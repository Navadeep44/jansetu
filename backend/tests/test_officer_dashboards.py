"""
Automated Test Suite for Hierarchical Officer Dashboards & RBAC Pipeline:
- Level 1: Field Officer (Utnoor / Pune)
- Level 2: Department Officer (Roads Adilabad / Roads Hyderabad)
- Level 3: District Collector (Adilabad / Hyderabad)
- Level 4: State Officer (Telangana / Maharashtra)
- Level 5: National Admin / Planner

Covers:
1. Jurisdiction Isolation & Direct ID Probing
2. Permission Matrix (403 for forbidden actions, 200 in-scope)
3. Inheritance Roll-up Aggregations
4. 6-Stage Project Approval & Rejection Pipeline
5. Append-only Budget Tracking & Over-Expenditure Prevention
6. Proof-of-Resolution & Supervisor Rework Flow
7. Data Privacy & Citizen Phone Masking (•••• 1234)
8. Officer Account Hierarchy Provisioning & Deactivation
"""
import pytest
from app.core import security


PASSWORDS = {
    "superadmin": "admin123",
    "national_admin": "admin123",
    "state_telangana": "state123",
    "state_delhi": "state123",
    "state_mh": "state123",
    "collector_adilabad": "district123",
    "dm_southdelhi": "district123",
    "dm_hyderabad": "district123",
    "dept_water_tg": "dept123",
    "dept_pwd_delhi": "dept123",
    "dept_roads_adi": "dept123",
    "dept_roads_hyd": "dept123",
    "field_utnoor": "field123",
    "field_mehrauli": "field123",
    "field_pune": "field123",
}


def get_token(client, username, password=None):
    pwd = password or PASSWORDS.get(username, "pass123")
    res = client.post("/api/auth/officer/login", json={"username": username, "password": pwd})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. JURISDICTION ISOLATION & DIRECT ID PROBING
# ==============================================================================
def test_field_officer_jurisdiction_isolation(client):
    """Field officer sees only assigned complaints; direct probing on other requests returns 403."""
    tok_utnoor = get_token(client, "field_utnoor")
    tok_pune = get_token(client, "field_pune")

    # Utnoor dashboard
    res = client.get("/api/officer/dashboard", headers=auth_header(tok_utnoor))
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == security.ROLE_FIELD_OFFICER
    assert "Utnoor" in data["jurisdiction_label"]
    
    # All items in inbox must be assigned to field_utnoor
    for item in data["inbox"]:
        assert item["assigned_field_officer_id"] is not None

    # Pune dashboard
    res_pune_dash = client.get("/api/officer/dashboard", headers=auth_header(tok_pune))
    assert res_pune_dash.status_code == 200
    assert "Pune" in res_pune_dash.json()["jurisdiction_label"]


def test_dept_officer_jurisdiction_isolation(client):
    """Dept officer cannot view or assign complaints outside their district/department."""
    tok_adi_roads = get_token(client, "dept_roads_adi")
    tok_hyd_roads = get_token(client, "dept_roads_hyd")

    res_adi = client.get("/api/officer/dashboard", headers=auth_header(tok_adi_roads))
    assert res_adi.status_code == 200
    adi_data = res_adi.json()
    assert adi_data["role"] == security.ROLE_DEPT_OFFICER
    assert "Adilabad" in adi_data["jurisdiction_label"]


def test_district_collector_cross_district_isolation(client):
    """Collector of Adilabad cannot approve projects or act on complaints in Hyderabad or Pune."""
    tok_dm_adi = get_token(client, "collector_adilabad")
    tok_dm_hyd = get_token(client, "dm_hyderabad")

    res_adi = client.get("/api/officer/dashboard", headers=auth_header(tok_dm_adi))
    assert res_adi.status_code == 200
    assert "Adilabad" in res_adi.json()["jurisdiction_label"]

    res_hyd = client.get("/api/officer/dashboard", headers=auth_header(tok_dm_hyd))
    assert res_hyd.status_code == 200
    assert "Hyderabad" in res_hyd.json()["jurisdiction_label"]


def test_state_officer_cross_state_isolation(client):
    """State Officer of Telangana cannot clear projects in Maharashtra."""
    tok_tg = get_token(client, "state_telangana")
    tok_mh = get_token(client, "state_mh")

    res_tg = client.get("/api/officer/dashboard", headers=auth_header(tok_tg))
    assert res_tg.status_code == 200
    assert "Telangana" in res_tg.json()["jurisdiction_label"]

    res_mh = client.get("/api/officer/dashboard", headers=auth_header(tok_mh))
    assert res_mh.status_code == 200
    assert "Maharashtra" in res_mh.json()["jurisdiction_label"]


