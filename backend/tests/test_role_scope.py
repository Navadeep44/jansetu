"""Each designation sees only its own jurisdiction and can only do its own job."""
import pytest

from app.models import Area, Project


def _login(client, u, p):
    r = client.post("/api/auth/officer/login", json={"username": u, "password": p})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_scoped_dashboards(client):
    nat = _login(client, "national_admin", "admin123")
    col = _login(client, "collector_adilabad", "district123")
    st = _login(client, "state_telangana", "state123")
    dept = _login(client, "dept_water_tg", "dept123")
    all_states = {s["state"] for s in client.get("/api/analytics/states", headers=nat).json()}
    assert len(all_states) >= 5
    assert {s["state"] for s in client.get("/api/analytics/states", headers=st).json()} == {"Telangana"}
    # a collector asking for Odisha still only gets Adilabad
    rows = client.get("/api/analytics/need-gap?state=Odisha&limit=500", headers=col).json()["items"]
    assert rows and {r["district"] for r in rows} == {"Adilabad"}
    d = client.get("/api/analytics/districts", headers=st).json()
    assert {x["name"] for x in d} >= {"Adilabad", "Hyderabad"} and all(x["state"] == "Telangana" for x in d)
    rows = client.get("/api/analytics/need-gap?limit=500", headers=dept).json()["items"]
    assert {r["sector"] for r in rows} == {"water"} and {r["district"] for r in rows} == {"Adilabad"}
    ov = client.get("/api/analytics/overview", headers=col).json()
    assert ov["scope"]["district"] == "Adilabad"


def test_decision_rights(client):
    col = _login(client, "collector_adilabad", "district123")
    field = _login(client, "field_utnoor", "field123")
    recs = client.get("/api/projects?source=recommended&status=recommended&limit=500").json()
    other = next(p for p in recs if p["district"] != "Adilabad")
    assert client.post(f"/api/projects/{other['id']}/decision", json={"decision": "approve", "reason": "x"}, headers=col).status_code == 403
    own = client.get("/api/projects?source=recommended&status=recommended&limit=500", headers=col).json()
    assert own and all(p["district"] == "Adilabad" for p in own)
    assert client.post(f"/api/projects/{own[0]['id']}/decision", json={"decision": "approve", "reason": "ok"}, headers=field).status_code == 403
    ok = client.post(f"/api/projects/{own[0]['id']}/decision", json={"decision": "approve", "reason": "In district plan"}, headers=col)
    assert ok.status_code == 200


def test_field_officer_sees_only_own_cases(client):
    field = _login(client, "field_utnoor", "field123")
    items = client.get("/api/requests?limit=200", headers=field).json()["items"]
    me = client.get("/api/auth/me", headers=field).json()["user_id"]
    assert all(r.get("assigned_field_officer_id") == me or "field_utnoor" in (r.get("assigned_officer") or "").lower()
               or "ravi" in (r.get("assigned_officer") or "").lower() for r in items)
    # and the field officer cannot see the district dashboard data of another district
    rows = client.get("/api/analytics/need-gap?state=Delhi&limit=50", headers=field).json()["items"]
    assert all(r["district"] == "Adilabad" for r in rows)


def test_citizen_otp(client):
    s = client.post("/api/auth/citizen/send-code", json={"phone": "+91 90000 11111"}).json()
    v = client.post("/api/auth/citizen/verify", json={"phone": "+91 90000 11111", "code": s["demo_code"]}).json()
    assert v["token"] and v["user"]["role"] == "citizen"
    r = client.get("/api/citizen/me/requests", headers={"Authorization": f"Bearer {v['token']}"})
    assert r.status_code == 200
