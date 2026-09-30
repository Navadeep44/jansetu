"""Natural-language questions from policymakers, in any language, answered over the live data.

Safety by design: the question is converted into a small, validated *intent* (never raw SQL),
which is then executed by trusted analytics functions. An LLM (if configured) only parses the
intent; the offline parser handles English, Hindi and Telugu keywords."""
import re

from sqlalchemy.orm import Session

from app.models import Area
from app.services import impact, providers_proxy, scoring, trends
from app.services.ai.extraction import _score_sectors
from app.services.ai.lexicon import SECTORS

INTENTS = ["top_need", "unplanned_need", "silent_zones", "hotspots", "misaligned_spending", "alerts", "impact"]
STATE_WORDS = {"Telangana": ["telangana", "तेलंगाना", "తెలంగాణ"], "Odisha": ["odisha", "orissa", "ओडिशा", "ఒడిశా", "ଓଡ଼ିଶା"],
               "Delhi": ["delhi", "दिल्ली", "ఢిల్లీ"], "Bihar": ["bihar", "बिहार", "బీహార్", "బిహార్"],
               "Uttar Pradesh": ["uttar pradesh", "उत्तर प्रदेश", "ఉత్తర ప్రదేశ్", " up "]}
DISTRICT_WORDS = {"Adilabad": ["आदिलाबाद", "ఆదిలాబాద్"], "Koraput": ["कोरापुट", "కోరాపుట్"], "Hyderabad": ["हैदराबाद", "హైదరాబాద్"],
                  "Gaya": ["गया", "గయ"], "Bahraich": ["बहराइच", "బహ్రైచ్"]}
INTENT_WORDS = {
    "silent_zones": ["silent", "unheard", "under-report", "underreport", "no one complain", "nobody complain", "invisible",
                     "अनसुन", "चुप", "कोई शिकायत नहीं", "నిశ్శబ్ద", "ఎవరూ ఫిర్యాదు"],
    "unplanned_need": ["no plan", "not planned", "unplanned", "without plan", "no project", "no works", "not covered", "nothing planned",
                       "बिना योजना", "कोई योजना नहीं", "योजना नहीं", "ప్రణాళిక లేని", "ప్లాన్ లేని"],
    "misaligned_spending": ["misalign", "wasted", "wrong place", "low need", "spending", "budget going", "गलत खर्च", "पैसा कहाँ", "ఖర్చు", "బడ్జెట్"],
    "alerts": ["spike", "sudden", "alert", "outbreak", "early warning", "surge", "protest", "unrest", "अचानक", "चेतावनी", "హెచ్చరిక", "అకస్మాత్తుగా"],
    "hotspots": ["hotspot", "hot spot", "cluster of", "concentrat", "where are most complaints", "हॉटस्पॉट", "హాట్‌స్పాట్"],
    "impact": ["impact", "did it work", "did the project", "projects work", "worked", "work?", "result", "outcome", "before and after", "effect", "असर", "नतीजा", "ఫలితం", "ప్రభావం"],
}


def _geo_filters(db: Session, q: str) -> dict:
    low = q.lower()
    f = {}
    padded = f" {low} "
    for st, words in STATE_WORDS.items():
        if any(w in padded for w in words):
            f["state"] = st
    for d, words in DISTRICT_WORDS.items():
        if any(w in low for w in words):
            f["district"] = d
    for a in db.query(Area).all():
        for field in ("state", "district"):
            v = getattr(a, field)
            if v and v.lower() in low:
                f[field] = v
        if a.name.lower() in low and len(a.name) > 3:
            f["area"] = a.name
    return f


def parse_offline(db: Session, question: str) -> dict:
    low = question.lower()
    intent = "top_need"
    for name, words in INTENT_WORDS.items():
        if any(w in low for w in words):
            intent = name
            break
    scores = _score_sectors(low)
    sector = max(scores, key=scores.get) if scores else None
    m = re.search(r"\btop\s*(\d{1,2})\b|\b(\d{1,2})\s*(districts|areas|places|villages|wards)", low)
    limit = int(m.group(1) or m.group(2)) if m else 10
    return {"intent": intent, "sector": sector, "limit": limit, **_geo_filters(db, question), "parser": "offline"}


LLM_PROMPT = f"""Convert a policymaker's question into JSON with keys: intent (one of {INTENTS}),
sector (one of {list(SECTORS)} or null), state (Indian state name or null), district (or null),
limit (int, default 10). Return JSON only."""


