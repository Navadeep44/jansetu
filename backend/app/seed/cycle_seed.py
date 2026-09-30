"""Telangana Cycle Seeder: Seeds realistic Telangana administrative hierarchy and ~122
cycle cases spanning from citizen submission to budget allocation, execution, and closure.
"""
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session

from app.core import security
from app.models.geo import Area
from app.models.request import CaseExpense, CitizenRequest, Notification, StatusHistory
from app.models.user import User

RNG = random.Random(2026)
NOW = datetime.utcnow().replace(microsecond=0)

# -----------------------------------------------------------------------------
# 1. GEOGRAPHIC HIERARCHY FOR TELANGANA (Adilabad and Hyderabad)
# -----------------------------------------------------------------------------
TELANGANA_HIERARCHY = {
    "Adilabad": {
        "Utnoor": [
            ("Utnoor Proper", 19.3667, 78.7833, 14200, 3100, "rural"),
            ("Hasnapur", 19.3450, 78.8020, 4800, 1050, "rural"),
            ("Birsaidpet", 19.3820, 78.7510, 3900, 840, "rural"),
            ("Ghanpur", 19.3950, 78.8100, 5200, 1120, "rural"),
            ("Laltekdi", 19.3580, 78.7690, 6100, 1340, "rural"),
        ],
        "Jainoor": [
            ("Jainoor Proper", 19.3900, 78.9600, 12500, 2750, "rural"),
            ("Jamuldhari", 19.4120, 78.9410, 4100, 890, "rural"),
            ("Daboli", 19.3780, 78.9850, 3600, 780, "rural"),
            ("Pardi", 19.4050, 78.9230, 4400, 960, "rural"),
            ("Ushegaon", 19.4210, 78.9720, 3200, 710, "rural"),
        ],
        "Narnoor": [
            ("Narnoor Gramam", 19.5050, 78.9050, 11800, 2550, "rural"),
            ("Tadihatnoor", 19.4890, 78.8820, 3800, 830, "rural"),
            ("Gundala", 19.5220, 78.9240, 4200, 910, "rural"),
            ("Sonapur", 19.5110, 78.8710, 3100, 680, "rural"),
            ("Mahagaon", 19.4750, 78.9310, 2900, 640, "rural"),
        ],
        "Bela": [
            ("Bela Colony", 19.7300, 78.6800, 13100, 2880, "rural"),
            ("Badi", 19.7120, 78.6610, 4500, 990, "rural"),
            ("Mangurla", 19.7450, 78.7020, 3700, 810, "rural"),
            ("Sirsanna", 19.7520, 78.6540, 4100, 890, "rural"),
            ("Saikhed", 19.7210, 78.7150, 3400, 740, "rural"),
        ],
    },
    "Hyderabad": {
        "Charminar": [
            ("Moghalpura", 17.3580, 78.4750, 42000, 8800, "urban"),
            ("Ghansi Bazaar", 17.3620, 78.4710, 38000, 8100, "urban"),
            ("Shalibanda", 17.3520, 78.4790, 46000, 9700, "urban"),
            ("Pathergatti", 17.3680, 78.4740, 51000, 10800, "urban"),
            ("Gulzar Houz", 17.3635, 78.4745, 34000, 7200, "urban"),
        ],
        "Khairatabad": [
            ("Somajiguda", 17.4250, 78.4580, 45000, 9500, "urban"),
            ("Punjagutta", 17.4280, 78.4520, 48000, 10200, "urban"),
            ("Anand Nagar", 17.4120, 78.4610, 36000, 7600, "urban"),
            ("Venkateshwara Colony", 17.4190, 78.4480, 39000, 8300, "urban"),
            ("Raj Bhavan Road", 17.4210, 78.4630, 31000, 6500, "urban"),
        ],
        "Secunderabad": [
            ("Monda Market", 17.4390, 78.4980, 49000, 10400, "urban"),
            ("Ranigunj", 17.4320, 78.4910, 44000, 9300, "urban"),
            ("General Bazaar", 17.4410, 78.5020, 41000, 8700, "urban"),
            ("Kalasiguda", 17.4450, 78.4940, 37000, 7800, "urban"),
            ("RP Road", 17.4370, 78.4960, 43000, 9100, "urban"),
        ],
        "Golconda": [
            ("Tolichowki", 17.4010, 78.4120, 58000, 12200, "urban"),
            ("Langar Houz", 17.3880, 78.4210, 47000, 9900, "urban"),
            ("MD Lines", 17.3940, 78.4050, 35000, 7400, "urban"),
            ("Nanal Nagar", 17.3970, 78.4180, 42000, 8900, "urban"),
            ("Shaikpet", 17.4080, 78.3980, 53000, 11300, "urban"),
        ],
    },
}

