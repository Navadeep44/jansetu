"""
Automated Test Suite for V2 Addendum Governance Suite:
1. D2 Scope Isolation (Telangana State Officer cannot see Soweto, Seelampur, Diepsloot, Maharashtra, etc.)
2. Field Verification with Geotagging and OTP/Signature Confirmation
3. Citizen Communication Relay with Masked Numbers & 403 Cross-Jurisdiction Protection
4. Document Verification Lifecycle (Field Flagging -> Dept Officer Verification)
5. Department Assignment Assistant & Team Workload Balancing
6. District Show-Cause Notices (Issue -> Answer -> Close)
7. District Jan Sunwai (Public Hearing) & Compliance Orders
8. District Disaster/Emergency Declaration & Relief Ledger
9. State Circular Dispatcher & District Collector Acknowledgements
10. Citizen Appeal Filing & State Officer Statutory Adjudication (Uphold/Overturn/Remand)
11. Versioned SLA Rule Engine with Open Case Preview
12. Cryptographic SHA-256 Audit Hash-Chain Integrity Verification & Intentional Tampering Detection
"""
import pytest
from app.core import security
from app.models.governance import AuditEvent
from app.core.database import SessionLocal
from tests.test_officer_dashboards import get_token, auth_header


# ==============================================================================
# 1. D2 SCOPE ISOLATION TEST
# ==============================================================================
def test_v2_state_officer_scope_isolation_d2(client):
    """Telangana State Officer must never see nodes from Delhi, Maharashtra, Soweto or Seelampur."""
    tok_tg = get_token(client, "state_telangana")

    # Command Center
    res = client.get("/api/state/command", headers=auth_header(tok_tg))
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "Telangana"

    # District Benchmark Leaderboard
    res_bench = client.get("/api/state/benchmark", headers=auth_header(tok_tg))
    assert res_bench.status_code == 200
    bench_data = res_bench.json()
    assert bench_data["state"] == "Telangana"
    for d in bench_data["leaderboard"]:
        assert d["district"] not in ["South Delhi", "Pune", "Soweto", "Seelampur"]

    # Scoped Early Warnings in State Command Center
    warnings = data.get("early_warnings", [])
    for w in warnings:
        area = w.get("area", "") or w.get("district", "")
        assert "Soweto" not in area
        assert "Seelampur" not in area
        assert "Diepsloot" not in area


# ==============================================================================
# 2. FIELD VERIFICATION & GEOTAGGING
# ==============================================================================
def test_v2_field_verification_lifecycle(client):
    """Field Officer submits field inspection checklist, photos, and citizen OTP confirmation."""
    tok_field = get_token(client, "field_utnoor")

    # Get an assigned complaint from field inbox
    res_dash = client.get("/api/officer/dashboard", headers=auth_header(tok_field))
    assert res_dash.status_code == 200
    inbox = res_dash.json()["inbox"]
    assert len(inbox) > 0
    case_id = inbox[0]["id"]

    # Submit verification
    verif_payload = {
        "checklist": [
            {"item": "Physical site inspected", "passed": True},
            {"item": "Pipe leakage sealed", "passed": True},
            {"item": "Water pressure restored", "passed": True},
        ],
        "notes": "Work completed at site in Block Utnoor. Citizen confirmed flow restored.",
        "device_lat": 19.3650,
        "device_lng": 78.7840,
        "citizen_confirmation_type": "otp",
        "photos": [
            {"kind": "before", "url": "/mock/proofs/before_leak.jpg", "lat": 19.3650, "lng": 78.7840},
            {"kind": "after", "url": "/mock/proofs/after_leak.jpg", "lat": 19.3650, "lng": 78.7840},
        ],
    }

    res_post = client.post(f"/api/cases/{case_id}/verification", json=verif_payload, headers=auth_header(tok_field))
    assert res_post.status_code == 200
    assert res_post.json()["status"] == "ok"

    # Retrieve verification record
    res_get = client.get(f"/api/cases/{case_id}/verification", headers=auth_header(tok_field))
    assert res_get.status_code == 200
    v_data = res_get.json()
    assert v_data["verification"]["citizen_confirmation_type"] == "otp"
    assert len(v_data.get("media", [])) >= 2


