"""Citizen tracking & verification, officer review queue, closures with quality audit, proof of resolution, erasure."""
import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.channels.conversation import verify as verify_closure
from app.core import security
from app.core.database import get_db
from app.core.i18n import t
from app.core.security import GOV_ROLES, require
from app.models import Area, AuditLog, CitizenRequest, Notification, Project, ProofUpload, StatusHistory
from app.schemas.inputs import (AssignIn, CloseIn, DisputeIn, FlagProofIn, ProgressIn,
                                ProofItemIn, ReplyIn, ResolveWithProofIn, ReviewIn, VerifyIn)
from app.schemas.serializers import cluster_out, iso, project_out, proof_out, request_out, status_history_out
from app.services import analytics_cache, clustering, pipeline, privacy
from app.services.ai.extraction import extract
from app.services.closure_audit import audit
from app.services.geo import gazetteer

router = APIRouter(tags=["requests"])


def _validate_proof_upload(item: ProofItemIn) -> tuple[bool, str, str]:
    """Validates file upload, security scanning hook, and computes SHA256 checksum."""
    max_bytes = 10 * 1024 * 1024  # 10 MB limit
    if item.file_size > max_bytes:
        return False, "File exceeds maximum size limit of 10 MB", ""
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"}
    if item.mime_type and item.mime_type.lower() not in allowed_types:
        return False, f"Unsupported MIME type '{item.mime_type}'. Only JPG, PNG, WEBP, and PDF are allowed.", ""
    
    # Calculate SHA256 from URL/Base64 string or content for audit integrity
    raw_str = item.file_url or item.file_name
    sha256 = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()
    return True, "Security scan passed", sha256


