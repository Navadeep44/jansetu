"""Need-Gap Index (NGI), Silent Zones, demand hotspots and spending alignment.

NGI(area, sector) = 100 * (wD*Demand + wS*SupplyDeficit + wV*Vulnerability + wX*Severity) / sum(w)
                        * (1 - wC * PlannedCoverage)

 Demand         = percentile (within country) of effective households reporting per 1,000 households,
                  divided by reporting propensity (connectivity) so low-connectivity places are not penalised
 SupplyDeficit  = 1 - infrastructure provisioning score (Mission Antyodaya / IBGE / Stats SA style)
 Vulnerability  = composite of poverty, SC/ST / marginalised share, women-headed households, disaster risk
 Severity       = mean AI-extracted severity (life-safety > livelihood > convenience)
 PlannedCoverage= an active sanctioned/approved project already addresses this need (avoid double funding)

Weights are transparent and adjustable (World Bank Infrastructure Prioritization Framework)."""
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Area, CitizenRequest, Project
from app.services import analytics_cache
from app.services.ai.lexicon import SECTORS
from app.services.geo.hotspots import getis_ord_gi_star

DEFAULT_WEIGHTS = {"demand": 0.30, "deficit": 0.30, "vulnerability": 0.20, "severity": 0.20, "coverage": 0.5}
ACTIVE_PROJECT = {"planned", "sanctioned", "approved", "in_progress"}
SECTOR_KEYS = list(SECTORS.keys())


