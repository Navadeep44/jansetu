"""Converts the highest Need-Gap area-sectors into concrete, costed, explainable candidate
projects, matched to the public scheme / budget line that can fund them (convergence)."""
import math
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Area, CitizenRequest, DemandCluster, Project
from app.services import analytics_cache, scoring
from app.services.ai.lexicon import SECTORS

CURRENCY = {"IN": "INR"}


def to_usd(amount: float, country: str) -> float:
    rate = settings.fx_inr_usd
    return round(amount * rate, 0)


SCHEMES = {
    "IN": {"water": "Jal Jeevan Mission + VB-GRAMG water-security works + 15th FC tied grant",
           "roads": "PMGSY-IV (rural) / VB-GRAMG connectivity works / State PWD",
           "electricity": "RDSS feeder upgrade + PM-KUSUM / PM Surya Ghar solar",
           "health": "NHM - Ayushman Arogya Mandir upgrade",
           "education": "Samagra Shiksha - classrooms, toilets and teacher posts",
           "sanitation": "Swachh Bharat Mission (G) Ph-II / AMRUT 2.0"},
}

SHARE = {"water": 1.0, "roads": 1.0, "electricity": 0.9, "health": 1.0, "education": 0.25, "sanitation": 0.9}


def estimate(area: Area, sector: str, sub: str, deficit: float) -> tuple[str, str, float, int]:
    c = area.country_code
    share = SHARE[sector] * (0.45 if sector == "roads" and area.setting == "urban" else 1.0)
    ben = max(50, int(area.population * min(1.0, deficit + 0.1) * share))
    km = round(min(12, max(1.5, 2 + deficit * 8 * (0.5 if area.setting == "urban" else 1))), 1)
    unit = {"roads": km * 8.0e6, "water": ben * 4500, "electricity": ben * 2500, "health": 2.5e7 * (0.5 + deficit),
            "education": math.ceil(ben / 40) * 1.5e6, "sanitation": ben * 3000}
    cost = round(unit.get(sector, ben * 1000), -3)
    n = area.name
    title = {
        ("roads", "new_connectivity"): f"All-weather road link for {n} ({km} km)",
        ("roads", "potholes_repair"): f"Road resurfacing and side drains, {n} ({km} km)",
        ("roads", "waterlogging"): f"Storm-water drainage and road raising, {n}",
        ("electricity", "street_lighting"): f"LED street-lighting network, {n}",
        ("electricity", "new_connection"): f"Household electrification + solar mini-grid, {n}",
        ("water", "water_quality"): f"Water treatment and safe-supply upgrade, {n}",
        ("health", "medicine_stockout"): f"Essential-medicines supply chain fix, {n}",
        ("education", "capacity"): f"New Anganwadi / classroom places, {n}",
        ("sanitation", "solid_waste"): f"Door-to-door waste collection and transfer point, {n}",
        ("sanitation", "toilets"): f"Community and household toilets programme, {n}",
    }.get((sector, sub)) or {
        "roads": f"All-weather road connectivity, {n} ({km} km)", "water": f"Piped drinking-water scheme and source repair, {n}",
        "electricity": f"Feeder upgrade and solar backup for reliable power, {n}", "health": f"Health centre upgrade and staffing, {n}",
        "education": f"Additional classrooms and teacher posts, {n}", "sanitation": f"Covered drains and faecal-sludge management, {n}",
    }[sector]
    desc = (f"Addresses the {SECTORS[sector]['label'].lower()} gap in {n}, {area.district} "
            f"(provisioning score {round((1 - deficit) * 100)}%). Estimated beneficiaries: {ben:,}.")
    return title, desc, cost, ben


def _evidence(db: Session, area_id: int, sector: str, limit: int = 4):
    reqs = (db.query(CitizenRequest).filter(CitizenRequest.area_id == area_id, CitizenRequest.category == sector)
            .order_by(CitizenRequest.severity.desc(), CitizenRequest.created_at.desc()).limit(40).all())
    seen, texts, out = set(), set(), []
    for r in reqs:
        if r.redacted_text in texts or (r.language in seen and len(out) >= 2):
            continue
        seen.add(r.language)
        texts.add(r.redacted_text)
        out.append({"tracking_id": r.tracking_id, "language": r.language, "original": r.redacted_text,
                    "english": r.translated_text, "channel": r.channel, "severity": r.severity})
        if len(out) >= limit:
            break
    return out


