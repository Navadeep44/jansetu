"""Authentication & role-based access.

- Citizens NEVER need to log in (inclusion: shared phones, IVR, assisted filing, anonymity).
- Officials log in and receive a signed, expiring token (HMAC-SHA256).
Demo accounts are listed in DEMO_USERS. In production replace login() with national SSO
(e.g. India Parichay / Jan Parichay, Brazil gov.br, South Africa eGov) - the token check stays the same."""
import base64
import hashlib
import hmac
import json
import time

from fastapi import Header, HTTPException

from app.core.config import settings

ROLES = ["citizen", "field_officer", "district", "national", "brics_analyst", "admin"]
GOV_ROLES = {"field_officer", "district", "national", "admin"}
PLANNER_ROLES = {"district", "national", "admin"}
TOKEN_TTL = 12 * 3600

DEMO_USERS = {
    "officer": {"password": "officer123", "role": "field_officer", "name": "Ravi Teja", "title": "Field officer, Utnoor block"},
    "collector": {"password": "collector123", "role": "district", "name": "Anitha Rao", "title": "District Collector, Adilabad"},
    "planner": {"password": "planner123", "role": "national", "name": "Dr. S. Menon", "title": "National planning ministry"},
    "brics": {"password": "brics123", "role": "brics_analyst", "name": "L. Silva", "title": "BRICS / NDB analyst"},
}


def _sign(payload: bytes) -> str:
    return hmac.new(settings.auth_secret.encode(), payload, hashlib.sha256).hexdigest()


def issue_token(username: str, role: str, name: str) -> str:
    body = base64.urlsafe_b64encode(json.dumps({"u": username, "r": role, "n": name, "exp": int(time.time()) + TOKEN_TTL}).encode())
    return body.decode() + "." + _sign(body)


def read_token(token: str) -> dict | None:
    try:
        body, sig = token.split(".", 1)
        if not hmac.compare_digest(_sign(body.encode()), sig):
            return None
        data = json.loads(base64.urlsafe_b64decode(body.encode()))
        return data if data.get("exp", 0) > time.time() else None
    except Exception:
        return None


def login(username: str, password: str) -> dict:
    u = DEMO_USERS.get((username or "").strip().lower())
    if not u or not hmac.compare_digest(u["password"], password or ""):
        raise HTTPException(401, "Wrong username or password")
    return {"token": issue_token(username.lower(), u["role"], u["name"]),
            "user": {"username": username.lower(), "role": u["role"], "name": u["name"], "title": u["title"]}}


def current_role(authorization: str | None = Header(default=None), x_role: str | None = Header(default=None)) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        data = read_token(authorization[7:].strip())
        if not data:
            raise HTTPException(401, "Session expired. Please log in again.")
        return data["r"]
    if settings.allow_role_header and x_role and x_role.lower() in ROLES:  # dev/test convenience only
        return x_role.lower()
    return "citizen"


def require(*allowed: str):
    def dep(authorization: str | None = Header(default=None), x_role: str | None = Header(default=None)) -> str:
        role = current_role(authorization, x_role)
        if role == "citizen":
            raise HTTPException(401, "Official login required")
        if role not in allowed and role != "admin":
            raise HTTPException(403, f"Your role ({role}) cannot do this")
        return role
    return dep