# ==============================================================================
# 3. CITIZEN COMMUNICATION RELAY
# ==============================================================================
def test_v2_citizen_messaging_relay(client):
    """Officers send templated messages; unauthorized cross-district officer receives 403."""
    tok_field_utnoor = get_token(client, "field_utnoor")
    tok_field_pune = get_token(client, "field_pune")

    res_dash = client.get("/api/officer/dashboard", headers=auth_header(tok_field_utnoor))
    case_id = res_dash.json()["inbox"][0]["id"]

    # Utnoor Field Officer sends arrival notice
    msg_payload = {
        "template_id": "arrival_notice",
        "channel": "sms",
        "custom_note": "Inspection team arriving at 11:30 AM",
    }
    res_send = client.post(f"/api/cases/{case_id}/messages", json=msg_payload, headers=auth_header(tok_field_utnoor))
    assert res_send.status_code == 200
    assert res_send.json()["status"] == "ok"

    # Fetch messages history
    res_msgs = client.get(f"/api/cases/{case_id}/messages", headers=auth_header(tok_field_utnoor))
    assert res_msgs.status_code == 200
    messages = res_msgs.json()["messages"]
    assert any(m["template_id"] == "arrival_notice" for m in messages)

    # Unauthorized Pune Field Officer attempting to message Utnoor case gets 403
    res_forbidden = client.post(f"/api/cases/{case_id}/messages", json=msg_payload, headers=auth_header(tok_field_pune))
    assert res_forbidden.status_code == 403