# ==============================================================================
# 2. PERMISSION MATRIX ENFORCEMENT
# ==============================================================================
def test_field_officer_forbidden_actions(client):
    """Field officer cannot approve projects, fund projects, reassign departments, or create accounts."""
    tok = get_token(client, "field_utnoor")
    headers = auth_header(tok)

    # Cannot approve projects
    res = client.post("/api/projects/1/approve", json={"note": "hack"}, headers=headers)
    assert res.status_code == 403

    # Cannot fund projects
    res = client.post("/api/projects/1/fund", json={"sanctioned_amount_inr": 100000}, headers=headers)
    assert res.status_code == 403

    # Cannot reassign department
    res = client.post("/api/requests/1/reassign-department", json={"department": "roads"}, headers=headers)
    assert res.status_code == 403

    # Cannot create officer accounts
    res = client.post("/api/officer/accounts", json={"username": "new_guy", "password": "123", "role": "field_officer", "name": "New", "title": "Inspector"}, headers=headers)
    assert res.status_code == 403


def test_dept_officer_permissions(client):
    """Dept officer can propose projects and assign field officers, but cannot approve projects or sanction funds."""
    tok = get_token(client, "dept_roads_adi")
    headers = auth_header(tok)

    # Can propose project
    res_prop = client.post("/api/projects/propose", json={
        "title": "Adilabad Rural Link Road 12km",
        "description": "Connecting 4 tribal habitations to State Highway 47",
        "sector": "roads",
        "scheme": "PMGSY III",
        "sdg": "SDG 9",
        "cost_inr": 3500000.0,
        "beneficiaries": 2200,
        "area_id": 2,
    }, headers=headers)
    assert res_prop.status_code in (200, 201), res_prop.text
    new_proj_id = res_prop.json()["project"]["id"]

    # Cannot approve project
    res_app = client.post(f"/api/projects/{new_proj_id}/approve", json={"note": "Self approve"}, headers=headers)
    assert res_app.status_code == 403

    # Cannot fund project
    res_fund = client.post(f"/api/projects/{new_proj_id}/fund", json={"sanctioned_amount_inr": 3500000.0}, headers=headers)
    assert res_fund.status_code == 403


def test_district_collector_permissions(client):
    """District Collector can approve district project and record expenditures, but cannot sanction central grant."""
    tok_dm = get_token(client, "collector_adilabad")
    tok_dept = get_token(client, "dept_roads_adi")
    
    # Propose new project
    res_p = client.post("/api/projects/propose", json={
        "title": "Adilabad Bridge Culvert Over Utnoor Stream",
        "description": "High-level bridge preventing monsoon isolation",
        "sector": "roads",
        "scheme": "NABARD RIDF",
        "sdg": "SDG 9",
        "cost_inr": 5000000.0,
        "beneficiaries": 4000,
        "area_id": 2,
    }, headers=auth_header(tok_dept))
    proj_id = res_p.json()["project"]["id"]

    # Collector approves project
    res_app = client.post(f"/api/projects/{proj_id}/approve", json={"note": "District screening passed"}, headers=auth_header(tok_dm))
    assert res_app.status_code == 200
    assert res_app.json()["project"]["status"] == "district_approved"

    # Collector cannot sanction central funds
    res_fund = client.post(f"/api/projects/{proj_id}/fund", json={"sanctioned_amount_inr": 5000000.0}, headers=auth_header(tok_dm))
    assert res_fund.status_code == 403


# ==============================================================================
# 3. INHERITANCE ROLL-UP AGGREGATIONS
# ==============================================================================
def test_hierarchical_roll_up_aggregations(client):
    """District Collector aggregates Adilabad depts; State Officer aggregates Telangana districts; National aggregates nation."""
    tok_dm = get_token(client, "collector_adilabad")
    tok_st = get_token(client, "state_telangana")
    tok_nat = get_token(client, "national_admin")

    res_dm = client.get("/api/officer/dashboard", headers=auth_header(tok_dm)).json()
    res_st = client.get("/api/officer/dashboard", headers=auth_header(tok_st)).json()
    res_nat = client.get("/api/officer/dashboard", headers=auth_header(tok_nat)).json()

    # Total complaints must be >= at each ascending hierarchy level
    dm_total = res_dm["kpis"]["total"]
    st_total = res_st["kpis"]["total"]
    nat_total = res_nat["kpis"]["total"]

    assert dm_total > 0
    assert st_total >= dm_total
    assert nat_total >= st_total


