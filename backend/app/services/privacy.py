"""Privacy-by-design utilities (DPG indicators 6, 7, 9A; India DPDP Act 2023 and DPDP Rules 2025)."""
import hashlib
import math
import random
import re

from app.core.config import settings

_PATTERNS = [
    (re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"), "[ID-NUMBER]"),                      # Aadhaar
    (re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"), "[ID-NUMBER]"),                          # PAN
    (re.compile(r"\b[A-Z]{3}\d{7}\b"), "[ID-NUMBER]"),                                # Voter ID (EPIC)
    (re.compile(r"\b\d{2}\s?\d{2}\s?\d{2}\s?\d{5}\b"), "[ID-NUMBER]"),                 # ration card-like
    (re.compile(r"(\+?\d{1,3}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}\b"), "[PHONE]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[EMAIL]"),
]
_NAME_INTRO = re.compile(
    r"(my name is|i am|मेरा नाम|नाम है|నా పేరు|ମୋ ନାମ|मैं हूँ|నేను|ମୁଁ)\s+([^\s,.;।]+(\s[^\s,.;।]+)?)",
    re.IGNORECASE,
)


def redact(text: str) -> str:
    out = text or ""
    out = _NAME_INTRO.sub(lambda m: m.group(1) + " [NAME]", out)
    for pat, repl in _PATTERNS:
        out = pat.sub(repl, out)
    return out


def household_hash(identifier: str | None) -> str:
    """One-way salted hash of phone / chat-id: lets us count unique households
    without ever storing the raw identifier in analytics tables."""
    raw = (identifier or f"anon-{random.random()}").strip().lower()
    raw = re.sub(r"[\s+\-().]", "", raw)  # '+91 90000-11111' and '919000011111' are the same household
    return hashlib.sha256((settings.household_salt + raw).encode()).hexdigest()[:24]


def k_anonymise(count: int, k: int | None = None) -> int | None:
    k = k or settings.k_anonymity
    return None if count < k else count


def dp_noise(value: float, sensitivity: float = 1.0) -> float:
    eps = settings.dp_epsilon
    if eps <= 0:
        return value
    u = random.random() - 0.5
    return value - (sensitivity / eps) * math.copysign(1, u) * math.log(1 - 2 * abs(u))
