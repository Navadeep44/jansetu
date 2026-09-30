"""Builds the India demo dataset: 5 states (Telangana, Odisha, Delhi, Bihar, Uttar Pradesh), 6 districts and 50 planning
areas across Telugu, Hindi, Odia and Bhojpuri speaking regions, with several thousand multilingual citizen requests over 12 months, existing investment plans,
completed projects for impact measurement, and injected events (disease spike, power-cut
anger, coordinated campaign) so every feature can be demonstrated.

Run:  python -m app.seed.seed"""
import base64
import hashlib
import random
from collections import defaultdict
from datetime import datetime, timedelta

from app.core.database import Base, SessionLocal, engine
from app.core import security
from app.models import (
    Area, AuditLog, CitizenRequest, Country, DemandCluster, IndicatorHistory, Notification,
    Project, ProjectFunding, ProjectExpenditure, ProjectHistory, ProofUpload, StatusHistory, User
)
from app.core.i18n import t
from app.services import analytics_cache, clustering, privacy, recommender
from app.services.ai.extraction import rule_extract
from app.services.ai.lexicon import sector_sdg
from app.services.pipeline import get_department_for_sector, new_tracking_id
from app.seed.geography import ADMIN_PREFIX, AREAS, COUNTRIES
from app.seed.templates import AFFLUENT, CAMPAIGN, COMMUNITY, T

RNG = random.Random(2026)
NOW = datetime.utcnow().replace(microsecond=0)
SECTORS = ["water", "roads", "electricity", "health", "education", "sanitation"]
SECTOR_RATE = {"water": 1.2, "roads": 1.0, "electricity": 0.9, "health": 0.8, "education": 0.55, "sanitation": 1.0}