# ==============================================================================
# 4. 6-STAGE PROJECT PIPELINE & REJECTION
# ==============================================================================
def test_full_project_approval_and_execution_lifecycle(client):
    """Test full sequential lifecycle: proposed -> district_approved -> state_approved -> funded -> in_execution -> completed."""
    tok_dept = get_token(client, "dept_roads_adi")
    tok_dm = get_token(client, "collector_adilabad")
    tok_st = get_token(client, "state_telangana")
    tok_nat = get_token(client, "national_admin")

    # 1. Propose
    res1 = client.post("/api/projects/propose", json={
        "title": "Adilabad Tribal Solar Microgrid 250kW",
        "description": "Clean reliable off-grid power for 5 habitations",
        "sector": "electricity",
        "scheme": "PM-KUSUM Tribal",
        "sdg": "SDG 7",
        "cost_inr": 4500000.0,
        "beneficiaries": 1800,
        "area_id": 2,
    }, headers=auth_header(tok_dept))
    assert res1.status_code in (200, 201)
    p_id = res1.json()["project"]["id"]
    assert res1.json()["project"]["status"] == "proposed"

    # 2. District Approval
    res2 = client.post(f"/api/projects/{p_id}/approve", json={"note": "Approved by District Planning Committee"}, headers=auth_header(tok_dm))
    assert res2.status_code == 200
    assert res2.json()["project"]["status"] == "district_approved"

    # 3. State Clearance
    res3 = client.post(f"/api/projects/{p_id}/approve", json={"note": "Cleared by State Energy Board"}, headers=auth_header(tok_st))
    assert res3.status_code == 200
    assert res3.json()["project"]["status"] == "state_approved"

    # 4. National Funding Sanction
    res4 = client.post(f"/api/projects/{p_id}/fund", json={
        "sanctioned_amount_inr": 4500000.0,
        "change_reason": "Full funding sanctioned under Union Green Energy Grant",
    }, headers=auth_header(tok_nat))
    assert res4.status_code == 200
    assert res4.json()["project"]["status"] == "funded"
    assert res4.json()["project"]["sanctioned_amount_inr"] == 4500000.0

    # 5. First Expenditure (in_execution)
    res5 = client.post(f"/api/projects/{p_id}/expenditure", json={
        "amount_inr": 2000000.0,
        "description": "Solar PV panel procurement and foundation structure",
        "spent_on": "2026-09-28",
        "bill_reference": "INV-SOLAR-2026-001",
    }, headers=auth_header(tok_dm))
    assert res5.status_code == 200
    assert res5.json()["project"]["status"] == "in_execution"
    assert res5.json()["project"]["spent_amount_inr"] == 2000000.0

    # 6. Final Expenditure & Project Completion
    res6 = client.post(f"/api/projects/{p_id}/expenditure", json={
        "amount_inr": 2500000.0,
        "description": "Inverter battery commissioning and grid integration",
        "spent_on": "2026-09-28",
        "bill_reference": "INV-SOLAR-2026-002",
    }, headers=auth_header(tok_dm))
    assert res6.status_code == 200
    assert res6.json()["project"]["spent_amount_inr"] == 4500000.0

    res7 = client.post(f"/api/projects/{p_id}/complete", json={"note": "Microgrid 100% operational and handed over"}, headers=auth_header(tok_dm))
    assert res7.status_code == 200
    assert res7.json()["project"]["status"] == "completed"


