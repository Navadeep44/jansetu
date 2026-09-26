"""Auto-generated policy brief for a country / state / district. Deterministic template
(always works); if an LLM is configured it adds an executive narrative and can translate."""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Project
from app.services import impact, providers_proxy, scoring, trends
from app.services.ai.lexicon import SECTORS

COUNTRY = {"IN": "India", "BR": "Brazil", "ZA": "South Africa"}


def build(db: Session, country: str, district: str | None = None, language: str = "en") -> dict:
    rows = [r for r in scoring.need_gap(db) if r["country"] == country and (not district or r["district"] == district)]
    silent = [r for r in rows if r["silent_zone"]][:5]
    top = rows[:8]
    recs = [p for p in db.query(Project).filter(Project.source == "recommended", Project.country_code == country)
            .order_by(Project.score.desc()).all() if not district or (p.area and p.area.district == district)][:8]
    al = scoring.alignment(db, country).get(country, {})
    al_list = al.get("misaligned_projects", [])
    if district:
        al_list = [m for m in al_list if any(r["area"] == m["area"] for r in rows)]
    alerts = [a for a in trends.alerts(db, country) if not district or a["district"] == district][:5]
    imp = impact.project_impacts(db, country)[:5]
    scope = f"{district} district, {COUNTRY.get(country, country)}" if district else COUNTRY.get(country, country)
    sectors = {}
    for r in rows:
        s = sectors.setdefault(r["sector"], {"reports": 0, "ngi": []})
        s["reports"] += r["reports"]
        s["ngi"].append(r["ngi"])
    sector_table = sorted(({"sector": SECTORS[k]["label"], "reports": v["reports"], "avg_ngi": round(sum(v["ngi"]) / len(v["ngi"]), 1)}
                           for k, v in sectors.items()), key=lambda x: x["avg_ngi"], reverse=True)
    sections = {
        "title": f"Development Demand Brief: {scope}",
        "generated_at": datetime.utcnow().isoformat(timespec="minutes") + "Z",
        "key_findings": [
            f"Highest unmet need: {top[0]['area']} ({SECTORS[top[0]['sector']]['label']}), Need-Gap Index {top[0]['ngi']}." if top else "No data.",
            f"{len([r for r in rows if r['silent_zone']])} silent zone(s): severe deficits with few citizen reports.",
            f"Spending alignment: {al.get('alignment_score', 0)}% of the active plan budget targets above-median needs; "
            f"{round(al.get('share_to_below_median_need', 0) * 100)}% targets below-median needs.",
            f"{len(alerts)} early-warning alert(s) this week." if alerts else "No early-warning alerts this week.",
        ],
        "sector_table": sector_table,
        "top_needs": [{k: r[k] for k in ("area", "district", "sector", "ngi", "deficit", "effective_households")} for r in top],
        "silent_zones": [{k: r[k] for k in ("area", "district", "sector", "deficit", "vulnerability", "silent_score")} for r in silent],
        "recommended_projects": [{"code": p.code, "title": p.title, "scheme": p.scheme, "cost_usd": p.cost_usd,
                                  "beneficiaries": p.beneficiaries, "score": p.score, "status": p.status} for p in recs],
        "misaligned_spending": al_list[:6],
        "alerts": alerts,
        "impact": [{k: i[k] for k in ("title", "sector", "did_estimate", "reduction_pct")} for i in imp],
        "method_note": "Need-Gap Index = demand (per-capita, connectivity-adjusted) + infrastructure deficit + vulnerability + "
                       "severity, discounted where an active project already covers the need. Weights are adjustable and published.",
    }
    narrative = providers_proxy.chat(
        "You write concise, neutral executive summaries for government planners. 120 words max. "
        f"Write in language code '{language}'.", str(sections), max_tokens=400)
    sections["executive_summary"] = narrative or (" ".join(sections["key_findings"]))
    sections["narrative_mode"] = "llm" if narrative else "template"
    return sections