def regenerate(db: Session, min_ngi: float = 40.0, per_state: int = 12) -> int:
    """Rebuild the 'recommended' shortlist. Human decisions (approved / deferred / rejected) are kept."""
    db.query(Project).filter(Project.source == "recommended", Project.status == "recommended").delete()
    db.flush()
    analytics_cache.bump()
    rows = scoring.need_gap(db)
    decided = {(p.area_id, p.sector) for p in db.query(Project).filter(Project.source == "recommended").all()}
    created = 0
    by_country: dict[str, list] = {}
    for r in rows:
        if r["ngi"] >= min_ngi and r["covered"] == 0 and (r["area_id"], r["sector"]) not in decided:
            by_country.setdefault(r["state"], []).append(r)
    country = "IN"
    for _state, cand in by_country.items():
        cand = cand[:per_state]
        drafts = []
        for r in cand:
            area = db.get(Area, r["area_id"])
            cl = (db.query(DemandCluster).filter(DemandCluster.area_id == area.id, DemandCluster.category == r["sector"])
                  .order_by(DemandCluster.unique_households.desc()).first())
            sub = cl.subcategory if cl else "general"
            title, desc, cost, ben = estimate(area, r["sector"], sub, r["deficit"])
            drafts.append((r, area, cl, title, desc, cost, ben))
        eff = scoring._pct_rank([d[6] / max(to_usd(d[5], country), 1) for d in drafts])
        for (r, area, cl, title, desc, cost, ben), e in zip(drafts, eff):
            score = round(0.75 * r["ngi"] + 0.25 * e * 100, 1)
            p = Project(
                code=f"REC-{country}-{area.id:03d}-{r['sector'][:3].upper()}", source="recommended", country_code=country,
                area_id=area.id, cluster_id=cl.id if cl else None, sector=r["sector"], title=title, description=desc,
                scheme=SCHEMES.get(country, {}).get(r["sector"], ""), sdg=SECTORS[r["sector"]]["sdg"], cost_local=cost,
                cost_usd=to_usd(cost, country), beneficiaries=ben, status="recommended", score=score,
                score_breakdown={
                    "ngi": r["ngi"], "efficiency_pct": round(e * 100, 1), "contributions": r["contributions"],
                    "inputs": {k: r[k] for k in ("demand_pct", "deficit", "vulnerability", "severity", "effective_households",
                                                 "reports", "demand_rate", "connectivity", "population", "households")},
                    "silent_zone": r["silent_zone"], "formula": "0.75 x NGI + 0.25 x cost-efficiency percentile",
                },
                created_at=datetime.utcnow(),
            )
            db.add(p)
            if cl and cl.status == "open":
                cl.status = "in_plan"
            created += 1
    db.commit()
    analytics_cache.bump()
    return created


def explain(db: Session, p: Project) -> dict:
    b = p.score_breakdown or {}
    contrib = b.get("contributions", {})
    labels = {"demand": "Citizen demand (per-capita, connectivity-adjusted)", "deficit": "Infrastructure deficit",
              "vulnerability": "Population vulnerability", "severity": "Reported severity"}
    drivers = sorted(({"factor": labels[k], "points": v} for k, v in contrib.items()), key=lambda d: d["points"], reverse=True)
    inputs = b.get("inputs", {})
    facts = []
    if inputs:
        facts = [
            f"{inputs.get('effective_households', 0):g} households raised this need ({inputs.get('reports', 0)} reports).",
            f"Infrastructure provisioning is only {round((1 - inputs.get('deficit', 0)) * 100)}% in this sector.",
            f"Vulnerability index {inputs.get('vulnerability', 0):.2f}; phone/internet access {round(inputs.get('connectivity', 0) * 100)}%.",
            f"No active sanctioned project currently covers this need.",
        ]
        if b.get("silent_zone"):
            facts.insert(0, "SILENT ZONE: severe deficit but few complaints. Low reporting reflects exclusion, not absence of need.")
    return {"drivers": drivers, "facts": facts, "evidence": _evidence(db, p.area_id, p.sector),
            "formula": b.get("formula", ""), "ngi": b.get("ngi"), "efficiency_pct": b.get("efficiency_pct")}


def optimise(projects: list[Project], budget: float) -> dict:
    """0/1 knapsack: choose the portfolio that maximises need-weighted beneficiaries within budget."""
    items = [p for p in projects if p.cost_local > 0]
    if not items or budget <= 0:
        return {"selected": [], "total_cost": 0, "total_beneficiaries": 0, "value": 0}
    unit = max(budget / 2000, 1.0)
    cap = int(budget // unit)
    costs = [max(1, int(math.ceil(p.cost_local / unit))) for p in items]
    vals = [p.beneficiaries * (p.score / 100) for p in items]
    n = len(items)
    dp = [[0.0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        c, v = costs[i - 1], vals[i - 1]
        row, prev = dp[i], dp[i - 1]
        for b in range(cap + 1):
            row[b] = prev[b]
            if c <= b and prev[b - c] + v > row[b]:
                row[b] = prev[b - c] + v
    sel, b = [], cap
    for i in range(n, 0, -1):
        if dp[i][b] != dp[i - 1][b]:
            sel.append(items[i - 1])
            b -= costs[i - 1]
    return {"selected": [p.id for p in sel], "total_cost": sum(p.cost_local for p in sel),
            "total_beneficiaries": sum(p.beneficiaries for p in sel), "value": round(dp[n][cap], 1),
            "budget": budget, "utilisation": round(sum(p.cost_local for p in sel) / budget, 3)}
