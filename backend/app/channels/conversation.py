"""Channel-agnostic conversation engine used by WhatsApp, Telegram, SMS, IVR and the
in-app channel simulator. Handles: new request, follow-up location, status check, and
citizen verification of closure (YES / NO) - all in the citizen's language."""
import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.i18n import NO_WORDS, YES_WORDS, t
from app.models import CitizenRequest
from app.services import pipeline, privacy
from app.services.ai.language import detect_language
from app.services.geo import gazetteer

WELCOME = {
    "en": "Namaste! This is JanSetu. Tell us, by voice or text in your own language, what your area needs (water, road, electricity, health, school, drains). Send 'status <ID>' to track.",
    "hi": "नमस्ते! यह जनसेतु है। अपनी भाषा में बोलकर या लिखकर बताइए कि आपके इलाके को क्या चाहिए (पानी, सड़क, बिजली, स्वास्थ्य, स्कूल, नाली)।",
    "te": "నమస్కారం! ఇది జనసేతు. మీ ప్రాంతానికి ఏమి కావాలో (నీరు, రోడ్డు, కరెంటు, ఆరోగ్యం, బడి, కాలువ) మీ భాషలో మాట్లాడి లేదా రాసి చెప్పండి.",
    "pt": "Olá! Aqui é o JanSetu. Conte, por voz ou texto, o que o seu bairro precisa (água, rua, energia, saúde, escola, esgoto).",
    "zu": "Sawubona! Lena yi-JanSetu. Sitshele ngezwi noma ngombhalo ukuthi indawo yakho idingani (amanzi, umgwaqo, ugesi, ezempilo, isikole, indle).",
}
_STATUS = re.compile(r"(status|स्थिति|స్థితి|situação|isimo|статус)\s*[:#]?\s*(JS-[A-Z]{2}-[A-Z0-9]{6})", re.I)
_TID = re.compile(r"JS-[A-Z]{2}-[A-Z0-9]{6}", re.I)


def _latest_for(db: Session, sender_hash: str, statuses: tuple) -> CitizenRequest | None:
    return (db.query(CitizenRequest).filter(CitizenRequest.household_hash == sender_hash, CitizenRequest.status.in_(statuses))
            .order_by(CitizenRequest.created_at.desc()).first())


def status_text(req: CitizenRequest) -> str:
    parts = [f"{req.tracking_id}: {req.status.replace('_', ' ')}"]
    if req.cluster:
        parts.append(f"{req.cluster.unique_households} households share this need in {req.area.name if req.area else ''}")
    return ". ".join(parts) + "."


def verify(db: Session, req: CitizenRequest, fixed: bool, rating: int | None = None) -> str:
    req.citizen_verified = fixed
    if rating:
        req.citizen_rating = rating
    req.updated_at = datetime.utcnow()
    if fixed:
        req.status, req.closed_at = "closed", datetime.utcnow()
        msg = t("closed", req.language, tid=req.tracking_id)
    else:
        req.status, req.closure_flag = "reopened", req.closure_flag or "citizen_disputed"
        msg = t("reopened", req.language, tid=req.tracking_id)
    pipeline.notify(db, req, "verification", msg)
    db.commit()
    return msg


def handle(db: Session, *, channel: str, sender: str, text: str = "", lang_hint: str | None = None,
           lat: float | None = None, lng: float | None = None, audio_path: str | None = None) -> dict:
    sender_hash = privacy.household_hash(f"{channel}:{sender}")
    body = (text or "").strip()
    lang = detect_language(body, lang_hint)[0] if body else (lang_hint or "en")

    if body.lower() in ("/start", "hi", "hello", "start", "menu", "नमस्ते", "olá", "ola", "sawubona"):
        return {"reply": WELCOME.get(lang, WELCOME["en"]), "kind": "welcome"}

    m = _STATUS.search(body) or (_TID.fullmatch(body) and _TID.search(body))
    if m:
        tid = (m.group(2) if m.lastindex and m.lastindex >= 2 else m.group(0)).upper()
        req = db.query(CitizenRequest).filter_by(tracking_id=tid).first()
        return {"reply": status_text(req) if req else f"{tid} not found.", "kind": "status", "tracking_id": tid}

    word = body.lower().strip(" .!")
    if word in YES_WORDS or word in NO_WORDS:
        req = _latest_for(db, sender_hash, ("resolved_pending_verification",))
        if req:
            return {"reply": verify(db, req, word in YES_WORDS), "kind": "verification", "tracking_id": req.tracking_id}

    pending = _latest_for(db, sender_hash, ("needs_review",))
    if pending and "needs_location" in (pending.flags or []):
        area = None
        if lat is not None and lng is not None:
            area, _ = gazetteer.nearest_area(db, lat, lng)
        elif body:
            a, conf, _ = gazetteer.resolve_text(db, body)
            area = a if conf >= 0.75 else None
        if area:
            msg = pipeline.attach_location(db, pending, area)
            return {"reply": msg, "kind": "ack", "tracking_id": pending.tracking_id}
        if not body:
            return {"reply": t("ask_location", pending.language), "kind": "ask_location", "tracking_id": pending.tracking_id}

    if not body and lat is not None:
        return {"reply": t("clarify", lang), "kind": "clarify"}
    res = pipeline.process(db, text=body, channel=channel, lang_hint=lang_hint, lat=lat, lng=lng,
                           identifier=f"{channel}:{sender}", audio_path=audio_path)
    req = res["request"]
    return {"reply": res["reply"], "kind": res["reply_kind"], "tracking_id": req.tracking_id,
            "understanding": res["understanding"]}
