"""Turns ranked citizen demand into a draft Viksit Gram Panchayat Plan (VB-GRAMG, from 1 July 2026):
works per village / ward with scheme convergence, cost, beneficiaries and the citizens' own words as evidence.
The Gram Sabha discusses and approves it by resolution; the CSV maps to Yuktdhara upload fields."""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Project
from app.services import recommender, scoring
from app.services.ai.lexicon import SECTORS


def build(db: Session, district: str, area: str | None = None) -> dict:
    rows = {(r["area_id"], r["sector"]): r for r in scoring.need_gap(db) if r["district"] == district}
    projects = [p for p in db.query(Project).filter(Project.source == "recommended",
                                                    Project.status.in_(["recommended", "approved"])).all()
                if p.area and p.area.district == district and (not area or p.area.name == area)]
    projects.sort(key=lambda p: p.score or 0, reverse=True)
    items = []
    for i, p in enumerate(projects, 1):
        r = rows.get((p.area_id, p.sector), {})
        ev = recommender._evidence(db, p.area_id, p.sector, limit=2)
        items.append({
            "priority": i, "area": p.area.name, "sector": SECTORS[p.sector]["label"], "sector_key": p.sector, "work": p.title,
            "scheme": p.scheme, "estimated_cost_inr": round(p.cost_local), "beneficiaries": p.beneficiaries,
            "households_asked": round(r.get("effective_households", 0)), "need_gap_index": r.get("ngi"),
            "silent_zone": bool(r.get("silent_zone")), "status": p.status, "lat": p.area.lat, "lng": p.area.lng,
            "evidence": " | ".join(e["english"] or e["original"] for e in ev),
            "evidence_original": [{"language": e["language"], "text": e["original"]} for e in ev],
        })
    total = sum(i["estimated_cost_inr"] for i in items)
    return {"district": district, "area": area, "generated_at": datetime.utcnow().isoformat(timespec="minutes") + "Z",
            "framework": "Viksit Gram Panchayat Plan (VB-GRAMG) · upload to Yuktdhara after Gram Sabha resolution",
            "items": items, "total_cost_inr": total, "water_share": round(
                sum(i["estimated_cost_inr"] for i in items if i["sector_key"] == "water") / total, 3) if total else 0}
