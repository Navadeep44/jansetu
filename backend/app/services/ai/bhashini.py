"""Client for Bhashini (India's National Language Translation Mission) ULCA pipeline API.
Free for government / DPG use: ASR, NMT and TTS across 22 scheduled Indian languages.
Docs: https://dibd-bhashini.gitbook.io/bhashini-apis"""
import base64
import logging

import httpx

from app.core.config import settings

log = logging.getLogger("jansetu.bhashini")
CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
INDIC = {"hi", "te", "or", "ta", "bn", "mr", "gu", "kn", "ml", "pa", "as", "ur", "en"}


def enabled() -> bool:
    return bool(settings.bhashini_user_id and settings.bhashini_api_key)


def _pipeline(task: dict):
    r = httpx.post(
        CONFIG_URL,
        headers={"userID": settings.bhashini_user_id, "ulcaApiKey": settings.bhashini_api_key},
        json={"pipelineTasks": [task], "pipelineRequestConfig": {"pipelineId": settings.bhashini_pipeline_id}},
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    service_id = data["pipelineResponseConfig"][0]["config"][0]["serviceId"]
    ep = data["pipelineInferenceAPIEndPoint"]
    return service_id, ep["callbackUrl"], ep["inferenceApiKey"]["name"], ep["inferenceApiKey"]["value"]


def asr(audio_bytes: bytes, lang: str, audio_format: str = "wav") -> str | None:
    if not enabled() or lang not in INDIC:
        return None
    try:
        sid, url, key_name, key_val = _pipeline({"taskType": "asr", "config": {"language": {"sourceLanguage": lang}}})
        r = httpx.post(url, headers={key_name: key_val}, timeout=60, json={
            "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": lang}, "serviceId": sid,
                                                             "audioFormat": audio_format, "samplingRate": 16000}}],
            "inputData": {"audio": [{"audioContent": base64.b64encode(audio_bytes).decode()}]},
        })
        r.raise_for_status()
        return r.json()["pipelineResponse"][0]["output"][0]["source"]
    except Exception as e:
        log.warning("Bhashini ASR failed: %s", e)
        return None


def translate(text: str, src: str, tgt: str = "en") -> str | None:
    if not enabled() or src not in INDIC or src == tgt:
        return None
    try:
        cfg = {"language": {"sourceLanguage": src, "targetLanguage": tgt}}
        sid, url, key_name, key_val = _pipeline({"taskType": "translation", "config": cfg})
        r = httpx.post(url, headers={key_name: key_val}, timeout=30, json={
            "pipelineTasks": [{"taskType": "translation", "config": {**cfg, "serviceId": sid}}],
            "inputData": {"input": [{"source": text}]},
        })
        r.raise_for_status()
        return r.json()["pipelineResponse"][0]["output"][0]["target"]
    except Exception as e:
        log.warning("Bhashini translation failed: %s", e)
        return None
