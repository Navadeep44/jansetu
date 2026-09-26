"""Natural-language Q&A, policy briefs, impact, BRICS federated exchange."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.inputs import QueryIn
from app.services import briefs, brics, impact, nlquery

router = APIRouter(tags=["insights"])


@router.post("/query")
def ask(body: QueryIn, db: Session = Depends(get_db)):
    return nlquery.answer(db, body.question)


@router.get("/briefs")
def brief(country: str = "IN", district: str | None = None, language: str = "en", db: Session = Depends(get_db)):
    return briefs.build(db, country, district, language)


@router.get("/impact/projects")
def impact_projects(country: str | None = None, db: Session = Depends(get_db)):
    return impact.project_impacts(db, country)


@router.get("/impact/kpis")
def impact_kpis(country: str | None = None, db: Session = Depends(get_db)):
    return impact.dpi_kpis(db, country)


@router.get("/brics/exchange")
def exchange(db: Session = Depends(get_db)):
    return brics.exchange(db)


@router.get("/brics/node/{country}")
def node(country: str, db: Session = Depends(get_db)):
    return brics.node_aggregate(db, country.upper())
