from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Area
from app.schemas.serializers import area_out
from app.services.ai import bhashini
from app.services.ai.language import LANGUAGES, SPEECH_TAGS
from app.services.ai.lexicon import SECTORS

router = APIRouter(tags=["meta"])


@router.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    return {
        "sectors": {k: {"label": v["label"], "sdg": v["sdg"]} for k, v in SECTORS.items()},
        "languages": LANGUAGES, "speech_tags": SPEECH_TAGS,
        "states": sorted({a.state for a in db.query(Area).all()}),
        "districts": sorted({(a.state, a.district) for a in db.query(Area).all()}),
        "capabilities": {
            "llm": settings.llm_enabled, "llm_provider": settings.llm_provider if settings.llm_enabled else "offline rules",
            "asr": settings.asr_provider, "bhashini": bhashini.enabled(),
            "telegram": bool(settings.telegram_bot_token), "whatsapp": bool(settings.whatsapp_token),
            "ivr": bool(settings.twilio_account_sid), "k_anonymity": settings.k_anonymity, "dp_epsilon": settings.dp_epsilon,
        },
    }


@router.get("/areas")
def areas(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Area)
    if state:
        q = q.filter(Area.state == state)
    return [area_out(a) for a in q.order_by(Area.state, Area.district, Area.name).all()]
