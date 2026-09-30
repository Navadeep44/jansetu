from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Area, CitizenRequest, DemandCluster, Project
from app.schemas.serializers import area_out, cluster_out, project_out, request_out

router = APIRouter(prefix="/clusters", tags=["demand clusters"])


from app.core import security


@router.get("")
def list_clusters(country: str | None = None, state: str | None = None, district: str | None = None, category: str | None = None, area_id: int | None = None,
                  status: str | None = None, sort: str = "households", limit: int = 50, offset: int = 0,
                  claims: dict = Depends(security.get_current_user_claims),
                  db: Session = Depends(get_db)):
    q = db.query(DemandCluster)
    # Jurisdiction Scoping
    q = security.apply_jurisdiction_scope(q, claims, DemandCluster, db)

    if country:
        q = q.filter(DemandCluster.country_code == country)
    already_joined = bool((claims.get("st") or claims.get("dist")) and claims.get("r") not in security.NATIONWIDE_ROLES)
    if state or district:
        if not already_joined:
            q = q.join(Area, DemandCluster.area_id == Area.id)
        if state:
            q = q.filter(Area.state == state)
        if district:
            q = q.filter(Area.district == district)
    if category:
        q = q.filter(DemandCluster.category == category)
    if area_id:
        q = q.filter(DemandCluster.area_id == area_id)
    if status:
        q = q.filter(DemandCluster.status.in_(status.split(",")))
    order = {"households": DemandCluster.unique_households.desc(), "severity": DemandCluster.severity_avg.desc(),
             "recent": DemandCluster.last_seen.desc()}.get(sort, DemandCluster.unique_households.desc())
    total = q.count()
    return {"total": total, "items": [cluster_out(c) for c in q.order_by(order).offset(offset).limit(limit).all()]}


@router.get("/{cluster_id}")
def cluster_detail(cluster_id: int, db: Session = Depends(get_db)):
    c = db.get(DemandCluster, cluster_id)
    if not c:
        raise HTTPException(404)
    reqs = db.query(CitizenRequest).filter(CitizenRequest.cluster_id == c.id).order_by(CitizenRequest.created_at.desc()).all()
    now = datetime.utcnow()
    weekly = Counter(min(25, (now - r.created_at).days // 7) for r in reqs)
    series = [{"weeks_ago": w, "reports": weekly.get(w, 0)} for w in range(25, -1, -1)]
    seen, quotes = set(), []
    for r in sorted(reqs, key=lambda r: -r.severity):
        if (r.language, r.redacted_text) in seen:
            continue
        seen.add((r.language, r.redacted_text))
        quotes.append({"language": r.language, "original": r.redacted_text, "english": r.translated_text, "channel": r.channel})
        if len(quotes) >= 6:
            break
    projects = db.query(Project).filter((Project.cluster_id == c.id) | ((Project.area_id == c.area_id) & (Project.sector == c.category))).all()
    return {"cluster": cluster_out(c), "area": area_out(c.area), "quotes": quotes, "weekly": series,
            "gender": dict(Counter(r.gender for r in reqs)), "status_mix": dict(Counter(r.status for r in reqs)),
            "recent_requests": [request_out(r) for r in reqs[:15]], "projects": [project_out(p) for p in projects]}