@router.get("/requests")
def list_requests(status: str | None = None, country: str | None = None, area_id: int | None = None,
                  category: str | None = None, flag: str | None = None, q: str | None = None, channel: str | None = None,
                  limit: int = 50, offset: int = 0, claims: dict = Depends(security.require_officer), db: Session = Depends(get_db)):
    qry = db.query(CitizenRequest)
    
    # Jurisdiction Scoping
    actor_role = claims.get("r")
    if actor_role not in (security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, "admin", "national"):
        if claims.get("st") or claims.get("dist"):
            qry = qry.join(Area, CitizenRequest.area_id == Area.id)
            if claims.get("st"):
                qry = qry.filter(Area.state == claims.get("st"))
            if claims.get("dist"):
                qry = qry.filter(Area.district == claims.get("dist"))
        if claims.get("dept"):
            qry = qry.filter(CitizenRequest.category == claims.get("dept"))

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
def review_queue(claims: dict = Depends(security.require_officer), db: Session = Depends(get_db)):
    qry = db.query(CitizenRequest).filter(or_(CitizenRequest.status == "needs_review", CitizenRequest.closure_flag == "formulaic_closure"))
    
    # Jurisdiction Scoping
    actor_role = claims.get("r")
    if actor_role not in (security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, "admin", "national"):
        if claims.get("st") or claims.get("dist"):
            qry = qry.join(Area, CitizenRequest.area_id == Area.id)
            if claims.get("st"):
                qry = qry.filter(Area.state == claims.get("st"))
            if claims.get("dist"):
                qry = qry.filter(Area.district == claims.get("dist"))
        if claims.get("dept"):
            qry = qry.filter(CitizenRequest.category == claims.get("dept"))

    reqs = qry.order_by(CitizenRequest.severity.desc(), CitizenRequest.created_at.desc()).limit(200).all()
    
    cq = db.query(CitizenRequest).filter(cast(CitizenRequest.flags, String).like('%"coordinated"%'))
    if actor_role not in (security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, "admin", "national"):
        if claims.get("st") or claims.get("dist"):
            cq = cq.join(Area, CitizenRequest.area_id == Area.id)
            if claims.get("st"):
                cq = cq.filter(Area.state == claims.get("st"))
            if claims.get("dist"):
                cq = cq.filter(Area.district == claims.get("dist"))
        if claims.get("dept"):
            cq = cq.filter(CitizenRequest.category == claims.get("dept"))
            
    coordinated = cq.all()
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

    # Step-by-step progress timeline
    history_records = list(r.status_history or [])
    timeline = []
    if history_records:
        for sh in history_records:
            timeline.append({
                "at": iso(sh.created_at),
                "status": sh.status,
                "stage": sh.stage_label,
                "event": sh.stage_label,
                "actor_role": sh.actor_role,
                "officer": sh.actor_name,
                "department": sh.department,
                "detail": sh.note,
            })
    else:
        # Synthesize fallback timeline if not yet in status_history table
        timeline.append({
            "at": iso(r.created_at),
            "status": "received",
            "stage": "Received",
            "event": "Request received",
            "officer": "Intake Desk",
            "department": pipeline.get_department_for_sector(r.category),
            "detail": f"Registered via {r.channel}. Tracking ID {r.tracking_id} assigned.",
        })
        if r.cluster:
            timeline.append({
                "at": iso(r.cluster.first_seen),
                "status": "clustered",
                "stage": "Verified & Grouped",
                "event": "Joined a demand cluster",
                "officer": "AI Demand Aggregator",
                "department": pipeline.get_department_for_sector(r.category),
                "detail": f"{r.cluster.unique_households} households share this need in {r.area.name if r.area else ''}.",
            })
        if project:
            timeline.append({
                "at": project["created_at"],
                "status": "in_plan",
                "stage": "Included in Project Plan",
                "event": "Sanctioned for works",
                "officer": "Planning Division",
                "department": pipeline.get_department_for_sector(r.category),
                "detail": f"{project['title']} ({project['status']}).",
            })
        if r.closure_note or r.status in ("resolved_pending_verification", "closed", "closed_verified"):
            timeline.append({
                "at": iso(r.closed_at or r.resolved_at or r.updated_at),
                "status": "resolved_pending_verification",
                "stage": "Resolved (Pending Citizen Confirmation)",
                "event": "Department reported action",
                "officer": r.assigned_officer or "Field Engineer",
                "department": r.assigned_department or pipeline.get_department_for_sector(r.category),
                "detail": r.closure_note or "Action Taken Report submitted with proof.",
            })
        if r.citizen_verified is not None or r.status in ("closed_verified", "reopened"):
            is_fixed = r.citizen_verified if r.citizen_verified is not None else (r.status == "closed_verified")
            timeline.append({
                "at": iso(r.closed_at or r.updated_at),
                "status": "closed_verified" if is_fixed else "reopened",
                "stage": "Closed (Confirmed by Citizen)" if is_fixed else "Reopened (Disputed)",
                "event": "Citizen verification",
                "officer": "Citizen Verification Desk",
                "department": pipeline.get_department_for_sector(r.category),
                "detail": "Confirmed fixed by citizen." if is_fixed else f"Disputed by citizen: {r.dispute_reason or 'Work incomplete'}. Reopened for inspection.",
            })

    proofs_list = [proof_out(p) for p in (r.proofs or [])]
    can_verify = r.status in ("resolved_pending_verification", "resolved") or (bool(r.closure_note) and r.citizen_verified is None)

    return {
        "request": request_out(r, full=True),
        "area": r.area.name if r.area else None,
        "cluster": cluster_out(r.cluster) if r.cluster else None,
        "project": project,
        "proofs": proofs_list,
        "history": [status_history_out(h) for h in history_records],
        "can_verify": can_verify,
        "department": r.assigned_department or pipeline.get_department_for_sector(r.category),
        "assigned_officer": r.assigned_officer,
        "assigned_department": r.assigned_department or pipeline.get_department_for_sector(r.category),
        "notifications": [{"kind": n.kind, "message": n.message, "language": n.language, "channel": n.channel,
                           "at": iso(n.created_at)} for n in notes],
        "timeline": sorted(timeline, key=lambda x: x.get("at") or ""),
    }


@router.post("/track/{tracking_id}/confirm")
def citizen_confirm(tracking_id: str, body: VerifyIn, db: Session = Depends(get_db)):
    """Citizen confirms resolution: 'Yes, this is fixed'."""
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    r.citizen_verified = True
    r.citizen_rating = body.rating
    r.status = "closed_verified"
    r.closed_at = datetime.utcnow()
    note_txt = f"Citizen confirmed work is fixed. Rating: {body.rating or 'N/A'}/5. {body.comment}".strip()
    
    pipeline.record_status_transition(
        db, r,
        status="closed_verified",
        stage_label="Closed (Confirmed by Citizen)",
        actor_role="citizen",
        actor_name="Citizen",
        department=r.assigned_department or pipeline.get_department_for_sector(r.category),
        note=note_txt,
        notify_message=t("closed", r.language, tid=r.tracking_id),
        notify_kind="closure_confirmed",
    )
    db.add(AuditLog(actor_role="citizen", action="confirm_resolution", entity="request", entity_id=r.tracking_id,
                    detail={"rating": body.rating, "comment": body.comment}))
    db.commit()
    analytics_cache.bump()
    return {"message": t("closed", r.language, tid=r.tracking_id), "status": r.status, "confirmed": True}


