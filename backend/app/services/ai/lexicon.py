"""Common, SDG-mapped development taxonomy shared by every BRICS node, plus a
multilingual keyword lexicon used by the offline (no-API-key) understanding engine.

Languages covered offline: English, Hindi/Bhojpuri (Devanagari), Telugu, Odia, Tamil,
Bengali, Portuguese, isiZulu, Afrikaans, Russian, Chinese, Arabic, Indonesian.
With an LLM or Bhashini configured, any language is supported."""

SECTORS: dict[str, dict] = {
    "water": {
        "label": "Drinking water", "sdg": "SDG 6", "unit_label": "water supply scheme",
        "keywords": [
            "water", "drinking water", "handpump", "hand pump", "borewell", "bore well", "tap water", "tanker",
            "पानी", "पेयजल", "हैंडपंप", "नल", "कुआँ", "टैंकर",
            "నీరు", "నీళ్ళ", "నీళ్లు", "తాగునీ", "బోరు", "కుళాయి", "బావి",
            "ପାଣି", "ନଳକୂଅ", "ପିଇବା",
            "தண்ணீர்", "குடிநீர்", "জল", "পানি", "নলকূপ",
            "água", "agua", "abastecimento", "torneira", "caixa d'água",
            "amanzi", "ompompi", "water", "kraan",
            "вода", "воды", "водоснабжение", "水", "饮用水", "自来水", "مياه", "ماء", "air bersih",
        ],
        "sub": {
            "source_repair": ["broken", "repair", "handpump", "borewell", "खराब", "पाडై", "పాడై", "ଖରାପ", "quebrad", "yaphuka"],
            "supply_shortage": ["no water", "shortage", "days", "नहीं है", "లేదు", "ନାହିଁ", "sem água", "falta", "asinawo", "нет воды", "没有水"],
            "water_quality": ["dirty", "contaminated", "yellow", "smell", "गंदा", "మురికి", "suja", "contaminad", "angcolile"],
        },
    },
    "roads": {
        "label": "Roads & connectivity", "sdg": "SDG 9", "unit_label": "road works",
        "keywords": [
            "road", "pothole", "bridge", "street", "footpath", "pavement", "culvert", "all-weather",
            "सड़क", "रास्ता", "पुल", "गड्ढे", "गड्ढा",
            "రోడ్డు", "రహదారి", "దారి", "వంతెన", "గుంత",
            "ରାସ୍ତା", "ପୋଲ", "சாலை", "রাস্তা",
            "rua", "estrada", "buraco", "asfalto", "ponte", "pavimenta", "alaga",
            "umgwaqo", "imigodi", "ibhuloho", "pad", "slaggat",
            "дорога", "яма", "мост", "道路", "路", "坑", "桥", "طريق", "jalan",
        ],
        "sub": {
            "new_connectivity": ["no road", "ambulance", "not reach", "cut off", "सड़क नहीं", "రోడ్డు లేదు", "ରାସ୍ତା ନାହିଁ", "ambulância", "ama-ambulensi", "एम्बुलेंस", "అంబులెన్స్", "ଆମ୍ବୁଲାନ୍ସ"],
            "potholes_repair": ["pothole", "गड्ढ", "గుంత", "buraco", "imigodi", "яма", "坑"],
            "waterlogging": ["flood", "waterlog", "alaga", "जलभराव", "ముంపు"],
        },
    },
    "electricity": {
        "label": "Electricity & lighting", "sdg": "SDG 7", "unit_label": "power works",
        "keywords": [
            "electricity", "electric", "live wire", "power cut", "power", "load shedding", "load-shedding", "transformer", "streetlight", "street light", "light pole",
            "बिजली", "ट्रांसफार्मर", "स्ट्रीट लाइट", "लाइट",
            "కరెంటు", "కరెంట్", "విద్యుత్", "ట్రాన్స్‌ఫార్మర్", "వీధి దీపం",
            "ବିଜୁଳି", "மின்சாரம்", "বিদ্যুৎ",
            "luz", "energia", "poste", "iluminação", "apagão",
            "ugesi", "ukukhanya", "krag", "elektrisiteit",
            "электричество", "свет", "фонарь", "电", "停电", "路灯", "كهرباء", "listrik",
        ],
        "sub": {
            "outages": ["cut", "hours", "load shedding", "outage", "घंटे", "గంటలు", "apagão", "since yesterday", "kusukela", "ayipheli", "停电"],
            "street_lighting": ["streetlight", "street light", "poste", "स्ट्रीट लाइट", "వీధి దీపం", "фонарь", "路灯", "dark", "escura"],
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
            "posto de saúde", "médico", "hospital", "ubs", "remédio",
            "umtholampilo", "udokotela", "amakhambi", "kliniek",
            "больница", "врач", "поликлиника", "医院", "医生", "诊所", "مستشفى", "طبيب", "puskesmas",
        ],
        "sub": {
            "staff_shortage": ["doctor", "डॉक्टर", "డాక్టర్", "ଡାକ୍ତର", "médico", "udokotela", "врач", "医生"],
            "medicine_stockout": ["medicine", "दवा", "మందులు", "remédio", "amakhambi"],
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
            "escola", "creche", "professor", "vaga",
            "isikole", "uthisha", "ekilasini", "skool",
            "школа", "учитель", "детский сад", "学校", "老师", "幼儿园", "مدرسة", "sekolah",
        ],
        "sub": {
            "teacher_shortage": ["teacher", "शिक्षक", "టీచర్", "ଶିକ୍ଷକ", "professor", "uthisha", "учитель"],
            "building_unsafe": ["roof", "छत", "పైకప్పు", "collapse", "telhado"],
            "capacity": ["crowded", "vaga", "sigcwele", "creche", "overcrowd"],
        },
    },
    "sanitation": {
        "label": "Sanitation & drainage", "sdg": "SDG 6", "unit_label": "sanitation works",
        "keywords": [
            "drain", "sewage", "sewer", "overflowing", "toilet", "garbage", "waste", "open defecation",
            "नाली", "सीवर", "शौचालय", "कचरा", "गंदगी", "नाला",
            "మురుగు", "కాలువ", "మరుగుదొడ్డి", "మరుగుదొడ్ల", "చెత్త",
            "ନାଳ", "ଶୌଚାଳୟ", "கழிவுநீர்", "নর্দমা",
            "esgoto", "lixo", "bueiro", "saneamento", "fossa",
            "indle", "amathoyilethi", "udoti", "riool",
            "канализация", "мусор", "туалет", "污水", "垃圾", "厕所", "صرف صحي", "sampah",
        ],
        "sub": {
            "drain_overflow": ["overflow", "उफन", "పొంగి", "ଉଛୁଳି", "céu aberto", "igeleza", "drain"],
            "toilets": ["toilet", "शौचालय", "మరుగుదొడ్డి", "మరుగుదొడ్ల", "ଶୌଚାଳୟ", "amathoyilethi"],
            "solid_waste": ["garbage", "कचरा", "చెత్త", "lixo", "udoti", "мусор", "垃圾"],
        },
    },
}

