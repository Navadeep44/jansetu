"""Natural-language Q&A, policy briefs, impact, and Gram Sabha plan export."""
import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import effective_scope, get_current_user_claims, require_officer
from app.schemas.inputs import QueryIn
from app.services import briefs, gp_plan, impact, nlquery

router = APIRouter(tags=["insights"])


@router.post("/query")
def ask(body: QueryIn, claims: dict = Depends(require_officer), db: Session = Depends(get_db)):
    res = nlquery.answer(db, body.question)
    sc = effective_scope(claims)
    if sc["locked"]:  # officers only get answers about their own area
        res["rows"] = [r for r in res["rows"] if (not sc["state"] or r.get("state") in (None, sc["state"]))
                       and (not sc["district"] or r.get("district") in (None, sc["district"]))]
        res["scope"] = sc
    return res


@router.get("/briefs")
def brief(state: str | None = None, district: str | None = None, language: str = "en", country: str | None = None,
          claims: dict = Depends(require_officer), db: Session = Depends(get_db)):
    sc = effective_scope(claims, state, district)
    return briefs.build(db, sc["state"], sc["district"], language)


@router.get("/impact/projects")
def impact_projects(state: str | None = None, district: str | None = None, claims: dict = Depends(get_current_user_claims),
                    db: Session = Depends(get_db)):
    sc = effective_scope(claims, state, district)
    return [p for p in impact.project_impacts(db) if (not sc["state"] or p["state"] == sc["state"])
            and (not sc["district"] or p["district"] == sc["district"])]


@router.get("/impact/kpis")
def impact_kpis(country: str | None = None, db: Session = Depends(get_db)):
    return impact.dpi_kpis(db, None)


@router.get("/plans/gram-sabha")
def gram_sabha_plan(district: str = "Adilabad", area: str | None = None, claims: dict = Depends(require_officer),
                    db: Session = Depends(get_db)):
    """Draft Viksit Gram Panchayat Plan items built from citizen demand, ready to table in the Gram Sabha
    and upload to the Yuktdhara planning portal."""
    district = effective_scope(claims, None, district)["district"] or district
    return gp_plan.build(db, district, area)


@router.get("/plans/gram-sabha.csv")
def gram_sabha_csv(district: str = "Adilabad", area: str | None = None, db: Session = Depends(get_db)):
    plan = gp_plan.build(db, district, area)
    cols = ["priority", "area", "sector", "work", "scheme", "estimated_cost_inr", "beneficiaries", "households_asked",
            "need_gap_index", "silent_zone", "lat", "lng", "evidence"]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for it in plan["items"]:
        w.writerow(it)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename=gram-sabha-plan-{district.lower()}.csv"})
