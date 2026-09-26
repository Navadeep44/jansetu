"""Speech-to-text for voice notes and IVR recordings.
Order: Bhashini (Indic) -> OpenAI-compatible Whisper -> None (goes to the human transcription queue).
The web app additionally uses the browser's on-device speech recognition, which needs no server key."""
import logging

import httpx

from app.core.config import settings
from app.services.ai import bhashini

log = logging.getLogger("jansetu.asr")


def transcribe(audio: bytes, filename: str = "audio.ogg", lang_hint: str | None = None) -> tuple[str | None, str]:
    if lang_hint and bhashini.enabled():
        fmt = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
        text = bhashini.asr(audio, lang_hint, fmt)
        if text:
            return text, "bhashini"
    if settings.asr_provider == "openai" and settings.llm_api_key:
        try:
            data = {"model": settings.asr_model}
            if lang_hint and len(lang_hint) == 2:
                data["language"] = lang_hint
            r = httpx.post(
                settings.llm_base_url.rstrip("/") + "/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                files={"file": (filename, audio)}, data=data, timeout=90,
            )
            r.raise_for_status()
            return r.json().get("text"), "whisper"
        except Exception as e:
            log.warning("Whisper transcription failed: %s", e)
    return None, "unavailable"