def _make_proof_svg(sector: str, title: str, area_name: str, date_str: str, lat: float, lng: float) -> str:
    color = {"water": "#0284c7", "roads": "#d97706", "electricity": "#eab308", "sanitation": "#059669", "health": "#dc2626", "education": "#7c3aed"}.get(sector, "#2563eb")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <defs>
        <linearGradient id="g_{sector}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#g_{sector})" rx="12" />
      <rect x="24" y="24" width="752" height="452" fill="none" stroke="{color}" stroke-width="2" stroke-dasharray="6,6" rx="8" opacity="0.6"/>
      <circle cx="80" cy="80" r="28" fill="{color}" opacity="0.2"/>
      <path d="M70 80 L76 86 L90 72" fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="120" y="74" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold">OFFICIAL RESOLUTION PROOF</text>
      <text x="120" y="98" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Verified On-Site by Department Engineer</text>
      <rect x="50" y="140" width="700" height="230" fill="#1e293b" rx="8" stroke="#334155" />
      <text x="75" y="190" fill="#f1f5f9" font-family="system-ui, sans-serif" font-size="20" font-weight="600">{title}</text>
      <text x="75" y="230" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="15">📍 Location: {area_name} ({lat:.4f}° N, {lng:.4f}° E)</text>
      <text x="75" y="265" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="15">📅 Date Completed: {date_str}</text>
      <text x="75" y="300" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="15">📸 Camera &amp; EXIF: GeoCam Pro v4.2 · F/1.8 · ISO 100 · 1/500s</text>
      <text x="75" y="335" fill="#22c55e" font-family="system-ui, sans-serif" font-size="15" font-weight="bold">✓ Integrity: SHA-256 Checksum Verified &amp; Digitally Signed</text>
      <rect x="50" y="390" width="700" height="60" fill="#0f172a" rx="6" />
      <text x="75" y="426" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">JanSetu Proof-of-Resolution System · Public Audit Record</text>
    </svg>"""
    return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
BY_LANG = defaultdict(list)
for _row in T:
    BY_LANG[(_row[0], _row[1])].append(_row)
_EXTRACT_CACHE: dict = {}
_USED_TRACKING_IDS: set = set()

CHANNELS = {
    ("IN", "rural"): {"ivr": 30, "whatsapp": 22, "assisted": 25, "sms": 10, "web": 5, "telegram": 3, "community": 5},
    ("IN", "urban"): {"whatsapp": 42, "web": 20, "ivr": 15, "sms": 10, "telegram": 6, "assisted": 7},
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
    ("PLAN-IN-011", "Banjara Hills", "roads", "Road resurfacing and decorative lighting, Banjara Hills", 15e7, "sanctioned", 18000, None, None),
    ("PLAN-IN-012", "Jubilee Hills", "roads", "Junction beautification and footpaths, Jubilee Hills", 8e7, "planned", 15000, None, None),
    ("PLAN-IN-013", "Chandrayangutta", "sanitation", "Underground drainage and nala lining, Chandrayangutta", 22e7, "completed", 150000, 360, 170),
    ("PLAN-IN-014", "Gaya Town", "roads", "Riverfront promenade and road widening, Gaya", 20e7, "sanctioned", 60000, None, None),
    ("PLAN-IN-015", "Sherghati", "electricity", "New 33/11 kV substation and feeder separation, Sherghati", 9e7, "completed", 120000, 380, 190),
    ("PLAN-IN-016", "Bodh Gaya", "health", "CHC upgrade and new labour room, Bodh Gaya", 4e7, "in_progress", 90000, 80, None),
    ("PLAN-IN-017", "Bahraich Town", "roads", "Ring road and flyover, Bahraich", 25e7, "planned", 50000, None, None),
    ("PLAN-IN-018", "Kaiserganj", "water", "Jal Jeevan Mission piped supply, Kaiserganj", 12e7, "in_progress", 140000, 110, None),
]
IMPROVED = {("Jahangirpuri", "water"): 0.40, ("Indervelly", "roads"): 0.30, ("Chandrayangutta", "sanitation"): 0.22,
            ("Sherghati", "electricity"): 0.40}
SPIKES = [("Seelampur", "sanitation", 16), ("Malakpet", "electricity", 22), ("Jainoor", "health", 12), ("Gaya Town", "water", 12)]
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
    channel = channel or _pick(CHANNELS.get((area.country_code, area.setting), CHANNELS[("IN", "urban")]))
    female_p = 0.6 if channel in ("assisted", "community") else 0.42
    roll = RNG.random()
    gender = "female" if roll < female_p else ("male" if roll < 0.92 else "undisclosed")
    tid = new_tracking_id(area.country_code)
    while tid in _USED_TRACKING_IDS:
        tid = new_tracking_id(area.country_code)
    _USED_TRACKING_IDS.add(tid)
    r = CitizenRequest(
        tracking_id=tid, channel=channel, language=lang, original_text=text,
        redacted_text=privacy.redact(text), translated_text=english or text,
        translation_mode="source" if lang == "en" else "reference", country_code=area.country_code, area_id=area.id,
        lat=area.lat + RNG.uniform(-0.03, 0.03), lng=area.lng + RNG.uniform(-0.03, 0.03), category=sector,
        subcategory=x["subcategory"] if x["category"] == sector else "general", request_type=x["request_type"],
        severity=x["severity"], affected_people=x["affected_people"], vulnerable_groups=x["vulnerable_groups"],
        sdg=sector_sdg(sector), confidence=max(0.55, x["confidence"]),
        extraction_mode="rules", household_hash=privacy.household_hash(f"hh-{area.id}-{hh_id}"),
        anonymous=RNG.random() < 0.08, gender=gender,
        assisted_by=(f"ASHA-{area.id:03d}-{RNG.randint(1, 9)}" if channel == "assisted" else None),
        supporters=supporters, flags=list(flags or []), status="clustered", created_at=created, updated_at=created,
    )
    r.area = area
    db.add(r)
    return r


def run():
    _USED_TRACKING_IDS.clear()
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    from app.core import security
    security.ensure_default_users(db)
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
    vm = areas["Jubilee Hills"]
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
                    description=f"Existing public investment plan item ({'Viksit Gram Panchayat Plan / state budget' if a.setting == 'rural' else 'Municipal / state budget'}).",
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

    # Seed StatusHistory and ProofUpload for all requests
    officer_names = ["P. Sharma (AE)", "K. Rao (EE)", "M. Deshmukh (Inspector)", "S. Sengupta (Executive Engineer)"]
    for r in requests:
        dept = get_department_for_sector(r.category)
        off = RNG.choice(officer_names)
        r.assigned_officer = off
        r.assigned_department = dept
        
        # Stage 1: Received
        db.add(StatusHistory(
            request_id=r.id,
            status="received",
            stage_label="Received",
            actor_role="citizen",
            actor_name="Citizen",
            department=dept,
            note=f"Grievance recorded via {r.channel}. Tracking ID {r.tracking_id} generated.",
            created_at=r.created_at,
        ))
        
        # Stage 2: Verified & Assigned
        assigned_time = r.created_at + timedelta(hours=RNG.randint(1, 12))
        r.assigned_at = assigned_time
        db.add(StatusHistory(
            request_id=r.id,
            status="assigned",
            stage_label="Verified & Assigned to Officer",
            actor_role="district_officer",
            actor_name="District Grievance Cell",
            department=dept,
            note=f"Assigned to {off} ({dept}) for ground inspection.",
            created_at=assigned_time,
        ))
        
        # Stage 3: In Progress (if past assigned)
        if r.status in ("in_progress", "resolved_pending_verification", "closed", "reopened"):
            in_prog_time = assigned_time + timedelta(days=RNG.randint(1, 4))
            r.in_progress_at = in_prog_time
            db.add(StatusHistory(
                request_id=r.id,
                status="in_progress",
                stage_label="Work In Progress",
                actor_role="field_officer",
                actor_name=off,
                department=dept,
                note=f"Field work commenced on site by {dept} contractors.",
                created_at=in_prog_time,
            ))
            
            # Stage 4: Resolved (if resolved or closed or reopened)
            if r.status in ("resolved_pending_verification", "closed", "reopened") or r.closure_note:
                res_time = r.closed_at or (in_prog_time + timedelta(days=RNG.randint(2, 10)))
                r.resolved_at = res_time
                date_str = res_time.strftime("%d %b %Y")
                area_name = r.area.name if r.area else "Local Area"
                svg_url = _make_proof_svg(r.category, f"{r.category.title()} Infrastructure Work Completed", area_name, date_str, r.lat or 19.34, r.lng or 78.52)
                
                # Add mandatory ProofUpload
                p_upload = ProofUpload(
                    request_id=r.id,
                    officer_id=off.lower().replace(" ", "_"),
                    officer_name=off,
                    department=dept,
                    file_url=svg_url,
                    file_name=f"{r.category}_resolution_proof_{r.tracking_id}.jpg",
                    file_type="photo",
                    file_size=1024 * RNG.randint(350, 950),
                    mime_type="image/jpeg",
                    sha256_hash=hashlib.sha256(f"{r.tracking_id}_{res_time}".encode()).hexdigest(),
                    uploaded_at=res_time,
                    lat=r.lat,
                    lng=r.lng,
                    exif_metadata={"Make": "GeoCam", "Model": "FieldPro-X", "GPSLatitude": r.lat, "GPSLongitude": r.lng, "DateTimeOriginal": date_str},
                    is_suspicious=r.closure_flag == "formulaic_closure",
                    suspicious_reason="Formulaic closure text detected" if r.closure_flag == "formulaic_closure" else "",
                    is_public=False,
                )
                db.add(p_upload)
                r.proof_count = 1
                
                db.add(StatusHistory(
                    request_id=r.id,
                    status="resolved_pending_verification",
                    stage_label="Resolved (Pending Citizen Confirmation)",
                    actor_role="field_officer",
                    actor_name=off,
                    department=dept,
                    note=r.closure_note or "Action Taken Report submitted with geo-tagged photo proof. Awaiting citizen confirmation.",
                    created_at=res_time,
                ))
                
                # Stage 5: Closed or Reopened
                if r.status in ("closed", "closed_verified") or r.citizen_verified is not None:
                    is_fixed = r.citizen_verified if r.citizen_verified is not None else True
                    close_time = res_time + timedelta(days=RNG.randint(1, 5))
                    db.add(StatusHistory(
                        request_id=r.id,
                        status="closed_verified" if is_fixed else "reopened",
                        stage_label="Closed (Confirmed by Citizen)" if is_fixed else "Reopened (Disputed by Citizen)",
                        actor_role="citizen",
                        actor_name="Citizen",
                        department=dept,
                        note="Citizen verified the fix on ground: Satisfied." if is_fixed else "Citizen disputed the resolution: Work incomplete on ground. Case reopened.",
                        created_at=close_time,
                    ))

    # a handful of items needing human review (low confidence / urgent safety / no location)
    review_msgs = [
        ("en", "Please help us sir, nobody listens to us here.", ["low_confidence"], "Utnoor"),
        ("en", "Electric wire fallen on the road near the school, children could be electrocuted!", ["urgent_safety"], "Chandrayangutta"),
        ("hi", "साहब हमारी कोई नहीं सुनता, कृपया मदद करें।", ["low_confidence"], "Seelampur"),
        ("te", "సార్, ఇక్కడ మా మాట ఎవరూ వినడం లేదు, దయచేసి సహాయం చేయండి.", ["low_confidence"], "Amberpet"),
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
        ("JS-IN-SUNIT1", "Mihinpurwa", "health", BY_LANG[("hi", "health")][0], "assisted", 30, "female"),
        ("JS-IN-PRIYA1", "Malakpet", "electricity", BY_LANG[("te", "electricity")][0], "whatsapp", 3, "female"),
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
    used = {lak_pid}
    for state, reason in (("Odisha", "Highest need-gap in district; convergence with PMGSY confirmed by DRDA."),
                          ("Bihar", "Approved in Gram Sabha; included in the Viksit Gram Panchayat Plan with VB-GRAMG works.")):
        top = next((p for p in recs if p.area and p.area.state == state and p.id not in used), None)
        if top:
            used.add(top.id)
        if top:
            top.status, top.decision_reason, top.decided_by = "approved", reason, "district"
            db.add(AuditLog(actor_role="district", action="approve_project", entity="project", entity_id=top.code,
                            detail={"reason": reason, "score": top.score}))
    # ---- Multi-Tier Officer Project Pipeline & Funding Seed -----------------------
    utnoor_area = areas.get("Utnoor") or list(areas.values())[0]
    narnoor_area = areas.get("Narnoor") or utnoor_area
    indervelly_area = areas.get("Indervelly") or utnoor_area
    adilabad_area = areas.get("Adilabad Urban") or utnoor_area
    boath_area = areas.get("Boath") or utnoor_area

    # 1. Proposed Project (Dept -> Collector)
    p_prop = Project(
        code="PRJ-TG-PROP-01",
        source="recommended",
        country_code="IN",
        area_id=utnoor_area.id,
        sector="water",
        title="Utnoor High-Yield Borewell & Overhead Tank Network",
        description="Installation of 4 deep borewells with solar pump sets and a 50,000L overhead distribution tank in Utnoor block.",
        scheme="Mission Bhagiratha / Jal Jeevan Mission",
        sdg="SDG 6",
        cost_local=2500000.0,
        cost_usd=recommender.to_usd(2500000.0, "IN"),
        beneficiaries=1850,
        score=82.5,
        status="proposed",
        proposer_user="dept_water_tg",
        proposed_at=NOW - timedelta(days=12),
        created_at=NOW - timedelta(days=12),
    )
    db.add(p_prop)
    db.flush()
    db.add(ProjectHistory(project_id=p_prop.id, from_status=None, to_status="proposed", actor_id="dept_water_tg", note="Proposed from high-density water demand cluster in Utnoor", timestamp=NOW - timedelta(days=12)))

    # 2. District Approved Project (Collector -> State)
    p_dist = Project(
        code="PRJ-TG-DIST-02",
        source="recommended",
        country_code="IN",
        area_id=narnoor_area.id,
        sector="roads",
        title="Narnoor-Jainoor All-Weather CC Road Convergence",
        description="Construction of 5.8km CC road linking tribal hamlets to the Narnoor primary healthcare sub-centre.",
        scheme="PMGSY Tribal Connectivity",
        sdg="SDG 9",
        cost_local=4800000.0,
        cost_usd=recommender.to_usd(4800000.0, "IN"),
        beneficiaries=3200,
        score=88.0,
        status="district_approved",
        proposer_user="dept_pwd_tg",
        proposed_at=NOW - timedelta(days=20),
        district_approved_at=NOW - timedelta(days=8),
        district_approved_by="collector_adilabad",
        created_at=NOW - timedelta(days=20),
    )
    db.add(p_dist)
    db.flush()
    db.add(ProjectHistory(project_id=p_dist.id, from_status="proposed", to_status="district_approved", actor_id="collector_adilabad", note="Approved by Collector Adilabad for State clearance", timestamp=NOW - timedelta(days=8)))

    # 3. State Approved Project (State -> National)
    p_state = Project(
        code="PRJ-TG-STAT-03",
        source="recommended",
        country_code="IN",
        area_id=indervelly_area.id,
        sector="electricity",
        title="Indervelly 33/11kV Substation Capacity Augmentation",
        description="Additional 5MVA transformer and HT line cabling for agricultural pump sets across 6 panchayats.",
        scheme="Revamped Distribution Sector Scheme (RDSS)",
        sdg="SDG 7",
        cost_local=6200000.0,
        cost_usd=recommender.to_usd(6200000.0, "IN"),
        beneficiaries=4500,
        score=91.5,
        status="state_approved",
        proposer_user="dept_power_tg",
        proposed_at=NOW - timedelta(days=30),
        district_approved_at=NOW - timedelta(days=22),
        district_approved_by="collector_adilabad",
        state_approved_at=NOW - timedelta(days=10),
        state_approved_by="state_telangana",
        created_at=NOW - timedelta(days=30),
    )
    db.add(p_state)
    db.flush()
    db.add(ProjectHistory(project_id=p_state.id, from_status="district_approved", to_status="state_approved", actor_id="state_telangana", note="Cleared by State Planning Board; forwarded to National Commission", timestamp=NOW - timedelta(days=10)))

    # 4. Funded Project (National Funded)
    p_fund = Project(
        code="PRJ-TG-FUND-04",
        source="recommended",
        country_code="IN",
        area_id=adilabad_area.id,
        sector="water",
        title="Adilabad Urban Smart Filtration & Distribution Plant",
        description="Automated rapid sand filtration plant with SCADA monitoring servicing 12,000 households.",
        scheme="AMRUT 2.0 Urban Water Supply",
        sdg="SDG 6",
        cost_local=12000000.0,
        cost_usd=recommender.to_usd(12000000.0, "IN"),
        beneficiaries=12000,
        score=94.0,
        status="funded",
        sanctioned_amount_inr=12000000.0,
        spent_amount_inr=0.0,
        funded_at=NOW - timedelta(days=5),
        funded_by="national_admin",
        created_at=NOW - timedelta(days=45),
    )
    db.add(p_fund)
    db.flush()
    db.add(ProjectFunding(project_id=p_fund.id, sanctioned_amount_inr=12000000.0, funded_by="national_admin", funded_at=NOW - timedelta(days=5)))
    db.add(ProjectHistory(project_id=p_fund.id, from_status="state_approved", to_status="funded", actor_id="national_admin", note="National grant sanctioned under AMRUT 2.0", timestamp=NOW - timedelta(days=5)))

    # 5. In-Execution Project with Expenditures
    p_exec = Project(
        code="PRJ-TG-EXEC-05",
        source="recommended",
        country_code="IN",
        area_id=utnoor_area.id,
        sector="sanitation",
        title="Utnoor Integrated Solid Waste & Bio-Methanation Plant",
        description="Decentralized waste processing facility and community biogas generation unit.",
        scheme="Swachh Bharat Mission (Grameen) Phase II",
        sdg="SDG 6",
        cost_local=3500000.0,
        cost_usd=recommender.to_usd(3500000.0, "IN"),
        beneficiaries=2400,
        score=85.0,
        status="in_execution",
        sanctioned_amount_inr=3500000.0,
        spent_amount_inr=1450000.0,
        funded_at=NOW - timedelta(days=25),
        funded_by="national_admin",
        created_at=NOW - timedelta(days=60),
    )
    db.add(p_exec)
    db.flush()
    db.add(ProjectFunding(project_id=p_exec.id, sanctioned_amount_inr=3500000.0, funded_by="national_admin", funded_at=NOW - timedelta(days=25)))
    db.add(ProjectExpenditure(project_id=p_exec.id, amount_inr=1450000.0, description="Civil structural excavation, foundation slab, and boundary fencing", spent_on=(NOW - timedelta(days=12)).strftime("%Y-%m-%d"), bill_reference="SBM/UTN/2026/V-44", recorded_by="dm_adilabad"))
    db.add(ProjectHistory(project_id=p_exec.id, from_status="funded", to_status="in_execution", actor_id="collector_adilabad", note="First milestone payment recorded; work in execution", timestamp=NOW - timedelta(days=12)))

    # 6. Completed Project
    p_comp = Project(
        code="PRJ-TG-COMP-06",
        source="recommended",
        country_code="IN",
        area_id=boath_area.id,
        sector="health",
        title="Boath 50-Bed Community Health Centre Upgradation",
        description="Addition of neonatal intensive care wing and 24x7 emergency medical trauma care.",
        scheme="National Health Mission (NHM) Infrastructure",
        sdg="SDG 3",
        cost_local=8500000.0,
        cost_usd=recommender.to_usd(8500000.0, "IN"),
        beneficiaries=9500,
        score=96.0,
        status="completed",
        sanctioned_amount_inr=8500000.0,
        spent_amount_inr=8500000.0,
        funded_at=NOW - timedelta(days=90),
        funded_by="national_admin",
        completed_at=NOW - timedelta(days=15),
        created_at=NOW - timedelta(days=120),
    )
    db.add(p_comp)
    db.flush()
    db.add(ProjectFunding(project_id=p_comp.id, sanctioned_amount_inr=8500000.0, funded_by="national_admin", funded_at=NOW - timedelta(days=90)))
    db.add(ProjectExpenditure(project_id=p_comp.id, amount_inr=5000000.0, description="Civil structural renovation and medical gas pipeline installation", spent_on=(NOW - timedelta(days=60)).strftime("%Y-%m-%d"), bill_reference="NHM/BTH/2026/V-12", recorded_by="dm_adilabad"))
    db.add(ProjectExpenditure(project_id=p_comp.id, amount_inr=3500000.0, description="NICU equipment procurement, backup generator, and final commissioning", spent_on=(NOW - timedelta(days=20)).strftime("%Y-%m-%d"), bill_reference="NHM/BTH/2026/V-38", recorded_by="dm_adilabad"))
    db.add(ProjectHistory(project_id=p_comp.id, from_status="in_execution", to_status="completed", actor_id="collector_adilabad", note="Work certified 100% complete and operational", timestamp=NOW - timedelta(days=15)))

    # ---- Field Officers Inbox Linking ---------------------------------------------
    fu = db.query(User).filter_by(username="field_utnoor").first()
    fm = db.query(User).filter_by(username="field_mehrauli").first()

    if fu:
        utnoor_reqs = db.query(CitizenRequest).filter(CitizenRequest.area_id == utnoor_area.id).all()
        for idx, r in enumerate(utnoor_reqs[:14]):
            r.assigned_field_officer_id = fu.id
            r.assigned_officer = fu.name
            r.assigned_department = "water"
            r.block = "Utnoor"
            r.assigned_at = NOW - timedelta(days=idx + 1)
            
            if idx in (0, 1, 2):
                # New / Assigned with active SLA countdown
                r.status = "assigned"
                r.sla_due_at = NOW + timedelta(hours=(idx + 1) * 24)
            elif idx in (3, 4, 5):
                # Work In Progress
                r.status = "in_progress"
                r.sla_due_at = NOW + timedelta(hours=36)
            elif idx in (6, 7):
                # Overdue SLA
                r.status = "in_progress"
                r.sla_due_at = NOW - timedelta(hours=48)
            elif idx in (8, 9):
                # Rework requested
                r.status = "assigned"
                r.rework_note = "Pipe joint weld incomplete on eastern section. Re-seal and submit fresh photo proof."
                r.sla_due_at = NOW + timedelta(hours=24)
            elif idx in (10, 11):
                # Citizen Disputed / Reopened
                r.status = "reopened"
                r.dispute_reason = "Water pressure still too low; dirty water coming out during evening supply."
                r.sla_due_at = NOW + timedelta(hours=18)
            else:
                # Resolved with proof
                r.status = "resolved_pending_verification"
                r.resolved_at = NOW - timedelta(days=2)

    # ---- V2 Governance & Officer Dashboard Suite Seeding --------------------------
    seed_v2_governance_suite(db)

    db.commit()
    analytics_cache.bump()
    total = db.query(CitizenRequest).count()
    print(f"Seeded {len(areas)} areas, {total} requests, {len(clusters)} clusters, {len(PLANS)} plan items, {n} recommendations.")
    db.close()


def seed_v2_governance_suite(db):
    """Populates realistic governance data across all 5 administrative tiers."""
    from app.models.governance import (
        FieldVerification, VerificationMedia, CitizenMessage, MessageTemplate,
        DocumentCheck, ShowCauseNotice, Hearing, HearingItem, ComplianceOrder,
        EmergencyIncident, IncidentBroadcast, ReliefLedger, UtilisationCertificate,
        Circular, CircularAck, Appeal, SlaRule, AuditEvent, InAppNotification,
        ResourceDocument, Integration, OfficerProfile
    )
    from app.services import audit_chain, communication, sla_engine

    # Ensure users and templates
    security.ensure_default_users(db)
    communication.ensure_default_templates(db)

    fu = db.query(User).filter_by(username="field_utnoor").first()
    dept_water = db.query(User).filter_by(username="dept_water_tg").first()
    collector = db.query(User).filter_by(username="collector_adilabad").first()
    state_off = db.query(User).filter_by(username="state_telangana").first()
    nat_admin = db.query(User).filter_by(username="national_admin").first()

    # 1. Message Templates & Resources
    res_docs = [
        ResourceDocument(title="Citizen Grievance Redressal Statutory Framework 2026", category="policy", version="v2.1", description="Guidelines for transparent public action, citizen verification, and appeal rights under JanSetu.", url="#"),
        ResourceDocument(title="Field Redressal Officer Standard Operating Procedure", category="sop", version="v1.4", description="SOP for on-site inspection, geotagged proof submission, distance checks, and citizen OTP confirmation.", url="#"),
        ResourceDocument(title="Multi-Tier Administrative Escalation Matrix & SLA Windows", category="escalation_matrix", version="v2.0", description="Operational thresholds for L1 to L5 redressal windows and show-cause directives.", url="#"),
        ResourceDocument(title="Field Officer Ethics & Code of Conduct", category="code_of_conduct", version="v1.0", description="Strict guidelines on whistleblower privacy, non-discrimination, and data integrity.", url="#"),
        ResourceDocument(title="Platform Troubleshooting & Offline PWA Sync FAQ", category="faq", version="v1.2", description="Best practices for offline queue caching, before/after photography, and supervisor rework handling.", url="#"),
    ]
    for rd in res_docs:
        if not db.query(ResourceDocument).filter_by(title=rd.title).first():
            db.add(rd)

    # 2. SLA Rules (2 versions: v1 archived, v2 active)
    if not db.query(SlaRule).first():
        db.add(SlaRule(
            version=1,
            scope="national",
            critical_hours=72,
            high_hours=96,
            routine_days=10,
            district_escalation_days=10,
            state_escalation_days=20,
            state_review_days=45,
            ack_target_hours=48,
            composite_weights_json={"sla": 30, "speed": 30, "reopen": 20, "rating": 20},
            effective_from=NOW - timedelta(days=180),
            author="Govt Technical Working Group",
            reason="Initial baseline SLA rules under JanSetu Pilot Phase 1.",
            is_active=False,
        ))
        db.add(SlaRule(
            version=2,
            scope="national",
            critical_hours=48,
            high_hours=72,
            routine_days=7,
            district_escalation_days=7,
            state_escalation_days=14,
            state_review_days=30,
            ack_target_hours=24,
            composite_weights_json={"sla": 40, "speed": 25, "reopen": 20, "rating": 15},
            effective_from=NOW - timedelta(days=30),
            author="National Administrative Reforms Commission",
            reason="Upgraded SLA targets: Critical 48h, High 72h, Routine 7d with enhanced citizen rating weight.",
            is_active=True,
        ))

    # 3. Integrations Registry
    if not db.query(Integration).first():
        integrations = [
            Integration(name="Open311 GeoReport v2 Endpoint", category="open311", status="connected", last_sync_at=NOW - timedelta(minutes=15), is_enabled=True, endpoint_url="/open311/v2"),
            Integration(name="CPGRAMS National Portal Gateway Connector", category="cpgrams_stub", status="not_connected", is_enabled=False, endpoint_url="https://cpgrams.gov.in/api/v1"),
            Integration(name="e-Pramaan / Parichay Single Sign-On (Mock)", category="sso_epramaan", status="connected", last_sync_at=NOW - timedelta(hours=1), is_enabled=True),
            Integration(name="DigiLocker Document Verification (Mock)", category="digilocker_mock", status="connected", last_sync_at=NOW - timedelta(hours=2), is_enabled=True),
            Integration(name="CDAC National SMS Gateway Relay", category="sms_gateway", status="connected", last_sync_at=NOW - timedelta(minutes=5), is_enabled=True),
            Integration(name="WhatsApp Cloud API Citizen Relay", category="whatsapp_gateway", status="connected", last_sync_at=NOW - timedelta(minutes=2), is_enabled=True),
        ]
        db.add_all(integrations)

    # 4. Field Officer (field_utnoor) Verifications & Messages
    if fu:
        utnoor_reqs = db.query(CitizenRequest).filter(CitizenRequest.assigned_field_officer_id == fu.id).all()
        for idx, r in enumerate(utnoor_reqs):
            # Field Verification records for active / resolved cases
            if not db.query(FieldVerification).filter_by(request_id=r.id).first():
                fv = FieldVerification(
                    request_id=r.id,
                    officer_id=fu.id,
                    officer_name=fu.name,
                    checklist_json=[
                        {"item": "Inspect physical pipeline / valve leak", "checked": True},
                        {"item": "Measure output water pressure & clarity", "checked": True},
                        {"item": "Replace damaged joint or gasket seal", "checked": idx % 2 == 0},
                        {"item": "Verify flow restored to all connected households", "checked": True},
                    ],
                    notes=f"Site inspection and repair executed under standard department norms. Pressure restored at 2.4 bar.",
                    device_lat=(r.lat or 19.3667) + 0.0002,
                    device_lng=(r.lng or 78.7833) + 0.0003,
                    distance_m=42.5,
                    citizen_confirmation_type="otp",
                    citizen_confirmation_ref="OTP-882194",
                    confirmed_at=NOW - timedelta(days=1),
                    created_at=NOW - timedelta(days=1),
                )
                db.add(fv)
                db.flush()

                db.add(VerificationMedia(
                    verification_id=fv.id,
                    request_id=r.id,
                    kind="before",
                    url="https://images.unsplash.com/photo-broken-water-pipe.jpg",
                    lat=r.lat or 19.3667,
                    lng=r.lng or 78.7833,
                    taken_at=NOW - timedelta(days=2),
                ))
                db.add(VerificationMedia(
                    verification_id=fv.id,
                    request_id=r.id,
                    kind="after",
                    url="https://images.unsplash.com/photo-clean-water-tap.jpg",
                    lat=r.lat or 19.3667,
                    lng=r.lng or 78.7833,
                    taken_at=NOW - timedelta(days=1),
                ))

            # Citizen Messages
            if not db.query(CitizenMessage).filter_by(request_id=r.id).first():
                db.add(CitizenMessage(
                    request_id=r.id,
                    sender_id=fu.id,
                    sender_name=fu.name,
                    sender_role="field_officer",
                    template_id="arrival_notice",
                    channel="sms",
                    message_text=f"Namaste! JanSetu Field Officer {fu.name} is arriving at your location today between 11:00 AM - 3:00 PM for inspection of grievance {r.tracking_id}.",
                    status="delivered",
                    sent_at=NOW - timedelta(days=2),
                ))
                db.add(CitizenMessage(
                    request_id=r.id,
                    sender_id=fu.id,
                    sender_name=fu.name,
                    sender_role="field_officer",
                    template_id="progress_update",
                    channel="whatsapp",
                    message_text=f"JanSetu Update on {r.tracking_id}: Repair work has commenced on site under Department supervision.",
                    status="read",
                    sent_at=NOW - timedelta(days=1),
                ))

    # 5. Show Cause Notices (District Collector)
    if collector and fu and dept_water:
        if not db.query(ShowCauseNotice).filter_by(district="Adilabad").first():
            db.add(ShowCauseNotice(
                district="Adilabad",
                issued_by_id=collector.id,
                issued_by_name=collector.name,
                to_user_id=dept_water.id,
                to_username=dept_water.username,
                to_user_name=dept_water.name,
                to_role="dept_officer",
                reason="Unsatisfactory SLA compliance (68%) in Boath Block water pipeline repairs over past 14 days.",
                linked_request_ids=["JS-IN-WTR102", "JS-IN-WTR105"],
                due_at=NOW + timedelta(days=2),
                status="issued",
                created_at=NOW - timedelta(hours=18),
            ))
            db.add(ShowCauseNotice(
                district="Adilabad",
                issued_by_id=collector.id,
                issued_by_name=collector.name,
                to_user_id=fu.id,
                to_username=fu.username,
                to_user_name=fu.name,
                to_role="field_officer",
                reason="Delay in on-site photo proof upload for 3 critical hospital supply grievances.",
                linked_request_ids=["JS-IN-HSP001"],
                due_at=NOW - timedelta(days=1),
                response_text="Site visits were delayed due to severe monsoon flash flood in Utnoor stream. Work completed on 26th September with verified photo.",
                responded_at=NOW - timedelta(hours=12),
                status="responded",
                created_at=NOW - timedelta(days=3),
            ))
            db.add(ShowCauseNotice(
                district="Adilabad",
                issued_by_id=collector.id,
                issued_by_name=collector.name,
                to_user_id=dept_water.id,
                to_username=dept_water.username,
                to_user_name=dept_water.name,
                to_role="dept_officer",
                reason="Repeated formulaic closure of borewell contamination complaints without water quality lab report.",
                linked_request_ids=["JS-IN-LAB011"],
                due_at=NOW - timedelta(days=5),
                response_text="Department has established mobile water testing laboratory and re-opened all disputed cases for fresh chemical analysis.",
                responded_at=NOW - timedelta(days=4),
                status="accepted",
                created_at=NOW - timedelta(days=7),
            ))

    # 6. Jan Sunwai Public Hearings & Compliance Orders
    if collector:
        if not db.query(Hearing).filter_by(district="Adilabad").first():
            # Past Hearing
            h_past = Hearing(
                district="Adilabad",
                title="Jan Sunwai Public Redressal Session — Q3 Review",
                scheduled_at=NOW - timedelta(days=14),
                venue="District Collectorate Conference Hall",
                attending_depts=["Water", "Roads", "Electricity", "Sanitation", "Health"],
                status="concluded",
                summary="Concluded with 42 citizen representations addressed; 6 compliance directives issued.",
                created_at=NOW - timedelta(days=20),
            )
            db.add(h_past)
            db.flush()

            # Upcoming Hearing
            h_upcoming = Hearing(
                district="Adilabad",
                title="Mandal-Level Jan Sunwai & Monsoon Grievance Redressal Camp",
                scheduled_at=NOW + timedelta(days=4),
                venue="Utnoor Integrated Tribal Development Agency (ITDA) Auditorium",
                attending_depts=["Water Supply", "Roads & Buildings", "TSSPDCL Electricity", "Health"],
                status="scheduled",
                summary="Focus on rural habitations, power transformers, and clean drinking water access.",
                created_at=NOW - timedelta(days=2),
            )
            db.add(h_upcoming)
            db.flush()

            # Items for Upcoming Hearing
            h_items = [
                HearingItem(hearing_id=h_upcoming.id, request_id=1, tracking_id="JS-IN-HD01", citizen_name_masked="•••• 4412", category="water", outcome="directed_with_deadline", direction="Executive Engineer to deploy emergency mobile water tanker within 24 hours."),
                HearingItem(hearing_id=h_upcoming.id, request_id=2, tracking_id="JS-IN-HD02", citizen_name_masked="•••• 9931", category="roads", outcome="directed_with_deadline", direction="Assistant Engineer to complete bridge culvert clearing before weekend."),
                HearingItem(hearing_id=h_upcoming.id, request_id=3, tracking_id="JS-IN-HD03", citizen_name_masked="•••• 5520", category="electricity", outcome="adjourned", direction="Adjourned for joint physical verification with Forest Department."),
            ]
            db.add_all(h_items)
            db.flush()

            # Compliance Orders
            db.add(ComplianceOrder(
                hearing_id=h_upcoming.id,
                hearing_item_id=h_items[0].id,
                request_id=1,
                dept="Water Supply",
                responsible_officer="Er. P. Venkatesh",
                description="Restore potable water flow to 6 tribal habitations in Utnoor by Friday 5 PM.",
                due_at=NOW + timedelta(days=2),
                status="in_progress",
            ))
            db.add(ComplianceOrder(
                hearing_id=h_upcoming.id,
                hearing_item_id=h_items[1].id,
                request_id=2,
                dept="Roads & Buildings",
                responsible_officer="Er. K. Suresh",
                description="Clear damaged road culvert and reconstruct retaining stone wall.",
                due_at=NOW - timedelta(days=1),
                status="overdue",
            ))

    # 7. Emergency Incident & Relief Ledger
    if collector:
        if not db.query(EmergencyIncident).filter_by(district="Adilabad").first():
            inc = EmergencyIncident(
                district="Adilabad",
                title="Adilabad Monsoon Flash Flood & Inundation Emergency",
                type="flood",
                severity="critical",
                blocks_json=["Utnoor", "Boath", "Adilabad Rural"],
                priority_multiplier=2.5,
                status="active",
                started_at=NOW - timedelta(days=3),
                summary="Heavy catchment rainfall exceeding 180mm causing seasonal stream overflow in Utnoor and Boath blocks.",
            )
            db.add(inc)
            db.flush()

            db.add(IncidentBroadcast(
                incident_id=inc.id,
                title="FLASH FLOOD RED ALERT: Immediate Relief Protocol Activated",
                message="All Field Officers in Utnoor and Boath blocks are directed to prioritize drinking water and road clearing with 2.5x priority.",
                channel="all",
                target_blocks=["Utnoor", "Boath"],
                sent_by=collector.name,
                sent_at=NOW - timedelta(days=2),
            ))

            db.add(ReliefLedger(
                incident_id=inc.id,
                block="Utnoor",
                amount_allocated=6000000.0,
                amount_disbursed=2450000.0,
                beneficiaries_served=3200,
                items_distributed=["5000 Tarpaulins", "20 Mobile Water Tankers", "Chlorination Tablets", "Medical Relief Kits"],
            ))
            db.add(ReliefLedger(
                incident_id=inc.id,
                block="Boath",
                amount_allocated=4000000.0,
                amount_disbursed=1800000.0,
                beneficiaries_served=2100,
                items_distributed=["3000 Food Ration Packs", "Temporary Sandbag Embankments", "Diesel Water Pumps"],
            ))

    # 8. Utilisation Certificates (UC)
    comp_proj = db.query(Project).filter_by(status="completed").first()
    if comp_proj:
        if not db.query(UtilisationCertificate).filter_by(project_id=comp_proj.id).first():
            db.add(UtilisationCertificate(
                project_id=comp_proj.id,
                uploaded_by="collector_adilabad",
                uploaded_by_name="Anitha Rao, IAS (District Collector)",
                doc_url="https://jansetu.gov.in/docs/UC_PRJ_TG_COMP_06.pdf",
                amount_inr=comp_proj.spent_amount_inr or 8500000.0,
                status="verified",
                verified_by="K. Chandrasekhar Reddy (State Commissioner)",
                verified_at=NOW - timedelta(days=5),
                uploaded_at=NOW - timedelta(days=12),
            ))

    # 9. State Circulars & Acknowledgements (State Officer)
    if state_off:
        if not db.query(Circular).filter_by(state="Telangana").first():
            c1 = Circular(
                state="Telangana",
                title="Directive on Mandatory Geotagged Proof Verification and SLA Adherence for Rural Water Supply",
                body="All District Collectors and Superintending Engineers must ensure 100% on-site photographic evidence with GPS coordinates (< 500m radius) before resolving complaints. Formulaic closures are strictly prohibited.",
                attachment_url="https://jansetu.gov.in/circulars/TS_GRV_2026_01.pdf",
                target_districts=["all"],
                effective_on=NOW - timedelta(days=15),
                published_by=state_off.username,
                published_by_name=state_off.name,
                created_at=NOW - timedelta(days=15),
            )
            c2 = Circular(
                state="Telangana",
                title="Pre-Monsoon Drainage Desilting & Road Safety Clearance Protocol",
                body="District administrations are directed to conduct joint inspections of low-lying bridges, culverts, and high-risk flood inundation habitations.",
                attachment_url="https://jansetu.gov.in/circulars/TS_GRV_2026_02.pdf",
                target_districts=["Adilabad", "Warangal", "Khammam"],
                effective_on=NOW - timedelta(days=5),
                published_by=state_off.username,
                published_by_name=state_off.name,
                created_at=NOW - timedelta(days=5),
            )
            db.add_all([c1, c2])
            db.flush()

            # Acks
            if collector:
                db.add(CircularAck(circular_id=c1.id, user_id=collector.id, user_name=collector.name, district="Adilabad", acknowledged_at=NOW - timedelta(days=14)))
                db.add(CircularAck(circular_id=c2.id, user_id=collector.id, user_name=collector.name, district="Adilabad", acknowledged_at=NOW - timedelta(days=4)))

    # 10. Citizen Appeals (State Appeals Desk)
    sample_reqs = db.query(CitizenRequest).limit(3).all()
    if len(sample_reqs) >= 3 and not db.query(Appeal).first():
        db.add(Appeal(
            request_id=sample_reqs[0].id,
            tracking_id=sample_reqs[0].tracking_id,
            citizen_phone="+91 94400 55667",
            reason="District closed grievance claiming tap repaired, but pipeline remains completely dry during morning supply hours.",
            evidence_url="https://images.unsplash.com/photo-dry-tap-appeal.jpg",
            status="pending",
            due_at=NOW + timedelta(days=22),
            created_at=NOW - timedelta(days=8),
        ))
        db.add(Appeal(
            request_id=sample_reqs[1].id,
            tracking_id=sample_reqs[1].tracking_id,
            citizen_phone="+91 98111 22233",
            reason="Repeated dispute against formulaic closure of illegal drainage encroachment causing road stagnation.",
            evidence_url="https://images.unsplash.com/photo-waterlogged-road.jpg",
            status="overturned_with_direction",
            order_text="State Order: District Collector Adilabad directed to conduct joint physical inspection with Municipal Revenue Wing within 7 days.",
            decided_by="state_telangana",
            decided_by_name="K. Chandrasekhar Reddy",
            due_at=NOW - timedelta(days=5),
            created_at=NOW - timedelta(days=25),
            decided_at=NOW - timedelta(days=6),
        ))
        db.add(Appeal(
            request_id=sample_reqs[2].id,
            tracking_id=sample_reqs[2].tracking_id,
            citizen_phone="+91 98765 43210",
            reason="Appeal against transformer replacement delay affecting irrigation pump set.",
            status="remanded_to_district",
            order_text="Remanded to District Collector for prioritized resolution under DDUGJY Rural Feeder Scheme.",
            decided_by="state_telangana",
            decided_by_name="K. Chandrasekhar Reddy",
            due_at=NOW - timedelta(days=2),
            created_at=NOW - timedelta(days=18),
            decided_at=NOW - timedelta(days=3),
        ))

    # 11. Hash-Chained Audit Trail (60 events)
    if not db.query(AuditEvent).first():
        actions_list = [
            ("system", "System", "system", "National", "system_boot", "server", "srv-01", {"event": "Platform initialized with SHA-256 hash chaining"}),
            ("superadmin", "Dr. Rajeshwar Rao", "super_admin", "National", "create_sla_rule", "sla_rule", "v1.0", {"standard": "National SLA Baseline"}),
            ("national_admin", "Dr. S. Menon", "admin", "National", "sync_open311_connector", "integration", "open311", {"records": 450}),
            ("state_telangana", "K. Chandrasekhar Reddy", "state_officer", "Telangana", "publish_state_circular", "circular", "TS-01", {"title": "Geotagging Directive"}),
            ("collector_adilabad", "Anitha Rao, IAS", "district_officer", "Adilabad", "acknowledge_circular", "circular", "TS-01", {"status": "acknowledged"}),
            ("collector_adilabad", "Anitha Rao, IAS", "district_officer", "Adilabad", "declare_emergency", "emergency_incident", "INC-01", {"type": "flood"}),
            ("collector_adilabad", "Anitha Rao, IAS", "district_officer", "Adilabad", "approve_project", "project", "PRJ-TG-01", {"status": "district_approved"}),
            ("state_telangana", "K. Chandrasekhar Reddy", "state_officer", "Telangana", "approve_project", "project", "PRJ-TG-01", {"status": "state_approved"}),
            ("national_admin", "Dr. S. Menon", "admin", "National", "fund_project", "project", "PRJ-TG-01", {"amount_inr": 3500000.0}),
            ("dept_water_tg", "Er. P. Venkatesh", "dept_officer", "Adilabad", "assign_field_officer", "request", "JS-IN-WTR01", {"assigned_to": "field_utnoor"}),
            ("field_utnoor", "Ravi Teja", "field_officer", "Utnoor", "submit_field_verification", "request", "JS-IN-WTR01", {"distance_m": 42.5}),
            ("dept_water_tg", "Er. P. Venkatesh", "dept_officer", "Adilabad", "proof_review_accept", "request", "JS-IN-WTR01", {"note": "Verified quality"}),
        ]
        for i in range(60):
            template = actions_list[i % len(actions_list)]
            audit_chain.record_audit_event(
                db,
                actor_id=1,
                actor_username=template[0],
                actor_name=template[1],
                role=template[2],
                jurisdiction=template[3],
                action=template[4],
                target_type=template[5],
                target_id=f"{template[6]}-{i+1}",
                detail=template[7],
                timestamp=NOW - timedelta(days=30 - (i * 0.5)),
                commit=True,
            )

    # 12. In-App Notifications
    notifs = [
        InAppNotification(role="field_officer", jurisdiction="Utnoor", type="assigned", title="NEW COMPLAINT ASSIGNED", message="Department Officer assigned Utnoor pipeline repair case JS-IN-9821.", link="/officer"),
        InAppNotification(role="field_officer", jurisdiction="Utnoor", type="rework_requested", title="SUPERVISOR REWORK REQUIRED", message="Edge seal incomplete on road patch. fresh photo needed.", link="/officer"),
        InAppNotification(role="dept_officer", jurisdiction="Adilabad", type="proof_submitted", title="RESOLUTION PROOF SUBMITTED", message="Field Officer Ravi Teja uploaded resolution photo for JS-IN-4421.", link="/officer"),
        InAppNotification(role="district_officer", jurisdiction="Adilabad", type="emergency", title="FLASH FLOOD EMERGENCY ACTIVE", message="Collectorate activated relief ledger in Utnoor and Boath blocks.", link="/officer"),
        InAppNotification(role="state_officer", jurisdiction="Telangana", type="appeal_needed", title="NEW CITIZEN APPEAL SUBMITTED", message="Citizen filed formal appeal against Adilabad district closure.", link="/officer"),
        InAppNotification(role="admin", jurisdiction="National", type="approval_needed", title="STATE PROJECTS READY FOR CENTRAL GRANT", message="2 State-cleared projects in Telangana & Delhi awaiting central funding.", link="/officer"),
    ]
    db.add_all(notifs)

    # 13. Officer Profiles
    officers = db.query(User).filter_by(user_type="officer").all()
    for o in officers:
        if not db.query(OfficerProfile).filter_by(user_id=o.id).first():
            db.add(OfficerProfile(
                user_id=o.id,
                office_address=f"{o.district or o.state or 'Central'} Administrative Complex, Civil Secretariat",
                working_hours="10:00 AM - 5:00 PM (Mon-Sat)",
                helpline="1800-111-222",
                official_email=f"{o.username}@grievance.gov.in",
            ))

    db.commit()



if __name__ == "__main__":
    run()
