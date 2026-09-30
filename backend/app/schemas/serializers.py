"""Output serializers. Analytics/officer views only ever expose the PII-redacted text."""
from app.models import Area, CitizenRequest, DemandCluster, Project
from app.services.ai.extraction import SUB_LABELS
from app.services.ai.language import LANGUAGES
from app.services.ai.lexicon import sector_label


def iso(d):
    return d.isoformat() if d else None


def area_out(a: Area | None) -> dict | None:
    if not a:
        return None
    return {"id": a.id, "name": a.name, "district": a.district, "state": a.state, "country": a.country_code,
            "level": a.level, "setting": a.setting, "admin_code": a.admin_code, "lat": a.lat, "lng": a.lng,
            "population": a.population, "households": a.households, "vulnerability": a.vulnerability,
            "connectivity": a.connectivity, "nightlights": a.nightlights, "infra": a.infra,
            "languages": a.primary_languages, "aliases": a.aliases}


def request_out(r: CitizenRequest, full: bool = False) -> dict:
    d = {
        "id": r.id, "tracking_id": r.tracking_id, "channel": r.channel, "language": r.language,
        "language_name": LANGUAGES.get(r.language, r.language), "text": r.redacted_text,
        "translated_text": r.translated_text, "translation_mode": r.translation_mode, "country": r.country_code,
        "area_id": r.area_id, "area": r.area.name if r.area else None, "district": r.area.district if r.area else None,
        "lat": r.lat, "lng": r.lng, "category": r.category, "category_label": sector_label(r.category),
        "subcategory": r.subcategory, "subcategory_label": SUB_LABELS.get(r.subcategory, r.subcategory),
        "request_type": r.request_type, "severity": r.severity, "affected_people": r.affected_people,
        "vulnerable_groups": r.vulnerable_groups, "sdg": r.sdg, "confidence": r.confidence,
        "extraction_mode": r.extraction_mode, "status": r.status, "cluster_id": r.cluster_id, "flags": r.flags,
        "review_reason": r.review_reason, "anonymous": r.anonymous, "gender": r.gender, "assisted_by": r.assisted_by,
        "supporters": r.supporters, "closure_note": r.closure_note, "closure_flag": r.closure_flag,
        "citizen_verified": r.citizen_verified, "citizen_rating": r.citizen_rating, "has_audio": bool(r.audio_path),
        "has_photo": bool(r.photo_path), "created_at": iso(r.created_at), "closed_at": iso(r.closed_at),
        "waiting_for": ("location" if "needs_location" in (r.flags or []) else
                        "details" if r.category == "other" and r.status == "needs_review" else None),
    }
    return d


def cluster_out(c: DemandCluster) -> dict:
    return {"id": c.id, "country": c.country_code, "area_id": c.area_id, "area": c.area.name if c.area else None,
            "district": c.area.district if c.area else None, "state": c.area.state if c.area else None, "lat": c.area.lat if c.area else None,
            "lng": c.area.lng if c.area else None, "category": c.category, "category_label": sector_label(c.category),
            "subcategory": c.subcategory, "title": c.title, "summary": c.summary, "request_count": c.request_count,
            "unique_households": c.unique_households, "supporters": c.supporters, "severity_avg": c.severity_avg,
            "languages": c.languages, "channels": c.channels, "vulnerable_groups": c.vulnerable_groups,
            "campaign_share": c.campaign_share, "status": c.status, "first_seen": iso(c.first_seen), "last_seen": iso(c.last_seen)}


def project_out(p: Project) -> dict:
    return {"id": p.id, "code": p.code, "source": p.source, "country": p.country_code, "area_id": p.area_id,
            "area": p.area.name if p.area else None, "district": p.area.district if p.area else None,
            "lat": p.area.lat if p.area else None, "lng": p.area.lng if p.area else None, "cluster_id": p.cluster_id,
            "sector": p.sector, "sector_label": sector_label(p.sector), "title": p.title, "description": p.description,
            "scheme": p.scheme, "sdg": p.sdg, "cost_local": p.cost_local, "cost_usd": p.cost_usd,
            "currency": "INR", "state": p.area.state if p.area else None,
            "beneficiaries": p.beneficiaries, "status": p.status, "score": p.score, "score_breakdown": p.score_breakdown,
            "decision_reason": p.decision_reason, "decided_by": p.decided_by, "created_at": iso(p.created_at),
            "started_at": iso(p.started_at), "completed_at": iso(p.completed_at)}
