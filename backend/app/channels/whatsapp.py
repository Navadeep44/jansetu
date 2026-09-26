"""WhatsApp Cloud API adapter (Meta). Configure the webhook URL
https://<your-host>/api/channels/whatsapp/webhook with verify token WHATSAPP_VERIFY_TOKEN."""
import logging
from pathlib import Path

import httpx

from app.core.config import settings
from app.core.database import SessionLocal
from app.channels import conversation
from app.services.ai import speech

log = logging.getLogger("jansetu.whatsapp")
GRAPH = "https://graph.facebook.com/v20.0"


def send(to: str, text: str):
    if not (settings.whatsapp_token and settings.whatsapp_phone_number_id):
        return
    httpx.post(f"{GRAPH}/{settings.whatsapp_phone_number_id}/messages",
               headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
               json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}}, timeout=20)


def _download_media(media_id: str) -> bytes | None:
    h = {"Authorization": f"Bearer {settings.whatsapp_token}"}
    meta = httpx.get(f"{GRAPH}/{media_id}", headers=h, timeout=20).json()
    if "url" not in meta:
        return None
    return httpx.get(meta["url"], headers=h, timeout=60).content


def handle_payload(payload: dict) -> list[dict]:
    outs = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            for msg in change.get("value", {}).get("messages", []):
                sender = msg.get("from", "")
                text, lat, lng, audio_path = "", None, None, None
                if msg.get("type") == "text":
                    text = msg["text"]["body"]
                elif msg.get("type") == "location":
                    lat, lng = msg["location"]["latitude"], msg["location"]["longitude"]
                elif msg.get("type") in ("audio", "voice"):
                    data = _download_media(msg[msg["type"]]["id"]) if settings.whatsapp_token else None
                    if data:
                        Path("media").mkdir(exist_ok=True)
                        audio_path = f"media/wa_{msg['id']}.ogg"
                        Path(audio_path).write_bytes(data)
                        text = speech.transcribe(data, "voice.ogg")[0] or ""
                db = SessionLocal()
                try:
                    out = conversation.handle(db, channel="whatsapp", sender=sender, text=text, lat=lat, lng=lng, audio_path=audio_path)
                finally:
                    db.close()
                send(sender, out["reply"])
                outs.append(out)
    return outs