def _pct_rank(values: list[float]) -> list[float]:
    n = len(values)
    if n <= 1:
        return [0.5] * n
    order = sorted(range(n), key=lambda i: values[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and values[order[j + 1]] == values[order[i]]:
            j += 1
        r = (i + j) / 2 / (n - 1)
        for k in range(i, j + 1):
            ranks[order[k]] = r
        i = j + 1
    return ranks


def _base_metrics(db: Session, days: int = 365):
    since = datetime.utcnow() - timedelta(days=days)
    areas = db.query(Area).all()
    reqs = db.query(CitizenRequest).filter(CitizenRequest.created_at >= since, CitizenRequest.area_id.isnot(None)).all()
    projects = db.query(Project).all()
    agg = defaultdict(lambda: {"households": set(), "extra": 0.0, "sev": [], "n": 0, "coordinated": 0})
    for r in reqs:
        if r.category not in SECTORS or "abusive" in (r.flags or []):
            continue
        a = agg[(r.area_id, r.category)]
        a["n"] += 1
        if "coordinated" in (r.flags or []):
            a["coordinated"] += 1
            a["extra"] += 0.25  # campaign messages count for a quarter of a household
        else:
            a["households"].add(r.household_hash)
        if r.channel == "community" and r.supporters > 1:
            a["extra"] += (r.supporters - 1) * 0.5
        a["sev"].append(r.severity)
    active = defaultdict(float)
    for p in projects:
        if p.status in ACTIVE_PROJECT and (p.source == "plan" or p.status != "recommended"):
            active[(p.area_id, p.sector)] += p.cost_local
    rows = []
    for ar in areas:
        for s in SECTOR_KEYS:
            a = agg.get((ar.id, s))
            eff = (len(a["households"]) + a["extra"]) if a else 0.0
            rate = eff / max(ar.households, 1) * 1000
            rows.append({
                "area_id": ar.id, "area": ar.name, "district": ar.district, "state": ar.state, "country": ar.country_code,
                "setting": ar.setting, "lat": ar.lat, "lng": ar.lng, "population": ar.population, "households": ar.households,
                "sector": s, "reports": a["n"] if a else 0, "effective_households": round(eff, 1),
                "demand_rate": round(rate, 2), "adjusted_rate": rate / max(ar.connectivity, 0.25),
                "deficit": round(1 - float((ar.infra or {}).get(s, 0.5)), 3), "vulnerability": ar.vulnerability,
                "connectivity": ar.connectivity, "severity": (sum(a["sev"]) / len(a["sev"]) / 5) if a and a["sev"] else 0.5,
                "coordinated_reports": a["coordinated"] if a else 0,
                "planned_budget_local": active.get((ar.id, s), 0.0), "covered": 1.0 if active.get((ar.id, s)) else 0.0,
            })
    by_country = defaultdict(list)
    for i, r in enumerate(rows):
        by_country[r["country"]].append(i)
    for idxs in by_country.values():
        pr = _pct_rank([rows[i]["adjusted_rate"] for i in idxs])
        raw = _pct_rank([rows[i]["demand_rate"] for i in idxs])
        for i, p, q in zip(idxs, pr, raw):
            rows[i]["demand_pct"] = round(p, 3)
            rows[i]["raw_demand_pct"] = round(q, 3)
    return rows


def need_gap(db: Session, weights: dict | None = None, days: int = 365) -> list[dict]:
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    base = analytics_cache.cached(("base", days), lambda: _base_metrics(db, days))
    sw = w["demand"] + w["deficit"] + w["vulnerability"] + w["severity"] or 1
    out = []
    for r in base:
        comp = {"demand": w["demand"] * r["demand_pct"], "deficit": w["deficit"] * r["deficit"],
                "vulnerability": w["vulnerability"] * r["vulnerability"], "severity": w["severity"] * r["severity"]}
        ngi = 100 * sum(comp.values()) / sw * (1 - w["coverage"] * r["covered"])
        silent = r["deficit"] >= 0.55 and r["vulnerability"] >= 0.5 and r["raw_demand_pct"] <= 0.35
        out.append({**r, "ngi": round(ngi, 1),
                    "contributions": {k: round(100 * v / sw, 1) for k, v in comp.items()},
                    "coverage_penalty": round(w["coverage"] * r["covered"], 2),
                    "silent_zone": silent,
                    "silent_score": round(r["deficit"] * r["vulnerability"] * (1 - r["raw_demand_pct"]), 3) if silent else 0.0})
    out.sort(key=lambda x: x["ngi"], reverse=True)
    return out


def area_summary(db: Session, weights: dict | None = None, sector: str | None = None) -> list[dict]:
    rows = need_gap(db, weights)
    if sector and sector != "all":
        rows = [r for r in rows if r["sector"] == sector]
    per = {}
    for r in rows:
        a = per.setdefault(r["area_id"], {
            "area_id": r["area_id"], "area": r["area"], "district": r["district"], "state": r["state"],
            "country": r["country"], "setting": r["setting"], "lat": r["lat"], "lng": r["lng"],
            "population": r["population"], "households": r["households"], "vulnerability": r["vulnerability"],
            "connectivity": r["connectivity"], "reports": 0, "effective_households": 0.0, "ngi_max": 0.0,
            "top_sector": None, "silent_sectors": [], "planned_budget_local": 0.0, "sectors": {}})
        a["reports"] += r["reports"]
        a["effective_households"] += r["effective_households"]
        a["planned_budget_local"] += r["planned_budget_local"]
        a["sectors"][r["sector"]] = {"ngi": r["ngi"], "deficit": r["deficit"], "reports": r["reports"]}
        if r["ngi"] > a["ngi_max"]:
            a["ngi_max"], a["top_sector"] = r["ngi"], r["sector"]
        if r["silent_zone"]:
            a["silent_sectors"].append(r["sector"])
    areas = list(per.values())
    for a in areas:
        a["demand_per_1000hh"] = round(a["effective_households"] / max(a["households"], 1) * 1000, 2)
        a["silent_zone"] = bool(a["silent_sectors"])
    by_country = defaultdict(list)
    for a in areas:
        by_country[a["country"]].append(a)
    for group in by_country.values():
        gi = getis_ord_gi_star([{"id": a["area_id"], "lat": a["lat"], "lng": a["lng"], "value": a["demand_per_1000hh"]} for a in group])
        for a in group:
            a["hotspot"] = gi[a["area_id"]]
    return sorted(areas, key=lambda a: a["ngi_max"], reverse=True)


def silent_zones(db: Session, country: str | None = None) -> list[dict]:
    rows = [r for r in need_gap(db) if r["silent_zone"] and (not country or r["country"] == country)]
    rows.sort(key=lambda r: r["silent_score"], reverse=True)
    for r in rows:
        r["recommended_outreach"] = (
            "Deploy ASHA / CSC / community health worker door-to-door survey and an IVR missed-call campaign in "
            f"{r['area']}; hold a ward/Gram Sabha listening session on {SECTORS[r['sector']]['label'].lower()}."
            if r["country"] == "IN" else
            f"Run an assisted listening campaign (community agents, IVR, WhatsApp broadcast) in {r['area']} on "
            f"{SECTORS[r['sector']]['label'].lower()}.")
    return rows


def alignment(db: Session, country: str | None = None) -> dict:
    """How much of the existing public investment plan goes where need is highest?"""
    rows = need_gap(db, {"coverage": 0.0})  # judge need before crediting the plan itself
    idx = {(r["area_id"], r["sector"]): r for r in rows}
    result = {}
    countries = sorted({r["country"] for r in rows if not country or r["country"] == country})
    plans = db.query(Project).filter(Project.source == "plan", Project.status.in_(["planned", "sanctioned", "in_progress"])).all()
    for c in countries:
        ngis = sorted(r["ngi"] for r in rows if r["country"] == c)
        if not ngis:
            continue
        q75 = ngis[int(0.75 * (len(ngis) - 1))]
        median = ngis[int(0.5 * (len(ngis) - 1))]
        cp = [p for p in plans if p.country_code == c]
        total = sum(p.cost_local for p in cp) or 0.0
        top = sum(p.cost_local for p in cp if idx.get((p.area_id, p.sector), {}).get("ngi", 0) >= q75)
        low = [p for p in cp if idx.get((p.area_id, p.sector), {}).get("ngi", 0) < median]
        above = total - sum(p.cost_local for p in low)
        result[c] = {
            "plan_budget_local": total, "plan_budget_usd": sum(p.cost_usd for p in cp),
            "share_to_top_quartile_need": round(top / total, 3) if total else 0.0,
            "share_to_below_median_need": round(sum(p.cost_local for p in low) / total, 3) if total else 0.0,
            "share_to_above_median_need": round(above / total, 3) if total else 0.0,
            "alignment_score": round(100 * above / total, 1) if total else 0.0,
            "misaligned_projects": [{
                "id": p.id, "code": p.code, "title": p.title, "area": p.area.name if p.area else "", "sector": p.sector,
                "cost_local": p.cost_local, "cost_usd": p.cost_usd, "status": p.status,
                "need_ngi": idx.get((p.area_id, p.sector), {}).get("ngi", 0), "country_median_ngi": median,
            } for p in sorted(low, key=lambda p: p.cost_local, reverse=True)],
            "thresholds": {"top_quartile_ngi": q75, "median_ngi": median},
        }
    return result
