"""End-to-End Walkthrough Script for JanSetu:
Tests both the First-Time Citizen Persona and Government Official Persona.
"""
import pytest


def test_citizen_and_official_e2e(client):
    # --- 1. FIRST-TIME CITIZEN JOURNEY ---
    # 1. Check meta and area lookup
    meta = client.get("/api/meta").json()
    assert "water" in meta.get("sectors", {})
    assert len(meta.get("states", [])) > 0

    areas = client.get("/api/areas").json()
    assert len(areas) > 0, "Areas should be populated"
    test_area = areas[0]

    # 2. Preview (multilingual AI clarifying extraction)
    hi_text = "हमारे वार्ड में पानी का पाइप टूट गया है और 5 दिनों से गंदा पानी आ रहा है"
    prev = client.post("/api/intake/preview", json={"text": hi_text, "language": "hi"}).json()
    assert prev.get("native_summary"), "Native summary must be provided"
    assert prev.get("clarifying_question"), "Clarifying dialogue prompt must be provided"

    # 3. File grievance intake with phone and multiple photos
    phone_number = "+91 94400 55667"
    form_data = {
        "text": hi_text,
        "language": "hi",
        "channel": "web",
        "area_id": str(test_area["id"]),
        "phone": phone_number,
        "anonymous": "false",
        "gender": "female",
    }
    files = [
        ("photos", ("damaged_pipe1.jpg", b"fake_image_bytes_1", "image/jpeg")),
        ("photos", ("damaged_pipe2.jpg", b"fake_image_bytes_2", "image/jpeg")),
    ]
    res = client.post("/api/intake/form", data=form_data, files=files).json()
    tid = res["tracking_id"]
    assert len(tid) >= 14, f"Tracking ID {tid} must have high entropy"

    # 4. Public tracking
    track_res = client.get(f"/api/requests/track/{tid}").json()
    assert track_res["request"]["tracking_id"] == tid
    assert "timeline" in track_res
    assert len(track_res["timeline"]) > 0

    # 5. Citizen My Requests Inbox
    my_reqs = client.get(f"/api/citizen/requests?phone={phone_number}").json()
    assert any(r["tracking_id"] == tid for r in my_reqs), f"Newly submitted {tid} must be in citizen inbox"

    # 6. Public Results page check
    pub_board = client.get("/api/public/board?country=all").json()
    assert "requests" in pub_board and "reopened" in pub_board and "items" in pub_board

    # --- 2. GOVERNMENT OFFICIAL & POLICYMAKER JOURNEY ---
    # 1. Login as District Collector
    login_res = client.post("/api/auth/login", json={
        "username": "collector_adilabad",
        "password": "district123"
    }).json()
    token = login_res.get("token")
    assert token, "Login should return a valid token"
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Access Demand Clusters & Hotspots Map
    clusters = client.get("/api/clusters", headers=headers).json()
    assert len(clusters) > 0, "Officer must have access to demand clusters"

    # 3. Access Projects list
    projects_list = client.get("/api/projects", headers=headers).json()
    assert isinstance(projects_list, list)
    assert len(projects_list) > 0

    # 4. Review citizen grievance queue
    req_officer = client.get("/api/requests?limit=10", headers=headers).json()
    assert "items" in req_officer and len(req_officer["items"]) > 0

    # 5. Verify RBAC Security Guard: Anonymous blocked from /api/requests
    anon_resp = client.get("/api/requests")
    assert anon_resp.status_code in (401, 403)

    # 6. Verify Citizen cannot access Officer Dashboard routes
    citizen_login = client.post("/api/auth/citizen/login", json={"demo_user": "citizen_ramesh"}).json()
    cit_token = citizen_login.get("token")
    cit_headers = {"Authorization": f"Bearer {cit_token}"}
    cit_block = client.get("/api/requests", headers=cit_headers)
    assert cit_block.status_code in (401, 403)
