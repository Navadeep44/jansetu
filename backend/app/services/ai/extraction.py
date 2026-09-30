"""Turns a free-form citizen message (any language) into a structured development request.

Hybrid design:
  1. Offline multilingual rules (always run, deterministic, explainable)
  2. LLM structured extraction (if configured) - overrides rules only when it returns valid JSON
Low confidence never auto-rejects: it routes the request to a human review queue."""
import re

from app.core.i18n import SECTOR_NAMES
from app.services.ai import bhashini, providers
from app.services.ai.language import LANGUAGES, detect_language
from app.services.ai.lexicon import (EMERGENCY_TERMS, ABUSIVE_TERMS, REPAIR_TERMS, SECTORS, SERVICE_TERMS,
                                     SEVERITY_TERMS, VULNERABLE_TERMS, sector_label, sector_sdg)

SUB_LABELS = {
    "source_repair": "water source broken (handpump / borewell)", "supply_shortage": "no regular water supply",
    "water_quality": "unsafe / contaminated water", "new_connectivity": "no all-weather road access",
    "potholes_repair": "damaged road surface", "waterlogging": "road flooding / waterlogging",
    "outages": "frequent power cuts", "street_lighting": "street lights not working", "new_connection": "no electricity connection",
    "staff_shortage": "no doctor / health staff", "medicine_stockout": "medicines unavailable", "no_facility": "no health facility nearby",
    "teacher_shortage": "teacher shortage", "building_unsafe": "unsafe school building", "capacity": "not enough school / creche places",
    "drain_overflow": "open or overflowing drains", "toilets": "toilets unavailable / unusable", "solid_waste": "garbage not collected",
    "general": "general issue",
}

_LATIN = re.compile(r"^[a-z0-9 '\-]+$")
_COLLECTIVE = ["village", "whole", "everyone", "all families", "colony", "गाँव", "पूरे", "మా ఊరి", "గ్రామ", "ఊరిలో", "ଗାଁ",
               "bairro", "comunidade", "todos", "vizinhança", "umphakathi", "sonke", "деревн", "村"]
_HOUSEHOLD_WORDS = r"(families|households|houses|people|परिवार|घर|लोग|కుటుంబాలు|ఇళ్లు|మంది|ପରିବାର|famílias|casas|pessoas|imindeni|abantu|семей|человек|户|人)"


def _match(text_low: str, term: str) -> bool:
    term = term.lower()
    if _LATIN.match(term):
        return re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", text_low) is not None
    return term in text_low


def _score_sectors(low: str) -> dict[str, float]:
    scores = {}
    for key, cfg in SECTORS.items():
        s = sum(len(k) for k in cfg["keywords"] if _match(low, k))
        if s:
            scores[key] = float(s)
    return scores


def _subcategory(low: str, sector: str) -> str:
    best, best_s = "general", 0
    for sub, terms in SECTORS.get(sector, {}).get("sub", {}).items():
        s = sum(len(t) for t in terms if _match(low, t))
        if s > best_s:
            best, best_s = sub, s
    return best


def _severity(low: str) -> int:
    for level in (5, 4, 3):
        if any(_match(low, t) for t in SEVERITY_TERMS[level]):
            return level
    return 2


def _affected(low: str) -> int:
    m = re.search(r"(\d{1,5})\s*" + _HOUSEHOLD_WORDS, low)
    if m:
        return int(m.group(1))
    if any(_match(low, c) for c in _COLLECTIVE):
        return 50
    return 1


def offline_gist(sector: str, sub: str, vulnerable: list[str], severity: int) -> str:
    parts = [f"{sector_label(sector)}: {SUB_LABELS.get(sub, sub.replace('_', ' '))}."]
    if vulnerable:
        parts.append("Affects " + ", ".join(v.replace("_", " ") for v in vulnerable) + ".")
    if severity >= 4:
        parts.append("Citizen reports a risk to health or life.")
    return " ".join(parts)


