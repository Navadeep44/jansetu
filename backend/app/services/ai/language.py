"""Lightweight language identification that works offline.
Script-based for Indic scripts (Devanagari, Telugu, Odia, Tamil, Bengali, Urdu), keyword-based for romanised text."""
import re

LANGUAGES = {
    "en": "English", "hi": "Hindi", "bho": "Bhojpuri", "te": "Telugu", "ta": "Tamil", "bn": "Bengali",
    "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi",
    "or": "Odia", "ur": "Urdu", "gon": "Gondi",
    # Legacy fallbacks for partner data compatibility
    "pt": "Portuguese", "zu": "isiZulu", "xh": "isiXhosa", "af": "Afrikaans", "ru": "Russian", "zh": "Chinese", "ar": "Arabic", "am": "Amharic", "fa": "Persian", "id": "Indonesian",
}

# BCP-47 tags used by browser speech APIs / TTS
SPEECH_TAGS = {
    "en": "en-IN", "hi": "hi-IN", "bho": "hi-IN", "te": "te-IN", "or": "or-IN", "ta": "ta-IN", "bn": "bn-IN",
    "mr": "mr-IN", "ur": "ur-IN", "kn": "kn-IN", "ml": "ml-IN", "gu": "gu-IN", "pa": "pa-IN", "gon": "te-IN",
    # Fallbacks
    "pt": "pt-BR", "zu": "zu-ZA", "xh": "xh-ZA", "af": "af-ZA", "ru": "ru-RU", "zh": "zh-CN", "ar": "ar-EG", "am": "am-ET", "fa": "fa-IR", "id": "id-ID",
}

_SCRIPT_RANGES = [
    ("te", r"[ఀ-౿]"), ("ta", r"[஀-௿]"), ("bn", r"[ঀ-৿]"),
    ("or", r"[଀-୿]"), ("gu", r"[઀-૿]"), ("kn", r"[ಀ-೿]"),
    ("ml", r"[ഀ-ൿ]"), ("pa", r"[਀-੿]"), ("hi", r"[ऀ-ॿ]"),
    ("ur", r"[؀-ۿ]"), ("ar", r"[؀-ۿ]"),
    ("ru", r"[Ѐ-ӿ]"), ("zh", r"[一-鿿]"), ("am", r"[ሀ-፿]"),
]

_LATIN_MARKERS = {
    "hi": ["pani", "paani", "nahi", "sadak", "bijli", "hamare", "gaon", "mein", "hai", "kripya", "naali", "hospital nahi"],
    "te": ["neellu", "ledu", "roddu", "current ledu", "maa ooru", "undi", "cheyandi", "baaga"],
    "en": ["the", "no", "is", "and", "our", "we", "not", "water", "road", "please", "there", "since", "village"],
}

_BHOJPURI_MARKERS = ["बाड़", "नइखे", "हमनी", "बा ", "जाला", "आवेला", "लइकन"]


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
