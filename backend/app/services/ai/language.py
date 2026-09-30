"""Lightweight language identification that works offline.
Script-based for Indic / Cyrillic / CJK / Arabic / Ethiopic, keyword-based for Latin scripts."""
import re

LANGUAGES = {
    "en": "English", "hi": "Hindi", "bho": "Bhojpuri", "te": "Telugu", "or": "Odia", "ta": "Tamil",
    "bn": "Bengali", "mr": "Marathi", "pt": "Portuguese", "zu": "isiZulu", "xh": "isiXhosa",
    "af": "Afrikaans", "ru": "Russian", "zh": "Chinese", "ar": "Arabic", "am": "Amharic",
    "fa": "Persian", "id": "Indonesian", "gon": "Gondi",
}

# BCP-47 tags used by browser speech APIs / TTS
SPEECH_TAGS = {
    "en": "en-IN", "hi": "hi-IN", "bho": "hi-IN", "te": "te-IN", "or": "or-IN", "ta": "ta-IN", "bn": "bn-IN",
    "mr": "mr-IN", "pt": "pt-BR", "zu": "zu-ZA", "xh": "xh-ZA", "af": "af-ZA", "ru": "ru-RU", "zh": "zh-CN",
    "ar": "ar-EG", "am": "am-ET", "fa": "fa-IR", "id": "id-ID",
}

_SCRIPT_RANGES = [
    ("te", r"[ఀ-౿]"), ("or", r"[଀-୿]"), ("ta", r"[஀-௿]"),
    ("bn", r"[ঀ-৿]"), ("hi", r"[ऀ-ॿ]"), ("ru", r"[Ѐ-ӿ]"),
    ("zh", r"[一-鿿]"), ("am", r"[ሀ-፿]"), ("ar", r"[؀-ۿ]"),
]

_LATIN_MARKERS = {
    "pt": ["não", "sem", "está", "rua", "água", "luz", "bairro", "há", "muito", "para", "com", "que", "de", "o posto", "esgoto", "falta", "nós", "minha", "ção", "já", "meu", "nossa", "nosso", "avenida", "buraco", "está", "uma"],
    "zu": ["asina", "amanzi", "ugesi", "umgwaqo", "izingane", "kusukela", "futhi", "kakhulu", "ayikho", "awukho", "isikole", "ngoba", "sicela", "umtholampilo"],
    "af": ["ons", "nie", "geen", "water", "krag", "die", "is", "het", "strate", "asseblief"],
    "id": ["tidak", "ada", "jalan", "air", "listrik", "kami", "sudah", "yang", "dan"],
    "en": ["the", "no", "is", "and", "our", "we", "not", "water", "road", "please", "there", "since", "village"],
}

_BHOJPURI_MARKERS = ["बाड़", "नइखे", "हमनी", "बा ", "जाला", "आवेला", "लइकन"]
_PERSIAN_MARKERS = ["پ", "چ", "ژ", "گ", "ی"]


def detect_language(text: str, hint: str | None = None) -> tuple[str, float]:
    """Return (language_code, confidence)."""
    if hint and hint in LANGUAGES and hint != "auto":
        return hint, 0.99
    t = (text or "").strip()
    if not t:
        return "und", 0.0
    counts = {}
    for code, pattern in _SCRIPT_RANGES:
        n = len(re.findall(pattern, t))
        if n:
            counts[code] = n
    if counts:
        code = max(counts, key=counts.get)
        share = counts[code] / max(1, len(re.sub(r"\s", "", t)))
        if code == "hi" and any(m in t for m in _BHOJPURI_MARKERS):
            return "bho", 0.75
        if code == "ar" and any(m in t for m in _PERSIAN_MARKERS):
            return "fa", 0.7
        return code, round(min(0.99, 0.6 + share * 0.4), 2)
    low = " " + t.lower() + " "
    scores = {}
    for code, markers in _LATIN_MARKERS.items():
        s = 0
        for m in markers:
            if re.search(r"(?<![a-zà-ÿ])" + re.escape(m) + r"(?![a-zà-ÿ])", low) or (len(m) > 3 and m in low):
                s += 1
        scores[code] = s
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "en", 0.4
    total = sum(scores.values())
    return best, round(min(0.95, 0.5 + scores[best] / (total + 1) * 0.5), 2)
