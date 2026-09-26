"""Federated BRICS layer. Each country runs its own sovereign JanSetu node; only aggregated,
k-anonymised (optionally differentially-private) indicators leave the country.
This module builds the outbound aggregate for live nodes and merges simulated partner nodes."""
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import CitizenRequest, Country
from app.services import privacy, scoring
from app.services.ai.lexicon import SECTORS

SIM_FILE = Path(__file__).resolve().parent.parent / "seed" / "federated_nodes.json"


def node_aggregate(db: Session, country: str) -> dict:
    """What a sovereign node publishes to the BRICS exchange (no PII, no row-level data)."""
    rows = [r for r in scoring.need_gap(db) if r["country"] == country]
    reqs = db.query(CitizenRequest).filter(CitizenRequest.country_code == country).all()
    total_hh = sum({r["area_id"]: r["households"] for r in rows}.values()) or 1
    al = scoring.alignment(db, country).get(country, {})
    sectors = {}
    for s in SECTORS:
        sr = [r for r in rows if r["sector"] == s]
        hh = len({q.household_hash for q in reqs if q.category == s})
        k = privacy.k_anonymise(hh)
        sectors[s] = {
            "households_reporting": k, "suppressed": k is None,
            "demand_per_10k_households": round(privacy.dp_noise(hh / total_hh * 10000), 1) if k else None,
            "avg_deficit": round(sum(r["deficit"] for r in sr) / len(sr), 3) if sr else None,
            "avg_ngi": round(sum(r["ngi"] for r in sr) / len(sr), 1) if sr else None,
            "silent_zones": sum(1 for r in sr if r["silent_zone"]),
        }
    return {"country": country, "node_status": "live", "sectors": sectors,
            "alignment_score": al.get("alignment_score"), "requests": privacy.k_anonymise(len(reqs)),
            "languages": len({q.language for q in reqs}),
            "privacy": {"k_anonymity": privacy.settings.k_anonymity, "dp_epsilon": privacy.settings.dp_epsilon}}


def exchange(db: Session) -> list[dict]:
    live = [node_aggregate(db, c.code) for c in db.query(Country).filter(Country.node_status == "live").all()]
    names = {c.code: c.name for c in db.query(Country).all()}
    for n in live:
        n["name"] = names.get(n["country"], n["country"])
    sim = json.loads(SIM_FILE.read_text(encoding="utf-8")) if SIM_FILE.exists() else []
    for s in sim:
        s["node_status"] = "simulated"
    return live + sim
