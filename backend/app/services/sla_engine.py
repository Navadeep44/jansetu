"""SLA and Escalation Rule Engine for JanSetu."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.governance import SlaRule
from app.models.request import CitizenRequest


DEFAULT_SLA_DEFAULTS = {
    "critical_hours": 48,
    "high_hours": 72,
    "routine_days": 7,
    "district_escalation_days": 7,
    "state_escalation_days": 14,
    "state_review_days": 30,
    "ack_target_hours": 24,
    "composite_weights": {"sla": 40, "speed": 25, "reopen": 20, "rating": 15},
}


def get_active_sla_rule(db: Session, state: Optional[str] = None) -> SlaRule:
    """Retrieve active SLA rule for the given state override or national default."""
    if state:
        state_rule = db.query(SlaRule).filter(
            SlaRule.scope == f"state:{state}",
            SlaRule.is_active == True,
        ).order_by(SlaRule.version.desc()).first()
        if state_rule:
            return state_rule

    national_rule = db.query(SlaRule).filter(
        SlaRule.scope == "national",
        SlaRule.is_active == True,
    ).order_by(SlaRule.version.desc()).first()

    if not national_rule:
        # Create initial Version 1
        national_rule = SlaRule(
            version=1,
            scope="national",
            critical_hours=48,
            high_hours=72,
            routine_days=7,
            district_escalation_days=7,
            state_escalation_days=14,
            state_review_days=30,
            ack_target_hours=24,
            composite_weights_json={"sla": 40, "speed": 25, "reopen": 20, "rating": 15},
            values_json={},
            effective_from=datetime.utcnow(),
            author="System Initialization",
            reason="Platform baseline SLA and escalation matrix standards.",
            is_active=True,
        )
        db.add(national_rule)
        db.commit()
    return national_rule


def calculate_sla_due_date(db: Session, severity: int, state: Optional[str] = None, created_at: Optional[datetime] = None) -> datetime:
    """Compute target SLA deadline based on grievance severity/urgency."""
    rule = get_active_sla_rule(db, state)
    base_time = created_at or datetime.utcnow()

    # Severity mapping: 5 = Critical (48h), 4 = High (72h), 1..3 = Routine (7 days)
    if severity >= 5:
        return base_time + timedelta(hours=rule.critical_hours)
    elif severity >= 4:
        return base_time + timedelta(hours=rule.high_hours)
    else:
        return base_time + timedelta(days=rule.routine_days)


def evaluate_sla_state(due_at: Optional[datetime], created_at: Optional[datetime], resolved_at: Optional[datetime] = None) -> Dict[str, Any]:
    """Calculate SLA countdown, tone, and breach status for UI rendering."""
    if not due_at or not created_at:
        return {"status": "normal", "tone": "blue", "percent_left": 100, "label": "Standard SLA", "is_breached": False}

    now = resolved_at or datetime.utcnow()
    total_window_sec = (due_at - created_at).total_seconds()
    if total_window_sec <= 0:
        total_window_sec = 86400

    remaining_sec = (due_at - now).total_seconds()
    percent_left = max(0.0, min(100.0, (remaining_sec / total_window_sec) * 100))

    if remaining_sec < 0:
        breached_hrs = round(abs(remaining_sec) / 3600, 1)
        return {
            "status": "breached",
            "tone": "red",
            "percent_left": 0.0,
            "hours_left": -breached_hrs,
            "label": f"Breached +{breached_hrs}h",
            "is_breached": True,
            "ring_color": "#ef4444",
        }
    elif percent_left < 25:
        hrs_left = round(remaining_sec / 3600, 1)
        return {
            "status": "critical",
            "tone": "red",
            "percent_left": round(percent_left, 1),
            "hours_left": hrs_left,
            "label": f"{hrs_left}h left (Critical)",
            "is_breached": False,
            "ring_color": "#f87171",
        }
    elif percent_left < 50:
        hrs_left = round(remaining_sec / 3600, 1)
        return {
            "status": "warning",
            "tone": "amber",
            "percent_left": round(percent_left, 1),
            "hours_left": hrs_left,
            "label": f"{hrs_left}h left",
            "is_breached": False,
            "ring_color": "#f59e0b",
        }
    else:
        hrs_left = round(remaining_sec / 3600, 1)
        days_left = round(hrs_left / 24, 1)
        lbl = f"{days_left}d left" if days_left >= 2 else f"{hrs_left}h left"
        return {
            "status": "good",
            "tone": "green",
            "percent_left": round(percent_left, 1),
            "hours_left": hrs_left,
            "label": lbl,
            "is_breached": False,
            "ring_color": "#10b981",
        }


def preview_sla_rule_change(
    db: Session,
    critical_hours: int,
    high_hours: int,
    routine_days: int,
    scope: str = "national",
) -> Dict[str, Any]:
    """Calculate the number of currently open grievances that would be affected by a proposed SLA change."""
    now = datetime.utcnow()
    open_reqs = db.query(CitizenRequest).filter(
        CitizenRequest.status.notin_(["closed", "closed_verified", "resolved", "resolved_pending_verification"])
    ).all()

    currently_overdue = sum(1 for r in open_reqs if r.sla_due_at and r.sla_due_at < now)
    newly_overdue_count = 0

    for r in open_reqs:
        c_at = r.created_at or now
        if r.severity >= 5:
            new_due = c_at + timedelta(hours=critical_hours)
        elif r.severity >= 4:
            new_due = c_at + timedelta(hours=high_hours)
        else:
            new_due = c_at + timedelta(days=routine_days)

        if new_due < now and (not r.sla_due_at or r.sla_due_at >= now):
            newly_overdue_count += 1

    return {
        "open_cases_count": len(open_reqs),
        "currently_overdue": currently_overdue,
        "newly_overdue_with_proposed_rules": newly_overdue_count,
        "projected_overdue_total": currently_overdue + newly_overdue_count,
        "effective_preview_note": "Rule changes apply forward to open cases; closed records remain immutable.",
    }
