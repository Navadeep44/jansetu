"""Provider-agnostic LLM access (DPG indicator 4: platform independence).
Supports any OpenAI-compatible endpoint (OpenAI, Groq, Together, Ollama, vLLM, Sarvam),
Anthropic and Google Gemini. Returns None on any failure so callers fall back to rules."""
import json
import logging
import re

import httpx

from app.core.config import settings

log = logging.getLogger("jansetu.llm")


def _extract_json(text: str):
    if not text:
        return None
    m = re.search(r"\{.*\}|\[.*\]", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def chat(system: str, user: str, json_mode: bool = False, max_tokens: int = 800, timeout: float = 30.0) -> str | None:
    if not settings.llm_enabled:
        return None
    try:
        p = settings.llm_provider
        if p == "anthropic":
            r = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": settings.llm_api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": settings.llm_model, "max_tokens": max_tokens, "system": system,
                      "messages": [{"role": "user", "content": user}]},
                timeout=timeout,
            )
            r.raise_for_status()
            return "".join(b.get("text", "") for b in r.json().get("content", []))
        if p == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.llm_model}:generateContent?key={settings.llm_api_key}"
            body = {"systemInstruction": {"parts": [{"text": system}]},
                    "contents": [{"role": "user", "parts": [{"text": user}]}],
                    "generationConfig": {"maxOutputTokens": max_tokens}}
            if json_mode:
                body["generationConfig"]["responseMimeType"] = "application/json"
            r = httpx.post(url, json=body, timeout=timeout)
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        # default: OpenAI-compatible
        body = {"model": settings.llm_model, "max_tokens": max_tokens,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        headers = {"Authorization": f"Bearer {settings.llm_api_key}"} if settings.llm_api_key else {}
        r = httpx.post(settings.llm_base_url.rstrip("/") + "/chat/completions", json=body, headers=headers, timeout=timeout)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:  # never break the citizen flow because an API failed
        log.warning("LLM call failed (%s); falling back to offline engine", e)
        return None


def chat_json(system: str, user: str, max_tokens: int = 800):
    return _extract_json(chat(system, user, json_mode=True, max_tokens=max_tokens) or "")
