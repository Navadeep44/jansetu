"""Builds the demo dataset: 3 live BRICS nodes (India, Brazil, South Africa) with ~50 planning
areas, several thousand multilingual citizen requests over 12 months, existing investment plans,
completed projects for impact measurement, and injected events (disease spike, power-cut
anger, coordinated campaign) so every feature can be demonstrated.

Run:  python -m app.seed.seed"""
import random
from collections import defaultdict
from datetime import datetime, timedelta

from app.core.database import Base, SessionLocal, engine
from app.models import (Area, AuditLog, CitizenRequest, Country, DemandCluster, IndicatorHistory, Notification,
                        Project)
from app.core.i18n import t
from app.services import analytics_cache, clustering, privacy, recommender
from app.services.ai.extraction import rule_extract
from app.services.ai.lexicon import sector_sdg
from app.services.pipeline import new_tracking_id
from app.seed.geography import ADMIN_PREFIX, AREAS, COUNTRIES
from app.seed.templates import AFFLUENT, CAMPAIGN, COMMUNITY, T

RNG = random.Random(2026)
NOW = datetime.utcnow().replace(microsecond=0)
SECTORS = ["water", "roads", "electricity", "health", "education", "sanitation"]
SECTOR_RATE = {"water": 1.2, "roads": 1.0, "electricity": 0.9, "health": 0.8, "education": 0.55, "sanitation": 1.0}
BY_LANG = defaultdict(list)
for _row in T:
    BY_LANG[(_row[0], _row[1])].append(_row)
_EXTRACT_CACHE: dict = {}

CHANNELS = {
    ("IN", "rural"): {"ivr": 30, "whatsapp": 22, "assisted": 25, "sms": 10, "web": 5, "telegram": 3, "community": 5},
    ("IN", "urban"): {"whatsapp": 42, "web": 20, "ivr": 15, "sms": 10, "telegram": 6, "assisted": 7},
    ("BR", "urban"): {"whatsapp": 48, "web": 22, "import": 18, "ivr": 6, "telegram": 6},
    ("BR", "rural"): {"whatsapp": 45, "ivr": 20, "web": 15, "assisted": 20},
    ("ZA", "urban"): {"whatsapp": 58, "ivr": 15, "sms": 12, "web": 10, "assisted": 5},
}

PLANS = [
    # code, area, sector, title, cost_local, status, beneficiaries, started_days_ago, completed_days_ago
    ("PLAN-IN-001", "Vasant Vihar", "roads", "Decorative footpaths and road resurfacing, Vasant Vihar", 12e7, "planned", 15000, None, None),
    ("PLAN-IN-002", "Greater Kailash", "electricity", "Smart LED street-light replacement, Greater Kailash", 6e7, "sanctioned", 22000, None, None),
    ("PLAN-IN-003", "Adilabad Urban", "roads", "Road widening and central median, Adilabad town", 18e7, "sanctioned", 40000, None, None),
    ("PLAN-IN-004", "Koraput Town", "roads", "Ring-road beautification, Koraput", 9e7, "planned", 20000, None, None),
    ("PLAN-IN-005", "Seelampur", "sanitation", "Covered drains phase 1, Seelampur", 7.5e7, "in_progress", 90000, 70, None),
    ("PLAN-IN-006", "Utnoor", "health", "PHC upgrade to Ayushman Arogya Mandir, Utnoor", 3e7, "sanctioned", 30000, None, None),
    ("PLAN-IN-007", "Jeypore", "education", "Smart classrooms, Jeypore", 2.5e7, "planned", 6000, None, None),
    ("PLAN-IN-008", "Jahangirpuri", "water", "Piped water network and ATM water kiosks, Jahangirpuri", 14e7, "completed", 120000, 330, 150),
    ("PLAN-IN-009", "Indervelly", "roads", "PMGSY all-weather road link, Indervelly (6.2 km)", 6.4e7, "completed", 21000, 400, 210),
    ("PLAN-IN-010", "Sangam Vihar", "water", "Piped water network phase 2, Sangam Vihar", 40e7, "in_progress", 250000, 120, None),
    ("PLAN-BR-001", "Moema", "roads", "Recapeamento de vias, Moema", 22e6, "sanctioned", 60000, None, None),
    ("PLAN-BR-002", "Pinheiros", "electricity", "Nova iluminação LED, Pinheiros", 8e6, "planned", 45000, None, None),
    ("PLAN-BR-003", "Vila Mariana", "roads", "Requalificação de calçadas, Vila Mariana", 12e6, "planned", 70000, None, None),
    ("PLAN-BR-004", "Grajaú", "sanitation", "Canalização de córrego e coleta de esgoto, Grajaú", 35e6, "in_progress", 110000, 90, None),
    ("PLAN-BR-005", "Capão Redondo", "sanitation", "Rede de esgoto e drenagem, Capão Redondo", 28e6, "completed", 95000, 360, 180),
    ("PLAN-BR-006", "Jardim Ângela", "health", "Nova UBS, Jardim Ângela", 6e6, "sanctioned", 40000, None, None),
    ("PLAN-ZA-001", "Sandton", "roads", "Road resurfacing, Sandton CBD", 60e6, "sanctioned", 90000, None, None),
    ("PLAN-ZA-002", "Midrand", "electricity", "Smart street-lighting, Midrand", 25e6, "planned", 60000, None, None),
    ("PLAN-ZA-003", "Diepsloot", "water", "Bulk water pipeline phase 1, Diepsloot", 120e6, "in_progress", 150000, 100, None),
    ("PLAN-ZA-004", "Alexandra", "electricity", "Electrification and illegal-connection regularisation, Alexandra", 45e6, "completed", 110000, 320, 150),
    ("PLAN-ZA-005", "Soweto", "electricity", "Substation refurbishment, Soweto", 80e6, "planned", 400000, None, None),
]
IMPROVED = {("Jahangirpuri", "water"): 0.40, ("Indervelly", "roads"): 0.30, ("Capão Redondo", "sanitation"): 0.32,
            ("Alexandra", "electricity"): 0.40}