def rule_extract(text: str, lang_hint: str | None = None) -> dict:
    lang, lang_conf = detect_language(text, lang_hint)
    low = (text or "").lower()
    scores = _score_sectors(low)
    if scores:
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        sector = ranked[0][0]
        margin = ranked[0][1] / (sum(scores.values()))
        confidence = round(min(0.95, 0.45 + 0.5 * margin + min(ranked[0][1], 20) / 100), 2)
    else:
        sector, confidence = "other", 0.2
    sub = _subcategory(low, sector)
    severity = _severity(low)
    vulnerable = [g for g, terms in VULNERABLE_TERMS.items() if any(_match(low, t) for t in terms)]
    if vulnerable and severity < 3:
        severity = 3
    if any(_match(low, t) for t in REPAIR_TERMS):
        rtype = "repair"
    elif any(_match(low, t) for t in SERVICE_TERMS):
        rtype = "service_quality"
    else:
        rtype = "new_asset"
    flags = []
    if any(_match(low, t) for t in EMERGENCY_TERMS):
        flags.append("urgent_safety")
        severity = 5
    if any(_match(low, t) for t in ABUSIVE_TERMS):
        flags.append("abusive")
    if len(low.strip()) < 12:
        flags.append("too_short")
    return {
        "language": lang, "language_name": LANGUAGES.get(lang, lang), "language_confidence": lang_conf,
        "category": sector, "category_label": sector_label(sector), "subcategory": sub,
        "subcategory_label": SUB_LABELS.get(sub, sub), "request_type": rtype, "severity": severity,
        "vulnerable_groups": vulnerable, "affected_people": _affected(low), "sdg": sector_sdg(sector),
        "confidence": round(confidence * (0.7 + 0.3 * lang_conf), 2), "flags": flags,
        "translated_text": text if lang == "en" else offline_gist(sector, sub, vulnerable, severity),
        "translation_mode": "source" if lang == "en" else "offline_gist", "extraction_mode": "rules",
        "sector_scores": scores,
    }


LLM_SYSTEM = """You are the understanding engine of JanSetu, a public Digital Public Good that turns citizen
development requests (any language, often transcribed speech) into structured data for government planners.
Return ONLY a JSON object with keys:
 translated_text (faithful English translation),
 category (one of: water, roads, electricity, health, education, sanitation, other),
 subcategory (short snake_case), request_type (new_asset|repair|service_quality),
 severity (1-5; 5 = risk to life), affected_people (integer estimate, households if stated),
 vulnerable_groups (list from: children, pregnant_women, elderly, disabled, women),
 location_mentions (list of place names / landmarks exactly as mentioned),
 confidence (0-1), clarifying_question (null or ONE short question in the citizen's language if the
 category or location is unclear).
Never invent facts. Keep names of people out of the output."""


NATIVE_TEMPLATES = {
    "hi": "जनसेतु ने समझा: {sector} की समस्या ({sub})। गंभीरता: {severity}/5। अनुमानित प्रभावित: ~{affected} लोग।",
    "te": "జనసేతు అర్థం చేసుకున్నది: {sector} సమస్య ({sub}). తీవ్రత: {severity}/5. ప్రభావితం: సుమారు {affected} మంది.",
    "ta": "ஜன்சேது புரிந்துகொண்டது: {sector} பிரச்சனை ({sub}). தீவிரம்: {severity}/5. பாதிக்கப்பட்டவர்கள்: ~{affected} பேர்.",
    "bn": "জনসেতু বুঝেছে: {sector} সমস্যা ({sub})। তীব্রতা: {severity}/5। ক্ষতিগ্রস্ত: ~{affected} জন।",
    "mr": "जनसेतूने समजून घेतले: {sector} ची समस्या ({sub}). तीव्रता: {severity}/5. बाधित: ~{affected} व्यक्ती.",
    "gu": "જનસેતુએ સમજ્યું: {sector} ની સમસ્યા ({sub}). ગંભીરતા: {severity}/5. અસરગ્રસ્ત: ~{affected} લોકો.",
    "kn": "ಜನಸೇತು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದು: {sector} ಸಮಸ್ಯೆ ({sub}). ತೀವ್ರತೆ: {severity}/5. ಬಾಧಿತರು: ~{affected} ಜನ.",
    "ml": "ജനസേതു മനസ്സിലാക്കിയത്: {sector} പ്രശ്നം ({sub}). തീവ്രത: {severity}/5. ബാധിതർ: ~{affected} ആളുകൾ.",
    "pa": "ਜਨਸੇਤੂ ਨੇ ਸਮਝਿਆ: {sector} ਦੀ ਸਮੱਸਿਆ ({sub}). ਗੰਭੀਰਤਾ: {severity}/5. ਪ੍ਰਭਾਵਿਤ: ~{affected} ਲੋਕ.",
    "or": "ଜନସେତୁ ବୁଝିପାରିଲା: {sector} ସମସ୍ୟା ({sub})। ଗମ୍ଭୀରତା: {severity}/5। ପ୍ରଭାବିତ: ~{affected} ଲୋକ।",
    "bho": "जनसेतु समझलसि: {sector} के समस्या ({sub})। गंभीरता: {severity}/5। परभावित: ~{affected} लोग।",
    "pt": "O JanSetu entendeu: Problema de {sector} ({sub}). Gravidade: {severity}/5. Afetados: ~{affected} pessoas.",
    "zu": "UJanSetu uqondile: Inkinga ye-{sector} ({sub}). Ubucayi: {severity}/5. Abathintekile: ~{affected} abantu.",
    "en": "JanSetu understood: {sector} issue ({sub}). Severity: {severity}/5. Estimated affected: ~{affected} people.",
}