# Photos mapped by department
DEPT_PHOTOS = {
    "water": {
        "citizen": ["/sample_photos/pipe_broken.svg"],
        "site": ["/sample_photos/pipe_broken.svg"],
        "completion": ["/sample_photos/pipe_fixed.svg"],
    },
    "roads": {
        "citizen": ["/sample_photos/road_damaged.svg"],
        "site": ["/sample_photos/road_damaged.svg"],
        "completion": ["/sample_photos/road_repaired.svg"],
    },
    "electricity": {
        "citizen": ["/sample_photos/transformer_broken.svg"],
        "site": ["/sample_photos/transformer_broken.svg"],
        "completion": ["/sample_photos/transformer_fixed.svg"],
    },
    "sanitation": {
        "citizen": ["/sample_photos/drain_overflow.svg"],
        "site": ["/sample_photos/drain_overflow.svg"],
        "completion": ["/sample_photos/drain_cleaned.svg"],
    },
    "health": {
        "citizen": ["/sample_photos/school_broken.svg"],
        "site": ["/sample_photos/school_broken.svg"],
        "completion": ["/sample_photos/school_fixed.svg"],
    },
    "education": {
        "citizen": ["/sample_photos/school_broken.svg"],
        "site": ["/sample_photos/school_broken.svg"],
        "completion": ["/sample_photos/school_fixed.svg"],
    },
}

# Line item catalog per department
LINE_ITEMS_CATALOG = {
    "water": [
        ("110mm PN-6 HDPE Pipe Replacement (IS:4984)", "metres", 280, 350.0),
        ("Trench Excavation in all classes of soil and backfilling", "cum", 65, 420.0),
        ("CI Double Flanged Sluice Valves 100mm dia (IS:14846)", "units", 2, 7500.0),
        ("Labour charges for pipe jointing and hydrostatic testing", "days", 8, 1200.0),
    ],
    "roads": [
        ("WMM (Wet Mix Macadam) 150mm thick base layer", "cum", 85, 1450.0),
        ("Dense Bituminous Macadam (DBM) 50mm coarse", "sqm", 320, 480.0),
        ("Bituminous Concrete (BC) 30mm wearing coat", "sqm", 320, 380.0),
        ("Static roller & vibrating tandem compaction hire", "shifts", 4, 8500.0),
    ],
    "electricity": [
        ("100 kVA 11/0.433 kV Distribution Transformer coil rework", "units", 1, 68000.0),
        ("HT XLPE 3x70 sq.mm insulated underground cabling", "metres", 75, 580.0),
        ("GI Pipe Earthing electrodes 40mm dia with salt & charcoal", "sets", 3, 4200.0),
        ("Skilled linemen team night emergency shutdown & installation", "teams", 2, 9500.0),
    ],
    "sanitation": [
        ("Super-sucker vacuum machine sewer desilting operation", "shifts", 3, 14000.0),
        ("M-25 Pre-cast RCC heavy duty drain cover slabs 1.2mx0.6m", "units", 28, 1850.0),
        ("Brick masonry sidewall plastering with CM 1:3 & waterproofing", "sqm", 45, 620.0),
        ("Sanitation crew cleaning, silt carting & bleaching spray", "days", 6, 2200.0),
    ],
    "health": [
        ("Roof APP waterproofing membrane & polyurea crack grouting", "sqm", 110, 480.0),
        ("Tubular 12V 150Ah solar inverter deep-cycle battery replacement", "units", 4, 14500.0),
        ("Medical cold-chain refrigerator wiring & voltage stabilizer", "units", 1, 18500.0),
        ("Sub-centre OPD diagnostic room false ceiling and LED fixtures", "sqm", 40, 650.0),
    ],
    "education": [
        ("Galvalume corrugated pre-painted steel roof truss sheets", "sqm", 140, 520.0),
        ("Dual-desk wooden benches reinforcement and PU paint finishing", "units", 35, 1100.0),
        ("School compound wall 9-inch brickwork breach reconstruction", "metres", 16, 2400.0),
        ("Commercial 50 LPH RO drinking water filtration overhaul", "units", 1, 16500.0),
    ],
}