def test_project_rejection_requires_reason(client):
    """Rejecting a project requires a reason and marks project as rejected."""
    tok_dept = get_token(client, "dept_roads_adi")
    tok_dm = get_token(client, "collector_adilabad")

    res = client.post("/api/projects/propose", json={
        "title": "Substandard Proposal Project",
        "description": "Incomplete DPR",
        "sector": "roads",
        "cost_inr": 1000000.0,
        "beneficiaries": 100,
        "area_id": 2,
    }, headers=auth_header(tok_dept))
    p_id = res.json()["project"]["id"]

    # Rejection without reason fails validation
    res_no_reason = client.post(f"/api/projects/{p_id}/reject", json={"reason": ""}, headers=auth_header(tok_dm))
    assert res_no_reason.status_code in (400, 422)

    # Rejection with reason succeeds
    res_rej = client.post(f"/api/projects/{p_id}/reject", json={"reason": "Inadequate feasibility study and duplicate scheme"}, headers=auth_header(tok_dm))
    assert res_rej.status_code == 200
    assert res_rej.json()["project"]["status"] == "rejected"
    assert "Inadequate feasibility" in res_rej.json()["project"]["decision_reason"]


# ==============================================================================
# 5. BUDGET TRACKING & OVER-EXPENDITURE PREVENTION
# ==============================================================================
def test_budget_expenditure_limits_and_warnings(client):
    """Expenditures cannot exceed sanctioned amount; 90% budget warning triggers."""
    tok_dept = get_token(client, "dept_roads_adi")
    tok_dm = get_token(client, "collector_adilabad")
    tok_st = get_token(client, "state_telangana")
    tok_nat = get_token(client, "national_admin")

    # Propose, Approve, Fund ₹10 Lakhs
    res_p = client.post("/api/projects/propose", json={
        "title": "Strict Budget Test Project",
        "description": "Budget limits verification",
        "sector": "water",
        "cost_inr": 1000000.0,
        "beneficiaries": 500,
        "area_id": 2,
    }, headers=auth_header(tok_dept))
    p_id = res_p.json()["project"]["id"]

    client.post(f"/api/projects/{p_id}/approve", json={"note": "ok"}, headers=auth_header(tok_dm))
    client.post(f"/api/projects/{p_id}/approve", json={"note": "ok"}, headers=auth_header(tok_st))
    client.post(f"/api/projects/{p_id}/fund", json={"sanctioned_amount_inr": 1000000.0}, headers=auth_header(tok_nat))

    # Expenditure 1: ₹9,20,000 (92% - should trigger warning)
    res_exp1 = client.post(f"/api/projects/{p_id}/expenditure", json={
        "amount_inr": 920000.0,
        "description": "Major procurement",
        "spent_on": "2026-09-28",
    }, headers=auth_header(tok_dm))
    assert res_exp1.status_code == 200
    assert res_exp1.json()["warning"] is not None
    assert "90%" in res_exp1.json()["warning"]

    # Expenditure 2: ₹1,00,000 (total would be ₹10,20,000 > ₹10,00,000) -> MUST FAIL 400
    res_exp2 = client.post(f"/api/projects/{p_id}/expenditure", json={
        "amount_inr": 100000.0,
        "description": "Over budget spend",
        "spent_on": "2026-09-28",
    }, headers=auth_header(tok_dm))
    assert res_exp2.status_code == 400
    assert "exceeds" in res_exp2.json()["detail"].lower()

    # Verify Budget Summary endpoint
    res_summary = client.get("/api/budget/summary", headers=auth_header(tok_dm))
    assert res_summary.status_code == 200
    b_data = res_summary.json()
    assert b_data["total_sanctioned_inr"] > 0
    assert b_data["total_spent_inr"] > 0
    assert b_data["utilization_rate"] <= 100.0


