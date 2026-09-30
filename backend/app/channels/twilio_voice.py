"""IVR + SMS for feature phones (no internet needed) via Twilio-compatible TwiML.
Point the phone number's Voice webhook to /api/channels/ivr/voice and SMS webhook to /api/channels/sms.
Flow: choose language -> speak your problem after the beep -> recording is transcribed ->
same pipeline as every other channel -> tracking ID read back and sent by SMS."""
from xml.sax.saxutils import escape

import httpx

from app.core.config import settings
from app.core.database import SessionLocal
from app.channels import conversation
from app.services.ai import speech

IVR_LANGS = {"1": ("hi", "hi-IN"), "2": ("te", "te-IN"), "3": ("en", "en-IN"), "4": ("or", "or-IN")}
PROMPTS = {
    "hi": "कृपया बीप के बाद अपनी समस्या बताइए।", "te": "బీప్ తర్వాత మీ సమస్యను చెప్పండి.",
    "en": "Please describe the problem in your area after the beep.", "or": "ବିପ୍ ପରେ ଆପଣଙ୍କ ସମସ୍ୟା କୁହନ୍ତୁ।",
}


def twiml(inner: str) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?><Response>{inner}</Response>'


def menu() -> str:
    base = settings.public_base_url.rstrip("/")
    return twiml(f'<Gather numDigits="1" action="{base}/api/channels/ivr/language" method="POST">'
                 '<Say language="en-IN">Welcome to JanSetu. For Hindi press 1. Telugu 2. English 3. Odia 4.</Say>'
                 '</Gather><Redirect>' + base + '/api/channels/ivr/voice</Redirect>')


def record_prompt(digit: str) -> str:
    lang, tag = IVR_LANGS.get(digit, ("en", "en-IN"))
    base = settings.public_base_url.rstrip("/")
    return twiml(f'<Say language="{tag}">{escape(PROMPTS[lang])}</Say>'
                 f'<Record maxLength="90" playBeep="true" action="{base}/api/channels/ivr/recording?lang={lang}" method="POST"/>')


def handle_recording(form: dict, lang: str) -> str:
    url, caller = form.get("RecordingUrl"), form.get("From", "unknown")
    text = ""
    if url:
        auth = (settings.twilio_account_sid, settings.twilio_auth_token) if settings.twilio_account_sid else None
        try:
            audio = httpx.get(url + ".wav", auth=auth, timeout=60).content
            text = speech.transcribe(audio, "ivr.wav", lang)[0] or ""
        except Exception:
            text = ""
    db = SessionLocal()
    try:
        if text:
            out = conversation.handle(db, channel="ivr", sender=caller, text=text, lang_hint=lang, audio_path=url)
            reply = out["reply"]
        else:
            from app.services import pipeline
            res = pipeline.process(db, text="[voice message awaiting transcription]", channel="ivr", lang_hint=lang,
                                   identifier=f"ivr:{caller}", audio_path=url)
            reply = res["reply"]
    finally:
        db.close()
    tag = dict(IVR_LANGS.values()).get(lang, "en-IN")
    return twiml(f'<Say language="{tag}">{escape(reply)}</Say><Hangup/>')


def handle_sms(form: dict) -> str:
    db = SessionLocal()
    try:
        out = conversation.handle(db, channel="sms", sender=form.get("From", "unknown"), text=form.get("Body", ""))
    finally:
        db.close()
    return twiml(f"<Message>{escape(out['reply'])}</Message>")
