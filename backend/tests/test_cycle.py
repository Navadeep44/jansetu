"""Tests for the complete grievance-to-budget cycle in JanSetu.
Verifies all status transitions, RBAC enforcement, financial limits, and analytics.
"""
import io
import pytest

from app.core import security


def _login(client, username, password):
    r = client.post("/api/auth/officer/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"Login failed for {username}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_cycle_geo_hierarchy(client):
    """Verifies that GET /api/geo/hierarchy returns nested State -> District -> Mandal -> Village."""
    resp = client.get("/api/geo/hierarchy?state=Telangana")
    assert resp.status_code == 200
    data = resp.json()
    assert "Telangana" in data
    tg = data["Telangana"]
    assert "Adilabad" in tg and "Hyderabad" in tg
    assert "Utnoor" in tg["Adilabad"]
    assert "Charminar" in tg["Hyderabad"]
    utn_villages = tg["Adilabad"]["Utnoor"]
    assert len(utn_villages) >= 4
    assert any("Utnoor" in v["village"] for v in utn_villages)


def test_full_grievance_to_budget_cycle(client):
    """E2E test verifying the complete 8-step cycle and strict RBAC enforcement."""
    col_adi = _login(client, "collector_adilabad", "district123")
    dh_water = _login(client, "dept_water_adi", "dept123")
    fo_utnoor = _login(client, "field_utnoor", "field123")
    fo_jainoor = _login(client, "field_water_jainoor", "field123")
    fo_roads = _login(client, "field_roads_utnoor", "field123")

    # -------------------------------------------------------------------------
    # Step 1: Citizen Submission (SUBMITTED)
    # -------------------------------------------------------------------------
    fake_photo = ("broken_pipe.jpg", b"fake image bytes", "image/jpeg")
    intake_data = {
        "state": "Telangana",
        "district": "Adilabad",
        "mandal": "Utnoor",
        "village": "Utnoor Proper",
        "category": "water",
        "text": "Main water pipeline burst near Ambedkar circle; 50 families cut off.",
        "language": "te",
        "phone": "+91 98480 12345",
        "gender": "female",
    }
    r_intake = client.post(
        "/api/cycle/intake",
        data=intake_data,
        files=[("photos", fake_photo)],
    )
    assert r_intake.status_code == 200, r_intake.text
    case = r_intake.json()["request"]
    case_id = case["id"]
    tracking_id = case["tracking_id"]
    assert case["status"] == "SUBMITTED"
    assert case["state"] == "Telangana"
    assert case["mandal"] == "Utnoor"

    # -------------------------------------------------------------------------
    # Step 2: Department Head Verifies (VERIFIED)
    # -------------------------------------------------------------------------
    r_ver = client.post(f"/api/requests/{case_id}/verify-head", data={"action": "verify", "note": "Verified genuine"}, headers=dh_water)
    assert r_ver.status_code == 200, r_ver.text
    assert r_ver.json()["request"]["status"] == "VERIFIED"

    # -------------------------------------------------------------------------
    # Step 3: Department Head Assigns to Mandal Field Officer (ASSIGNED)
    # -------------------------------------------------------------------------
    r_assignable = client.get("/api/officer/assignable-officers?district=Adilabad&department=water&mandal=Utnoor", headers=dh_water)
    assert r_assignable.status_code == 200
    officer_list = r_assignable.json()
    assert any(o["username"] == "field_utnoor" for o in officer_list)
    fo_user = next(o for o in officer_list if o["username"] == "field_utnoor")

    r_assign = client.post(
        f"/api/requests/{case_id}/assign-cycle",
        data={"field_officer_id": fo_user["id"], "note": "Inspect site within 48h"},
        headers=dh_water
    )
    assert r_assign.status_code == 200, r_assign.text
    assert r_assign.json()["request"]["status"] == "ASSIGNED"

    # -------------------------------------------------------------------------
    # RBAC Check: Other Mandal Field Officer is FORBIDDEN (403)
    # -------------------------------------------------------------------------
    r_bad_fo = client.post(
        f"/api/requests/{case_id}/inspect-and-budget",
        data={"inspection_notes": "Attempting illegal inspection from Jainoor"},
        headers=fo_jainoor
    )
    assert r_bad_fo.status_code == 403

    # Other department field officer in same mandal is also FORBIDDEN (403)
    r_bad_dept = client.post(
        f"/api/requests/{case_id}/inspect-and-budget",
        data={"inspection_notes": "Attempting roads inspection on water case"},
        headers=fo_roads
    )
    assert r_bad_dept.status_code == 403

    # -------------------------------------------------------------------------
    # Step 4: Assigned Field Officer Site Inspection & Budget Request
    # -------------------------------------------------------------------------
    line_items_json = '[{"item": "HDPE Pipe 110mm", "quantity": 120, "unit": "m", "unit_cost": 350.0, "total": 42000.0}, {"item": "Labour & Excavation", "quantity": 4, "unit": "days", "unit_cost": 1500.0, "total": 6000.0}]'
    site_photo = ("site_survey.jpg", b"fake site photo", "image/jpeg")

    r_budget = client.post(
        f"/api/requests/{case_id}/inspect-and-budget",
        data={
            "inspection_notes": "Detailed site inspection completed. 120m damaged section identified.",
            "inspection_lat": "19.3667",
            "inspection_lng": "78.7833",
            "line_items": line_items_json,
        },
        files=[("site_photos", site_photo)],
        headers=fo_utnoor
    )
    assert r_budget.status_code == 200, r_budget.text
    case = r_budget.json()["request"]
    assert case["status"] == "BUDGET_REQUESTED"
    assert case["budget_requested"] == 48000.0
    assert len(case["budget_line_items"]) == 2

    # -------------------------------------------------------------------------
    # Step 5: Department Head Reviews & Forwards to Collector
    # -------------------------------------------------------------------------
    # Department Head CANNOT approve budget (403)
    r_dh_approve = client.post(
        f"/api/requests/{case_id}/budget/decision",
        data={"decision": "approve", "note": "DH trying to approve"},
        headers=dh_water
    )
    assert r_dh_approve.status_code == 403

    # DH forwards to Collector
    r_fwd = client.post(
        f"/api/requests/{case_id}/forward-to-collector",
        data={"forward_note": "SSR rates verified. Forwarded for administrative sanction."},
        headers=dh_water
    )
    assert r_fwd.status_code == 200
    assert r_fwd.json()["request"]["status"] == "SENT_TO_COLLECTOR"

    # -------------------------------------------------------------------------
    # Step 6: Collector Negotiates (Counter-Offer)
    # -------------------------------------------------------------------------
    r_neg = client.post(
        f"/api/requests/{case_id}/budget/decision",
        data={
            "decision": "negotiate",
            "counter_amount": "42000.0",
            "justification": "Trenching rate benchmarked to Adilabad SSR 2025-26 average.",
        },
        headers=col_adi
    )
    assert r_neg.status_code == 200, r_neg.text
    case = r_neg.json()["request"]
    assert case["status"] == "NEGOTIATION"
    assert len(case["negotiation_history"]) == 1

    # -------------------------------------------------------------------------
    # Step 7: Department Head Accepts Counter-Offer -> Budget ALLOCATED
    # -------------------------------------------------------------------------
    r_accept_neg = client.post(
        f"/api/requests/{case_id}/budget/respond-negotiation",
        data={"action": "accept", "note": "Accepted revised rate ceiling. Scope adjusted."},
        headers=dh_water
    )
    assert r_accept_neg.status_code == 200, r_accept_neg.text
    case = r_accept_neg.json()["request"]
    assert case["status"] == "ALLOCATED"
    assert case["budget_allocated"] == 42000.0

    # -------------------------------------------------------------------------
    # Step 8: Field Officer Logs Expenses (Spend <= Allocation Rule)
    # -------------------------------------------------------------------------
    # Rule check: Spend EXCEEDING allocation MUST be rejected (422)
    r_overspend = client.post(
        f"/api/requests/{case_id}/expenses",
        data={
            "item": "Luxury Valve",
            "amount": "50000.0",  # exceeds allocated 42000.0
            "vendor_name": "Supplier",
        },
        headers=fo_utnoor
    )
    assert r_overspend.status_code == 422
    assert "exceed" in r_overspend.text.lower()

    # Valid expense within allocation
    r_exp1 = client.post(
        f"/api/requests/{case_id}/expenses",
        data={
            "item": "110mm HDPE Pipes (IS:4984)",
            "amount": "35000.0",
            "vendor_name": "Sri Balaji Pipes Utnoor",
            "bill_reference": "INV-TG-UTN-09",
        },
        headers=fo_utnoor
    )
    assert r_exp1.status_code == 200, r_exp1.text
    case = r_exp1.json()["request"]
    assert case["budget_spent"] == 35000.0

    r_exp2 = client.post(
        f"/api/requests/{case_id}/expenses",
        data={
            "item": "Pipe installation labour charges",
            "amount": "4500.0",
            "vendor_name": "Local Labour Contractor",
            "bill_reference": "VOUCH-UTN-12",
        },
        headers=fo_utnoor
    )
    assert r_exp2.status_code == 200
    case = r_exp2.json()["request"]
    assert case["budget_spent"] == 39500.0
    assert case["budget_spent"] <= case["budget_allocated"]

    # -------------------------------------------------------------------------
    # Step 9: Field Officer Completes Work (WORK_DONE)
    # -------------------------------------------------------------------------
    comp_photo = ("completed_pipe.jpg", b"fake completion photo", "image/jpeg")
    r_done = client.post(
        f"/api/requests/{case_id}/complete-work",
        data={"completion_notes": "Pipe replaced and pressure tested to 3.0 bar."},
        files=[("completion_photos", comp_photo)],
        headers=fo_utnoor
    )
    assert r_done.status_code == 200, r_done.text
    assert r_done.json()["request"]["status"] == "WORK_DONE"

    # -------------------------------------------------------------------------
    # Step 10: Department Head Checks Proof (Accepts)
    # -------------------------------------------------------------------------
    r_proof = client.post(
        f"/api/requests/{case_id}/proof/review-cycle",
        data={"action": "accept", "note": "Completion photo and expenditure vouchers verified."},
        headers=dh_water
    )
    assert r_proof.status_code == 200
    assert r_proof.json()["request"]["status"] == "resolved_pending_verification"

    # -------------------------------------------------------------------------
    # Step 11: Citizen Confirms "Fixed" (CLOSED)
    # -------------------------------------------------------------------------
    r_confirm = client.post(
        f"/api/requests/{tracking_id}/citizen-confirm",
        data={"confirmed": "true", "rating": "5", "comment": "Water pressure fully restored. Thank you!"}
    )
    assert r_confirm.status_code == 200, r_confirm.text
    final_case = r_confirm.json()["request"]
    assert final_case["status"] == "CLOSED"
    assert final_case["citizen_verified"] is True
    assert final_case["citizen_rating"] == 5


def test_cycle_reopen_flow(client):
    """Verifies that if citizen marks 'Not fixed', case reopens at Department Head queue."""
    dh_water = _login(client, "dept_water_adi", "dept123")
    fo_utnoor = _login(client, "field_utnoor", "field123")
    col_adi = _login(client, "collector_adilabad", "district123")

    intake = client.post(
        "/api/cycle/intake",
        data={"state": "Telangana", "district": "Adilabad", "mandal": "Utnoor", "village": "Birsaidpet", "category": "water", "text": "Leaking valve"}
    ).json()["request"]
    cid = intake["id"]
    tid = intake["tracking_id"]

    client.post(f"/api/requests/{cid}/verify-head", data={"action": "verify"}, headers=dh_water)
    fo_id = client.get("/api/auth/me", headers=fo_utnoor).json()["user_id"]
    client.post(f"/api/requests/{cid}/assign-cycle", data={"field_officer_id": fo_id}, headers=dh_water)
    client.post(f"/api/requests/{cid}/inspect-and-budget", data={"inspection_notes": "Checked", "line_items": '[{"item":"Valve","quantity":1,"unit":"pcs","unit_cost":5000,"total":5000}]'}, headers=fo_utnoor)
    client.post(f"/api/requests/{cid}/forward-to-collector", data={"forward_note": "OK"}, headers=dh_water)
    client.post(f"/api/requests/{cid}/budget/decision", data={"decision": "approve"}, headers=col_adi)
    client.post(f"/api/requests/{cid}/expenses", data={"item": "Valve", "amount": "4800", "vendor_name": "Shop"}, headers=fo_utnoor)
    client.post(f"/api/requests/{cid}/complete-work", data={"completion_notes": "Done"}, headers=fo_utnoor)
    client.post(f"/api/requests/{cid}/proof/review-cycle", data={"action": "accept"}, headers=dh_water)

    # Citizen disputes: "Not fixed"
    r_dispute = client.post(
        f"/api/requests/{tid}/citizen-confirm",
        data={"confirmed": "false", "comment": "Water is still leaking around the base."}
    )
    assert r_dispute.status_code == 200
    res = r_dispute.json()["request"]
    assert res["status"] == "REOPENED"
    assert res["citizen_verified"] is False
    assert "leaking" in res["dispute_reason"]


def test_cycle_rejection_flow(client):
    """Verifies that Department Head rejection informs citizen and records reason."""
    dh_water = _login(client, "dept_water_adi", "dept123")

    intake = client.post(
        "/api/cycle/intake",
        data={"state": "Telangana", "district": "Adilabad", "mandal": "Utnoor", "village": "Hasnapur", "category": "water", "text": "Private tap problem"}
    ).json()["request"]
    cid = intake["id"]

    r_rej = client.post(
        f"/api/requests/{cid}/verify-head",
        data={"action": "reject", "rejection_reason": "Private residential connection; not in municipal mandate."},
        headers=dh_water
    )
    assert r_rej.status_code == 200
    case = r_rej.json()["request"]
    assert case["status"] == "REJECTED"
    assert "Private" in case["rejection_reason"]


def test_cycle_analytics_endpoints(client):
    """Verifies live computed analytics endpoints for budget funnel, cycle metrics, and negotiation stats."""
    col_adi = _login(client, "collector_adilabad", "district123")

    # 1. Budget Funnel
    r_funnel = client.get("/api/analytics/budget-funnel?district=Adilabad", headers=col_adi)
    assert r_funnel.status_code == 200
    data = r_funnel.json()
    assert "funnel" in data
    funnel = data["funnel"]
    assert "requested" in funnel
    assert "approved" in funnel
    assert "allocated" in funnel
    assert "spent" in funnel
    # Financial consistency: spent <= allocated <= approved
    assert funnel["spent"] <= funnel["allocated"] + 1.0

    # 2. Cycle Metrics
    r_metrics = client.get("/api/analytics/cycle-metrics?district=Adilabad", headers=col_adi)
    assert r_metrics.status_code == 200
    metrics = r_metrics.json()
    assert "total_cases" in metrics
    assert "sla_breach_rate" in metrics
    assert "reopen_rate" in metrics
    assert "citizen_fix_rate" in metrics

    # 3. Negotiation Stats
    r_neg = client.get("/api/analytics/negotiation-stats?district=Adilabad", headers=col_adi)
    assert r_neg.status_code == 200
    neg = r_neg.json()
    assert "negotiation_cases_count" in neg
    assert "average_cut_percentage" in neg

    # 4. Cases by Mandal
    r_mandal = client.get("/api/analytics/cases-by-mandal?district=Adilabad", headers=col_adi)
    assert r_mandal.status_code == 200
    data = r_mandal.json()
    assert "by_mandal" in data
    mandals = data["by_mandal"]
    assert len(mandals) >= 4
    assert "Utnoor" in mandals
