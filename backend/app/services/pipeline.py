"""The intake pipeline every channel goes through (web, WhatsApp, Telegram, IVR, SMS,
assisted/CSC, Gram Sabha community mode, portal imports).

text/voice -> language ID -> (ASR) -> understanding + translation -> PII redaction ->
geo-resolution -> anti-gaming -> demand clustering -> reply in citizen's language."""
import re
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.i18n import EMERGENCY_NUMBERS, t
from app.models import Area, CitizenRequest, Notification, StatusHistory, ProofUpload
from app.services import analytics_cache, clustering, privacy
from app.services.ai.extraction import extract
from app.services.geo import gazetteer

LANG_COUNTRY = {"pt": "BR", "zu": "ZA", "xh": "ZA", "af": "ZA", "te": "IN", "hi": "IN", "bho": "IN", "or": "IN",
                "ta": "IN", "bn": "IN", "mr": "IN", "gon": "IN", "ru": "RU", "zh": "CN", "ar": "EG", "am": "ET",
                "fa": "IR", "id": "ID"}
_ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

SECTOR_DEPARTMENTS = {
    "water": "Public Health Engineering & Water Supply",
    "roads": "Roads & Rural Infrastructure Development",
    "electricity": "Electricity & Power Distribution Board",
    "health": "Health & Family Welfare Department",
    "education": "School Education & Literacy Department",
    "sanitation": "Municipal Sanitation & Drainage Authority",
    "other": "General Grievance Redressal Division",
}


def get_department_for_sector(sector: str) -> str:
    return SECTOR_DEPARTMENTS.get(sector, SECTOR_DEPARTMENTS["other"])


def new_tracking_id(country: str) -> str:
    # 10 random alphanumeric chars (>50 bits entropy) preventing brute force guessing
    return f"JS-{country or 'XX'}-" + "".join(secrets.choice(_ALPH) for _ in range(10))


def notify(db: Session, req: CitizenRequest, kind: str, message: str) -> Notification:
    n = Notification(request_id=req.id, channel=req.channel, language=req.language, kind=kind, message=message,
                     delivered=req.channel in ("web", "assisted", "community", "simulator"))
    db.add(n)
    return n


def record_status_transition(
    db: Session,
    req: CitizenRequest,
    *,
    status: str,
    stage_label: str,
    actor_role: str = "system",
    actor_name: str = "System",
    department: str = "",
    note: str = "",
    notify_message: str | None = None,
    notify_kind: str = "status_update",
    created_at: datetime | None = None,
    public_visible: bool = True,
) -> StatusHistory:
    """Record an immutable lifecycle stage transition and notify the citizen."""
    ts = created_at or datetime.utcnow()
    req.status = status
    req.updated_at = ts

    if status == "assigned":
        req.assigned_at = ts
    elif status == "in_progress":
        req.in_progress_at = ts
    elif status in ("resolved_pending_verification", "resolved"):
        req.resolved_at = ts
    elif status in ("closed", "closed_verified"):
        req.closed_at = ts

    dept = department or req.assigned_department or get_department_for_sector(req.category)
    sh = StatusHistory(
        request_id=req.id,
        status=status,
        stage_label=stage_label,
        actor_role=actor_role,
        actor_name=actor_name,
        department=dept,
        note=note,
        public_visible=public_visible,
        created_at=ts,
    )
    db.add(sh)

    if notify_message:
        notify(db, req, notify_kind, notify_message)

    return sh