CLARIFYING_PROMPTS = {
    "hi": {
        "unclear_sector": "क्या यह समस्या पानी, सड़क, बिजली, स्वास्थ्य, स्कूल या नाली के बारे में है? कृपया नीचे चुनें।",
        "missing_location": "कृपया अपने गाँव, वार्ड या इलाके का नाम जोड़ें ताकि कार्य दल मौके पर पहुँच सके।",
        "confirm": "क्या यह विवरण आपकी समस्या से सही मेल खाता है?",
    },
    "te": {
        "unclear_sector": "ఇది నీరు, రోడ్డు, కరెంటు, ఆరోగ్యం, బడి లేదా మురుగు కాలువ — దేని గురించి? దయచేసి కింద ఎంచుకోండి.",
        "missing_location": "దయచేసి మీ గ్రామం, వార్డు లేదా ప్రాంతం పేరును పేర్కొనండి.",
        "confirm": "ఈ వివరాలు మీ సమస్యకు సరిగ్గా సరిపోలుతున్నాయా?",
    },
    "ta": {
        "unclear_sector": "இது குடிநீர், சாலை, மின்சாரம், சுகாதாரம், பள்ளி அல்லது வடிகால் பற்றியதா? கீழே தேர்வு செய்யவும்.",
        "missing_location": "உங்கள் கிராமம் அல்லது பகுதியின் பெயரைத் தெரிவிக்கவும்.",
        "confirm": "ஜன்சேது புரிந்துகொண்ட இந்த விவரங்கள் சரியானவையா?",
    },
    "bn": {
        "unclear_sector": "এটি পানীয় জল, রাস্তা, বিদ্যুৎ, স্বাস্থ্য, স্কুল নাকি নর্দমা সংক্রান্ত? অনুগ্রহ করে নির্বাচন করুন।",
        "missing_location": "অনুগ্রহ করে আপনার গ্রাম বা এলাকার নাম উল্লেখ করুন।",
        "confirm": "জনসেতু যা বুঝেছে তা কি আপনার সমস্যার সাথে সঠিকভাবে মিলেছে?",
    },
    "mr": {
        "unclear_sector": "ही समस्या पाणी, रस्ता, वीज, आरोग्य, शाळा की गटाराबद्दल आहे? कृपया खाली निवडा.",
        "missing_location": "कृपया तुमच्या गावाचे किंवा परिसराचे नाव सांगा.",
        "confirm": "जनसेतूने समजून घेतलेले तपशील योग्य आहेत का?",
    },
    "en": {
        "unclear_sector": "Is this about water, road, electricity, health, school, or drainage? Please tap below to clarify.",
        "missing_location": "Please mention your village, ward, or neighborhood so the field team knows where to go.",
        "confirm": "Does JanSetu's understanding accurately describe your problem?",
    },
}