def parse(db: Session, question: str) -> dict:
    base = parse_offline(db, question)
    llm = providers_proxy.chat_json(LLM_PROMPT, question)
    if isinstance(llm, dict) and llm.get("intent") in INTENTS:
        merged = {**base, **{k: v for k, v in llm.items() if v not in (None, "")}, "parser": "llm"}
        if merged.get("sector") not in SECTORS:
            merged["sector"] = base.get("sector")
        return merged
    return base


def _match(r: dict, it: dict) -> bool:
    return all(not it.get(k) or str(r.get(k, "")).lower() == str(it[k]).lower()
               for k in ("state", "district", "area")) and (not it.get("sector") or r.get("sector") == it["sector"])


def answer(db: Session, question: str) -> dict:
    it = parse(db, question)
    lim = max(1, min(int(it.get("limit") or 10), 50))
    sector_name = SECTORS[it["sector"]]["label"].lower() if it.get("sector") in SECTORS else "all sectors"
    it.pop("country", None)
    where = it.get("district") or it.get("state") or it.get("area") or "India"
    cols = ["area", "district", "state", "sector", "ngi", "deficit", "effective_households", "vulnerability"]
    if it["intent"] in ("top_need", "unplanned_need"):
        rows = [r for r in scoring.need_gap(db) if _match(r, it)]
        if it["intent"] == "unplanned_need":
            rows = [r for r in rows if r["covered"] == 0]
        rows = rows[:lim]
        text = (f"Top {len(rows)} {'unplanned ' if it['intent'] == 'unplanned_need' else ''}needs for {sector_name} in {where}. "
                + (f"Highest: {rows[0]['area']} ({rows[0]['district']}) with Need-Gap Index {rows[0]['ngi']}." if rows else "No matches."))
    elif it["intent"] == "silent_zones":
        rows = [r for r in scoring.silent_zones(db) if _match(r, it)][:lim]
        cols = cols + ["silent_score", "recommended_outreach"]
        text = (f"{len(rows)} silent zone(s) for {sector_name} in {where}: severe deficits but few complaints. "
                "These communities are under-heard, not well-served.")
    elif it["intent"] == "hotspots":
        rows = [a for a in scoring.area_summary(db, sector=it.get("sector"))
                if a["hotspot"]["class"].startswith("hot") and all(not it.get(k) or str(a.get(k, "")).lower() == str(it[k]).lower() for k in ("state", "district"))][:lim]
        cols = ["area", "district", "state", "demand_per_1000hh", "ngi_max", "top_sector"]
        for r in rows:
            r["gi_z"] = r["hotspot"]["z"]
        cols.append("gi_z")
        text = f"{len(rows)} statistically significant demand hotspot(s) (Getis-Ord Gi*) for {sector_name} in {where}."
    elif it["intent"] == "misaligned_spending":
        al = scoring.alignment(db, state=it.get("state"))
        rows = [p for c, v in al.items() for p in v["misaligned_projects"]
                if not it.get("sector") or p["sector"] == it["sector"]][:lim]
        cols = ["code", "title", "area", "state", "sector", "cost_local", "need_ngi", "national_median_ngi"]
        text = "; ".join(f"{c}: {v['alignment_score']}% of planned budget goes to above-median needs, "
                         f"{round(v['share_to_below_median_need'] * 100)}% to below-median needs" for c, v in al.items())
    elif it["intent"] == "alerts":
        rows = [a for a in trends.alerts(db, state=it.get("state")) if not it.get("sector") or a["sector"] == it["sector"]][:lim]
        cols = ["area", "district", "state", "sector", "last_week", "baseline_weekly_mean", "z", "message"]
        text = f"{len(rows)} early-warning alert(s) in the last week."
    else:
        rows = [r for r in impact.project_impacts(db) if not it.get("sector") or r["sector"] == it["sector"]][:lim]
        for r in rows:
            r["reduction_pct"] = r.get("reduction_pct")
        cols = ["code", "title", "area", "state", "sector", "did_estimate", "reduction_pct"]
        text = f"{len(rows)} completed project(s) with measured impact. Negative DiD = complaints fell faster than in comparison areas."
    return {"question": question, "intent": it, "answer": text, "columns": cols,
            "rows": [{k: r.get(k) for k in cols + ["lat", "lng", "area_id"] if k in r or k in cols} for r in rows]}
