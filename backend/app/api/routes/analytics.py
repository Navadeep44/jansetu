from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Area, CitizenRequest, DemandCluster, Project
from app.services import analytics_cache, scoring, trends

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _weights(demand: float | None, deficit: float | None, vulnerability: float | None, severity: float | None, coverage: float | None):
    w = {"demand": demand, "deficit": deficit, "vulnerability": vulnerability, "severity": severity, "coverage": coverage}
    return {k: v for k, v in w.items() if v is not None}


@router.get("/overview")
def overview(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    def build():
        q = db.query(CitizenRequest)
        if state:
            q = q.join(Area, CitizenRequest.area_id == Area.id).filter(Area.state == state)
        total = q.count()
        hh = q.with_entities(func.count(func.distinct(CitizenRequest.household_hash))).scalar()
        langs = q.with_entities(func.count(func.distinct(CitizenRequest.language))).scalar()
        ch = dict(q.with_entities(CitizenRequest.channel, func.count()).group_by(CitizenRequest.channel).all())
        st = dict(q.with_entities(CitizenRequest.status, func.count()).group_by(CitizenRequest.status).all())
        cat = dict(q.with_entities(CitizenRequest.category, func.count()).group_by(CitizenRequest.category).all())
        cq = db.query(DemandCluster)
        pq = db.query(Project).filter(Project.source == "recommended")
        if state:
            cq = cq.join(Area, DemandCluster.area_id == Area.id).filter(Area.state == state)
            pq = pq.join(Area, Project.area_id == Area.id).filter(Area.state == state)
        silent = scoring.silent_zones(db, state=state)
        al = scoring.alignment(db, state=state)
        nat = scoring.alignment(db, national=True).get("India", {})
        return {
            "total_requests": total, "unique_households": hh, "languages": langs, "channels": ch, "status": st,
            "categories": cat, "clusters": cq.count(), "recommended_projects": pq.count(),
            "approved_projects": pq.filter(Project.status.in_(["approved", "in_progress"])).count(),
            "silent_zones": len(silent), "silent_areas": len({r["area_id"] for r in silent}),
            "voice_share": round((ch.get("ivr", 0) + ch.get("community", 0)) / max(total, 1), 3),
            "alignment": {c: {"alignment_score": v["alignment_score"], "share_to_below_median_need": v["share_to_below_median_need"],
                              "plan_budget": v["plan_budget_local"]} for c, v in al.items()},
            "alignment_national": {"alignment_score": nat.get("alignment_score", 0), "plan_budget": nat.get("plan_budget_local", 0),
                                   "share_to_below_median_need": nat.get("share_to_below_median_need", 0)},
            "states": len({a.state for a in db.query(Area).all()}),
            "districts": len({(a.state, a.district) for a in db.query(Area).all()}),
            "alerts": len(trends.alerts(db, state=state)),
            "needs_review": st.get("needs_review", 0),
        }
    return analytics_cache.cached(("overview", state), build)


@router.get("/states")
def states(db: Session = Depends(get_db)):
    """National view for policymakers: one card per state."""
    return analytics_cache.cached(("states",), lambda: scoring.states(db))


@router.get("/need-gap")
def need_gap(country: str | None = None, sector: str | None = None, state: str | None = None, district: str | None = None,
             w_demand: float | None = None, w_deficit: float | None = None, w_vulnerability: float | None = None,
             w_severity: float | None = None, w_coverage: float | None = None, limit: int = 100, db: Session = Depends(get_db)):
    rows = scoring.need_gap(db, _weights(w_demand, w_deficit, w_vulnerability, w_severity, w_coverage))
    rows = [r for r in rows if (not country or r["country"] == country) and (not sector or sector == "all" or r["sector"] == sector)
            and (not state or r["state"] == state) and (not district or r["district"] == district)]
    return {"weights": {**scoring.DEFAULT_WEIGHTS, **_weights(w_demand, w_deficit, w_vulnerability, w_severity, w_coverage)},
            "total": len(rows), "items": rows[:limit]}


@router.get("/areas")
def areas(sector: str | None = None, state: str | None = None, district: str | None = None, country: str | None = None,
          db: Session = Depends(get_db)):
    rows = scoring.area_summary(db, sector=sector)
    return [a for a in rows if (not state or a["state"] == state) and (not district or a["district"] == district)]


@router.get("/silent-zones")
def silent(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    return scoring.silent_zones(db, state=state)


@router.get("/alignment")
def alignment(state: str | None = None, national: bool = False, country: str | None = None, db: Session = Depends(get_db)):
    return scoring.alignment(db, state=state, national=national)


@router.get("/trends")
def trend(state: str | None = None, sector: str | None = None, weeks: int = 12, country: str | None = None, db: Session = Depends(get_db)):
    return trends.weekly_series(db, weeks, None, sector, state)


@router.get("/alerts")
def alerts(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    return trends.alerts(db, state=state)


@router.get("/sectors")
def sectors(state: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    rows = [r for r in scoring.need_gap(db) if not state or r["state"] == state]
    out = {}
    for r in rows:
        s = out.setdefault(r["sector"], {"sector": r["sector"], "reports": 0, "households": 0.0, "ngi_sum": 0.0, "n": 0,
                                         "deficit_sum": 0.0, "silent": 0})
        s["reports"] += r["reports"]
        s["households"] += r["effective_households"]
        s["ngi_sum"] += r["ngi"]
        s["deficit_sum"] += r["deficit"]
        s["n"] += 1
        s["silent"] += int(r["silent_zone"])
    return sorted(({"sector": k, "reports": v["reports"], "households": round(v["households"]),
                    "avg_ngi": round(v["ngi_sum"] / v["n"], 1), "avg_deficit": round(v["deficit_sum"] / v["n"], 3),
                    "silent_zones": v["silent"]} for k, v in out.items()), key=lambda x: -x["avg_ngi"])


@router.get("/languages")
def languages(country: str | None = None, db: Session = Depends(get_db)):
    q = db.query(CitizenRequest.language, CitizenRequest.channel)
    if country:
        q = q.filter(CitizenRequest.country_code == country)
    rows = q.all()
    return {"languages": dict(Counter(l for l, _ in rows).most_common()), "channels": dict(Counter(c for _, c in rows).most_common())}