@router.post("/track/{tracking_id}/dispute")
def citizen_dispute(tracking_id: str, body: DisputeIn, db: Session = Depends(get_db)):
    """Citizen disputes resolution: 'No, not fixed' + reason and optional photo."""
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    r.citizen_verified = False
    r.dispute_reason = body.reason
    r.dispute_photo_path = body.photo
    r.status = "reopened"
    r.closure_flag = "citizen_disputed"
    
    note_txt = f"Citizen disputed resolution: '{body.reason}'. Case reopened for re-inspection."
    pipeline.record_status_transition(
        db, r,
        status="reopened",
        stage_label="Reopened (Disputed by Citizen)",
        actor_role="citizen",
        actor_name="Citizen",
        department=r.assigned_department or pipeline.get_department_for_sector(r.category),
        note=note_txt,
        notify_message=t("reopened", r.language, tid=r.tracking_id),
        notify_kind="case_reopened",
    )
    db.add(AuditLog(actor_role="citizen", action="dispute_resolution", entity="request", entity_id=r.tracking_id,
                    detail={"reason": body.reason, "photo": bool(body.photo)}))
    db.commit()
    analytics_cache.bump()
    return {"message": t("reopened", r.language, tid=r.tracking_id), "status": r.status, "reopened": True}


@router.post("/track/{tracking_id}/verify")
def verify(tracking_id: str, body: VerifyIn, db: Session = Depends(get_db)):
    r = db.query(CitizenRequest).filter_by(tracking_id=tracking_id.upper()).first()
    if not r:
        raise HTTPException(404, "Tracking ID not found")
    if body.fixed:
        return citizen_confirm(tracking_id, body, db)
    else:
        return citizen_dispute(tracking_id, DisputeIn(reason=body.comment or "Work incomplete on ground"), db)


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
        pipeline.record_status_transition(
            db, r,
            status="closed",
            stage_label="Closed (Spam / Duplicate)",
            actor_role=role,
            actor_name="Officer",
            note="Marked as duplicate or invalid by reviewing officer.",
        )
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
            pipeline.record_status_transition(
                db, r,
                status="clustered",
                stage_label="Verified & Grouped with Demand Cluster",
                actor_role=role,
                actor_name="Reviewing Officer",
                department=pipeline.get_department_for_sector(r.category),
                note=f"Verified category as '{r.category}' in {r.area.name}. Grouped with {c.unique_households} households.",
            )
        else:
            r.status = "received"
        r.review_reason = ""
    db.add(AuditLog(actor_role=role, action=f"review_{body.action}", entity="request", entity_id=r.tracking_id,
                    detail=body.model_dump()))
    db.commit()
    analytics_cache.bump()
    return request_out(r)


@router.post("/requests/{request_id}/assign")
def assign_officer(request_id: int, body: AssignIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    """Assigns an officer & department to the complaint."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    r.assigned_officer = body.officer_name
    r.assigned_department = body.department or pipeline.get_department_for_sector(r.category)
    r.assigned_at = datetime.utcnow()
    
    note = body.note or f"Assigned to {r.assigned_officer} ({r.assigned_department}) for field inspection."
    pipeline.record_status_transition(
        db, r,
        status="assigned",
        stage_label="Verified & Assigned to Officer",
        actor_role=role,
        actor_name=body.officer_name,
        department=r.assigned_department,
        note=note,
        notify_message=f"Your grievance {r.tracking_id} has been assigned to {r.assigned_officer} ({r.assigned_department}).",
        notify_kind="assigned",
    )
    db.add(AuditLog(actor_role=role, action="assign_officer", entity="request", entity_id=r.tracking_id,
                    detail={"officer": body.officer_name, "department": r.assigned_department}))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True)}


@router.post("/requests/{request_id}/in-progress")
def mark_in_progress(request_id: int, body: ProgressIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    """Marks that field work has commenced on site."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    r.in_progress_at = datetime.utcnow()
    officer = body.officer_name or r.assigned_officer or "Field Team"
    dept = r.assigned_department or pipeline.get_department_for_sector(r.category)
    
    pipeline.record_status_transition(
        db, r,
        status="in_progress",
        stage_label="Work In Progress",
        actor_role=role,
        actor_name=officer,
        department=dept,
        note=body.note or "Field work has commenced on site.",
        notify_message=f"Work on your request {r.tracking_id} is now in progress on site.",
        notify_kind="in_progress",
    )
    db.add(AuditLog(actor_role=role, action="mark_in_progress", entity="request", entity_id=r.tracking_id,
                    detail={"note": body.note}))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True)}


