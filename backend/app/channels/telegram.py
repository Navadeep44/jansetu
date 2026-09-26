"""Telegram bot adapter (text, voice notes, location). Works via webhook
(POST /api/channels/telegram/webhook) or long-polling for local demos:

    TELEGRAM_BOT_TOKEN=... python -m app.channels.telegram"""
import logging
import time
from pathlib import Path

import httpx

from app.core.config import settings
from app.core.database import SessionLocal
from app.channels import conversation
from app.services.ai import speech

log = logging.getLogger("jansetu.telegram")
API = "https://api.telegram.org/bot{token}/{method}"
MEDIA = Path("media")


def _call(method: str, **kw):
    return httpx.post(API.format(token=settings.telegram_bot_token, method=method), timeout=30, **kw).json()


def send(chat_id, text: str):
    if settings.telegram_bot_token:
        _call("sendMessage", json={"chat_id": chat_id, "text": text})


def handle_update(update: dict) -> dict | None:
    msg = update.get("message") or update.get("edited_message")
    if not msg:
        return None
    chat_id = msg["chat"]["id"]
    text, lat, lng, audio_path = msg.get("text", ""), None, None, None
    lang_hint = (msg.get("from") or {}).get("language_code")
    if msg.get("location"):
        lat, lng = msg["location"]["latitude"], msg["location"]["longitude"]
    voice = msg.get("voice") or msg.get("audio")
    if voice and settings.telegram_bot_token:
        info = _call("getFile", json={"file_id": voice["file_id"]})
        fp = info.get("result", {}).get("file_path")
        if fp:
            data = httpx.get(f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{fp}", timeout=60).content
            MEDIA.mkdir(exist_ok=True)
            audio_path = str(MEDIA / f"tg_{voice['file_unique_id']}.ogg")
            Path(audio_path).write_bytes(data)
            transcript, _ = speech.transcribe(data, "voice.ogg", lang_hint)
            text = transcript or text
            if not text:
                send(chat_id, "Voice received. Speech recognition is not configured on this node, so an officer will listen to it. You can also type your message.")
    db = SessionLocal()
    try:
        out = conversation.handle(db, channel="telegram", sender=str(chat_id), text=text, lang_hint=lang_hint,
                                  lat=lat, lng=lng, audio_path=audio_path)
    finally:
        db.close()
    send(chat_id, out["reply"])
    return out


def poll():
    if not settings.telegram_bot_token:
        raise SystemExit("Set TELEGRAM_BOT_TOKEN in backend/.env first (create a bot with @BotFather).")
    offset = None
    log.warning("JanSetu Telegram bot polling... (Ctrl+C to stop)")
    while True:
        try:
            res = _call("getUpdates", json={"timeout": 25, "offset": offset})
            for u in res.get("result", []):
                offset = u["update_id"] + 1
                handle_update(u)
        except Exception as e:  # keep the demo bot alive
            log.warning("poll error: %s", e)
            time.sleep(3)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    poll()
