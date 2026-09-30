from datetime import datetime
from app.models import Area, CitizenRequest, DemandCluster, Project, StatusHistory, ProofUpload, ProjectFunding, ProjectExpenditure, ProjectHistory
from app.services.ai.extraction import SUB_LABELS
from app.services.ai.language import LANGUAGES
from app.services.ai.lexicon import sector_label


def iso(d):
    return d.isoformat() if d else None


def status_history_out(sh: StatusHistory) -> dict:
    return {
        "id": sh.id,
        "request_id": sh.request_id,
        "status": sh.status,
        "stage_label": sh.stage_label,
        "actor_role": sh.actor_role,
        "actor_name": sh.actor_name,
        "department": sh.department,
        "note": sh.note,
        "public_visible": sh.public_visible,
        "created_at": iso(sh.created_at),
    }


def proof_out(p: ProofUpload) -> dict:
    return {
        "id": p.id,
        "request_id": p.request_id,
        "officer_id": p.officer_id,
        "officer_name": p.officer_name,
        "department": p.department,
        "file_url": p.file_url,
        "file_name": p.file_name,
        "file_type": p.file_type,
        "file_size": p.file_size,
        "mime_type": p.mime_type,
        "sha256_hash": p.sha256_hash,
        "uploaded_at": iso(p.uploaded_at),
        "lat": p.lat,
        "lng": p.lng,
        "exif_metadata": p.exif_metadata,
        "is_suspicious": p.is_suspicious,
        "suspicious_reason": p.suspicious_reason,
        "is_public": p.is_public,
    }


def area_out(a: Area | None) -> dict | None:
    if not a:
        return None
    return {"id": a.id, "name": a.name, "district": a.district, "state": a.state, "country": a.country_code,
            "level": a.level, "setting": a.setting, "admin_code": a.admin_code, "lat": a.lat, "lng": a.lng,
            "population": a.population, "households": a.households, "vulnerability": a.vulnerability,
            "connectivity": a.connectivity, "nightlights": a.nightlights, "infra": a.infra,
            "languages": a.primary_languages, "aliases": a.aliases}


def request_out(r: CitizenRequest, full: bool = False) -> dict:
    now = datetime.utcnow()
    is_overdue = bool(r.sla_due_at and r.sla_due_at < now and r.status not in ("closed", "closed_verified", "resolved_pending_verification"))
    d = {
        "id": r.id, "tracking_id": r.tracking_id, "channel": r.channel, "language": r.language,
        "language_name": LANGUAGES.get(r.language, r.language), "text": r.redacted_text,
        "translated_text": r.translated_text, "translation_mode": r.translation_mode, "country": r.country_code,
        "area_id": r.area_id, "area": r.area.name if r.area else None, "district": r.area.district if r.area else None,
        "state": r.area.state if r.area else None, "block": r.block or (r.area.name if r.area else ""),
        "lat": r.lat, "lng": r.lng, "category": r.category, "category_label": sector_label(r.category),
        "subcategory": r.subcategory, "subcategory_label": SUB_LABELS.get(r.subcategory, r.subcategory),
        "request_type": r.request_type, "severity": r.severity, "affected_people": r.affected_people,
        "vulnerable_groups": r.vulnerable_groups, "sdg": r.sdg, "confidence": r.confidence,
        "extraction_mode": r.extraction_mode, "status": r.status, "cluster_id": r.cluster_id, "flags": r.flags,
        "review_reason": r.review_reason, "anonymous": r.anonymous, "gender": r.gender, "assisted_by": r.assisted_by,
        "supporters": r.supporters,
        "assigned_officer": r.assigned_officer, "assigned_field_officer_id": r.assigned_field_officer_id,
        "assigned_department": r.assigned_department,
        "assigned_at": iso(r.assigned_at), "sla_due_at": iso(r.sla_due_at), "is_overdue": is_overdue,
        "escalated": bool(r.escalated), "escalation_reason": r.escalation_reason, "rework_note": r.rework_note,
        "in_progress_at": iso(r.in_progress_at), "resolved_at": iso(r.resolved_at),
        "closure_note": r.closure_note, "closure_flag": r.closure_flag,
        "citizen_verified": r.citizen_verified, "citizen_rating": r.citizen_rating,
        "dispute_reason": r.dispute_reason, "dispute_photo_path": r.dispute_photo_path, "proof_count": r.proof_count,
        "has_audio": bool(r.audio_path), "has_photo": bool(r.photo_path or (r.photos and len(r.photos) > 0)),
        "created_at": iso(r.created_at), "closed_at": iso(r.closed_at),
        "waiting_for": ("location" if "needs_location" in (r.flags or []) else
                        "details" if r.category == "other" and r.status == "needs_review" else None),
        # Hierarchy fields
        "mandal": getattr(r, "mandal", "") or r.block or (getattr(r.area, "mandal", "") if r.area else "") or (r.area.name if r.area else ""),
        "village": getattr(r, "village", "") or (getattr(r.area, "village", "") if r.area else "") or (r.area.name if r.area else ""),
        # Photos
        "photos": getattr(r, "photos", []) or ([r.photo_path] if r.photo_path else []),
        "site_photos": getattr(r, "site_photos", []) or [],
        "completion_photos": getattr(r, "completion_photos", []) or [],
        # Inspection
        "inspection_notes": getattr(r, "inspection_notes", "") or "",
        "inspection_lat": getattr(r, "inspection_lat", None),
        "inspection_lng": getattr(r, "inspection_lng", None),
        "inspection_at": iso(getattr(r, "inspection_at", None)),
        # Budget cycle
        "budget_requested": getattr(r, "budget_requested", 0.0) or 0.0,
        "budget_approved": getattr(r, "budget_approved", 0.0) or 0.0,
        "budget_allocated": getattr(r, "budget_allocated", 0.0) or 0.0,
        "budget_spent": getattr(r, "budget_spent", 0.0) or 0.0,
        "budget_line_items": getattr(r, "budget_line_items", []) or [],
        "negotiation_history": getattr(r, "negotiation_history", []) or [],
        "expenses": getattr(r, "expenses", []) or [],
        "dh_forward_note": getattr(r, "dh_forward_note", "") or "",
        "collector_note": getattr(r, "collector_note", "") or "",
        "rejection_reason": getattr(r, "rejection_reason", "") or "",
        "sla_stage": getattr(r, "sla_stage", "verify") or "verify",
        "sla_breached": getattr(r, "sla_breached", False) or is_overdue,
    }
    if full:
        d["status_history"] = [status_history_out(sh) for sh in (r.status_history or [])]
        d["proofs"] = [proof_out(p) for p in (r.proofs or [])]
    return d