def synthesize_native_dialogue(result: dict, text: str) -> dict:
    lang = result.get("language") or "en"
    sec = result.get("category", "other")
    sec_name = SECTOR_NAMES.get(lang, {}).get(sec, SECTOR_NAMES.get("en", {}).get(sec, sec))
    sub = result.get("subcategory_label", result.get("subcategory", "general"))
    sev = result.get("severity", 2)
    aff = result.get("affected_people", 1)

    template = NATIVE_TEMPLATES.get(lang, NATIVE_TEMPLATES["en"])
    native_summary = template.format(sector=sec_name, sub=sub, severity=sev, affected=aff)

    prompts = CLARIFYING_PROMPTS.get(lang, CLARIFYING_PROMPTS["en"])
    clarifying_q = result.get("clarifying_question")
    clarifying_options = []

    has_location = bool(result.get("location_mentions")) or bool(
        re.search(r"\b(village|colony|ward|mandal|dist|nagar|street|basti|गाँव|वार्ड|నగర్|కాలనీ)\b", text, re.I)
    )

    if sec == "other" or result.get("confidence", 0) < 0.45:
        if not clarifying_q:
            clarifying_q = prompts["unclear_sector"]
        clarifying_options = [
            {"label": "💧 " + SECTOR_NAMES.get(lang, {}).get("water", "Water"), "category": "water", "append": " (Water / drinking supply)"},
            {"label": "🛣️ " + SECTOR_NAMES.get(lang, {}).get("roads", "Roads"), "category": "roads", "append": " (Road / link)"},
            {"label": "⚡ " + SECTOR_NAMES.get(lang, {}).get("electricity", "Electricity"), "category": "electricity", "append": " (Electricity supply)"},
            {"label": "🚯 " + SECTOR_NAMES.get(lang, {}).get("sanitation", "Sanitation"), "category": "sanitation", "append": " (Drains / sanitation)"},
            {"label": "🏥 " + SECTOR_NAMES.get(lang, {}).get("health", "Health"), "category": "health", "append": " (Health / clinic)"},
            {"label": "🏫 " + SECTOR_NAMES.get(lang, {}).get("education", "Education"), "category": "education", "append": " (School / education)"},
        ]
    elif not has_location and len(text.strip().split()) < 8:
        if not clarifying_q:
            clarifying_q = prompts["missing_location"]
        clarifying_options = [
            {"label": "📍 " + ("मेरी लोकेशन उपयोग करें" if lang == "hi" else "నా లొకేషన్ పంపండి" if lang == "te" else "Use my GPS location"), "action": "use_location"},
            {"label": "✏️ " + ("गाँव / वार्ड का नाम लिखें" if lang == "hi" else "గ్రామం పేరు రాయండి" if lang == "te" else "Type village/ward name"), "action": "focus_location"},
        ]
    else:
        if not clarifying_q:
            clarifying_q = prompts["confirm"]
        clarifying_options = [
            {"label": "✅ " + ("हाँ, विवरण सही है" if lang == "hi" else "అవును, వివరాలు సరైనవే" if lang == "te" else "Yes, details are correct"), "action": "confirm"},
            {"label": "✏️ " + ("कुछ और जोड़ें" if lang == "hi" else "మరిన్ని వివరాలు" if lang == "te" else "Add more details"), "action": "refine"},
        ]

    result["native_summary"] = native_summary
    result["clarifying_question"] = clarifying_q
    result["clarifying_options"] = clarifying_options
    result["needs_clarification"] = sec == "other" or result.get("confidence", 0) < 0.45 or (not has_location and len(text.strip().split()) < 8)
    return result


def extract(text: str, lang_hint: str | None = None) -> dict:
    result = rule_extract(text, lang_hint)
    result["location_mentions"] = []
    result["clarifying_question"] = None
    llm = providers.chat_json(LLM_SYSTEM, f"Language hint: {result['language_name']}\nCitizen message:\n{text}")
    if isinstance(llm, dict) and llm.get("category") in list(SECTORS) + ["other"]:
        for key in ("translated_text", "category", "subcategory", "request_type", "affected_people",
                    "vulnerable_groups", "location_mentions", "clarifying_question"):
            if llm.get(key) not in (None, ""):
                result[key] = llm[key]
        try:
            result["severity"] = max(result["severity"] if "urgent_safety" in result["flags"] else 1, int(llm.get("severity", result["severity"])))
            result["confidence"] = round(float(llm.get("confidence", result["confidence"])), 2)
        except (TypeError, ValueError):
            pass
        result["category_label"] = sector_label(result["category"])
        result["subcategory_label"] = SUB_LABELS.get(result["subcategory"], str(result["subcategory"]).replace("_", " "))
        result["sdg"] = sector_sdg(result["category"])
        result["translation_mode"] = "source" if result["language"] == "en" else "llm"
        result["extraction_mode"] = "llm"
    elif result["language"] != "en":
        t = bhashini.translate(text, result["language"], "en")
        if t:
            result["translated_text"], result["translation_mode"] = t, "bhashini"
            # re-run English rules on the translation to improve category confidence
            again = rule_extract(t, "en")
            if again["confidence"] > result["confidence"]:
                for k in ("category", "category_label", "subcategory", "subcategory_label", "sdg", "confidence"):
                    result[k] = again[k]
    return synthesize_native_dialogue(result, text)
