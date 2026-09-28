"""Append-only, hash-chained cryptographic audit trail for JanSetu governance actions."""
import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.governance import AuditEvent


def _compute_hash(prev_hash: str, actor_username: str, role: str, jurisdiction: str,
                  action: str, target_type: str, target_id: str, detail_str: str,
                  timestamp_iso: str, result: str) -> str:
    """Deterministic SHA-256 computation over ordered fields."""
    payload = f"{prev_hash}|{actor_username}|{role}|{jurisdiction}|{action}|{target_type}|{target_id}|{detail_str}|{timestamp_iso}|{result}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def record_audit_event(
    db: Session,
    *,
    actor_id: Optional[int] = None,
    actor_username: str = "system",
    actor_name: str = "System",
    role: str = "system",
    jurisdiction: str = "National",
    action: str,
    target_type: str = "general",
    target_id: str = "",
    detail: Optional[Dict[str, Any]] = None,
    ip_address: str = "127.0.0.1",
    result: str = "success",
    timestamp: Optional[datetime] = None,
    commit: bool = True,
) -> AuditEvent:
    """Append a new cryptographic audit event linked to the previous event's hash."""
    ts = timestamp or datetime.utcnow()
    detail_data = detail or {}
    detail_str = json.dumps(detail_data, sort_keys=True)

    # Get the latest event's hash (including pending in session)
    pending_events = [obj for obj in db.new if isinstance(obj, AuditEvent)]
    if pending_events:
        prev_hash = pending_events[-1].hash
    else:
        last_event = db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
        prev_hash = last_event.hash if last_event else "0" * 64

    event_hash = _compute_hash(
        prev_hash=prev_hash,
        actor_username=actor_username,
        role=role,
        jurisdiction=jurisdiction,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        detail_str=detail_str,
        timestamp_iso=ts.isoformat(),
        result=result,
    )

    ev = AuditEvent(
        prev_hash=prev_hash,
        hash=event_hash,
        actor_id=actor_id,
        actor_username=actor_username,
        actor_name=actor_name,
        role=role,
        jurisdiction=jurisdiction,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        detail_json=detail_data,
        ip_address=ip_address,
        result=result,
        timestamp=ts,
    )
    db.add(ev)
    if commit:
        db.commit()
    return ev


def verify_audit_chain(db: Session) -> dict:
    """Verify integrity of the entire audit log hash chain."""
    events = db.query(AuditEvent).order_by(AuditEvent.id.asc()).all()
    if not events:
        return {
            "valid": True,
            "total_events": 0,
            "verified_at": datetime.utcnow().isoformat(),
            "message": "Audit chain is empty and intact.",
        }

    expected_prev = "0" * 64
    for idx, ev in enumerate(events):
        # 1. Check prev_hash matches previous record
        if ev.prev_hash != expected_prev:
            return {
                "valid": False,
                "broken_at_id": ev.id,
                "broken_at_index": idx,
                "reason": f"Mismatched prev_hash: expected '{expected_prev}', got '{ev.prev_hash}'",
                "verified_at": datetime.utcnow().isoformat(),
            }

        # 2. Recompute current hash
        detail_str = json.dumps(ev.detail_json or {}, sort_keys=True)
        recomputed = _compute_hash(
            prev_hash=ev.prev_hash,
            actor_username=ev.actor_username,
            role=ev.role,
            jurisdiction=ev.jurisdiction,
            action=ev.action,
            target_type=ev.target_type,
            target_id=ev.target_id,
            detail_str=detail_str,
            timestamp_iso=ev.timestamp.isoformat() if ev.timestamp else "",
            result=ev.result,
        )

        if ev.hash != recomputed:
            return {
                "valid": False,
                "broken_at_id": ev.id,
                "broken_at_index": idx,
                "reason": f"Tampered record content: stored hash '{ev.hash}' does not match recomputed '{recomputed}'",
                "verified_at": datetime.utcnow().isoformat(),
            }

        expected_prev = ev.hash

    return {
        "valid": True,
        "total_events": len(events),
        "latest_hash": expected_prev,
        "verified_at": datetime.utcnow().isoformat(),
        "message": f"Cryptographic audit chain verified ({len(events)} events perfectly linked).",
    }