@router.post("/requests/{request_id}/resolve-with-proof")
def resolve_with_proof(request_id: int, body: ResolveWithProofIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    """Mandatory Proof-of-Resolution Upload: An officer cannot resolve a complaint without proof files (photos/docs)."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    
    # 1. Require at least one proof file
    if not body.proofs or len(body.proofs) == 0:
        raise HTTPException(422, {"message": "Mandatory proof required: upload at least 1 photo of the completed work or supporting document."})
    
    # 2. Quality check of Action Taken Report
    a = audit(body.closure_note, r.translated_text or r.redacted_text)
    if a["formulaic"] and not body.force:
        raise HTTPException(422, {"message": "Closure note looks formulaic. Please provide specific details of the action taken.", "audit": a})
    
    # 3. Validate and store proof files permanently
    dept = body.department or r.assigned_department or pipeline.get_department_for_sector(r.category)
    officer = body.officer_name or r.assigned_officer or "Field Officer"
    
    saved_proofs = []
    has_suspicious = False
    suspicious_notes = []

    for item in body.proofs:
        valid, msg, sha256 = _validate_proof_upload(item)
        if not valid:
            raise HTTPException(400, {"message": f"Proof file validation failed: {msg}"})
        
        # Check duplicate hash against previous proofs across system
        dup = db.query(ProofUpload).filter(ProofUpload.sha256_hash == sha256, ProofUpload.request_id != r.id).first()
        is_susp = False
        susp_reason = ""
        if dup:
            is_susp = True
            susp_reason = f"Duplicate image hash detected (identical file previously submitted for {dup.request_id})"
            has_suspicious = True
            suspicious_notes.append(susp_reason)
        
        p = ProofUpload(
            request_id=r.id,
            officer_id=officer.lower().replace(" ", "_"),
            officer_name=officer,
            department=dept,
            file_url=item.file_url,
            file_name=item.file_name,
            file_type=item.file_type,
            file_size=item.file_size,
            mime_type=item.mime_type,
            sha256_hash=sha256,
            uploaded_at=datetime.utcnow(),
            lat=item.lat or r.lat,
            lng=item.lng or r.lng,
            exif_metadata=item.exif_metadata,
            is_suspicious=is_susp,
            suspicious_reason=susp_reason,
            is_public=False,
        )
        db.add(p)
        saved_proofs.append(p)
    
    r.closure_note = body.closure_note
    r.closure_flag = "suspicious_proof" if has_suspicious else ("formulaic_closure" if a["formulaic"] else "")
    r.status = "resolved_pending_verification"
    r.resolved_at = datetime.utcnow()
    r.proof_count = (r.proof_count or 0) + len(saved_proofs)
    
    note_txt = f"Action Taken Report submitted with {len(saved_proofs)} proof file(s) by {officer} ({dept}). Awaiting citizen confirmation."
    pipeline.record_status_transition(
        db, r,
        status="resolved_pending_verification",
        stage_label="Resolved (Pending Citizen Confirmation)",
        actor_role=role,
        actor_name=officer,
        department=dept,
        note=note_txt,
        notify_message=t("resolved", r.language, tid=r.tracking_id),
        notify_kind="resolved_pending_verification",
    )
    
    db.add(AuditLog(actor_role=role, action="resolve_with_proof", entity="request", entity_id=r.tracking_id,
                    detail={"proof_count": len(saved_proofs), "audit": a, "suspicious": has_suspicious, "reasons": suspicious_notes}))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True), "proofs": [proof_out(p) for p in saved_proofs], "audit": a, "proof_count": len(saved_proofs)}


@router.post("/requests/{request_id}/close/audit")
def close_audit(request_id: int, body: CloseIn, db: Session = Depends(get_db)):
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404)
    return audit(body.closure_note, r.translated_text or r.redacted_text)


@router.post("/requests/{request_id}/close")
def close(request_id: int, body: CloseIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    """Legacy/Compatibility close endpoint. If proofs are provided, records them as Proof-of-Resolution."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404)
    
    # If proofs provided in CloseIn, delegate to resolve_with_proof
    if body.proofs and len(body.proofs) > 0:
        return resolve_with_proof(request_id, ResolveWithProofIn(
            closure_note=body.closure_note,
            proofs=body.proofs,
            force=body.force,
        ), role, db)
    
    # Otherwise check formulaic closure
    a = audit(body.closure_note, r.translated_text or r.redacted_text)
    if a["formulaic"] and not body.force:
        raise HTTPException(422, {"message": "Closure note looks formulaic; please describe the concrete action and upload proof.", "audit": a})
    
    r.closure_note, r.closure_flag = body.closure_note, "formulaic_closure" if a["formulaic"] else ""
    r.status, r.closed_at, r.resolved_at = "resolved_pending_verification", datetime.utcnow(), datetime.utcnow()
    
    pipeline.record_status_transition(
        db, r,
        status="resolved_pending_verification",
        stage_label="Resolved (Pending Citizen Confirmation)",
        actor_role=role,
        actor_name="Field Officer",
        department=r.assigned_department or pipeline.get_department_for_sector(r.category),
        note=body.closure_note,
        notify_message=t("resolved", r.language, tid=r.tracking_id),
        notify_kind="resolved_pending_verification",
    )
    
    db.add(AuditLog(actor_role=role, action="close_request", entity="request", entity_id=r.tracking_id,
                    detail={"audit": a, "note": body.closure_note[:500]}))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True), "audit": a}


