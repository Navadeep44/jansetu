"""Login for officials + citizen conveniences that need no login:
'My requests' by phone, 'Me too' support for needs already reported nearby,
a public 'You said, we did' results board, and open (non-PII) CSV export."""
import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.i18n import t
from app.models import Area, CitizenRequest, DemandCluster, Project
from app.schemas.serializers import cluster_out, project_out, request_out
from app.services import analytics_cache, clustering, pipeline, privacy, scoring
from app.services.ai.lexicon import sector_sdg
from app.services.geo import gazetteer

router = APIRouter(tags=["public"])


@router.get("/citizen/requests")
def my_requests(phone: str, db: Session = Depends(get_db)):
    """Citizens find all their requests with the phone number they used. No account needed."""
    if len(phone.strip()) < 6:
        raise HTTPException(400, "Enter the phone number you used")
    hashes = {privacy.household_hash(phone.strip())}
    for ch in ("whatsapp", "telegram", "sms", "ivr"):
        hashes.add(privacy.household_hash(f"{ch}:{phone.strip()}"))
    rows = (db.query(CitizenRequest).filter(CitizenRequest.household_hash.in_(hashes))
            .order_by(CitizenRequest.created_at.desc()).limit(50).all())
    return [request_out(r) for r in rows]


@router.get("/nearby")
def nearby(area_id: int | None = None, lat: float | None = None, lng: float | None = None, db: Session = Depends(get_db)):
    """Needs already reported near the citizen, so they can add their voice with one tap."""
    if not area_id and lat is not None and lng is not None:
        a, _ = gazetteer.nearest_area(db, lat, lng)
        area_id = a.id if a else None
    if not area_id:
        return []
    cl = (db.query(DemandCluster).filter(DemandCluster.area_id == area_id, DemandCluster.status != "resolved")
          .order_by(DemandCluster.unique_households.desc()).limit(6).all())
    return [cluster_out(c) for c in cl]


class SupportIn(BaseModel):
    phone: str | None = None
    language: str = "en"


@router.post("/clusters/{cluster_id}/support")
def support(cluster_id: int, body: SupportIn, db: Session = Depends(get_db)):
    """'Me too': one tap adds this household to an existing need (no typing, no duplicate ticket)."""
    c = db.get(DemandCluster, cluster_id)
    if not c:
        raise HTTPException(404)
    hh = privacy.household_hash(body.phone) if body.phone else privacy.household_hash(None)
    if body.phone and db.query(CitizenRequest).filter_by(cluster_id=c.id, household_hash=hh).first():
        return {"already": True, "cluster": cluster_out(c), "message": "Your household is already counted for this need."}
    r = CitizenRequest(
        tracking_id=pipeline.new_tracking_id(c.country_code), channel="web", language=body.language,
        original_text=f"[Me too] {c.title}", redacted_text=f"[Me too] {c.title}", translated_text=f"[Me too] {c.title}",
        translation_mode="source", country_code=c.country_code, area_id=c.area_id, lat=c.area.lat, lng=c.area.lng,
        category=c.category, subcategory=c.subcategory, severity=max(1, round(c.severity_avg)), sdg=sector_sdg(c.category),
        confidence=1.0, extraction_mode="support", household_hash=hh, status="clustered", cluster_id=c.id,
        proof_count=0, created_at=datetime.utcnow(), updated_at=datetime.utcnow(),
    )
    r.area = c.area
    db.add(r)
    db.flush()
    clustering.recompute(db, c)
    msg = t("ack", body.language, tid=r.tracking_id, category=c.category, n=max(0, c.unique_households - 1), area=c.area.name)
    pipeline.notify(db, r, "ack", msg)
    db.commit()
    analytics_cache.bump()
    return {"already": False, "tracking_id": r.tracking_id, "cluster": cluster_out(c), "message": msg}


@router.get("/public/board")
def board(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    """Transparency: what citizens asked for and what government did about it."""
    q = db.query(CitizenRequest)
    pq = db.query(Project).filter(Project.status.in_(["approved", "in_progress", "completed"]))
    if state:
        q = q.join(Area, CitizenRequest.area_id == Area.id).filter(Area.state == state)
        pq = pq.join(Area, Project.area_id == Area.id).filter(Area.state == state)
    projects = pq.order_by(Project.status.desc(), Project.completed_at.desc()).all()
    items = []
    for p in projects:
        voices = 0
        if p.cluster_id:
            c = db.get(DemandCluster, p.cluster_id)
            voices = c.unique_households if c else 0
        else:
            voices = (db.query(func.count(func.distinct(CitizenRequest.household_hash)))
                      .filter(CitizenRequest.area_id == p.area_id, CitizenRequest.category == p.sector).scalar() or 0)
        items.append({**project_out(p), "citizen_voices": voices})
    return {
        "requests": q.count(),
        "households": q.with_entities(func.count(func.distinct(CitizenRequest.household_hash))).scalar(),
        "verified_fixed": q.filter(CitizenRequest.citizen_verified.is_(True)).count(),
        "reopened": q.filter(CitizenRequest.status == "reopened").count(),
        "completed": sum(1 for i in items if i["status"] == "completed"),
        "in_progress": sum(1 for i in items if i["status"] == "in_progress"),
        "approved": sum(1 for i in items if i["status"] == "approved"),
        "items": items,
    }


@router.get("/export/need-gap.csv")
def export_need_gap(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    """Open data export (DPG indicator 6): aggregated, contains no personal data."""
    rows = [r for r in scoring.need_gap(db) if not state or r["state"] == state]
    cols = ["state", "district", "area", "sector", "ngi", "effective_households", "reports", "demand_rate",
            "deficit", "vulnerability", "connectivity", "silent_zone", "covered", "planned_budget_local"]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        row = {k: r.get(k) for k in cols}
        # k-anonymity: never publish a count that could point to fewer than k households
        if (r.get("effective_households") or 0) < settings.k_anonymity:
            row["effective_households"] = f"<{settings.k_anonymity}"
            row["reports"] = f"<{settings.k_anonymity}"
            row["demand_rate"] = ""
        w.writerow(row)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=jansetu-need-gap.csv"})
