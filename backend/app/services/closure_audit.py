"""Closure-quality audit: catches the 'Your grievance has been disposed' problem.
An Action Taken Report is flagged when it is boilerplate or merely restates the complaint."""
from difflib import SequenceMatcher

from app.services.ai.lexicon import FORMULAIC_CLOSURE_PHRASES


def audit(closure_note: str, complaint_text: str) -> dict:
    note = (closure_note or "").strip().lower()
    reasons = []
    if len(note) < 40:
        reasons.append("Action Taken Report is too short to describe any concrete action.")
    hits = [p for p in FORMULAIC_CLOSURE_PHRASES if p in note]
    if hits:
        reasons.append("Uses boilerplate phrases: " + ", ".join(f'"{h}"' for h in hits) + ".")
    sim = SequenceMatcher(None, note, (complaint_text or "").lower()).ratio()
    if sim > 0.6:
        reasons.append("Mostly restates the citizen's complaint instead of reporting action.")
    concrete = any(w in note for w in ("repaired", "installed", "replaced", "constructed", "sanctioned", "completed",
                                       "work order", "laid", "deployed", "commissioned", "cleaned", "restored"))
    if not concrete:
        reasons.append("No concrete action verb (repaired / installed / sanctioned ...) found.")
    formulaic = bool(hits) or sim > 0.6 or (len(note) < 40 and not concrete)
    return {"formulaic": formulaic, "similarity_to_complaint": round(sim, 2), "reasons": reasons,
            "advice": "Describe what was done, where, when, and attach a photo; the citizen will be asked to verify."
            if formulaic else "Looks specific. The citizen will be asked to verify."}