# Multilingual scenario templates
CASE_TEMPLATES = {
    "water": [
        ("te", "ఉట్నూర్ బస్టాండ్ వద్ద మెయిన్ మంచినీటి పైపులైన్ పగిలి రోడ్డుపై నీరు వృథాగా పోతోంది, 60 కుటుంబాలకు తాగునీరు బంద్ అయింది.",
               "Main drinking water pipeline ruptured near bus stand; water gushing onto the road, 60 households cut off from potable supply."),
        ("te", "వార్డు నం. 4 లోని చేతిపంపు బోరు సిలిండర్ ఊడిపోయింది, మహిళలు బిందెలతో 2 కి.మీ నడవాల్సి వస్తోంది.",
               "Handpump bore cylinder slipped into casing in Ward 4; villagers forced to walk 2km for water."),
        ("hi", "मुख्य बाजार के पास पेयजल पाइपलाइन फटने से गंदा पानी घरों में आ रहा है, तुरंत मरम्मत की जाए।",
               "Broken drinking water pipe near main market causing contaminated sewage water backflow into residential taps."),
        ("en", "Water supply pipeline joint leaking under pedestrian pavement; ground subsidence risk near primary school.",
               "Water supply pipeline joint leaking under pedestrian pavement; ground subsidence risk near primary school."),
    ],
    "roads": [
        ("te", "ప్రధాన రహదారిపై భారీ వర్షాలకు పెద్ద గుంతలు పడ్డాయి, రాత్రి వేళల్లో ద్విచక్ర వాహనాలు ప్రమాదాలకు గురవుతున్నాయి.",
               "Severe craters and potholes formed along main connector road after heavy rain; two-wheelers skidding frequently."),
        ("te", "స్కూల్ రోడ్డు వద్ద బ్రిడ్జ్ కల్వర్టు పక్క గోడ కూలిపోయింది, వెంటనే రక్షణ గోడ కట్టి రోడ్డు లెవెలింగ్ చేయాలి.",
               "Culvert wing wall collapsed near school link road; embankment washed away, urgent retaining wall needed."),
        ("hi", "सड़क पर डामर पूरी तरह उखड़ चुका है और नुकीले पत्थर बाहर आ गए हैं, एम्बुलेंस भी नहीं आ पा रही है।",
               "Bitumen completely eroded leaving sharp gravel stones; ambulances refusing to enter the residential ward."),
        ("en", "Severe surface erosion and cratering on bus route section; urgent wet mix macadam and resurfacing required.",
               "Severe surface erosion and cratering on bus route section; urgent wet mix macadam and resurfacing required."),
    ],
    "electricity": [
        ("te", "11 కేవీ వీధి ట్రాన్స్‌ఫార్మర్ ఓవర్‌లోడ్ అయి పొగలు వస్తున్నాయి, విద్యుత్ సరఫరా తరచూ నిలిచిపోతోంది.",
               "11kV distribution transformer smoking due to severe overload; frequent tripping leaving the entire colony in darkness."),
        ("te", "వ్యవసాయ బోర్లకు వెళ్లే విద్యుత్ తీగలు తెగి రోడ్డుపై పడ్డాయి, పశువులకు ప్రాణాపాయం ఉంది.",
               "Overhead 440V agricultural transmission cables snapped and hanging low; hazard for livestock and farmers."),
        ("hi", "ट्रांसफॉर्मर में बार-बार स्पार्किंग हो रही है, आसपास के घरों के उपकरण जलने का खतरा है।",
               "Intermittent sparking and voltage surges from the colony transformer damaging home appliances."),
        ("en", "Transformer coil insulation failed and earthing wire burnt out; risk of fire in commercial lane.",
               "Transformer coil insulation failed and earthing wire burnt out; risk of fire in commercial lane."),
    ],
    "sanitation": [
        ("te", "ప్రధాన మురుగు కాలువ పూడికతో నిండిపోయి మురుగునీరు రోడ్లపైకి వస్తోంది, దుర్వాసనతో దోమలు పెరిగాయి.",
               "Open drainage canal completely choked with plastic debris; stagnant black water overflowing onto public street."),
        ("te", "మార్కెట్ వద్ద మురుగు కాలువపై స్లాబ్ విరిగిపోయి పెద్ద రంధ్రం పడింది, నడిచేవారు పడిపోయే ప్రమాదం ఉంది.",
               "Heavy RCC drainage manhole cover cracked and caved in near market; pedestrian hazard."),
        ("hi", "सीवर लाइन जाम होने से सारा गंदा पानी गलियों में बह रहा है, बीमारी फैलने का गंभीर खतरा है।",
               "Underground sewer line backlogged and overflowing; grave risk of waterborne vector diseases."),
        ("en", "Underground drainage line blocked with silt; requires super-sucker vacuum extraction and slab replacement.",
               "Underground drainage line blocked with silt; requires super-sucker vacuum extraction and slab replacement."),
    ],
    "health": [
        ("te", "ప్రాథమిక ఆరోగ్య ఉపకేంద్రం పైకప్పు వర్షపు నీటితో కారుతోంది, మందుల నిల్వ గదిలో తేమ చేరింది.",
               "Sub-centre clinic roof leaking during rainfall; dampness endangering medicine stocks and vaccine cold chain."),
        ("te", "పీహెచ్‌సీ లోని సోలార్ ఇన్వర్టర్ బ్యాటరీలు పనిచేయడం లేదు, రాత్రి కాన్పుల సమయంలో తీవ్ర ఇబ్బంది అవుతోంది.",
               "PHC solar battery bank defunct; nighttime deliveries disrupted during grid power outages."),
        ("hi", "प्राथमिक स्वास्थ्य केंद्र के आपातकालीन वार्ड में बिजली और पानी की व्यवस्था खराब है, तत्काल मरम्मत कराएं।",
               "Primary health centre emergency room wiring shorted and tap water connection broken."),
        ("en", "PHC vaccination room moisture intrusion and inverter battery failure; urgent civil and electrical overhaul.",
               "PHC vaccination room moisture intrusion and inverter battery failure; urgent civil and electrical overhaul."),
    ],
    "education": [
        ("te", "ప్రభుత్వ ప్రాథమిక పాఠశాల పైకప్పు రేకులు గాలివానకు లేచిపోయాయి, పిల్లల తరగతి గదిలోకి నీరు వస్తోంది.",
               "Government Primary School tin roof sheets blown away in heavy gale; classroom exposed to elements."),
        ("te", "పాఠశాల ప్రహరీ గోడ కూలిపోయింది, రోడ్డు పక్కన పశువులు ఆవరణలోకి వస్తున్నాయి, రక్షణ లేదు.",
               "School boundary wall collapsed towards road side; stray cattle entering student playground."),
        ("hi", "स्कूल के बच्चों के बैठने के लिए बेंच और डेस्क टूट चुके हैं, बारिश में छत भी टपकती है।",
               "Classroom wooden student benches broken and roof leaking in primary school block."),
        ("en", "School boundary wall breach and damaged classroom roof; structural repair and furniture refurbishment needed.",
               "School boundary wall breach and damaged classroom roof; structural repair and furniture refurbishment needed."),
    ],
}


