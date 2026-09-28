"""End-to-end tests for Grievance Status Tracking & Proof-of-Resolution module."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed.seed import run as seed

GOV = {}


@pytest.fixture(scope="session", autouse=True)
def setup_gov_auth(client):
    tok = client.post("/api/auth/login", json={"username": "planner", "password": "planner123"}).json()["token"]
    GOV["Authorization"] = f"Bearer {tok}"


def test_immediate_tracking_id_and_initial_status_history(client):
    """1) When a citizen reports a problem, generate a unique tracking ID and show it immediately."""
    r = client.post("/api/intake/text", json={
        "text": "Broken transformer sparking near the primary school in Narnoor",
        "phone": "+919876543210",
    }).json()

    tid = r["tracking_id"]
    assert tid.startswith("JS-IN-")
    assert "tracking_id" in r
    assert r["cluster"] is not None

    # Track status immediately
    track = client.get(f"/api/track/{tid}").json()
    assert track["request"]["tracking_id"] == tid
    assert len(track["history"]) >= 1
    assert track["history"][0]["stage_label"] == "Received"
    assert track["history"][0]["actor_role"] == "citizen"
    assert track["department"] is not None


def test_officer_assignment_and_in_progress_lifecycle(client):
    """2) Status transition lifecycle: Received -> Assigned -> In Progress."""
    # Create request
    r = client.post("/api/intake/text", json={
        "text": "Deep potholes causing accidents on Utnoor main highway",
        "phone": "+919876543211",
    }).json()
    req_id = r["request"]["id"]
    tid = r["tracking_id"]

    # Assign officer
    assign_res = client.post(f"/api/requests/{req_id}/assign", headers=GOV, json={
        "officer_name": "Er. Rajesh Kumar",
        "department": "Roads & Buildings Department",
        "note": "Assigned to Ward Engineer for site inspection and survey",
    }).json()
    assert assign_res["request"]["status"] == "assigned"
    assert assign_res["request"]["assigned_officer"] == "Er. Rajesh Kumar"

    # Mark in progress
    progress_res = client.post(f"/api/requests/{req_id}/in-progress", headers=GOV, json={
        "officer_name": "Er. Rajesh Kumar",
        "note": "Road repair crew and asphalt paver deployed on site",
    }).json()
    assert progress_res["request"]["status"] == "in_progress"

    # Citizen tracking check
    t = client.get(f"/api/track/{tid}").json()
    assert t["request"]["status"] == "in_progress"
    stages = [h["stage_label"] for h in t["history"]]
    assert "Received" in stages
    assert any("Assigned" in s for s in stages)
    assert "Work In Progress" in stages


def test_mandatory_proof_of_resolution_requirement(client):
    """3) Officer CANNOT mark complaint as 'Resolved' with just text notes. Mandatory proof upload."""
    r = client.post("/api/intake/text", json={
        "text": "Contaminated water supply in Jainoor ward 4",
        "phone": "+919876543212",
    }).json()
    req_id = r["request"]["id"]
    tid = r["tracking_id"]

    # Attempt to resolve with NO proof files -> must fail with 422 Unprocessable Entity
    empty_proof_res = client.post(f"/api/requests/{req_id}/resolve-with-proof", headers=GOV, json={
        "closure_note": "Replaced 40m pipeline section and chlorinated on 15 Sept.",
        "officer_name": "Inspector S. Rao",
        "department": "Rural Water Supply",
        "proofs": [],
    })
    assert empty_proof_res.status_code == 422

    # Attempt to resolve with invalid file type (e.g. executable/script) -> must fail with 400/422
    bad_type_res = client.post(f"/api/requests/{req_id}/resolve-with-proof", headers=GOV, json={
        "closure_note": "Replaced 40m pipeline section and chlorinated on 15 Sept.",
        "proofs": [{
            "file_url": "data:text/plain;base64,AAAA",
            "file_name": "malicious.exe",
            "mime_type": "application/x-msdownload",
        }],
    })
    assert bad_type_res.status_code in (400, 422)

    # Resolve WITH valid image proof and geotag
    good_res = client.post(f"/api/requests/{req_id}/resolve-with-proof", headers=GOV, json={
        "closure_note": "Replaced cracked 4-inch PVC pipeline section and disinfected reservoir on 15 Sept.",
        "officer_name": "Inspector S. Rao",
        "department": "Rural Water Supply",
        "proofs": [{
            "file_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            "file_name": "pipeline_fixed_onsite.jpg",
            "file_type": "photo",
            "file_size": 1048576,
            "mime_type": "image/jpeg",
            "lat": 19.421,
            "lng": 78.854,
            "exif_metadata": {"camera": "Nikon D3500", "captured_at": "2026-09-15T10:30:00Z"},
        }],
    })
    assert good_res.status_code == 200
    good_data = good_res.json()
    assert good_data["request"]["status"] == "resolved_pending_verification"
    assert good_data["proof_count"] == 1

    # Check track endpoint
    t = client.get(f"/api/track/{tid}").json()
    assert t["request"]["status"] == "resolved_pending_verification"
    assert len(t["proofs"]) == 1
    assert t["proofs"][0]["lat"] == 19.421
    assert t["proofs"][0]["sha256_hash"] is not None


def test_citizen_confirmation_and_dispute_flow(client):
    """4) Citizen can inspect proof and either confirm ('Yes, fixed') or dispute ('No, not fixed')."""
    # Case A: Confirmation
    r1 = client.post("/api/intake/text", json={"text": "Streetlight broken in Narnoor", "phone": "+919876543220"}).json()
    req1_id = r1["request"]["id"]
    tid1 = r1["tracking_id"]
    resolve_r1 = client.post(f"/api/requests/{req1_id}/resolve-with-proof", headers=GOV, json={
        "closure_note": "Replaced defective 45W LED luminaire and fixed timer switch on 18 Sept.",
        "proofs": [{"file_url": "data:image/png;base64,iVBORw0KGgo=", "file_name": "light_fixed.png", "mime_type": "image/png"}],
        "force": True,
    })
    assert resolve_r1.status_code == 200

    confirm_res = client.post(f"/api/track/{tid1}/confirm", json={
        "rating": 5,
        "comment": "Thank you! The light is working well now.",
    })
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "closed_verified"
    t1 = client.get(f"/api/track/{tid1}").json()
    assert t1["request"]["status"] == "closed_verified"
    assert t1["request"]["citizen_rating"] == 5

    # Case B: Dispute (Reopens case)
    r2 = client.post("/api/intake/text", json={"text": "Handpump handle missing in Utnoor", "phone": "+919876543221"}).json()
    req2_id = r2["request"]["id"]
    tid2 = r2["tracking_id"]
    resolve_r2 = client.post(f"/api/requests/{req2_id}/resolve-with-proof", headers=GOV, json={
        "closure_note": "Attached replacement GI handle and lubricated piston cylinder on 19 Sept.",
        "proofs": [{"file_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg==", "file_name": "pump.jpg", "mime_type": "image/jpeg"}],
        "force": True,
    })
    assert resolve_r2.status_code == 200

    dispute_res = client.post(f"/api/track/{tid2}/dispute", json={
        "reason": "Water is still muddy and pressure is very low.",
        "photo": "data:image/jpeg;base64,/9j/dispute_evidence",
    })
    assert dispute_res.status_code == 200
    dispute_data = dispute_res.json()
    assert dispute_data["status"] == "reopened"
    t2 = client.get(f"/api/track/{tid2}").json()
    assert t2["request"]["status"] == "reopened"
    assert t2["request"]["dispute_reason"] == "Water is still muddy and pressure is very low."


def test_supervisor_pending_proof_review_dashboard(client):
    """5) Supervisor dashboard monitors pending verification cases and flags suspicious proofs."""
    review_list = client.get("/api/admin/pending-proof-review", headers=GOV).json()
    assert "items" in review_list
    assert "total" in review_list

    if review_list["items"]:
        item = review_list["items"][0]
        assert "days_pending" in item
        if item.get("proofs"):
            proof_id = item["proofs"][0]["id"]
            # Flag proof as suspicious
            flag_res = client.post(f"/api/admin/proof/{proof_id}/flag-suspicious", headers=GOV, json={
                "suspicious": True,
                "reason": "Photo appears to be a stock photo, not from the actual site.",
            }).json()
            assert flag_res["proof"]["is_suspicious"] is True
