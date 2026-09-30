"""Common, SDG-mapped development taxonomy shared by every Indian language region, plus a
multilingual keyword lexicon used by the offline (no-API-key) understanding engine.

Languages covered offline: English, Hindi/Bhojpuri (Devanagari), Telugu, Odia, Tamil, Bengali.
With Bhashini (all 22 scheduled languages) or an LLM configured, any Indian language is supported."""

SECTORS: dict[str, dict] = {
    "water": {
        "label": "Drinking water", "sdg": "SDG 6", "unit_label": "water supply scheme",
        "keywords": [
            "water", "drinking water", "handpump", "hand pump", "borewell", "bore well", "tap water", "tanker",
            "पानी", "पेयजल", "जल ", "हैंडपंप", "नल", "कुआँ", "टैंकर",
            "నీరు", "నీటి", "నీళ్ళ", "నీళ్లు", "తాగునీ", "మంచినీ", "బోరు", "కుళాయి", "బావి",
            "ପାଣି", "ନଳକୂଅ", "ପିଇବା",
            "தண்ணீர்", "குடிநீர்", "জল", "পানি", "নলকূপ",
        ],
        "sub": {
            "source_repair": ["broken", "repair", "handpump", "borewell", "खराब", "पाडై", "పాడై", "ଖରାପ", "yaphuka"],
            "supply_shortage": ["no water", "shortage", "days", "नहीं है", "లేదు", "ନାହିଁ"],
            "water_quality": ["dirty", "contaminated", "yellow", "smell", "गंदा", "మురికి", "angcolile"],
        },
    },
    "roads": {
        "label": "Roads & connectivity", "sdg": "SDG 9", "unit_label": "road works",
        "keywords": [
            "road", "pothole", "bridge", "street", "footpath", "pavement", "culvert", "all-weather",
            "सड़क", "रास्ता", "पुल", "गड्ढे", "गड्ढा",
            "రోడ్డు", "రోడ్లు", "రహదారి", "దారి", "వంతెన", "గుంత",
            "ରାସ୍ତା", "ପୋଲ", "சாலை", "রাস্তা",
        ],
        "sub": {
            "new_connectivity": ["no road", "ambulance", "not reach", "cut off", "सड़क नहीं", "రోడ్డు లేదు", "ରାସ୍ତା ନାହିଁ", "ambulância", "ama-ambulensi", "एम्बुलेंस", "అంబులెన్స్", "ଆମ୍ବୁଲାନ୍ସ"],
            "potholes_repair": ["pothole", "गड्ढ", "గుంత"],
            "waterlogging": ["flood", "waterlog", "जलभराव", "ముంపు"],
        },
    },
    "electricity": {
        "label": "Electricity & lighting", "sdg": "SDG 7", "unit_label": "power works",
        "keywords": [
            "electricity", "electric", "live wire", "power cut", "power", "load shedding", "load-shedding", "transformer", "streetlight", "street light", "light pole",
            "बिजली", "ट्रांसफार्मर", "स्ट्रीट लाइट", "लाइट",
            "కరెంటు", "కరెంట్", "విద్యుత్", "ట్రాన్స్‌ఫార్మర్", "వీధి దీపం",
            "ବିଜୁଳି", "மின்சாரம்", "বিদ্যুৎ",
        ],
        "sub": {
            "outages": ["cut", "hours", "load shedding", "outage", "घंटे", "గంటలు", "since yesterday"],
            "street_lighting": ["streetlight", "street light", "स्ट्रीट लाइट", "వీధి దీపం", "dark", "escura"],
            "new_connection": ["no electricity", "बिजली नहीं", "కరెంటు లేదు", "ବିଜୁଳି ନାହିଁ", "awukho ugesi", "sem luz"],
        },
    },
    "health": {
        "label": "Health facilities", "sdg": "SDG 3", "unit_label": "health facility",
        "keywords": [
            "hospital", "clinic", "doctor", "nurse", "medicine", "health centre", "phc", "ambulance service",
            "अस्पताल", "डॉक्टर", "दवा", "स्वास्थ्य केंद्र",
            "ఆసుపత్రి", "డాక్టర్", "వైద్యుడు", "మందులు", "ఆరోగ్య కేంద్రం",
            "ଡାକ୍ତରଖାନା", "ଡାକ୍ତର", "மருத்துவமனை", "হাসপাতাল",
        ],
        "sub": {
            "staff_shortage": ["doctor", "डॉक्टर", "డాక్టర్", "ଡାକ୍ତର"],
            "medicine_stockout": ["medicine", "दवा", "మందులు", "amakhambi"],
            "no_facility": ["no hospital", "कोई अस्पताल नहीं", "ఆసుపత్రి లేదు", "ଡାକ୍ତରଖାନା ନାହିଁ", "far"],
        },
    },
    "education": {
        "label": "Schools & childcare", "sdg": "SDG 4", "unit_label": "school infrastructure",
        "keywords": [
            "school", "teacher", "classroom", "creche", "anganwadi",
            "स्कूल", "विद्यालय", "शिक्षक", "आंगनवाड़ी",
            "పాఠశాల", "బడి", "టీచర్", "ఉపాధ్యాయ", "అంగన్వాడీ",
            "ସ୍କୁଲ", "ଶିକ୍ଷକ", "பள்ளி", "বিদ্যালয়", "স্কুল",
        ],
        "sub": {
            "teacher_shortage": ["teacher", "शिक्षक", "టీచర్", "ଶିକ୍ଷକ"],
            "building_unsafe": ["roof", "छत", "పైకప్పు", "collapse", "telhado"],
            "capacity": ["crowded", "creche", "overcrowd"],
        },
    },
    "sanitation": {
        "label": "Sanitation & drainage", "sdg": "SDG 6", "unit_label": "sanitation works",
        "keywords": [
            "drain", "sewage", "sewer", "overflowing", "toilet", "garbage", "waste", "open defecation",
            "नाली", "सीवर", "शौचालय", "कचरा", "गंदगी", "नाला",
            "మురుగు", "కాలువ", "డ్రైనేజీ", "మరుగుదొడ్డి", "మరుగుదొడ్ల", "చెత్త",
            "ନାଳ", "ଶୌଚାଳୟ", "கழிவுநீர்", "নর্দমা",
        ],
        "sub": {
            "drain_overflow": ["overflow", "उफन", "పొంగి", "ଉଛୁଳି", "drain"],
            "toilets": ["toilet", "शौचालय", "మరుగుదొడ్డి", "మరుగుదొడ్ల", "ଶୌଚାଳୟ"],
            "solid_waste": ["garbage", "कचरा", "చెత్త"],
        },
    },
}

