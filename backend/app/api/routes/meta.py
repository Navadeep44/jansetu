from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Area, Country
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
        "countries": [{"code": c.code, "name": c.name, "currency": c.currency, "node_status": c.node_status,
                       "languages": c.languages} for c in db.query(Country).all()],
        "capabilities": {
            "llm": settings.llm_enabled, "llm_provider": settings.llm_provider if settings.llm_enabled else "offline rules",
            "asr": settings.asr_provider, "bhashini": bhashini.enabled(),
            "telegram": bool(settings.telegram_bot_token), "whatsapp": bool(settings.whatsapp_token),
            "ivr": bool(settings.twilio_account_sid), "k_anonymity": settings.k_anonymity, "dp_epsilon": settings.dp_epsilon,
        },
    }


@router.get("/areas")
def areas(country: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Area)
    if country:
        q = q.filter(Area.country_code == country)
    return [area_out(a) for a in q.order_by(Area.country_code, Area.district, Area.name).all()]