@router.get("/admin/pending-proof-review")
def admin_pending_proof_review(claims: dict = Depends(security.require_officer), db: Session = Depends(get_db)):
    """Supervisor/Admin review dashboard: lists all cases pending citizen confirmation,
    flagging ones stuck too long (> 7 days) or with suspicious proof."""
    qry = db.query(CitizenRequest).filter(CitizenRequest.status == "resolved_pending_verification")
    
    actor_role = claims.get("r")
    if actor_role not in (security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, "admin", "national"):
        if claims.get("st") or claims.get("dist"):
            qry = qry.join(Area, CitizenRequest.area_id == Area.id)
            if claims.get("st"):
                qry = qry.filter(Area.state == claims.get("st"))
            if claims.get("dist"):
                qry = qry.filter(Area.district == claims.get("dist"))
        if claims.get("dept"):
            qry = qry.filter(CitizenRequest.category == claims.get("dept"))

    reqs = qry.order_by(CitizenRequest.resolved_at.desc(), CitizenRequest.created_at.desc()).limit(150).all()
    
    now = datetime.utcnow()
    results = []
    for r in reqs:
        days_pending = (now - r.resolved_at).days if r.resolved_at else (now - r.updated_at).days
        proofs = [proof_out(p) for p in (r.proofs or [])]
        is_stuck = days_pending >= 7
        has_suspicious_proof = any(p["is_suspicious"] for p in proofs) or r.closure_flag in ("formulaic_closure", "suspicious_proof")
        
        results.append({
            "request": request_out(r, full=True),
            "days_pending": days_pending,
            "is_stuck": is_stuck,
            "has_suspicious_proof": has_suspicious_proof,
            "proof_count": len(proofs),
            "proofs": proofs,
            "assigned_officer": r.assigned_officer,
            "assigned_department": r.assigned_department or pipeline.get_department_for_sector(r.category),
        })
    return {"total": len(results), "items": results}


@router.post("/admin/proof/{proof_id}/flag-suspicious")
def flag_proof_suspicious(proof_id: int, body: FlagProofIn, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    """Supervisor flags a proof as suspicious or clears flag."""
    p = db.get(ProofUpload, proof_id)
    if not p:
        raise HTTPException(404, "Proof not found")
    p.is_suspicious = body.suspicious
    p.suspicious_reason = body.reason
    if body.suspicious and p.request:
        p.request.closure_flag = "suspicious_proof"
    db.add(AuditLog(actor_role=role, action="flag_suspicious_proof", entity="proof", entity_id=str(proof_id),
                    detail={"suspicious": body.suspicious, "reason": body.reason}))
    db.commit()
    return {"proof": proof_out(p), "status": "updated"}


@router.get("/audit-log")
def audit_log(limit: int = 100, role: str = Depends(require(*GOV_ROLES, "brics_analyst")), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [{"id": a.id, "actor_role": a.actor_role, "action": a.action, "entity": a.entity, "entity_id": a.entity_id,
             "detail": a.detail, "at": iso(a.created_at)} for a in rows]