def process(db: Session, *, text: str, channel: str = "web", lang_hint: str | None = None,
            lat: float | None = None, lng: float | None = None, location_text: str = "",
            identifier: str | None = None, anonymous: bool = False, gender: str = "undisclosed",
            assisted_by: str | None = None, supporters: int = 1, audio_path: str | None = None,
            photo_path: str | None = None, country_hint: str | None = None, area_id: int | None = None,
            created_at: datetime | None = None, notify_citizen: bool = True, commit: bool = True) -> dict:
    x = extract(text, lang_hint)
    redacted = privacy.redact(text)

    # --- geo-resolution ---------------------------------------------------------
    area, geo_conf, geo_method = None, 0.0, "none"
    if area_id:
        area, geo_conf, geo_method = db.get(Area, area_id), 1.0, "selected"
    if not area and lat is not None and lng is not None:
        area, dist = gazetteer.nearest_area(db, lat, lng)
        if area:
            geo_conf, geo_method = max(0.5, 1 - dist / 40), "gps"
    if not area:
        a, conf, _ = gazetteer.resolve_text(db, f"{location_text} {text}", country_hint, x.get("location_mentions"))
        if a and conf >= 0.75:
            area, geo_conf, geo_method = a, conf, "place_name"
    country = (area.country_code if area else None) or country_hint or LANG_COUNTRY.get(x["language"], "IN")

    flags = list(x["flags"])
    if not area:
        flags.append("needs_location")
    if x["confidence"] < 0.5 or x["category"] == "other":
        flags.append("low_confidence")

    phone_digits = "".join(c for c in (identifier or "") if c.isdigit())
    phone_last4 = phone_digits[-4:] if len(phone_digits) >= 4 else None

    req = CitizenRequest(
        tracking_id=new_tracking_id(country), channel=channel, language=x["language"], original_text=text,
        redacted_text=redacted, translated_text=privacy.redact(x["translated_text"]), translation_mode=x["translation_mode"],
        audio_path=audio_path, photo_path=photo_path, country_code=country, area_id=area.id if area else None,
        lat=lat if lat is not None else (area.lat if area else None), lng=lng if lng is not None else (area.lng if area else None),
        location_text=location_text or "", category=x["category"], subcategory=x["subcategory"], request_type=x["request_type"],
        severity=x["severity"], affected_people=int(x.get("affected_people") or 1), vulnerable_groups=x["vulnerable_groups"],
        sdg=x["sdg"], confidence=x["confidence"], extraction_mode=x["extraction_mode"],
        household_hash=privacy.household_hash(identifier), phone_last4=phone_last4, anonymous=anonymous, gender=gender, assisted_by=assisted_by,
        supporters=max(1, supporters), flags=flags, proof_count=0, created_at=created_at or datetime.utcnow(),
        updated_at=created_at or datetime.utcnow(),
    )
    req.area = area
    db.add(req)
    db.flush()

    # --- anti-gaming ---------------------------------------------------------------
    if area:
        dup = db.query(CitizenRequest).filter(
            CitizenRequest.household_hash == req.household_hash, CitizenRequest.area_id == area.id,
            CitizenRequest.category == req.category, CitizenRequest.id != req.id,
            CitizenRequest.created_at >= req.created_at - timedelta(days=30)).first()
        if dup:
            req.flags = list(req.flags) + ["repeat_from_same_household"]
        if clustering.detect_coordination(db, req):
            req.flags = list(req.flags) + ["coordinated"]

    blocking = {"needs_location", "low_confidence", "urgent_safety", "abusive"}
    needs_review = bool(blocking & set(req.flags))
    reasons = [f for f in req.flags if f in blocking]
    req.review_reason = ", ".join(reasons)

    cluster = None
    if not {"needs_location", "abusive"} & set(req.flags) and req.category != "other":
        cluster = clustering.find_or_create(db, req)
        if cluster:
            req.cluster_id = cluster.id
            db.flush()
            clustering.recompute(db, cluster)
    initial_status = "needs_review" if needs_review else ("clustered" if cluster else "received")
    req.status = initial_status
    area_name = area.name if area else ""

    # --- record initial lifecycle status history ---------------------------------------------
    record_status_transition(
        db, req,
        status="received",
        stage_label="Received",
        actor_role="citizen",
        actor_name="Citizen",
        department=get_department_for_sector(req.category),
        note=f"Grievance recorded via {channel}. Tracking ID {req.tracking_id} generated.",
        created_at=req.created_at,
    )
    if cluster and initial_status == "clustered":
        record_status_transition(
            db, req,
            status="clustered",
            stage_label="Grouped with Nearby Demands",
            actor_role="system",
            actor_name="AI Demand Aggregator",
            department=get_department_for_sector(req.category),
            note=f"Aggregated with {cluster.unique_households} households in {area_name} facing similar issues.",
            created_at=req.created_at,
        )
    req.status = initial_status

    # --- reply in the citizen's language -----------------------------------------------------
    others = max(0, (cluster.unique_households - 1)) if cluster else 0
    if "urgent_safety" in req.flags:
        kind, msg = "safety", t("safety", req.language, number=EMERGENCY_NUMBERS.get(country, "112"))
    elif "needs_location" in req.flags:
        kind, msg = "ask_location", t("ask_location", req.language)
    elif req.category == "other":
        kind, msg = "clarify", t("clarify", req.language)
    elif cluster and others > 0:
        kind, msg = "ack", t("ack", req.language, tid=req.tracking_id, category=req.category, n=others, area=area_name)
    elif cluster:
        kind, msg = "ack", t("ack_first", req.language, tid=req.tracking_id, category=req.category, area=area_name)
    else:
        kind, msg = "review", t("review", req.language, tid=req.tracking_id)
    if kind in ("ask_location", "clarify"):
        msg = msg + " (" + req.tracking_id + ")"
    if notify_citizen:
        notify(db, req, kind, msg)

    analytics_cache.bump()
    if commit:
        db.commit()
        db.refresh(req)
    return {
        "request": req, "cluster": cluster, "reply": msg, "reply_kind": kind,
        "understanding": {**{k: v for k, v in x.items() if k != "sector_scores"}, "sector_scores": x.get("sector_scores", {}),
                          "redacted_text": redacted, "geo": {"area": area_name, "area_id": area.id if area else None,
                                                             "method": geo_method, "confidence": round(geo_conf, 2)},
                          "flags": req.flags},
    }


