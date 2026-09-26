"""Open311 GeoReport v2 (open standard for civic service requests) so any city portal, app or
existing grievance system can push to / pull from JanSetu without custom integration.
Spec: https://wiki.open311.org/GeoReport_v2"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import CitizenRequest
from app.services import pipeline
from app.services.ai.lexicon import SECTORS

router = APIRouter(prefix="/open311/v2", tags=["Open311 GeoReport v2"])
OPEN = {"received", "needs_review", "clustered", "in_plan", "in_progress", "reopened"}


def _to311(r: CitizenRequest) -> dict:
    return {"service_request_id": r.tracking_id, "status": "open" if r.status in OPEN else "closed",
            "status_notes": r.closure_note or r.status, "service_name": SECTORS.get(r.category, {}).get("label", "Other"),
            "service_code": r.category, "description": r.translated_text or r.redacted_text,
            "agency_responsible": r.area.district if r.area else None, "requested_datetime": r.created_at.isoformat() + "Z",
            "updated_datetime": (r.updated_at or r.created_at).isoformat() + "Z",
            "address": f"{r.area.name}, {r.area.district}" if r.area else r.location_text, "lat": r.lat, "long": r.lng,
            "media_url": None}


@router.get("/discovery.json")
def discovery():
    return {"changeset": "2026-09-01", "contact": "open-source maintainers (see README)", "key_service": "none",
            "endpoints": [{"specification": "http://wiki.open311.org/GeoReport_v2", "url": "/open311/v2",
                           "changeset": "2026-09-01", "type": "production", "formats": ["application/json"]}]}


@router.get("/services.json")
def services():
    return [{"service_code": k, "service_name": v["label"], "description": f"{v['label']} ({v['sdg']})", "metadata": False,
             "type": "realtime", "keywords": ",".join(v["keywords"][:6]), "group": v["sdg"]} for k, v in SECTORS.items()]


@router.get("/requests.json")
def list_requests(service_code: str | None = None, status: str | None = None, start_date: str | None = None,
                  end_date: str | None = None, db: Session = Depends(get_db)):
    q = db.query(CitizenRequest)
    if service_code:
        q = q.filter(CitizenRequest.category.in_(service_code.split(",")))
    if start_date:
        q = q.filter(CitizenRequest.created_at >= datetime.fromisoformat(start_date.replace("Z", "")))
    if end_date:
        q = q.filter(CitizenRequest.created_at <= datetime.fromisoformat(end_date.replace("Z", "")))
    rows = [_to311(r) for r in q.order_by(CitizenRequest.created_at.desc()).limit(1000).all()]
    return [r for r in rows if not status or r["status"] == status]


@router.get("/requests/{rid}.json")
def get_request(rid: str, db: Session = Depends(get_db)):
    r = db.query(CitizenRequest).filter_by(tracking_id=rid).first()
    if not r:
        raise HTTPException(404)
    return [_to311(r)]


@router.post("/requests.json")
async def create(request: Request, db: Session = Depends(get_db)):
    ctype = request.headers.get("content-type", "")
    data = await request.json() if "json" in ctype else dict(await request.form())
    desc = data.get("description") or ""
    if not desc:
        raise HTTPException(400, "description is required")
    lat = float(data["lat"]) if data.get("lat") not in (None, "") else None
    lng = float(data["long"]) if data.get("long") not in (None, "") else None
    res = pipeline.process(db, text=desc, channel="import", lat=lat, lng=lng, location_text=data.get("address_string", ""),
                           identifier=data.get("phone") or data.get("email") or data.get("device_id"))
    return [{"service_request_id": res["request"].tracking_id, "service_notice": res["reply"], "account_id": None}]
