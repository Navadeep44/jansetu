"""End-to-End Walkthrough Script for JanSetu:
Tests both the First-Time Citizen Persona and Government Official Persona.
"""
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_citizen_journey():
    print("\n--- 1. FIRST-TIME CITIZEN JOURNEY ---")
    s = requests.Session()
    
    # 1. Check meta and area lookup
    meta = s.get(f"{BASE_URL}/api/meta").json()
    print(f"Meta check: System country={meta.get('default_country')}, sectors={len(meta.get('sectors', []))}")
    
    areas = s.get(f"{BASE_URL}/api/areas").json()
    assert len(areas) > 0, "Areas should be populated"
    test_area = areas[0]
    print(f"Area selection: {test_area['name']} (ID {test_area['id']}) in {test_area.get('district')}, {test_area.get('state')}")

    # 2. Preview (multilingual AI clarifying extraction)
    hi_text = "हमारे वार्ड में पानी का पाइप टूट गया है और 5 दिनों से गंदा पानी आ रहा है"
    prev = s.post(f"{BASE_URL}/api/intake/preview", json={"text": hi_text, "language": "hi"}).json()
    print(f"AI Multilingual preview: detected={prev.get('language')}, category={prev.get('category')}")
    print(f"Native summary: {prev.get('native_summary')}")
    print(f"Clarifying question: {prev.get('clarifying_question')}")
    assert prev.get("native_summary"), "Native summary must be provided"
    assert prev.get("clarifying_question"), "Clarifying dialogue prompt must be provided"

    # 3. File grievance intake with phone and multiple photos
    form_data = {
        "text": hi_text,
        "language": "hi",
        "channel": "web",
        "area_id": test_area["id"],
        "phone": "+91 94400 55667",
        "anonymous": "false",
        "gender": "female",
    }
    files = [
        ("photos", ("damaged_pipe1.jpg", b"fake_image_bytes_1", "image/jpeg")),
        ("photos", ("damaged_pipe2.jpg", b"fake_image_bytes_2", "image/jpeg")),
    ]
    res = s.post(f"{BASE_URL}/api/intake/form", data=form_data, files=files).json()
    tid = res["tracking_id"]
    print(f"Grievance submitted successfully! Tracking ID: {tid}")
    assert len(tid) >= 14, f"Tracking ID {tid} must have high entropy (10+ random chars)"
    print(f"Tracking ID format validated: length={len(tid)}, sample={tid}")

    # 4. Public tracking without phone last 4 digits (Unverified)
    track_unverified = s.get(f"{BASE_URL}/api/requests/track/{tid}").json()
    print(f"Unverified tracking: verified_access={track_unverified.get('verified_access')}")
    print(f"Masked phone: {track_unverified.get('masked_phone')}")
    print(f"Protected text excerpt: {track_unverified['request']['text'][:60]}...")
    assert track_unverified.get("verified_access") is False, "Access without phone last 4 must be unverified"
    assert "••••" in track_unverified["request"]["text"], "Personal text must be masked for unverified lookups"

    # 5. Verified tracking with correct phone last 4 digits ("5667")
    track_verified = s.get(f"{BASE_URL}/api/requests/track/{tid}?phone_last4=5667").json()
    print(f"Verified tracking with 5667: verified_access={track_verified.get('verified_access')}")
    print(f"Unmasked text: {track_verified['request']['text']}")
    assert track_verified.get("verified_access") is True, "Access with matching last 4 digits must be verified"
    assert hi_text in track_verified["request"]["text"], "Original complaint text must be shown when verified"

    # 6. Citizen My Requests Inbox
    my_reqs = s.get(f"{BASE_URL}/api/citizen/requests?phone=9440055667").json()
    print(f"Citizen Inbox: Found {len(my_reqs)} complaints for 9440055667")
    assert any(r["tracking_id"] == tid for r in my_reqs), f"Newly submitted {tid} must be in citizen inbox"

    # 7. Public Results page check
    pub_board = s.get(f"{BASE_URL}/api/public/board?country=all").json()
    print(f"Public Results: requests={pub_board.get('requests')}, projects={pub_board.get('projects')}, reopened={pub_board.get('reopened')}")
    assert "disputed_cases" in pub_board, "Public board must include disputed_cases drill-down list"
    print(f"Disputed cases available for drill-down: {len(pub_board.get('disputed_cases', []))}")

    print("Citizen Journey Passed 100%!")
    return tid


def test_official_journey(tid):
    print("\n--- 2. GOVERNMENT OFFICIAL & POLICYMAKER JOURNEY ---")
    s = requests.Session()

    # 1. Login as District/Policymaker Officer
    login_res = s.post(f"{BASE_URL}/api/auth/officer/login", json={
        "username": "officer_patil",
        "password": "officer123"
    }).json()
    token = login_res.get("token")
    user = login_res.get("user")
    print(f"Officer logged in: {user.get('name')} ({user.get('role')}), Jurisdiction={user.get('state')}, {user.get('district')}")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Access Demand Clusters & Hotspots Map
    clusters = s.get(f"{BASE_URL}/api/clusters", headers=headers).json()
    print(f"Clusters available for officer: {len(clusters)} clusters loaded")
    assert len(clusters) > 0, "Officer must have access to demand clusters"

    # 3. Access Projects & Ranking Simulation with Weight Sliders
    # Default weights: need_gap=40, demand=35, vulnerability=25
    priorities_default = s.get(f"{BASE_URL}/api/priorities", headers=headers).json()
    print(f"Priorities (Default Weights): Top priority = {priorities_default[0]['title'] if priorities_default else 'None'}")

    # Adjusted weights: High vulnerability weight
    priorities_custom = s.get(f"{BASE_URL}/api/priorities?w_need=10&w_demand=20&w_vuln=70", headers=headers).json()
    print(f"Priorities (70% Vulnerability Weight): Top priority = {priorities_custom[0]['title'] if priorities_custom else 'None'}")

    # 4. Review and assign citizen grievance
    req_officer = s.get(f"{BASE_URL}/api/requests?limit=10", headers=headers).json()
    print(f"Officer Grievance Queue: {len(req_officer)} requests in jurisdiction")

    # 5. Verify RBAC Security Guard: Anonymous citizen cannot access /api/requests
    anon_resp = requests.get(f"{BASE_URL}/api/requests")
    assert anon_resp.status_code in (401, 403), f"Anonymous user must be blocked from /api/requests (got {anon_resp.status_code})"
    print(f"RBAC Security Guard Verified: Anonymous citizen blocked from raw complaints ({anon_resp.status_code})")

    # 6. Verify Citizen cannot access Officer Dashboard routes
    citizen_login = requests.post(f"{BASE_URL}/api/auth/citizen/login", json={"demo_user": "citizen_ramesh"}).json()
    cit_token = citizen_login.get("token")
    cit_headers = {"Authorization": f"Bearer {cit_token}"}
    cit_block = requests.get(f"{BASE_URL}/api/requests", headers=cit_headers)
    assert cit_block.status_code in (401, 403), f"Citizen user must be blocked from officer raw complaints (got {cit_block.status_code})"
    print(f"RBAC Security Guard Verified: Authenticated citizen blocked from officer endpoints ({cit_block.status_code})")

    print("Official Journey Passed 100%!")


if __name__ == "__main__":
    tid = test_citizen_journey()
    test_official_journey(tid)