# ==============================================================================
# 4. DOCUMENT VERIFICATION LIFECYCLE
# ==============================================================================
def test_v2_document_verification_lifecycle(client):
    """Field officer checks document, Dept officer verifies against central registry adapter."""
    tok_field = get_token(client, "field_utnoor")
    tok_dept = get_token(client, "dept_water_tg")

    res_dash = client.get("/api/officer/dashboard", headers=auth_header(tok_field))
    case_id = res_dash.json()["inbox"][0]["id"]

    # Field officer gets case documents
    res_docs = client.get(f"/api/cases/{case_id}/documents", headers=auth_header(tok_field))
    assert res_docs.status_code == 200
    doc_id = res_docs.json()["documents"][0]["id"]

    # Field officer flags document as received
    res_flag = client.patch(
        f"/api/cases/{case_id}/documents/{doc_id}",
        json={"status": "received", "reason": "Aadhaar copy received during physical site visit"},
        headers=auth_header(tok_field)
    )
    assert res_flag.status_code == 200

    # Dept officer verifies document
    res_verify = client.post(
        f"/api/dept/documents/{doc_id}/verify",
        json={"status": "verified", "reason": "Central mock registry matched resident name & block"},
        headers=auth_header(tok_dept)
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "ok"


# ==============================================================================
# 5. DEPT ASSIGNMENT ASSISTANT & WORKLOAD
# ==============================================================================
def test_v2_dept_assignment_assistant_and_workload(client):
    """Dept Officer uses AI/rank assistant to suggest field officers and inspects team capacity."""
    tok_dept = get_token(client, "dept_water_tg")

    # Board view
    res_board = client.get("/api/dept/board", headers=auth_header(tok_dept))
    assert res_board.status_code == 200
    board = res_board.json()
    assert "columns" in board
    assert "unassigned" in board["columns"]
    assert "assigned" in board["columns"]
    assert "in_field" in board["columns"]
    assert "proof_review" in board["columns"]

    # Team Workload
    res_workload = client.get("/api/dept/workload", headers=auth_header(tok_dept))
    assert res_workload.status_code == 200
    officers = res_workload.json().get("team_workload", [])
    assert len(officers) > 0

    # Assignment Assistant Suggestion
    if board["columns"]["assigned"]:
        assigned_id = board["columns"]["assigned"][0]["id"]
        res_sug = client.get(f"/api/dept/assign-suggestions/{assigned_id}", headers=auth_header(tok_dept))
        assert res_sug.status_code == 200
        suggestions = res_sug.json()["suggestions"]
        assert len(suggestions) > 0
        assert "score" in suggestions[0]
        assert "reason" in suggestions[0] or "recommendation_reason" in suggestions[0]


# ==============================================================================
# 6. DISTRICT SHOW-CAUSE NOTICES
# ==============================================================================
def test_v2_district_show_cause_lifecycle(client):
    """District Collector issues notice -> Dept Officer answers -> Collector accepts & closes."""
    tok_dm = get_token(client, "collector_adilabad")
    tok_dept = get_token(client, "dept_roads_adi")

    # Collector issues show-cause notice
    sc_payload = {
        "to_user": "dept_roads_adi",
        "to_user_name": "Executive Engineer (Roads Adilabad)",
        "to_role": "dept_officer",
        "reason": "Repeated SLA breaches on Utnoor-Asifabad arterial road repair complaints",
        "linked_request_ids": [],
        "due_days": 3,
    }
    res_issue = client.post("/api/district/show-cause", json=sc_payload, headers=auth_header(tok_dm))
    assert res_issue.status_code == 200
    notice_id = res_issue.json()["notice_id"]

    # Dept Officer answers notice
    res_ans = client.patch(
        f"/api/district/show-cause/{notice_id}?action=answer",
        json={"response_text": "Material supply was delayed due to monsoon flooding; emergency patch work initiated."},
        headers=auth_header(tok_dept)
    )
    assert res_ans.status_code == 200
    assert res_ans.json()["status"] == "ok"

    # Collector accepts response and closes notice
    res_accept = client.patch(
        f"/api/district/show-cause/{notice_id}?action=accept",
        json={"decision": "accepted", "note": "Explanation accepted. Re-inspect after 7 days."},
        headers=auth_header(tok_dm)
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ok"


# ==============================================================================
# 7. DISTRICT JAN SUNWAI & COMPLIANCE ORDERS
# ==============================================================================
def test_v2_district_jan_sunwai_hearing(client):
    """District Collector creates Jan Sunwai hearing with agenda items and compliance orders."""
    tok_dm = get_token(client, "collector_adilabad")

    hearing_payload = {
        "title": "Adilabad Rural Grievance Jan Sunwai (Quarterly)",
        "scheduled_at": "2026-10-15T10:00:00Z",
        "venue": "District Collectorate Main Auditorium, Adilabad",
        "attending_departments": ["water", "roads", "electricity", "sanitation"],
        "items": [
            {
                "request_id": 1,
                "outcome": "directed_with_deadline",
                "direction": "Complete overhead reservoir valve replacement within 72 hours",
                "responsible_dept": "water",
                "due_days": 3,
            }
        ],
    }

    res_h = client.post("/api/district/hearings", json=hearing_payload, headers=auth_header(tok_dm))
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "ok"

    # List hearings
    res_list = client.get("/api/district/hearings", headers=auth_header(tok_dm))
    assert res_list.status_code == 200
    assert len(res_list.json()["hearings"]) > 0


# ==============================================================================
# 8. DISTRICT EMERGENCY & RELIEF LEDGER
# ==============================================================================
def test_v2_district_emergency_relief_ledger(client):
    """District Collector declares flash flood emergency with relief ledger."""
    tok_dm = get_token(client, "collector_adilabad")

    em_payload = {
        "title": "Penganga River Flash Flood Emergency 2026",
        "type": "flood",
        "severity": "critical",
        "blocks": ["Utnoor", "Indervelly"],
        "priority_multiplier": 3.0,
        "summary": "Heavy rainfall in catchment area led to waterlogging in 18 low-lying habitations.",
    }

    res_em = client.post("/api/district/emergency", json=em_payload, headers=auth_header(tok_dm))
    assert res_em.status_code == 200
    inc_id = res_em.json()["incident_id"]

    # Fetch emergency module status
    res_get = client.get("/api/district/emergency", headers=auth_header(tok_dm))
    assert res_get.status_code == 200
    incidents = res_get.json()["incidents"]
    assert any(i["id"] == inc_id for i in incidents)


# ==============================================================================
# 9. STATE CIRCULAR DISPATCHER & ACKNOWLEDGEMENT
# ==============================================================================
def test_v2_state_circular_and_ack(client):
    """State Officer publishes circular; District Collector acknowledges."""
    tok_tg = get_token(client, "state_telangana")
    tok_dm = get_token(client, "collector_adilabad")

    circ_payload = {
        "title": "Monsoon Preparedness & Zero-Overdue Drainage Protocol 2026",
        "body": "All District Collectors must inspect primary stormwater drains and submit daily clearing logs.",
        "attachment_url": "/docs/circular_monsoon_2026.pdf",
        "target_districts": ["all"],
        "effective_on": "2026-10-01T00:00:00Z",
    }

    res_pub = client.post("/api/state/circulars", json=circ_payload, headers=auth_header(tok_tg))
    assert res_pub.status_code == 200
    circ_id = res_pub.json()["circular_id"]

    # District Collector acknowledges receipt
    res_ack = client.post(f"/api/state/circulars/{circ_id}/ack", headers=auth_header(tok_dm))
    assert res_ack.status_code == 200
    assert res_ack.json()["status"] == "ok"

    # State Officer verifies acknowledgement
    res_list = client.get("/api/state/circulars", headers=auth_header(tok_tg))
    assert res_list.status_code == 200
    matched = next((c for c in res_list.json()["circulars"] if c["id"] == circ_id), None)
    assert matched is not None
    assert matched["acks_count"] >= 1


# ==============================================================================
# 10. CITIZEN APPEAL FILING & STATE ADJUDICATION
# ==============================================================================
def test_v2_citizen_appeal_and_state_adjudication(client):
    """Citizen files statutory appeal -> State Officer adjudicates with binding order."""
    tok_tg = get_token(client, "state_telangana")

    # Citizen submits appeal
    res_app = client.post(
        "/api/citizen/requests/1/appeal",
        json={"reason": "Water pipeline work was only partially completed; pressure remains insufficient for 50 families.", "phone": "+91 94400 11223"}
    )
    assert res_app.status_code == 200
    app_id = res_app.json()["appeal_id"]

    # State Officer lists appeals
    res_list = client.get("/api/state/appeals", headers=auth_header(tok_tg))
    assert res_list.status_code == 200
    assert any(a["id"] == app_id for a in res_list.json()["appeals"])

    # State Officer adjudicates (Overturn with direction)
    res_decide = client.post(
        f"/api/state/appeals/{app_id}/decide",
        json={
            "decision": "overturn_with_direction",
            "order_text": "District Collector Adilabad directed to re-lay branch feeder line within 10 days.",
        },
        headers=auth_header(tok_tg)
    )
    assert res_decide.status_code == 200
    assert res_decide.json()["appeal_status"] == "overturn_with_direction"


# ==============================================================================
# 11. NATIONAL SLA RULE VERSIONING & PREVIEW
# ==============================================================================
def test_v2_national_sla_rule_versioning_and_preview(client):
    """National Admin previews and updates versioned SLA rule table."""
    tok_nat = get_token(client, "national_admin")

    sla_payload = {
        "critical_hours": 36,
        "high_hours": 60,
        "routine_days": 5,
        "district_escalation_days": 6,
        "state_escalation_days": 12,
        "state_review_days": 25,
        "ack_target_hours": 20,
        "scope": "national",
        "reason": "Tightening citizen grievance turnaround standards nationwide per PMO directive",
    }

    # Preview impact on open cases
    res_prev = client.post("/api/national/sla-rules/preview", json=sla_payload, headers=auth_header(tok_nat))
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert "open_cases_count" in prev_data
    assert "newly_overdue_with_proposed_rules" in prev_data

    # Update versioned rule
    res_update = client.post("/api/national/sla-rules", json=sla_payload, headers=auth_header(tok_nat))
    assert res_update.status_code == 200
    assert res_update.json()["new_version"] >= 1


# ==============================================================================
# 12. CRYPTOGRAPHIC AUDIT HASH CHAIN INTEGRITY & TAMPER DETECTION
# ==============================================================================
def test_v2_cryptographic_audit_hash_chain_integrity(client):
    """Audit hash chain passes on intact log and fails immediately upon tampering."""
    tok_nat = get_token(client, "national_admin")

    # Verify intact chain
    res_verify = client.get("/api/national/audit/verify-chain", headers=auth_header(tok_nat))
    assert res_verify.status_code == 200
    data = res_verify.json()
    assert data["valid"] is True
    assert data.get("broken_at_index") is None

    # Tamper with an audit event in database
    db = SessionLocal()
    try:
        event = db.query(AuditEvent).order_by(AuditEvent.id.asc()).first()
        if event:
            orig_action = event.action
            event.action = "ILLEGAL_TAMPERED_ACTION_FOR_TEST"
            db.commit()

            # Verify that integrity check now FAILS
            res_tampered = client.get("/api/national/audit/verify-chain", headers=auth_header(tok_nat))
            assert res_tampered.status_code == 200
            tamper_data = res_tampered.json()
            assert tamper_data["valid"] is False
            assert tamper_data.get("broken_at_index") is not None

            # Restore original value
            event.action = orig_action
            db.commit()
    finally:
        db.close()