def ensure_telangana_areas(db: Session) -> dict:
    """Creates or updates the 40 Telangana hierarchy villages/wards in Area table."""
    area_map = {}  # (district, mandal, village) -> Area

    for district, mandals in TELANGANA_HIERARCHY.items():
        for mandal, villages in mandals.items():
            for v_name, lat, lng, pop, hh, setting in villages:
                area = (
                    db.query(Area)
                    .filter(Area.state == "Telangana", Area.district == district, Area.mandal == mandal, Area.village == v_name)
                    .first()
                )
                if not area:
                    # Also check by name
                    area = (
                        db.query(Area)
                        .filter(Area.state == "Telangana", Area.district == district, Area.name == v_name)
                        .first()
                    )
                if not area:
                    area = Area(
                        country_code="IN",
                        state="Telangana",
                        district=district,
                        name=f"{v_name}",
                        mandal=mandal,
                        village=v_name,
                        level="ward" if setting == "urban" else "village",
                        setting=setting,
                        admin_code=f"LGD-TG-{district[:3].upper()}-{len(area_map)+1:04d}",
                        lat=lat,
                        lng=lng,
                        population=pop,
                        households=hh,
                        vulnerability=0.45 if district == "Adilabad" else 0.25,
                        connectivity=0.60 if district == "Adilabad" else 0.90,
                        nightlights=0.40 if district == "Adilabad" else 0.85,
                        infra={"water": 0.6, "roads": 0.5, "electricity": 0.7, "health": 0.5, "education": 0.6, "sanitation": 0.5},
                        primary_languages=["te", "hi", "en"] if district == "Hyderabad" else ["te", "hi"],
                    )
                    db.add(area)
                    db.flush()
                else:
                    area.mandal = mandal
                    area.village = v_name
                    area.state = "Telangana"
                    area.district = district
                    db.flush()

                area_map[(district, mandal, v_name)] = area

    return area_map


def get_officers_lookup(db: Session):
    """Maps officers by role, district, mandal, and department."""
    officers = db.query(User).filter_by(user_type="officer").all()
    collector_map = {}       # district -> User
    dept_head_map = {}       # (district, dept) -> User
    field_officer_map = {}   # (mandal, dept) -> User

    for o in officers:
        if o.role == security.ROLE_DISTRICT_OFFICER:
            if o.district:
                collector_map[o.district] = o
        elif o.role == security.ROLE_DEPT_OFFICER:
            if o.district and o.department:
                dept_head_map[(o.district, o.department)] = o
        elif o.role == security.ROLE_FIELD_OFFICER:
            if o.block and o.department:
                field_officer_map[(o.block, o.department)] = o

    return collector_map, dept_head_map, field_officer_map


