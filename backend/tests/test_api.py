"""End-to-end API tests on the seeded demo dataset.  Run:  cd backend && pytest -q"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_jansetu.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed.seed import run as seed  # noqa: E402

GOV = {}  # filled after login


@pytest.fixture(scope="session", autouse=True)
def setup_gov_auth(client):
    tok = client.post("/api/auth/login", json={"username": "planner", "password": "planner123"}).json()["token"]
    GOV["Authorization"] = f"Bearer {tok}"


def test_health_and_meta(client):
    assert client.get("/api/health").json()["status"] == "ok"
    m = client.get("/api/meta").json()
    assert "water" in m["sectors"] and len(m["states"]) == 5


@pytest.mark.parametrize("text,lang,sector", [
    ("మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. ఉట్నూర్", "te", "water"),
    ("गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आ पाती। Seelampur", "hi", "roads"),
    ("ଆମ ଗାଁରେ ପିଇବା ପାଣି ନାହିଁ, ନଳକୂଅ ଖରାପ ହୋଇଛି। Lamtaput", "or", "water"),
    ("हमनी के गली में नाली उफना जाला, सीवर के पानी से लइकन बेमार हो जात बाड़न। Bawana", "bho", "sanitation"),
])
def test_multilingual_intake_clusters_and_replies(client, text, lang, sector):
    r = client.post("/api/intake/text", json={"text": text, "phone": f"+1{hash(text) % 10**9}"}).json()
    u = r["understanding"]
    assert u["language"] == lang and u["category"] == sector
    assert r["request"]["area"] is not None, "place name should be geo-resolved"
    assert r["cluster"] and r["cluster"]["unique_households"] >= 1
    assert r["tracking_id"] in r["reply"]


def test_pii_redaction(client):
    r = client.post("/api/intake/text", json={"text": "My name is Ravi Kumar, call 9876543210. No water in Utnoor for 5 days"}).json()
    assert "9876543210" not in r["request"]["text"] and "Ravi" not in r["request"]["text"]


def test_needs_location_then_follow_up(client):
    a = client.post("/api/channels/simulate", json={"sender": "+91999", "text": "Our handpump is broken, no drinking water"}).json()
    assert a["kind"] == "ask_location"
    b = client.post("/api/channels/simulate", json={"sender": "+91999", "text": "Narnoor"}).json()
    assert b["kind"] == "ack" and "Narnoor" in b["reply"]


def test_urgent_safety_flag(client):
    r = client.post("/api/intake/text", json={"text": "Gas leak near the school in Malakpet, children trapped!"}).json()
    assert "urgent_safety" in r["understanding"]["flags"] and r["reply_kind"] == "safety"


def test_analytics(client):
    ov = client.get("/api/analytics/overview").json()
    assert ov["total_requests"] > 1000 and ov["silent_zones"] > 0
    ng = client.get("/api/analytics/need-gap?country=IN&w_demand=0&limit=5").json()
    assert ng["weights"]["demand"] == 0 and len(ng["items"]) == 5
    assert client.get("/api/analytics/silent-zones").json()
    assert "Telangana" in client.get("/api/analytics/alignment").json()
    assert "India" in client.get("/api/analytics/alignment?national=true").json()
    assert any(a["area"] == "Malakpet" for a in client.get("/api/analytics/alerts").json())
    st = client.get("/api/analytics/states").json()
    assert {s["state"] for s in st} == {"Telangana", "Odisha", "Delhi", "Bihar", "Uttar Pradesh"}
    assert client.get("/api/analytics/overview?state=Bihar").json()["total_requests"] < ov["total_requests"]
    areas = client.get("/api/analytics/areas").json()
    assert all("hotspot" in a for a in areas)


def test_projects_explain_decide_optimise(client):
    recs = client.get("/api/projects?source=recommended&country=IN&status=recommended").json()
    assert recs
    d = client.get(f"/api/projects/{recs[0]['id']}").json()
    assert d["explanation"]["drivers"] and d["explanation"]["facts"]
    bad = client.post(f"/api/projects/{recs[0]['id']}/decision", json={"decision": "reject"}, headers=GOV)
    assert bad.status_code == 422  # reason required
    ok = client.post(f"/api/projects/{recs[0]['id']}/decision", json={"decision": "approve", "reason": "test"}, headers=GOV).json()
    assert ok["project"]["status"] == "approved"
    denied = client.post(f"/api/projects/{recs[1]['id']}/decision", json={"decision": "approve"})
    assert denied.status_code == 401  # citizens (no login) cannot decide
    opt = client.post("/api/projects/optimise", json={"budget": 5e8}).json()
    assert opt["total_cost"] <= 5e8 and opt["selected"]


def test_tracking_verification_and_closure_audit(client):
    t = client.get("/api/track/JS-IN-RAMES1").json()
    assert t["request"]["closure_flag"] == "formulaic_closure"
    v = client.post("/api/track/JS-IN-RAMES1/verify", json={"fixed": False}).json()
    assert v["status"] == "reopened"
    req_id = t["request"]["id"]
    a = client.post(f"/api/requests/{req_id}/close/audit", json={"closure_note": "Grievance disposed."}).json()
    assert a["formulaic"]
    blocked = client.post(f"/api/requests/{req_id}/close", json={"closure_note": "Disposed."}, headers=GOV)
    assert blocked.status_code == 422
    good = client.post(f"/api/requests/{req_id}/close", headers=GOV,
                       json={"closure_note": "Drain de-silted and 120 m of covered drain constructed on 12 Sept; photo attached."}).json()
    assert good["request"]["status"] == "resolved_pending_verification"


def test_nl_query_and_brief(client):
    q = client.post("/api/query", json={"question": "Show silent zones in India"}).json()
    assert q["intent"]["intent"] == "silent_zones" and q["rows"]
    q2 = client.post("/api/query", json={"question": "सबसे ज़्यादा पानी की समस्या कहाँ है?"}).json()
    assert q2["intent"]["sector"] == "water"
    b = client.get("/api/briefs?state=Odisha&district=Koraput").json()
    assert b["top_needs"] and b["key_findings"]


def test_impact_and_gram_sabha_plan(client):
    imp = client.get("/api/impact/projects").json()
    assert imp and all(i["did_estimate"] < 0 for i in imp)
    k = client.get("/api/impact/kpis").json()
    assert k["inclusion"]["voice_share"] > 0
    gp = client.get("/api/plans/gram-sabha?district=Adilabad").json()
    assert gp["items"] and gp["items"][0]["priority"] == 1 and gp["items"][0]["estimated_cost_inr"] > 0
    assert client.get("/api/plans/gram-sabha.csv?district=Gaya").text.startswith("priority,area")
    q = client.post("/api/query", json={"question": "తెలంగాణలో నీటి సమస్య ఎక్కడ ఎక్కువ?"}).json()
    assert q["intent"]["state"] == "Telangana" and q["intent"]["sector"] == "water"


def test_open311_and_community(client):
    assert len(client.get("/open311/v2/services.json").json()) == 6
    created = client.post("/open311/v2/requests.json", json={"description": "Street light not working in Kukatpally", "lat": 17.485, "long": 78.411}).json()
    rid = created[0]["service_request_id"]
    assert client.get(f"/open311/v2/requests/{rid}.json").json()[0]["service_code"] == "electricity"
    areas = client.get("/api/areas?country=IN").json()
    utnoor = next(a for a in areas if a["name"] == "Utnoor")
    c = client.post("/api/intake/community", json={"area_id": utnoor["id"], "transcript":
                    "Road to the village washes away every monsoon (120 people). The school has only one teacher (64 people). Handpump broken for weeks (80 people)."}).json()
    assert c["count"] == 3 and {d["understanding"]["category"] for d in c["demands"]} == {"roads", "education", "water"}


def test_erasure(client):
    r = client.post("/api/intake/text", json={"text": "No electricity in Tembisa since Monday"}).json()
    assert client.delete(f"/api/track/{r['tracking_id']}").json()["erased"]
    assert client.get(f"/api/track/{r['tracking_id']}").json()["request"]["text"].startswith("[erased")


def test_login_and_protection(client):
    assert client.post("/api/auth/login", json={"username": "planner", "password": "wrong"}).status_code == 401
    assert client.get("/api/review-queue").status_code == 401
    assert client.get("/api/review-queue", headers=GOV).status_code == 200
    fake = client.get("/api/review-queue", headers={"Authorization": "Bearer abc.def"})
    assert fake.status_code == 401


def test_me_too_my_requests_board_export(client):
    areas = client.get("/api/areas?country=IN").json()
    narnoor = next(a for a in areas if a["name"] == "Narnoor")
    near = client.get(f"/api/nearby?area_id={narnoor['id']}").json()
    before = near[0]["unique_households"]
    r = client.post(f"/api/clusters/{near[0]['id']}/support", json={"phone": "+919000011111", "language": "te"}).json()
    assert r["cluster"]["unique_households"] == before + 1
    again = client.post(f"/api/clusters/{near[0]['id']}/support", json={"phone": "+919000011111"}).json()
    assert again["already"]
    mine = client.get("/api/citizen/requests?phone=+919000011111").json()
    assert mine and mine[0]["tracking_id"] == r["tracking_id"]
    b = client.get("/api/public/board").json()
    assert b["completed"] >= 4 and b["items"]
    csv_text = client.get("/api/export/need-gap.csv").text
    assert csv_text.startswith("state,district") and "Narnoor" in csv_text


def test_citizen_can_answer_where(client):
    r = client.post("/api/intake/text", json={"text": "Our handpump is broken, no drinking water for a week"}).json()
    tid = r["tracking_id"]
    assert r["reply_kind"] == "ask_location" and r["request"]["waiting_for"] == "location"
    bad = client.post(f"/api/track/{tid}/reply", json={"text": "somewhere unknown xyz"}).json()
    assert bad["resolved"] is False
    ok = client.post(f"/api/track/{tid}/reply", json={"text": "Jainoor"}).json()
    assert ok["resolved"] and "Jainoor" in ok["reply"]
    t = client.get(f"/api/track/{tid}").json()
    assert t["request"]["waiting_for"] is None and t["cluster"] and t["area"] == "Jainoor"
    kinds = [n["kind"] for n in t["notifications"]]
    assert "citizen_reply" in kinds and kinds[-1] == "ack"
    extra = client.post(f"/api/track/{tid}/reply", json={"text": "It is near the school"}).json()
    assert extra["resolved"]
