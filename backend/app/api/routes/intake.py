"""Citizen intake: web/PWA, assisted (CSC / ASHA / community worker), community meetings, voice."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import ProofUpload
from app.schemas.inputs import CommunityIntake, PreviewIn, TextIntake
from app.schemas.serializers import cluster_out, request_out
from app.services import pipeline
from app.services.ai import speech
from app.services.ai.extraction import extract

router = APIRouter(prefix="/intake", tags=["intake"])
MEDIA = Path("media")


def _result(res: dict) -> dict:
    return {"tracking_id": res["request"].tracking_id, "reply": res["reply"], "reply_kind": res["reply_kind"],
            "request": request_out(res["request"]), "cluster": cluster_out(res["cluster"]) if res["cluster"] else None,
            "understanding": res["understanding"]}


@router.post("/preview")
def preview(body: PreviewIn):
    """Live 'what the AI understood' while the citizen types or speaks (nothing is stored)."""
    return extract(body.text, body.language)


@router.post("/text")
def intake_text(body: TextIntake, db: Session = Depends(get_db)):
    res = pipeline.process(db, text=body.text, channel=body.channel, lang_hint=body.language, lat=body.lat, lng=body.lng,
                           location_text=body.location_text, identifier=body.phone, anonymous=body.anonymous,
                           gender=body.gender, assisted_by=body.assisted_by, area_id=body.area_id, country_hint=body.country)
    return _result(res)


@router.post("/form")
async def intake_form(
    text: str = Form(""), language: str | None = Form(None), channel: str = Form("web"),
    lat: float | None = Form(None), lng: float | None = Form(None), location_text: str = Form(""),
    area_id: int | None = Form(None), phone: str | None = Form(None), anonymous: bool = Form(False),
    gender: str = Form("undisclosed"), assisted_by: str | None = Form(None),
    audio: UploadFile | None = File(None), photo: UploadFile | None = File(None),
    photos: list[UploadFile] = File(default=[]), db: Session = Depends(get_db),
):
    """Multipart intake with optional voice recording and multiple photo evidence (up to 5)."""
    MEDIA.mkdir(exist_ok=True)
    audio_path = photo_path = None
    asr_mode = "browser" if text else "none"
    if audio is not None:
        data = await audio.read()
        ext = (audio.filename or "voice.webm").rsplit(".", 1)[-1]
        audio_path = str(MEDIA / f"{uuid.uuid4().hex}.{ext}")
        Path(audio_path).write_bytes(data)
        if not text:
            transcript, asr_mode = speech.transcribe(data, audio.filename or "voice.webm", language)
            text = transcript or ""

    # Aggregate photo files
    all_photos = []
    if photo is not None:
        all_photos.append(photo)
    for p in (photos or []):
        if p not in all_photos:
            all_photos.append(p)

    saved_photos = []
    for p in all_photos[:5]:
        pdata = await p.read()
        if pdata:
            ext = (p.filename or "photo.jpg").rsplit(".", 1)[-1]
            p_path = str(MEDIA / f"{uuid.uuid4().hex}.{ext}")
            Path(p_path).write_bytes(pdata)
            saved_photos.append((p_path, p.filename or "photo.jpg", len(pdata)))

    if saved_photos:
        photo_path = saved_photos[0][0]

    if not text:
        text = "[voice message awaiting transcription]"
    res = pipeline.process(db, text=text, channel=channel, lang_hint=language, lat=lat, lng=lng, location_text=location_text,
                           identifier=phone, anonymous=anonymous, gender=gender, assisted_by=assisted_by, area_id=area_id,
                           audio_path=audio_path, photo_path=photo_path)

    # Save additional photos as ProofUpload records linked to the request
    req = res["request"]
    for p_path, p_name, p_size in saved_photos[1:]:
        proof = ProofUpload(
            request_id=req.id,
            officer_name="Citizen Attachment",
            department=pipeline.get_department_for_sector(req.category),
            file_url=p_path,
            file_name=p_name,
            file_size=p_size,
            file_type="photo",
        )
        db.add(proof)
    if len(saved_photos) > 1:
        db.commit()

    out = _result(res)
    out["asr_mode"] = asr_mode
    return out


@router.post("/community")
def intake_community(body: CommunityIntake, db: Session = Depends(get_db)):
    """Gram Sabha / ward meeting: one transcript -> many collective demands with supporter counts."""
    results = pipeline.process_community(db, transcript=body.transcript, area_id=body.area_id, facilitator=body.facilitator,
                                         lang_hint=body.language, default_supporters=body.default_supporters)
    return {"count": len(results), "demands": [_result(r) for r in results]}
