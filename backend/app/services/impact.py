"""Impact measurement for DPI-driven investment:
 - difference-in-differences on complaint rates (treated area-sector vs untreated comparison areas)
 - before/after infrastructure indicator change
 - inclusion, responsiveness and trust (closing-the-loop) KPIs."""
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from statistics import median

from sqlalchemy.orm import Session

from app.models import Area, CitizenRequest, IndicatorHistory, Project


def _monthly_rate(reqs, area_ids: set, sector: str, start: datetime, end: datetime, households: dict) -> float:
    months = max((end - start).days / 30.0, 0.5)
    n = sum(1 for r in reqs if r.area_id in area_ids and r.category == sector and start <= r.created_at < end)
    hh = sum(households[a] for a in area_ids) or 1
    return n / months / hh * 1000  # reports per 1,000 households per month


def project_impacts(db: Session, country: str | None = None) -> list[dict]:
    q = db.query(Project).filter(Project.status == "completed", Project.completed_at.isnot(None))
    if country:
        q = q.filter(Project.country_code == country)
    projects = q.all()
    reqs = db.query(CitizenRequest).filter(CitizenRequest.area_id.isnot(None)).all()
    areas = db.query(Area).all()
    hh = {a.id: a.households for a in areas}
    area_country = {a.id: a.country_code for a in areas}
    treated_pairs = {(p.area_id, p.sector) for p in db.query(Project).filter(Project.status.in_(["completed", "in_progress"])).all()}
    out = []
    now = datetime.utcnow()
    for p in projects:
        # 'before' = the 180 days up to completion (need still unmet), 'after' = since completion
        b0, b1 = p.completed_at - timedelta(days=180), p.completed_at
        a0, a1 = p.completed_at, min(now, p.completed_at + timedelta(days=180))
        if (a1 - a0).days < 20:
            continue
        control = {a.id for a in areas if area_country[a.id] == p.country_code and a.id != p.area_id
                   and (a.id, p.sector) not in treated_pairs}
        tb = _monthly_rate(reqs, {p.area_id}, p.sector, b0, b1, hh)
        ta = _monthly_rate(reqs, {p.area_id}, p.sector, a0, a1, hh)
        cb = _monthly_rate(reqs, control, p.sector, b0, b1, hh) if control else 0
        ca = _monthly_rate(reqs, control, p.sector, a0, a1, hh) if control else 0
        did = (ta - tb) - (ca - cb)
        hist = {h.year: h.value for h in db.query(IndicatorHistory).filter(
            IndicatorHistory.area_id == p.area_id, IndicatorHistory.sector == p.sector).all()}
        years = sorted(hist)
        out.append({
            "project_id": p.id, "code": p.code, "title": p.title, "area": p.area.name if p.area else "",
            "country": p.country_code, "sector": p.sector, "cost_usd": p.cost_usd, "beneficiaries": p.beneficiaries,
            "completed_at": p.completed_at.isoformat(), "source": p.source,
            "complaints_per_1000hh_month": {"treated_before": round(tb, 2), "treated_after": round(ta, 2),
                                            "control_before": round(cb, 2), "control_after": round(ca, 2)},
            "did_estimate": round(did, 2),
            "reduction_pct": round(100 * (tb - ta) / tb, 1) if tb else None,
            "indicator": {"before": hist.get(years[0]) if years else None, "after": hist.get(years[-1]) if years else None,
                          "years": years, "series": [{"year": y, "value": hist[y]} for y in years]},
        })
    return out


def dpi_kpis(db: Session, country: str | None = None) -> dict:
    q = db.query(CitizenRequest)
    if country:
        q = q.filter(CitizenRequest.country_code == country)
    reqs = q.all()
    n = len(reqs) or 1
    areas = {a.id: a for a in db.query(Area).all()}
    ch = Counter(r.channel for r in reqs)
    voice = sum(1 for r in reqs if r.channel == "ivr" or r.audio_path)
    women = sum(1 for r in reqs if r.gender == "female")
    disclosed = sum(1 for r in reqs if r.gender in ("female", "male", "other")) or 1
    rural = sum(1 for r in reqs if r.area_id and areas[r.area_id].setting == "rural")
    closed = [r for r in reqs if r.status in ("closed", "reopened", "resolved_pending_verification")]
    verified = [r for r in reqs if r.citizen_verified is not None]
    projects = {p.cluster_id: p for p in db.query(Project).filter(Project.cluster_id.isnot(None)).all()}
    days_to_plan = [(projects[r.cluster_id].created_at - r.created_at).days for r in reqs
                    if r.cluster_id in projects and projects[r.cluster_id].created_at > r.created_at]
    by_lang = Counter(r.language for r in reqs)
    by_month = defaultdict(int)
    for r in reqs:
        by_month[r.created_at.strftime("%Y-%m")] += 1
    return {
        "total_requests": len(reqs), "unique_households": len({r.household_hash for r in reqs}),
        "languages": len(by_lang), "language_mix": dict(by_lang.most_common()),
        "channel_mix": dict(ch.most_common()),
        "inclusion": {"voice_share": round(voice / n, 3), "women_share_of_disclosed": round(women / disclosed, 3),
                      "rural_share": round(rural / n, 3), "assisted_share": round((ch.get("assisted", 0) + ch.get("community", 0)) / n, 3),
                      "non_english_share": round(sum(v for k, v in by_lang.items() if k != "en") / n, 3),
                      "anonymous_share": round(sum(1 for r in reqs if r.anonymous) / n, 3)},
        "responsiveness": {"median_days_to_plan": median(days_to_plan) if days_to_plan else None,
                           "in_review": sum(1 for r in reqs if r.status == "needs_review")},
        "trust": {"closed_or_resolved": len(closed), "citizen_verified_share": round(len(verified) / len(closed), 3) if closed else 0,
                  "verified_fixed": sum(1 for r in verified if r.citizen_verified),
                  "reopened": sum(1 for r in reqs if r.status == "reopened"),
                  "formulaic_closures_flagged": sum(1 for r in reqs if r.closure_flag == "formulaic_closure"),
                  "avg_rating": round(sum(r.citizen_rating for r in reqs if r.citizen_rating) /
                                      max(1, sum(1 for r in reqs if r.citizen_rating)), 2)},
        "monthly_volume": [{"month": k, "requests": v} for k, v in sorted(by_month.items())],
    }
