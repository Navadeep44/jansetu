"""From complaints to DEMAND: requests about the same need in the same place are merged
into one DemandCluster. Priority counts unique households, never raw messages."""
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import CitizenRequest, DemandCluster
from app.services.ai.extraction import SUB_LABELS
from app.services.ai.lexicon import sector_label


def _title(sub: str, sector: str, area_name: str) -> str:
    label = SUB_LABELS.get(sub) if sub != "general" else None
    label = label or sector_label(sector).lower()
    return f"{label[0].upper() + label[1:]} in {area_name}"


def find_or_create(db: Session, req: CitizenRequest) -> DemandCluster | None:
    if not req.area_id or req.category == "other":
        return None
    q = db.query(DemandCluster).filter(
        DemandCluster.area_id == req.area_id, DemandCluster.category == req.category,
        DemandCluster.status != "resolved")
    candidates = q.all()
    match = next((c for c in candidates if c.subcategory == req.subcategory), None)
    if not match and req.subcategory == "general" and candidates:
        match = max(candidates, key=lambda c: c.request_count)
    if not match and candidates:
        generic = next((c for c in candidates if c.subcategory == "general"), None)
        if generic:
            generic.subcategory = req.subcategory
            match = generic
    if match:
        return match
    c = DemandCluster(country_code=req.country_code, area_id=req.area_id, category=req.category,
                      subcategory=req.subcategory, title=_title(req.subcategory, req.category, req.area.name if req.area else ""),
                      first_seen=req.created_at, last_seen=req.created_at)
    db.add(c)
    db.flush()
    return c


def recompute(db: Session, cluster: DemandCluster) -> DemandCluster:
    reqs = db.query(CitizenRequest).filter(CitizenRequest.cluster_id == cluster.id).all()
    if not reqs:
        return cluster
    cluster.request_count = len(reqs)
    cluster.unique_households = len({r.household_hash for r in reqs})
    cluster.supporters = sum(max(1, r.supporters) for r in reqs)
    cluster.severity_avg = round(sum(r.severity for r in reqs) / len(reqs), 2)
    cluster.languages = [l for l, _ in Counter(r.language for r in reqs).most_common()]
    cluster.channels = dict(Counter(r.channel for r in reqs))
    cluster.vulnerable_groups = sorted({g for r in reqs for g in (r.vulnerable_groups or [])})
    cluster.campaign_share = round(sum(1 for r in reqs if "coordinated" in (r.flags or [])) / len(reqs), 2)
    cluster.first_seen = min(r.created_at for r in reqs)
    cluster.last_seen = max(r.created_at for r in reqs)
    area = cluster.area.name if cluster.area else ""
    cluster.title = _title(cluster.subcategory, cluster.category, area)
    vg = ", ".join(g.replace("_", " ") for g in cluster.vulnerable_groups) or "none reported"
    cluster.summary = (f"{cluster.unique_households} households raised this need through {cluster.request_count} reports "
                       f"in {len(cluster.languages)} language(s) via {', '.join(cluster.channels)}. "
                       f"Average severity {cluster.severity_avg}/5. Vulnerable groups mentioned: {vg}.")
    return cluster


def detect_coordination(db: Session, req: CitizenRequest, window_hours: int = 48, threshold: int = 4) -> bool:
    """Flags near-identical messages from many different households in a short window
    (possible orchestrated campaign). Flagged reports are still kept and shown, but
    weighted down in priority scoring and surfaced to officers for review."""
    if not req.area_id:
        return False
    since = (req.created_at or datetime.utcnow()) - timedelta(hours=window_hours)
    norm = " ".join((req.redacted_text or "").lower().split())
    if len(norm) < 15:
        return False
    recent = db.query(CitizenRequest).filter(
        CitizenRequest.area_id == req.area_id, CitizenRequest.created_at >= since,
        CitizenRequest.household_hash != req.household_hash).all()
    same = [r for r in recent if " ".join((r.redacted_text or "").lower().split()) == norm]
    if len(same) >= threshold:
        for r in same:
            if "coordinated" not in (r.flags or []):
                r.flags = list(r.flags or []) + ["coordinated"]
        return True
    return False