def cluster_out(c: DemandCluster) -> dict:
    return {"id": c.id, "country": c.country_code, "area_id": c.area_id, "area": c.area.name if c.area else None,
            "district": c.area.district if c.area else None, "state": c.area.state if c.area else None,
            "lat": c.area.lat if c.area else None,
            "lng": c.area.lng if c.area else None, "category": c.category, "category_label": sector_label(c.category),
            "subcategory": c.subcategory, "title": c.title, "summary": c.summary, "request_count": c.request_count,
            "unique_households": c.unique_households, "supporters": c.supporters, "severity_avg": c.severity_avg,
            "languages": c.languages, "channels": c.channels, "vulnerable_groups": c.vulnerable_groups,
            "campaign_share": c.campaign_share, "status": c.status, "first_seen": iso(c.first_seen), "last_seen": iso(c.last_seen)}


def project_out(p: Project) -> dict:
    sanctioned = sum(f.sanctioned_amount_inr for f in (p.fundings or []))
    spent = sum(e.amount_inr for e in (p.expenditures or []))
    remaining = max(0.0, sanctioned - spent)
    utilization = round((spent / sanctioned) * 100, 1) if sanctioned > 0 else 0.0

    return {
        "id": p.id, "code": p.code, "source": p.source, "country": p.country_code, "area_id": p.area_id,
        "area": p.area.name if p.area else None, "district": p.area.district if p.area else None,
        "state": p.area.state if p.area else None,
        "lat": p.area.lat if p.area else None, "lng": p.area.lng if p.area else None, "cluster_id": p.cluster_id,
        "sector": p.sector, "sector_label": sector_label(p.sector), "title": p.title, "description": p.description,
        "scheme": p.scheme, "sdg": p.sdg, "cost_local": p.cost_local, "cost_usd": p.cost_usd,
        "sanctioned_amount": sanctioned, "sanctioned_amount_inr": sanctioned,
        "total_spent": spent, "spent_amount_inr": spent,
        "remaining_budget": remaining,
        "utilization_pct": utilization,
        "currency": {"IN": "INR", "BR": "BRL", "ZA": "ZAR"}.get(p.country_code, "INR"),
        "beneficiaries": p.beneficiaries, "status": p.status, "score": p.score, "score_breakdown": p.score_breakdown,
        "decision_reason": p.decision_reason, "decided_by": p.decided_by, "created_at": iso(p.created_at),
        "started_at": iso(p.started_at), "completed_at": iso(p.completed_at),
        "fundings": [{"id": f.id, "sanctioned_amount_inr": f.sanctioned_amount_inr, "funded_by": f.funded_by, "funded_at": iso(f.funded_at), "change_reason": f.change_reason} for f in (p.fundings or [])],
        "expenditures": [{"id": e.id, "amount_inr": e.amount_inr, "description": e.description, "spent_on": e.spent_on, "bill_reference": e.bill_reference, "recorded_by": e.recorded_by, "created_at": iso(e.created_at)} for e in (p.expenditures or [])],
        "history": [{"id": h.id, "from_status": h.from_status, "to_status": h.to_status, "actor_name": h.actor_name, "actor_role": h.actor_role, "note": h.note, "timestamp": iso(h.timestamp)} for h in (p.history or [])],
    }