OTHER = {"label": "Other public service", "sdg": "SDG 16"}

SEVERITY_TERMS = {
    5: ["death", "died", "dying", "collapse", "electrocut", "मौत", "मर गए", "చనిపోయ", "ମୃତ୍ୟୁ"],
    4: ["ambulance", "pregnant", "disease", "sick", "diarrh", "cholera", "dangerous", "accident", "unsafe",
        "एम्बुलेंस", "गर्भवती", "बीमार", "खतरनाक",
        "అంబులెన్స్", "గర్భిణి", "జబ్బు", "ప్రమాదం",
        "ଆମ୍ବୁଲାନ୍ସ", "ଗର୍ଭବତୀ", "ବେମାର"],
    3: ["days", "weeks", "months", "every day", "दिन", "महीने", "రోజు", "నెలలు", "ଦିନ", "izinsuku"],
}

VULNERABLE_TERMS = {
    "children": ["child", "children", "kids", "बच्चे", "बच्चों", "लइकन", "పిల్లలు", "ଶିଶୁ", "ପିଲା", "crianças", "izingane"],
    "pregnant_women": ["pregnant", "गर्भवती", "గర్భిణి", "ଗର୍ଭବତୀ", "okhulelwe"],
    "elderly": ["elderly", "old people", "बुजुर्ग", "వృద్ధులు", "ବୃଦ୍ଧ"],
    "disabled": ["disabled", "wheelchair", "विकलांग", "దివ్యాంగ", "abakhubazekile"],
    "women": ["women", "mothers", "महिलाएं", "మహిళలు", "abesifazane"],
}

REPAIR_TERMS = ["broken", "repair", "damaged", "not working", "खराब", "टूट", "పాడై", "పనిచేయ", "ଖରାପ", "consert", "yaphuka"]
SERVICE_TERMS = ["no doctor", "teacher absent", "hours", "irregular", "queue", "घंटे", "గంటలు", "silinda"]

EMERGENCY_TERMS = ["fire", "gas leak", "trapped", "drowning", "electrocuted", "suicide", "आग", "गैस रिसाव", "మంటలు", "incêndio", "vazamento de gás", "umlilo"]
ABUSIVE_TERMS = ["idiot", "bastard", "kill you", "कुत्ते", "harami"]

FORMULAIC_CLOSURE_PHRASES = [
    "disposed", "everything is in order", "no action required", "matter closed", "noted",
    "forwarded to concerned", "not pertaining", "as per rules", "resolved as per report",
]


def sector_label(key: str) -> str:
    return SECTORS.get(key, OTHER)["label"]


def sector_sdg(key: str) -> str:
    return SECTORS.get(key, OTHER)["sdg"]
