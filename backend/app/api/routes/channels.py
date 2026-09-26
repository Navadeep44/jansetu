"""Messaging channel webhooks + an in-app simulator (so the demo works with zero setup)."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.channels import conversation, telegram, twilio_voice, whatsapp
from app.core.config import settings
from app.core.database import get_db
from app.schemas.inputs import SimulateIn

router = APIRouter(prefix="/channels", tags=["channels"])


@router.post("/simulate")
def simulate(body: SimulateIn, db: Session = Depends(get_db)):
    """Same conversation engine as the real WhatsApp / Telegram / SMS bots."""
    return conversation.handle(db, channel=body.channel, sender=body.sender, text=body.text, lang_hint=body.language,
                               lat=body.lat, lng=body.lng)


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    out = telegram.handle_update(await request.json())
    return {"ok": True, "handled": bool(out)}


@router.get("/whatsapp/webhook")
def whatsapp_verify(mode: str = Query(None, alias="hub.mode"), token: str = Query(None, alias="hub.verify_token"),
                    challenge: str = Query(None, alias="hub.challenge")):
    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        return PlainTextResponse(challenge or "")
    raise HTTPException(403, "verification failed")


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    outs = whatsapp.handle_payload(await request.json())
    return {"ok": True, "messages": len(outs)}


@router.post("/ivr/voice")
def ivr_voice():
    return Response(twilio_voice.menu(), media_type="application/xml")


@router.post("/ivr/language")
async def ivr_language(request: Request):
    form = dict(await request.form())
    return Response(twilio_voice.record_prompt(form.get("Digits", "3")), media_type="application/xml")


@router.post("/ivr/recording")
async def ivr_recording(request: Request, lang: str = "en"):
    form = dict(await request.form())
    return Response(twilio_voice.handle_recording(form, lang), media_type="application/xml")


@router.post("/sms")
async def sms(request: Request):
    form = dict(await request.form())
    return Response(twilio_voice.handle_sms(form), media_type="application/xml")
