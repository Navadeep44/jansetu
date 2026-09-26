"""Geo-resolution: GPS pin -> nearest planning area, or spoken place names / landmarks
(in any script) -> area via alias + fuzzy matching against the admin gazetteer."""
import math
import re
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models import Area


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_area(db: Session, lat: float, lng: float, max_km: float = 40.0, country: str | None = None):
    q = db.query(Area)
    if country:
        q = q.filter(Area.country_code == country)
    best, best_d = None, 1e9
    for a in q.all():
        d = haversine_km(lat, lng, a.lat, a.lng)
        if d < best_d:
            best, best_d = a, d
    return (best, round(best_d, 1)) if best and best_d <= max_km else (None, None)


def _norm(s: str) -> str:
    return re.sub(r"[^\w\s]", " ", (s or "").lower()).strip()


def resolve_text(db: Session, text: str, country: str | None = None, extra_mentions: list[str] | None = None):
    """Returns (area, confidence, matched_name)."""
    low = _norm(text)
    tokens = set(low.split())
    q = db.query(Area)
    if country:
        q = q.filter(Area.country_code == country)
    best, best_score, matched = None, 0.0, ""
    mentions = [_norm(m) for m in (extra_mentions or []) if m]
    for a in q.all():
        names = [a.name] + list(a.aliases or [])
        for n in names:
            nn = _norm(n)
            if not nn:
                continue
            if nn in low:
                score = 0.95
            else:
                score = 0.0
                for tok in tokens | set(mentions):
                    if len(tok) >= 4:
                        r = SequenceMatcher(None, tok, nn).ratio()
                        if r > score:
                            score = r
                score = score * 0.9 if score >= 0.82 else 0.0
            if score > best_score:
                best, best_score, matched = a, score, n
    return best, round(best_score, 2), matched