SPIKES = [("Seelampur", "sanitation", 16), ("Soweto", "electricity", 24), ("Diepsloot", "water", 12)]
GOOD_CLOSURE = {
    "water": "Borewell repaired and piped supply commissioned; water tested safe by the district lab.",
    "roads": "All-weather road laid and culvert constructed; bus service restored.",
    "sanitation": "Covered drains constructed and sewer line connected; area cleaned and disinfected.",
    "electricity": "New transformer installed and connections regularised; supply restored 22 hours a day.",
}


def _extract(text):
    if text not in _EXTRACT_CACHE:
        _EXTRACT_CACHE[text] = rule_extract(text)
    return _EXTRACT_CACHE[text]


def _pick(weights: dict):
    keys = list(weights)
    return RNG.choices(keys, weights=[weights[k] for k in keys])[0]


def _lang_for(area: Area, sector: str) -> str:
    langs = [l for l in area.primary_languages if BY_LANG.get((l, sector))]
    if not langs:
        return "en"
    w = [0.6] + [0.4 / max(1, len(langs) - 1)] * (len(langs) - 1)
    return RNG.choices(langs, weights=w[: len(langs)])[0]


def _make(db, area, sector, template, created, hh_id, channel=None, supporters=1, flags=None):
    lang, _, text, english = template
    x = _extract(text)
    channel = channel or _pick(CHANNELS.get((area.country_code, area.setting), CHANNELS[("ZA", "urban")]))
    female_p = 0.6 if channel in ("assisted", "community") else 0.42
    roll = RNG.random()
    gender = "female" if roll < female_p else ("male" if roll < 0.92 else "undisclosed")
    r = CitizenRequest(
        tracking_id=new_tracking_id(area.country_code), channel=channel, language=lang, original_text=text,
        redacted_text=privacy.redact(text), translated_text=english or text,
        translation_mode="source" if lang == "en" else "reference", country_code=area.country_code, area_id=area.id,
        lat=area.lat + RNG.uniform(-0.03, 0.03), lng=area.lng + RNG.uniform(-0.03, 0.03), category=sector,
        subcategory=x["subcategory"] if x["category"] == sector else "general", request_type=x["request_type"],
        severity=x["severity"], affected_people=x["affected_people"], vulnerable_groups=x["vulnerable_groups"],
        sdg=sector_sdg(sector), confidence=max(0.55, x["confidence"]),
        extraction_mode="rules", household_hash=privacy.household_hash(f"hh-{area.id}-{hh_id}"),
        anonymous=RNG.random() < 0.08, gender=gender,
        assisted_by=(f"ASHA-{area.id:03d}-{RNG.randint(1, 9)}" if channel == "assisted" and area.country_code == "IN"
                     else f"CHW-{area.id:03d}" if channel == "assisted" else None),
        supporters=supporters, flags=list(flags or []), status="clustered", created_at=created, updated_at=created,
    )
    r.area = area
    db.add(r)
    return r


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    for c in COUNTRIES:
        db.add(Country(**c))
    areas = {}
    for (cc, state, district, name, aliases, level, setting, lat, lng, pop, hh, vul, conn, nl, infra, langs) in AREAS:
        a = Area(country_code=cc, state=state, district=district, name=name, aliases=aliases, level=level, setting=setting,
                 admin_code=f"{ADMIN_PREFIX[cc]}-{len(areas) + 1:04d}", lat=lat, lng=lng, population=pop, households=hh,
                 vulnerability=vul, connectivity=conn, nightlights=nl, infra=infra, primary_languages=langs)
        db.add(a)
        areas[name] = a
    db.flush()

    # indicator history (Mission Antyodaya-style annual surveys)
    for a in areas.values():
        for s in SECTORS:
            now_v = a.infra[s]
            before = IMPROVED.get((a.name, s))
            for y in range(2022, 2027):
                v = (before if before is not None and y < 2026 else now_v - 0.015 * (2026 - y)) + RNG.uniform(-0.01, 0.01)
                db.add(IndicatorHistory(area_id=a.id, sector=s, year=y, value=round(max(0.02, min(0.99, v)), 3)))

    plan_rows = {(p[1], p[2]): p for p in PLANS}
    requests: list[CitizenRequest] = []
    for a in areas.values():
        pool = max(25, int(a.households ** 0.55))
        for s in SECTORS:
            plan = plan_rows.get((a.name, s))
            deficit = 1 - (IMPROVED.get((a.name, s)) or a.infra[s])
            lam = (a.households / 1000) ** 0.6 * deficit ** 1.4 * a.connectivity ** 1.5 * 42 * SECTOR_RATE[s]
            n = min(170, int(RNG.gauss(lam, lam * 0.15)))
            for _ in range(max(0, n)):
                created = NOW - timedelta(days=RNG.uniform(0, 365) ** 1.05 / 365 ** 0.05, hours=RNG.uniform(0, 23))
                if plan and plan[8] is not None and created > NOW - timedelta(days=plan[8]) and RNG.random() > 0.2:
                    continue  # project completed: complaints drop
                lang = _lang_for(a, s)
                tpl = RNG.choice(BY_LANG[(lang, s)])
                requests.append(_make(db, a, s, tpl, created, RNG.randint(1, pool)))
            if a.vulnerability < 0.2 and s in ("roads", "electricity"):  # affluent 'loud' convenience complaints
                loud = int((a.households / 1000) ** 0.6 * a.connectivity ** 2 * 9)
                opts = [x for x in AFFLUENT if x[1] == s and x[0] in a.primary_languages] or [x for x in AFFLUENT if x[1] == s and x[0] == "en"]
                for _ in range(loud):
                    created = NOW - timedelta(days=RNG.uniform(0, 365))
                    requests.append(_make(db, a, s, RNG.choice(opts), created, RNG.randint(1, pool), channel=RNG.choice(["web", "whatsapp", "telegram"])))

    # injected events for early warning
    for name, sector, k in SPIKES:
        a = areas[name]
        for i in range(k):
            lang = _lang_for(a, sector)
            tpl = RNG.choice(BY_LANG[(lang, sector)])
            requests.append(_make(db, a, sector, tpl, NOW - timedelta(days=RNG.uniform(0, 6)), 5000 + i))

    # coordinated campaign (anti-gaming demo): identical text, many 'households', within hours
    vm = areas["Vila Mariana"]
    base = NOW - timedelta(days=9)
    for i in range(14):
        requests.append(_make(db, vm, "roads", CAMPAIGN, base + timedelta(minutes=17 * i), 9000 + i, channel="whatsapp", flags=["coordinated"]))

    # Gram Sabha / community-meeting demands
    for (aname, lang, text, english, sup) in COMMUNITY:
        a = areas[aname]
        x = _extract(text)
        requests.append(_make(db, a, x["category"] if x["category"] != "other" else "roads", (lang, None, text, english),
                              NOW - timedelta(days=RNG.randint(20, 80)), 7000 + len(requests), channel="community", supporters=sup))

    db.flush()

    # ---- cluster in bulk -------------------------------------------------------------------
    groups = defaultdict(list)
    for r in requests:
        groups[(r.area_id, r.category, r.subcategory)].append(r)
    by_area_cat = defaultdict(list)
    for key in list(groups):
        by_area_cat[(key[0], key[1])].append(key)
    clusters = {}
    for (aid, cat), keys in by_area_cat.items():
        specific = [k for k in keys if k[2] != "general"]
        target_for_general = max(specific, key=lambda k: len(groups[k])) if specific else None
        for k in keys:
            if k[2] == "general" and target_for_general:
                continue
            first = groups[k][0]
            c = DemandCluster(country_code=first.country_code, area_id=aid, category=cat, subcategory=k[2], title="")
            c.area = first.area
            db.add(c)
            db.flush()
            clusters[k] = c
            for r in groups[k]:
                r.cluster_id = c.id
        if target_for_general and (aid, cat, "general") in groups:
            for r in groups[(aid, cat, "general")]:
                r.cluster_id = clusters[target_for_general].id
    db.flush()
    for c in clusters.values():
        clustering.recompute(db, c)

    # ---- existing investment plans + project lifecycle ---------------------------------------
    for code, aname, sector, title, cost, status, ben, started, completed in PLANS:
        a = areas[aname]
        p = Project(code=code, source="plan", country_code=a.country_code, area_id=a.id, sector=sector, title=title,
                    description=f"Existing public investment plan item ({'GPDP / state budget' if a.country_code == 'IN' else 'PPA / municipal budget' if a.country_code == 'BR' else 'Municipal IDP'}).",
                    scheme=recommender.SCHEMES[a.country_code][sector], sdg=sector_sdg(sector), cost_local=cost,
                    cost_usd=recommender.to_usd(cost, a.country_code), beneficiaries=ben, status=status,
                    created_at=NOW - timedelta(days=(started or 60) + 30),
                    started_at=NOW - timedelta(days=started) if started else None,
                    completed_at=NOW - timedelta(days=completed) if completed else None)
        db.add(p)
        area_reqs = [r for r in requests if r.area_id == a.id and r.category == sector]
        for r in area_reqs:
            if status == "completed" and r.created_at < p.completed_at:
                verified = RNG.random() < 0.82
                r.status = "closed" if verified else "reopened"
                r.closure_note = GOOD_CLOSURE[sector]
                r.citizen_verified = verified
                r.citizen_rating = RNG.choice([4, 5, 5, 4, 3]) if verified else RNG.choice([1, 2])
                r.closed_at = p.completed_at + timedelta(days=RNG.randint(1, 20))
            elif status == "in_progress" and r.created_at < NOW - timedelta(days=20):
                r.status = "in_progress"
        cl_ids = {r.cluster_id for r in area_reqs if r.cluster_id}
        for cid in cl_ids:
            c = db.get(DemandCluster, cid)
            c.status = "resolved" if status == "completed" else ("in_progress" if status == "in_progress" else "in_plan")

    # formulaic closures ('Your grievance has been disposed') in Delhi and Bawana
    for r in [r for r in requests if r.area and r.area.name in ("Bawana", "Mangolpuri") and r.category in ("water", "sanitation")][:18]:
        r.status = "resolved_pending_verification"
        r.closure_note = "Your grievance has been disposed. Everything is in order as per report of field staff."
        r.closure_flag = "formulaic_closure"
        r.closed_at = r.created_at + timedelta(days=RNG.randint(10, 25))

    # a handful of items needing human review (low confidence / urgent safety / no location)
    review_msgs = [
        ("en", "Please help us sir, nobody listens to us here.", ["low_confidence"], "Utnoor"),
        ("en", "Electric wire fallen on the road near the school, children could be electrocuted!", ["urgent_safety"], "Soweto"),
        ("hi", "साहब हमारी कोई नहीं सुनता, कृपया मदद करें।", ["low_confidence"], "Seelampur"),
        ("pt", "Ninguém resolve nada aqui, estamos abandonados.", ["low_confidence"], "Grajaú"),
    ]
    for lang, text, flags, aname in review_msgs:
        a = areas[aname]
        x = rule_extract(text)
        r = CitizenRequest(tracking_id=new_tracking_id(a.country_code), channel="whatsapp", language=lang, original_text=text,
                           redacted_text=text, translated_text=text if lang == "en" else x["translated_text"],
                           country_code=a.country_code, area_id=a.id, lat=a.lat, lng=a.lng, category=x["category"],
                           subcategory=x["subcategory"], severity=x["severity"], sdg=x["sdg"], confidence=x["confidence"],
                           household_hash=privacy.household_hash(text), flags=flags + x["flags"], status="needs_review",
                           review_reason=", ".join(flags), created_at=NOW - timedelta(hours=RNG.randint(2, 40)))
        db.add(r)
    tel = rule_extract("మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది.")
    db.add(CitizenRequest(tracking_id=new_tracking_id("IN"), channel="whatsapp", language="te",
                          original_text="మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది.", redacted_text="మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది.",
                          translated_text=tel["translated_text"], country_code="IN", category="water", subcategory=tel["subcategory"],
                          severity=tel["severity"], sdg="SDG 6", confidence=tel["confidence"], household_hash=privacy.household_hash("loc"),
                          flags=["needs_location"], status="needs_review", review_reason="needs_location",
                          created_at=NOW - timedelta(hours=5)))

    # ---- persona tracking IDs for the live demo ----------------------------------------------
    demo = [
        ("JS-IN-LAKSH1", "Narnoor", "roads", BY_LANG[("te", "roads")][0], "assisted", 40, "female"),
        ("JS-IN-RAMES1", "Bawana", "sanitation", BY_LANG[("bho", "sanitation")][0], "ivr", 55, "male"),
        ("JS-BR-MARIA1", "Capão Redondo", "electricity", BY_LANG[("pt", "electricity")][0], "whatsapp", 30, "female"),
        ("JS-ZA-THAND1", "Soweto", "electricity", BY_LANG[("zu", "electricity")][0], "whatsapp", 3, "female"),
    ]
    demo_reqs = {}
    for tid, aname, sector, tpl, ch, days, gender in demo:
        a = areas[aname]
        r = _make(db, a, sector, tpl, NOW - timedelta(days=days), f"demo-{tid}", channel=ch)
        r.tracking_id, r.gender = tid, gender
        cands = [c for k, c in clusters.items() if k[0] == a.id and k[1] == sector]
        cl = max(cands, key=lambda c: c.unique_households) if cands else None
        if cl:
            r.cluster_id = cl.id
        demo_reqs[tid] = r
    db.flush()
    rm = demo_reqs["JS-IN-RAMES1"]
    rm.status, rm.closure_flag = "resolved_pending_verification", "formulaic_closure"
    rm.closure_note = "Your grievance has been disposed. Everything is in order."
    for r in demo_reqs.values():
        c = db.get(DemandCluster, r.cluster_id) if r.cluster_id else None
        if c:
            clustering.recompute(db, c)
        others = max(0, (c.unique_households if c else 1) - 1)
        db.add(Notification(request_id=r.id, channel=r.channel, language=r.language, kind="ack",
                            message=t("ack", r.language, tid=r.tracking_id, category=r.category, n=others, area=r.area.name),
                            delivered=True, created_at=r.created_at + timedelta(minutes=1)))
    db.add(Notification(request_id=rm.id, channel="ivr", language="bho", kind="resolved",
                        message=t("resolved", "bho", tid=rm.tracking_id), delivered=True, created_at=NOW - timedelta(days=5)))
    db.commit()

    # ---- AI recommendations, then a couple of human decisions ---------------------------------
    analytics_cache.bump()
    n = recommender.regenerate(db)
    recs = db.query(Project).filter(Project.source == "recommended").order_by(Project.score.desc()).all()
    rec_clusters = {p.cluster_id: p for p in recs if p.cluster_id}
    for r in db.query(CitizenRequest).filter(CitizenRequest.cluster_id.in_(list(rec_clusters)), CitizenRequest.status == "clustered").all():
        r.status = "in_plan"
    lak = db.query(CitizenRequest).filter_by(tracking_id="JS-IN-LAKSH1").first()
    if lak and lak.cluster_id in rec_clusters:
        db.add(Notification(request_id=lak.id, channel=lak.channel, language=lak.language, kind="in_plan",
                            message=t("in_plan", lak.language, tid=lak.tracking_id, project=rec_clusters[lak.cluster_id].title),
                            delivered=True, created_at=NOW - timedelta(days=2)))
    lak_pid = rec_clusters[lak.cluster_id].id if lak and lak.cluster_id in rec_clusters else -1
    for country, reason in (("IN", "Highest need-gap in district; convergence with PMGSY confirmed by DRDA."),
                            ("BR", "Aprovado no ciclo do PPA; alinhado ao Novo PAC.")):
        top = next((p for p in recs if p.country_code == country and p.id != lak_pid), None)
        if top:
            top.status, top.decision_reason, top.decided_by = "approved", reason, "district"
            db.add(AuditLog(actor_role="district", action="approve_project", entity="project", entity_id=top.code,
                            detail={"reason": reason, "score": top.score}))
    db.commit()
    analytics_cache.bump()
    total = db.query(CitizenRequest).count()
    print(f"Seeded {len(areas)} areas, {total} requests, {len(clusters)} clusters, {len(PLANS)} plan items, {n} recommendations.")
    db.close()


if __name__ == "__main__":
    run()