OTHER = {"label": "Other public service", "sdg": "SDG 16"}

SEVERITY_TERMS = {
    5: ["death", "died", "dying", "collapse", "electrocut", "मौत", "मर गए", "చనిపోయ", "ମୃତ୍ୟୁ", "morte", "morreu", "ukufa", "смерть", "死亡"],
    4: ["ambulance", "pregnant", "disease", "sick", "diarrh", "cholera", "dangerous", "accident", "unsafe",
        "एम्बुलेंस", "गर्भवती", "बीमार", "खतरनाक",
        "అంబులెన్స్", "గర్భిణి", "జబ్బు", "ప్రమాదం",
        "ଆମ୍ବୁଲାନ୍ସ", "ଗର୍ଭବତୀ", "ବେମାର",
        "ambulância", "grávida", "doença", "perigos", "acidente",
        "ama-ambulensi", "okhulelwe", "ukugula", "ingozi",
        "опасн", "болезн", "危险", "生病"],
    3: ["days", "weeks", "months", "every day", "दिन", "महीने", "రోజు", "నెలలు", "ଦିନ", "dias", "meses", "izinsuku", "дней", "天"],
}

VULNERABLE_TERMS = {
    "children": ["child", "children", "kids", "बच्चे", "बच्चों", "लइकन", "పిల్లలు", "ଶିଶୁ", "ପିଲା", "crianças", "izingane", "дети", "孩子"],
    "pregnant_women": ["pregnant", "गर्भवती", "గర్భిణి", "ଗର୍ଭବତୀ", "grávida", "okhulelwe"],
    "elderly": ["elderly", "old people", "बुजुर्ग", "వృద్ధులు", "ବୃଦ୍ଧ", "idosos", "abadala", "пожилые", "老人"],
    "disabled": ["disabled", "wheelchair", "विकलांग", "దివ్యాంగ", "deficiente", "abakhubazekile"],
    "women": ["women", "mothers", "महिलाएं", "మహిళలు", "mães", "mulheres", "abesifazane"],
}

REPAIR_TERMS = ["broken", "repair", "damaged", "not working", "खराब", "टूट", "పాడై", "పనిచేయ", "ଖରାପ", "quebrad", "consert", "yaphuka", "сломан", "坏"]
SERVICE_TERMS = ["no doctor", "teacher absent", "hours", "irregular", "queue", "fila", "घंटे", "గంటలు", "silinda"]

EMERGENCY_TERMS = ["fire", "gas leak", "trapped", "drowning", "electrocuted", "suicide", "आग", "गैस रिसाव", "మంటలు", "incêndio", "vazamento de gás", "umlilo", "пожар", "火灾"]
ABUSIVE_TERMS = ["idiot", "bastard", "kill you", "कुत्ते", "harami"]

FORMULAIC_CLOSURE_PHRASES = [
    "disposed", "everything is in order", "no action required", "matter closed", "noted",
    "forwarded to concerned", "not pertaining", "as per rules", "resolved as per report",
]


def sector_label(key: str) -> str:
    return SECTORS.get(key, OTHER)["label"]


def sector_sdg(key: str) -> str:
    return SECTORS.get(key, OTHER)["sdg"]