def generate_budget_items(sector: str, scale: float = 1.0):
    """Builds realistic costed line items and computes total requested amount."""
    templates = LINE_ITEMS_CATALOG[sector]
    items = []
    total = 0.0
    for name, unit, base_qty, base_cost in templates:
        qty = max(1, int(base_qty * scale))
        unit_cost = base_cost
        line_total = round(qty * unit_cost, 2)
        total += line_total
        items.append({
            "item": name,
            "quantity": qty,
            "unit": unit,
            "unit_cost": unit_cost,
            "total": line_total,
        })
    return items, round(total, 2)


def seed_cycle_dataset(db: Session):
    """Generates 122 cycle cases across Telangana covering all 10 cycle statuses."""
    area_map = ensure_telangana_areas(db)
    collector_map, dept_head_map, field_officer_map = get_officers_lookup(db)

    departments = ["water", "roads", "electricity", "sanitation", "health", "education"]
    locations = list(area_map.keys())  # [(district, mandal, village), ...]

    # Target distribution totaling 122 cases
    STATUS_PLAN = [
        ("SUBMITTED", 14),
        ("VERIFIED", 8),
        ("REJECTED", 10),
        ("ASSIGNED", 16),
        ("BUDGET_REQUESTED", 16),
        ("SENT_TO_COLLECTOR", 14),
        ("ALLOCATED", 14),
        ("WORK_DONE", 14),
        ("CLOSED", 10),
        ("REOPENED", 6),
    ]

    case_counter = 100
    created_cases = []

    for status_name, count in STATUS_PLAN:
        for idx in range(count):
            case_counter += 1
            tid = f"JS-TG-26-{case_counter:04d}"

            # Pick location and sector
            dist, mandal, village = locations[(case_counter) % len(locations)]
            area = area_map[(dist, mandal, village)]
            sector = departments[(case_counter) % len(departments)]
            dept_name = sector

            # Select language and description
            template_pool = CASE_TEMPLATES[sector]
            lang, orig_text, transl_text = template_pool[(case_counter) % len(template_pool)]

            # Determine age in days (spread across 6 months / 180 days)
            days_ago = min(175, max(1, int(180 - (case_counter * 1.4) % 170)))
            created_at = NOW - timedelta(days=days_ago, hours=(case_counter * 3) % 24)

            # Officers
            fo = field_officer_map.get((mandal, sector)) or field_officer_map.get(("Utnoor", sector))
            dh = dept_head_map.get((dist, sector)) or dept_head_map.get(("Adilabad", sector))
            coll = collector_map.get(dist) or collector_map.get("Adilabad")

            photos_info = DEPT_PHOTOS[sector]
            citizen_photos = photos_info["citizen"]
            histories = []

            req = CitizenRequest(
                tracking_id=tid,
                channel="web" if idx % 2 == 0 else "assisted",
                language=lang,
                original_text=orig_text,
                redacted_text=orig_text,
                translated_text=transl_text,
                translation_mode="source" if lang == "en" else "reference",
                country_code="IN",
                area_id=area.id,
                lat=area.lat + RNG.uniform(-0.005, 0.005),
                lng=area.lng + RNG.uniform(-0.005, 0.005),
                location_text=f"{village}, {mandal} Mandal, {dist} Dist",
                category=sector,
                subcategory="repair" if sector in ("water", "roads", "electricity") else "infrastructure",
                request_type="repair",
                severity=RNG.choice([3, 4, 5]),
                affected_people=RNG.randint(40, 250),
                sdg="SDG 6" if sector in ("water", "sanitation") else ("SDG 9" if sector == "roads" else "SDG 7"),
                confidence=0.92,
                extraction_mode="rules",
                household_hash=f"hh-{area.id}-{case_counter}",
                anonymous=False,
                gender="female" if idx % 2 == 0 else "male",
                status=status_name,
                created_at=created_at,
                updated_at=created_at,
                state="Telangana",
                district=dist,
                mandal=mandal,
                village=village,
                photos=citizen_photos,
                sla_stage="verify",
                sla_breached=False,
            )

            # Step 1: SUBMITTED Status History
            histories.append(StatusHistory(
                request_id=None,  # will set after req flush
                status="SUBMITTED",
                stage_label="Submitted",
                actor_role="citizen",
                actor_name="Citizen",
                department=dept_name,
                note=f"Grievance submitted by citizen at {village}, {mandal}. Tracking ID: {tid}",
                created_at=created_at,
            ))

            # SLA and overdues
            # Step-specific lifecycle data:
            if status_name == "SUBMITTED":
                # Some are overdue (verify > 2 days)
                is_overdue = (idx % 3 == 0) and (NOW - created_at > timedelta(hours=48))
                req.sla_due_at = created_at + timedelta(hours=48)
                req.sla_stage = "verify"
                req.sla_breached = is_overdue

            elif status_name == "REJECTED":
                rej_time = created_at + timedelta(hours=RNG.randint(4, 24))
                req.rejection_reason = "Duplicate complaint already covered under sanctioned state municipal works (Sanction #TG-2025-W44)."
                req.updated_at = rej_time
                req.sla_stage = "verify"
                req.sla_due_at = created_at + timedelta(hours=48)
                req.assigned_department = dept_name
                histories.append(StatusHistory(
                    request_id=None,
                    status="REJECTED",
                    stage_label="Rejected by Department Head",
                    actor_role="dept_officer",
                    actor_name=dh.name if dh else "Department Head",
                    department=dept_name,
                    note=f"Rejected: {req.rejection_reason}",
                    created_at=rej_time,
                ))

            elif status_name in ("VERIFIED", "ASSIGNED", "BUDGET_REQUESTED", "SENT_TO_COLLECTOR", "ALLOCATED", "WORK_DONE", "CLOSED", "REOPENED"):
                # Pass through VERIFIED
                ver_time = created_at + timedelta(hours=RNG.randint(3, 20))
                req.assigned_department = dept_name
                histories.append(StatusHistory(
                    request_id=None,
                    status="VERIFIED",
                    stage_label="Verified by Department Head",
                    actor_role="dept_officer",
                    actor_name=dh.name if dh else "Department Head",
                    department=dept_name,
                    note=f"Department Head verified public validity on ground.",
                    created_at=ver_time,
                ))

                if status_name == "VERIFIED":
                    req.sla_stage = "assign"
                    req.sla_due_at = ver_time + timedelta(hours=24)

                if status_name in ("ASSIGNED", "BUDGET_REQUESTED", "SENT_TO_COLLECTOR", "ALLOCATED", "WORK_DONE", "CLOSED", "REOPENED"):
                    # Pass through ASSIGNED
                    assign_time = ver_time + timedelta(hours=RNG.randint(2, 12))
                    req.assigned_field_officer_id = fo.id if fo else None
                    req.assigned_officer = fo.name if fo else "Field Officer"
                    req.assigned_at = assign_time
                    req.block = mandal
                    histories.append(StatusHistory(
                        request_id=None,
                        status="ASSIGNED",
                        stage_label="Assigned to Field Officer",
                        actor_role="dept_officer",
                        actor_name=dh.name if dh else "Department Head",
                        department=dept_name,
                        note=f"Assigned to {fo.name if fo else 'Field Officer'} ({fo.title if fo else 'AE'}) for mandatory on-site inspection.",
                        created_at=assign_time,
                    ))

                    if status_name == "ASSIGNED":
                        is_overdue = (idx % 3 == 0) and (NOW - assign_time > timedelta(hours=120))
                        req.sla_stage = "inspect"
                        req.sla_due_at = assign_time + timedelta(hours=120)
                        req.sla_breached = is_overdue

                    if status_name in ("BUDGET_REQUESTED", "SENT_TO_COLLECTOR", "ALLOCATED", "WORK_DONE", "CLOSED", "REOPENED"):
                        # Pass through BUDGET_REQUESTED
                        inspect_time = assign_time + timedelta(days=RNG.randint(1, 4), hours=RNG.randint(1, 10))
                        items, req_amount = generate_budget_items(sector, scale=1.0 + (idx % 4) * 0.15)
                        req.inspection_at = inspect_time
                        req.inspection_notes = f"Ground inspection completed at {village}. Verified damaged assets; repair required to restore service."
                        req.inspection_lat = req.lat
                        req.inspection_lng = req.lng
                        req.site_photos = photos_info["site"]
                        req.budget_requested = req_amount
                        req.budget_line_items = items

                        histories.append(StatusHistory(
                            request_id=None,
                            status="BUDGET_REQUESTED",
                            stage_label="Site Inspected & Budget Requested",
                            actor_role="field_officer",
                            actor_name=fo.name if fo else "Field Officer",
                            department=dept_name,
                            note=f"Field inspection completed. Cost estimate ₹{req_amount:,.2f} prepared with {len(items)} line items.",
                            created_at=inspect_time,
                        ))

                        if status_name == "BUDGET_REQUESTED":
                            req.sla_stage = "forward"
                            req.sla_due_at = inspect_time + timedelta(hours=48)

                        if status_name in ("SENT_TO_COLLECTOR", "ALLOCATED", "WORK_DONE", "CLOSED", "REOPENED"):
                            # Pass through SENT_TO_COLLECTOR
                            fwd_time = inspect_time + timedelta(hours=RNG.randint(6, 36))
                            req.dh_forward_note = f"Verified cost estimates against current district SSR schedule. Recommended for immediate sanction."

                            histories.append(StatusHistory(
                                request_id=None,
                                status="SENT_TO_COLLECTOR",
                                stage_label="Forwarded to Collector",
                                actor_role="dept_officer",
                                actor_name=dh.name if dh else "Department Head",
                                department=dept_name,
                                note=f"Forwarded with technical justification and photo evidence for Collector budget clearance.",
                                created_at=fwd_time,
                            ))

                            # Add negotiation history for some cases!
                            has_negotiation = (idx % 2 == 1)
                            if has_negotiation:
                                neg_time_1 = fwd_time + timedelta(hours=24)
                                cut_percent = RNG.choice([0.10, 0.12, 0.15, 0.18])
                                counter_offer = round(req_amount * (1.0 - cut_percent), 2)
                                round1 = {
                                    "round": 1,
                                    "by_role": "district_officer",
                                    "by_name": coll.name if coll else "District Collector",
                                    "action": "NEGOTIATE",
                                    "proposed_amount": counter_offer,
                                    "justification": f"Based on the {dist} Schedule of Rates (SSR) 2025-26 and past average cost of similar works (₹{counter_offer*0.95:,.2f}), trenching & machinery hire rates are revised downward.",
                                    "timestamp": neg_time_1.isoformat(),
                                }
                                neg_time_2 = neg_time_1 + timedelta(hours=14)
                                round2 = {
                                    "round": 2,
                                    "by_role": "dept_officer",
                                    "by_name": dh.name if dh else "Department Head",
                                    "action": "ACCEPT_NEGOTIATION",
                                    "proposed_amount": counter_offer,
                                    "justification": "Accepted revised SSR rate ceiling. Contractor work scope adjusted accordingly.",
                                    "timestamp": neg_time_2.isoformat(),
                                }
                                req.negotiation_history = [round1, round2]

                            if status_name == "SENT_TO_COLLECTOR":
                                req.sla_stage = "collector"
                                req.sla_due_at = fwd_time + timedelta(hours=168)
                                req.sla_breached = (idx % 4 == 0) and (NOW - fwd_time > timedelta(hours=168))

                            if status_name in ("ALLOCATED", "WORK_DONE", "CLOSED", "REOPENED"):
                                # Collector APPROVES -> ALLOCATED
                                appr_time = fwd_time + timedelta(days=RNG.randint(2, 6))
                                approved_amt = counter_offer if has_negotiation else req_amount
                                req.budget_approved = approved_amt
                                req.budget_allocated = approved_amt
                                req.collector_note = f"Administrative sanction accorded for ₹{approved_amt:,.2f}. Funds credited to Field Officer case wallet."

                                histories.append(StatusHistory(
                                    request_id=None,
                                    status="ALLOCATED",
                                    stage_label="Budget Approved & Allocated",
                                    actor_role="district_officer",
                                    actor_name=coll.name if coll else "District Collector",
                                    department=dept_name,
                                    note=f"Budget approved and ₹{approved_amt:,.2f} allocated into case wallet.",
                                    created_at=appr_time,
                                ))

                                if status_name == "ALLOCATED":
                                    req.sla_stage = "work"
                                    req.sla_due_at = appr_time + timedelta(hours=336)
                                    req.sla_breached = (idx % 4 == 0) and (NOW - appr_time > timedelta(hours=336))

                                if status_name in ("WORK_DONE", "CLOSED", "REOPENED"):
                                    # Field Officer executes work and logs expenses
                                    # Spend <= Allocation strictly enforced!
                                    work_time = appr_time + timedelta(days=RNG.randint(4, 12))
                                    req.completion_photos = photos_info["completion"]
                                    
                                    # Spend between 85% and 98% of allocation
                                    spend_factor = RNG.uniform(0.88, 0.98)
                                    actual_spend = round(approved_amt * spend_factor, 2)
                                    req.budget_spent = actual_spend

                                    # Build expense records
                                    exp_list = []
                                    num_exp = len(items)
                                    remaining = actual_spend
                                    for exp_idx, itm in enumerate(items):
                                        if exp_idx == num_exp - 1:
                                            exp_amt = round(remaining, 2)
                                        else:
                                            ratio = itm["total"] / req_amount
                                            exp_amt = round(actual_spend * ratio, 2)
                                            remaining -= exp_amt
                                        
                                        exp_record = {
                                            "item": itm["item"],
                                            "amount": exp_amt,
                                            "vendor_name": f"Sri Venkateshwara Enterprises ({mandal})",
                                            "bill_reference": f"INV-{dist[:3].upper()}-{case_counter}-{exp_idx+1}",
                                            "logged_at": (appr_time + timedelta(days=exp_idx+1)).isoformat(),
                                        }
                                        exp_list.append(exp_record)

                                    req.expenses = exp_list

                                    histories.append(StatusHistory(
                                        request_id=None,
                                        status="WORK_DONE",
                                        stage_label="Work Completed by Field Officer",
                                        actor_role="field_officer",
                                        actor_name=fo.name if fo else "Field Officer",
                                        department=dept_name,
                                        note=f"Execution 100% finished on ground. Actual spend logged: ₹{actual_spend:,.2f}. Geo-tagged completion photos uploaded.",
                                        created_at=work_time,
                                    ))

                                    if status_name == "WORK_DONE":
                                        req.sla_stage = "proof_review"
                                        req.sla_due_at = work_time + timedelta(hours=72)
                                        req.sla_breached = (idx % 3 == 0) and (NOW - work_time > timedelta(hours=72))

                                    if status_name in ("CLOSED", "REOPENED"):
                                        # Dept Head accepts proof first
                                        accept_time = work_time + timedelta(hours=RNG.randint(6, 48))
                                        histories.append(StatusHistory(
                                            request_id=None,
                                            status="resolved_pending_verification",
                                            stage_label="Proof Accepted by Dept Head",
                                            actor_role="dept_officer",
                                            actor_name=dh.name if dh else "Department Head",
                                            department=dept_name,
                                            note=f"Department Head checked physical work completion photos and expenditure vouchers. Accepted.",
                                            created_at=accept_time,
                                        ))

                                        confirm_time = accept_time + timedelta(days=RNG.randint(1, 4))
                                        if status_name == "CLOSED":
                                            req.status = "CLOSED"
                                            req.citizen_verified = True
                                            req.citizen_rating = RNG.choice([4, 5, 5, 4])
                                            req.closed_at = confirm_time
                                            req.closure_note = "Citizen inspected the repaired asset on ground and confirmed resolution as Fixed."
                                            histories.append(StatusHistory(
                                                request_id=None,
                                                status="CLOSED",
                                                stage_label="Closed (Citizen Confirmed Fixed)",
                                                actor_role="citizen",
                                                actor_name="Citizen",
                                                department=dept_name,
                                                note="Citizen marked: 'Fixed'. Rating: 5/5. Grievance successfully closed.",
                                                created_at=confirm_time,
                                            ))
                                        elif status_name == "REOPENED":
                                            req.status = "REOPENED"
                                            req.citizen_verified = False
                                            req.dispute_reason = "Water pressure is still very low during evening supply and leakage was only partially sealed."
                                            req.closure_note = "Citizen disputed completion: Work on ground remains unsatisfactory. Reopened at Department Head."
                                            histories.append(StatusHistory(
                                                request_id=None,
                                                status="REOPENED",
                                                stage_label="Reopened by Citizen",
                                                actor_role="citizen",
                                                actor_name="Citizen",
                                                department=dept_name,
                                                note=f"Citizen marked: 'Not Fixed'. Reason: {req.dispute_reason}. Case reopened at Department Head queue.",
                                                created_at=confirm_time,
                                            ))

            db.add(req)
            db.flush()

            for h in histories:
                h.request_id = req.id
                db.add(h)
            db.flush()

            # Add CaseExpense records to DB table if expenses present
            if req.expenses:
                for exp in req.expenses:
                    db.add(CaseExpense(
                        request_id=req.id,
                        officer_id=req.assigned_field_officer_id,
                        officer_name=req.assigned_officer or "Field Officer",
                        item=exp["item"],
                        amount=exp["amount"],
                        vendor_name=exp.get("vendor_name", ""),
                        bill_reference=exp.get("bill_reference", ""),
                    ))

            # Add Citizen Notification
            db.add(Notification(
                request_id=req.id,
                channel=req.channel,
                language=req.language,
                kind="ack",
                message=f"JanSetu: Your grievance {req.tracking_id} for {req.category} is {req.status}.",
                delivered=True,
                created_at=created_at + timedelta(minutes=1),
            ))

            created_cases.append(req)

    db.commit()
    print(f"Successfully seeded {len(created_cases)} Telangana grievance-to-budget cycle cases across 40 hierarchy locations.")
    return created_cases
