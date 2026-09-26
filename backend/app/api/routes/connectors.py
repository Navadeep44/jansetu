"""Aggregating fragmented systems: bulk import from existing grievance portals and open datasets
(e.g. São Paulo SP156 / Rio 1746 open data CSVs, CPGRAMS exports, municipal call-centre logs,
or any Open311 GeoReport v2 endpoint)."""
import csv
import io

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import GOV_ROLES, require
from app.services import pipeline

router = APIRouter(prefix="/connectors", tags=["connectors"])


@router.post("/csv")
async def import_csv(file: UploadFile = File(...), text_column: str = Form("description"), lat_column: str = Form(""),
                     lng_column: str = Form(""), location_column: str = Form(""), language: str | None = Form(None),
                     source: str = Form("portal"), limit: int = Form(500), role: str = Depends(require(*GOV_ROLES)),
                     db: Session = Depends(get_db)):
    raw = (await file.read()).decode("utf-8-sig", errors="replace")
    sample = raw[:2048]
    delim = ";" if sample.count(";") > sample.count(",") else ","
    reader = csv.DictReader(io.StringIO(raw), delimiter=delim)
    if text_column not in (reader.fieldnames or []):
        raise HTTPException(400, f"Column '{text_column}' not found. Columns: {reader.fieldnames}")
    created, skipped = 0, 0
    for i, row in enumerate(reader):
        if i >= limit:
            break
        text = (row.get(text_column) or "").strip()
        if len(text) < 5:
            skipped += 1
            continue
        def _f(col):
            try:
                return float(str(row.get(col)).replace(",", ".")) if col and row.get(col) else None
            except ValueError:
                return None
        pipeline.process(db, text=text, channel="import", lang_hint=language, lat=_f(lat_column), lng=_f(lng_column),
                         location_text=row.get(location_column, "") if location_column else "",
                         identifier=f"{source}:{i}:{text[:30]}", notify_citizen=False, commit=False)
        created += 1
    db.commit()
    return {"imported": created, "skipped": skipped, "source": source}


class Open311Pull(BaseModel):
    url: str
    limit: int = 200


@router.post("/open311/pull")
def pull_open311(body: Open311Pull, role: str = Depends(require(*GOV_ROLES)), db: Session = Depends(get_db)):
    try:
        items = httpx.get(body.url, timeout=30).json()
    except Exception as e:
        raise HTTPException(502, f"Could not fetch Open311 feed: {e}")
    n = 0
    for it in items[: body.limit]:
        desc = it.get("description") or it.get("service_name")
        if not desc:
            continue
        pipeline.process(db, text=desc, channel="import", lat=it.get("lat"), lng=it.get("long"),
                         location_text=it.get("address") or "", identifier=f"open311:{it.get('service_request_id')}",
                         notify_citizen=False, commit=False)
        n += 1
    db.commit()
    return {"imported": n}
