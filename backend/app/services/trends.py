"""Emerging-issue detection and early warning: rolling z-score on weekly report volume per
area x sector (6-week baseline). Catches e.g. water-borne disease outbreaks or rising anger
over power cuts before they turn into crises or protests."""
from collections import defaultdict
from datetime import datetime, timedelta
from statistics import mean, pstdev

from sqlalchemy.orm import Session

from app.models import Area, CitizenRequest
from app.services.ai.lexicon import SECTORS

ALERT_TEXT = {
    "sanitation": "Possible water-borne disease risk: sharp rise in drainage / sewage reports.",
    "water": "Water supply failure spreading: sharp rise in drinking-water reports.",
    "electricity": "Rising frustration over power outages: early warning of possible unrest.",
    "health": "Surge in health-service complaints: check staffing and medicine stock.",
    "roads": "Spike in road access problems: check flooding / damage after weather events.",
    "education": "Surge in school-related complaints.",
}


def weekly_series(db: Session, weeks: int = 12, country: str | None = None, sector: str | None = None, state: str | None = None) -> list[dict]:
    now = datetime.utcnow()
    since = now - timedelta(weeks=weeks)
    q = db.query(CitizenRequest).filter(CitizenRequest.created_at >= since)
    if country:
        q = q.filter(CitizenRequest.country_code == country)
    if sector and sector != "all":
        q = q.filter(CitizenRequest.category == sector)
    if state:
        q = q.join(Area, CitizenRequest.area_id == Area.id).filter(Area.state == state)
    buckets = defaultdict(lambda: defaultdict(int))
    for r in q.all():
        wk = (now - r.created_at).days // 7
        buckets[weeks - 1 - wk][r.category] += 1
    out = []
    for i in range(weeks):
        start = since + timedelta(weeks=i)
        row = {"week": start.strftime("%d %b"), **{s: buckets[i].get(s, 0) for s in SECTORS}}
        row["total"] = sum(buckets[i].values())
        out.append(row)
    return out


def alerts(db: Session, country: str | None = None, state: str | None = None, z_threshold: float = 2.5, min_count: int = 5) -> list[dict]:
    now = datetime.utcnow()
    since = now - timedelta(weeks=7)
    q = db.query(CitizenRequest).filter(CitizenRequest.created_at >= since, CitizenRequest.area_id.isnot(None))
    if country:
        q = q.filter(CitizenRequest.country_code == country)
    counts = defaultdict(lambda: [0] * 7)
    for r in q.all():
        wk = min(6, (now - r.created_at).days // 7)
        counts[(r.area_id, r.category)][6 - wk] += 1
    areas = {a.id: a for a in db.query(Area).all()}
    out = []
    for (aid, sector), series in counts.items():
        if sector not in SECTORS:
            continue
        base, last = series[:6], series[6]
        mu, sd = mean(base), pstdev(base)
        z = (last - mu) / max(sd, 0.75)
        if last >= min_count and z >= z_threshold:
            a = areas[aid]
            if state and a.state != state:
                continue
            out.append({"area_id": aid, "area": a.name, "district": a.district, "state": a.state, "country": a.country_code,
                        "sector": sector, "last_week": last, "baseline_weekly_mean": round(mu, 1), "z": round(z, 1),
                        "series": series, "lat": a.lat, "lng": a.lng,
                        "severity": "critical" if z >= 4 else "high",
                        "message": ALERT_TEXT.get(sector, "Unusual spike in reports.")})
    return sorted(out, key=lambda x: x["z"], reverse=True)