def attach_location(db: Session, req: CitizenRequest, area: Area) -> str:
    """Second turn of a conversation: the citizen told us where the problem is."""
    req.area_id, req.area, req.country_code = area.id, area, area.country_code
    req.lat, req.lng = req.lat or area.lat, req.lng or area.lng
    req.flags = [f for f in (req.flags or []) if f != "needs_location"]
    cluster = None
    if req.category != "other":
        cluster = clustering.find_or_create(db, req)
        req.cluster_id = cluster.id
        db.flush()
        clustering.recompute(db, cluster)
    blocking = {"low_confidence", "urgent_safety", "abusive"} & set(req.flags)
    req.status = "needs_review" if blocking else ("clustered" if cluster else "received")
    req.review_reason = ", ".join(sorted(blocking))
    others = max(0, cluster.unique_households - 1) if cluster else 0
    msg = (t("ack", req.language, tid=req.tracking_id, category=req.category, n=others, area=area.name) if cluster and others
           else t("ack_first", req.language, tid=req.tracking_id, category=req.category, area=area.name) if cluster
           else t("review", req.language, tid=req.tracking_id))
    notify(db, req, "ack", msg)
    analytics_cache.bump()
    db.commit()
    return msg


_SPLIT = re.compile(r"(?<=[.!?।॥\n])\s+|\n+")
_SUPPORT = re.compile(r"\((\d{1,4})\)|(\d{1,4})\s*(people|votes|hands|supporters|लोग|మంది|pessoas|abantu)", re.I)


def process_community(db: Session, *, transcript: str, area_id: int | None, facilitator: str | None,
                      lang_hint: str | None = None, default_supporters: int = 1) -> list[dict]:
    """Gram Sabha / ward-meeting mode: one recording or minutes -> many collective demands,
    each weighted by how many people supported it in the meeting."""
    results = []
    for raw in [s.strip() for s in _SPLIT.split(transcript or "") if s and len(s.strip()) > 10]:
        m = _SUPPORT.search(raw)
        sup = int(m.group(1) or m.group(2)) if m else default_supporters
        r = process(db, text=raw, channel="community", lang_hint=lang_hint, area_id=area_id,
                    identifier=f"community:{facilitator}:{area_id}:{raw[:40]}", assisted_by=facilitator,
                    supporters=sup, commit=False)
        results.append(r)
    db.commit()
    return results