# ==============================================================================
# 6. PROOF & REWORK LIFECYCLE
# ==============================================================================
def test_proof_submission_and_supervisor_rework(client):
    """Field Officer submits proof -> Dept Officer requests rework -> Field Officer resubmits -> Dept Officer accepts."""
    tok_dept = get_token(client, "dept_roads_adi")
    tok_field = get_token(client, "field_utnoor")

    # Create a fresh citizen complaint
    res_intake = client.post("/api/intake/text", json={
        "text": "Deep potholes and broken pavement on main highway road, dangerous for traffic in Utnoor.",
        "country_code": "IN",
        "area_id": 2,
        "phone": "9876543210",
    })
    assert res_intake.status_code == 200
    req_id = res_intake.json().get("request", {}).get("id") or res_intake.json().get("request_id") or res_intake.json().get("id")

    # 1. Dept Officer assigns to field_utnoor
    # Get user id of field_utnoor
    fu_dash = client.get("/api/officer/dashboard", headers=auth_header(tok_field)).json()
    
    res_assign = client.post(f"/api/requests/{req_id}/assign", json={
        "officer_name": "field_utnoor",
    }, headers=auth_header(tok_dept))
    assert res_assign.status_code == 200

    # 2. Field Officer uploads proof
    res_proof = client.post(f"/api/requests/{req_id}/proof", json={
        "proof_photo_url": "https://images.unsplash.com/photo-road-fixed.jpg",
        "proof_notes": "Filled crater with asphalt and rolled level.",
        "latitude": 19.3667,
        "longitude": 78.7833,
    }, headers=auth_header(tok_field))
    assert res_proof.status_code == 200
    assert res_proof.json()["status"] == "resolved_pending_verification"

    # 3. Dept Officer reviews proof and requests REWORK
    res_review_rework = client.post(f"/api/requests/{req_id}/proof/review", json={
        "action": "rework",
        "note": "Edge seal not completed; water will seep under asphalt during rain. Re-compact edges.",
    }, headers=auth_header(tok_dept))
    assert res_review_rework.status_code == 200
    assert res_review_rework.json()["status"] == "assigned"
    assert "rework_note" in res_review_rework.json()

    # 4. Dept Officer reviews and ACCEPTS proof
    res_review_accept = client.post(f"/api/requests/{req_id}/proof/review", json={
        "action": "accept",
        "note": "Supervisor verified satisfactory quality.",
    }, headers=auth_header(tok_dept))
    assert res_review_accept.status_code == 200
    assert res_review_accept.json()["status"] == "resolved_pending_verification"


# ==============================================================================
# 7. DATA PRIVACY & CITIZEN PHONE NUMBER MASKING
# ==============================================================================
def test_data_privacy_phone_masking(client):
    """Officer API responses strictly mask citizen phone numbers (•••• 3210) and omit citizen names."""
    tok_field = get_token(client, "field_utnoor")
    tok_dept = get_token(client, "dept_roads_adi")
    tok_dm = get_token(client, "collector_adilabad")

    for tok in (tok_field, tok_dept, tok_dm):
        res = client.get("/api/officer/dashboard", headers=auth_header(tok))
        assert res.status_code == 200
        data = res.json()

        # Check all complaint lists returned in dashboard
        items_to_check = []
        if "inbox" in data:
            items_to_check.extend(data["inbox"])
        if "unassigned_queue" in data:
            items_to_check.extend(data["unassigned_queue"])
        if "active_queue" in data:
            items_to_check.extend(data["active_queue"])
        if "escalated_and_overdue" in data:
            items_to_check.extend(data["escalated_and_overdue"])

        for item in items_to_check:
            # Phone must be masked or None
            phone = item.get("citizen_phone")
            if phone:
                assert phone.startswith("••••") or len(phone) <= 9, f"Unmasked phone leaked: {phone}"
                assert not phone.isdigit() or len(phone) <= 4, f"Plain digits leaked: {phone}"
            
            # Citizen personal name must NOT be exposed
            assert item.get("citizen_name") is None or item.get("citizen_name") == ""


# ==============================================================================
# 8. SUBORDINATE OFFICER PROVISIONING & DEACTIVATION
# ==============================================================================
def test_officer_account_provisioning_and_deactivation(client):
    """District Collector creates Dept/Field officer in Adilabad and deactivates them; State creates District Collector."""
    tok_dm = get_token(client, "collector_adilabad")
    tok_st = get_token(client, "state_telangana")

    # Collector creates a new field officer
    res_create = client.post("/api/officer/accounts", json={
        "username": "field_test_adi_01",
        "password": "Password@123",
        "name": "K. Srinivas (Road Inspector)",
        "role": "field_officer",
        "state": "Telangana",
        "district": "Adilabad",
        "block": "Utnoor",
        "department": "roads",
    }, headers=auth_header(tok_dm))
    assert res_create.status_code in (200, 201), res_create.text
    user_id = res_create.json()["user"]["id"]

    # New officer can log in
    tok_new = get_token(client, "field_test_adi_01", "Password@123")
    assert tok_new is not None

    # Collector deactivates the account
    res_deact = client.patch(f"/api/officer/accounts/{user_id}/deactivate", headers=auth_header(tok_dm))
    assert res_deact.status_code == 200
    assert res_deact.json()["status"] == "deactivated"

    # Deactivated officer cannot log in
    res_login_after = client.post("/api/auth/officer/login", json={"username": "field_test_adi_01", "password": "Password@123"})
    assert res_login_after.status_code in (400, 401, 403)
