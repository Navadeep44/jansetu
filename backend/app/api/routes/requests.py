"""Citizen tracking & verification, officer review queue, closures with quality audit, erasure."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.channels.conversation import verify as verify_closure
from app.core.database import get_db
from app.core.i18n import t
from app.core.security import GOV_ROLES, require
from app.models import Area, AuditLog, CitizenRequest, Notification, Project
from app.schemas.inputs import CloseIn, ReplyIn, ReviewIn, VerifyIn
from app.schemas.serializers import cluster_out, iso, project_out, request_out
from app.services import analytics_cache, clustering, pipeline, privacy
from app.services.ai.extraction import extract
from app.services.closure_audit import audit
from app.services.geo import gazetteer

router = APIRouter(tags=["requests"])


@router.get("/requests")
def list_requests(status: str | None = None, country: str | None = None, area_id: int | None = None,
                  category: str | None = None, flag: str | None = None, q: str | None = None, channel: str | None = None,
                  limit: int = 50, offset: int = 0, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    qry = db.query(CitizenRequest)
    if status:
        qry = qry.filter(CitizenRequest.status.in_(status.split(",")))
    if country:
        qry = qry.filter(CitizenRequest.country_code == country)
    if area_id:
        qry = qry.filter(CitizenRequest.area_id == area_id)
    if category:
        qry = qry.filter(CitizenRequest.category == category)
    if channel:
        qry = qry.filter(CitizenRequest.channel == channel)
    if q:
        qry = qry.filter(or_(CitizenRequest.redacted_text.ilike(f"%{q}%"), CitizenRequest.translated_text.ilike(f"%{q}%"),
                             CitizenRequest.tracking_id.ilike(f"%{q}%")))
    if flag:
        qry = qry.filter(or_(cast(CitizenRequest.flags, String).like(f'%"{flag}"%'), CitizenRequest.closure_flag == flag))
    total = qry.count()
    rows = qry.order_by(CitizenRequest.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [request_out(r) for r in rows]}


@router.get("/review-queue")
def review_queue(role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    reqs = (db.query(CitizenRequest).filter(or_(CitizenRequest.status == "needs_review", CitizenRequest.closure_flag == "formulaic_closure"))
            .order_by(CitizenRequest.severity.desc(), CitizenRequest.created_at.desc()).limit(200).all())
    coordinated = db.query(CitizenRequest).filter(cast(CitizenRequest.flags, String).like('%"coordinated"%')).all()
    campaigns = {}
    for r in coordinated:
        if "coordinated" in (r.flags or []):
            key = (r.area.name if r.area else "?", r.redacted_text[:80])
            campaigns.setdefault(key, {"area": key[0], "text": r.redacted_text, "count": 0, "first": r.created_at, "category": r.category})
            campaigns[key]["count"] += 1
    return {
        "needs_review": [request_out(r) for r in reqs if r.status == "needs_review"],
        "formulaic_closures": [request_out(r) for r in reqs if r.closure_flag == "formulaic_closure"],
        "campaigns": [{**v, "first": iso(v["first"])} for v in campaigns.values()],
    }


@router.get("/track/{tracking_id}")
def track(tracking_id: str, db: Session = Depends(get_db)):
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper().strip()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    notes = db.query(Notification).filter_by(request_id=r.id).order_by(Notification.created_at).all()
    project = None
    if r.cluster_id:
        p = db.query(Project).filter(Project.cluster_id == r.cluster_id).order_by(Project.score.desc()).first()
        if not p and r.area_id:
            p = db.query(Project).filter(Project.area_id == r.area_id, Project.sector == r.category,
                                         Project.status.in_(["sanctioned", "in_progress", "completed", "approved"])).first()
        project = project_out(p) if p else None
    timeline = [{"at": iso(r.created_at), "event": "Request received", "detail": f"via {r.channel}, {r.language}"}]
    if r.cluster:
        timeline.append({"at": iso(r.cluster.first_seen), "event": "Joined a demand cluster",
                         "detail": f"{r.cluster.unique_households} households share this need"})
    if project:
        timeline.append({"at": project["created_at"], "event": "Included in a project", "detail": f"{project['title']} ({project['status']})"})
    if r.closure_note:
        timeline.append({"at": iso(r.closed_at), "event": "Department reported action", "detail": r.closure_note})
    if r.citizen_verified is not None:
        timeline.append({"at": iso(r.closed_at), "event": "Citizen verification", "detail": "Confirmed fixed" if r.citizen_verified else "Disputed: reopened"})
    return {"request": request_out(r, full=True), "area": r.area.name if r.area else None,
            "cluster": cluster_out(r.cluster) if r.cluster else None, "project": project,
            "notifications": [{"kind": n.kind, "message": n.message, "language": n.language, "channel": n.channel,
                               "at": iso(n.created_at)} for n in notes],
            "timeline": sorted(timeline, key=lambda x: x["at"] or "")}


@router.post("/track/{tracking_id}/verify")
def verify(tracking_id: str, body: VerifyIn, db: Session = Depends(get_db)):
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    msg = verify_closure(db, r, body.fixed, body.rating)
    db.add(AuditLog(actor_role="citizen", action="verify_closure", entity="request", entity_id=r.tracking_id,
                    detail={"fixed": body.fixed, "rating": body.rating, "comment": body.comment[:300]}))
    db.commit()
    analytics_cache.bump()
    return {"message": msg, "status": r.status}


@router.post("/track/{tracking_id}/reply")
def reply(tracking_id: str, body: ReplyIn, db: Session = Depends(get_db)):
    """The citizen answers a question (e.g. 'where is this?') or adds more details. No login needed."""
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper().strip()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    text = (body.text or "").strip()
    area = db.get(Area, body.area_id) if body.area_id else None
    if not area and body.lat is not None and body.lng is not None:
        area, _ = gazetteer.nearest_area(db, body.lat, body.lng)
    shown = text or (f"[Location: {area.name}]" if area else "[Location shared]")
    db.add(Notification(request_id=r.id, channel=r.channel, language=r.language, kind="citizen_reply", message=shown, delivered=True))
    db.flush()

    # 1) we were waiting for the place
    if "needs_location" in (r.flags or []):
        if not area and text:
            a, conf, _ = gazetteer.resolve_text(db, text)
            area = a if conf >= 0.75 else None
        if area:
            msg = pipeline.attach_location(db, r, area)
            return {"reply": msg, "status": r.status, "resolved": True}
        msg = t("place_not_found", r.language)
        pipeline.notify(db, r, "ask_location", msg)
        db.commit()
        return {"reply": msg, "status": r.status, "resolved": False}

    # 2) we could not understand the problem: re-read it with the extra details
    if r.category == "other" and text:
        x = extract(f"{r.original_text} {text}", r.language)
        if x["category"] != "other":
            r.category, r.subcategory, r.sdg = x["category"], x["subcategory"], x["sdg"]
            r.severity, r.confidence = max(r.severity, x["severity"]), x["confidence"]
            r.translated_text = f"{r.translated_text} | {x['translated_text']}"
            r.flags = [f for f in (r.flags or []) if f != "low_confidence"]
            if r.area_id:
                msg = pipeline.attach_location(db, r, r.area)
                return {"reply": msg, "status": r.status, "resolved": True}

    # 3) any other extra detail is added to the request for the officer
    r.original_text = f"{r.original_text}\n+ {text}" if text else r.original_text
    r.redacted_text = f"{r.redacted_text}\n+ {privacy.redact(text)}" if text else r.redacted_text
    r.updated_at = datetime.utcnow()
    msg = t("noted", r.language, tid=r.tracking_id)
    pipeline.notify(db, r, "noted", msg)
    db.commit()
    analytics_cache.bump()
    return {"reply": msg, "status": r.status, "resolved": True}


@router.delete("/track/{tracking_id}")
def erase(tracking_id: str, db: Session = Depends(get_db)):
    """Right to erasure (DPDP s.12 / LGPD art.18 / POPIA s.24): personal content is deleted,
    only the anonymous, aggregated demand signal is retained."""
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    r.original_text = r.redacted_text = "[erased at citizen's request]"
    r.audio_path = r.photo_path = None
    r.lat = r.area.lat if r.area else None
    r.lng = r.area.lng if r.area else None
    r.anonymous = True
    db.add(AuditLog(actor_role="citizen", action="erase_personal_data", entity="request", entity_id=r.tracking_id, detail={}))
    db.commit()
    return {"erased": True}


@router.post("/requests/{request_id}/review")
def review(request_id: int, body: ReviewIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404)
    if body.action == "reject_spam":
        r.status, r.flags = "closed", list(set((r.flags or []) + ["rejected_spam"]))
    else:
        if body.category:
            r.category = body.category
        if body.area_id:
            r.area_id = body.area_id
            r.area = db.get(Area, body.area_id)
            r.country_code = r.area.country_code
        r.flags = [f for f in (r.flags or []) if f not in ("low_confidence", "needs_location", "urgent_safety")]
        r.confidence = max(r.confidence, 0.9)
        if r.area_id and r.category != "other":
            c = clustering.find_or_create(db, r)
            r.cluster_id = c.id
            db.flush()
            clustering.recompute(db, c)
            r.status = "clustered"
            others = max(0, c.unique_households - 1)
            msg = (t("ack", r.language, tid=r.tracking_id, category=r.category, n=others, area=r.area.name) if others
                   else t("ack_first", r.language, tid=r.tracking_id, category=r.category, area=r.area.name))
            pipeline.notify(db, r, "ack", msg)
        else:
            r.status = "received"
        r.review_reason = ""
    db.add(AuditLog(actor_role=role, action=f"review_{body.action}", entity="request", entity_id=r.tracking_id,
                    detail=body.model_dump()))
    db.commit()
    analytics_cache.bump()
    return request_out(r)


@router.post("/requests/{request_id}/close/audit")
def close_audit(request_id: int, body: CloseIn, db: Session = Depends(get_db)):
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404)
    return audit(body.closure_note, r.translated_text or r.redacted_text)


@router.post("/requests/{request_id}/close")
def close(request_id: int, body: CloseIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404)
    a = audit(body.closure_note, r.translated_text or r.redacted_text)
    if a["formulaic"] and not body.force:
        raise HTTPException(422, {"message": "Closure note looks formulaic; please describe the concrete action.", "audit": a})
    r.closure_note, r.closure_flag = body.closure_note, "formulaic_closure" if a["formulaic"] else ""
    r.status, r.closed_at = "resolved_pending_verification", datetime.utcnow()
    pipeline.notify(db, r, "resolved", t("resolved", r.language, tid=r.tracking_id))
    db.add(AuditLog(actor_role=role, action="close_request", entity="request", entity_id=r.tracking_id,
                    detail={"audit": a, "note": body.closure_note[:500]}))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r), "audit": a}


@router.get("/audit-log")
def audit_log(limit: int = 100, role: str = Depends(require(*GOV_ROLES, "brics_analyst")), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [{"id": a.id, "actor_role": a.actor_role, "action": a.action, "entity": a.entity, "entity_id": a.entity_id,
             "detail": a.detail, "at": iso(a.created_at)} for a in rows]
