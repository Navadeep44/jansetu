"""Authentication & Role-Based Access Control (RBAC) System.

Defines:
- Hierarchical roles (Super Admin, Admin, State Officer, District Officer, Department Officer, Field Officer, Citizen)
- Fine-grained jurisdictional scoping (Country, State, District, Department)
- Permission definitions and token encoding/decoding
- Backend route protection dependencies and query scoping helpers
"""
import base64
import hashlib
import hmac
import json
import time
from typing import List, Optional, Set
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

# Available Roles
ROLE_SUPER_ADMIN = "super_admin"
ROLE_ADMIN = "admin"
ROLE_STATE_OFFICER = "state_officer"
ROLE_DISTRICT_OFFICER = "district_officer"
ROLE_DEPT_OFFICER = "dept_officer"
ROLE_FIELD_OFFICER = "field_officer"
ROLE_CITIZEN = "citizen"

ALL_ROLES = [
    ROLE_SUPER_ADMIN,
    ROLE_ADMIN,
    ROLE_STATE_OFFICER,
    ROLE_DISTRICT_OFFICER,
    ROLE_DEPT_OFFICER,
    ROLE_FIELD_OFFICER,
    ROLE_CITIZEN,
]

OFFICER_ROLES = {
    ROLE_SUPER_ADMIN,
    ROLE_ADMIN,
    ROLE_STATE_OFFICER,
    ROLE_DISTRICT_OFFICER,
    ROLE_DEPT_OFFICER,
    ROLE_FIELD_OFFICER,
}

GOV_ROLES = OFFICER_ROLES
ROLES = ALL_ROLES

PLANNER_ROLES = {
    ROLE_SUPER_ADMIN,
    ROLE_ADMIN,
    ROLE_STATE_OFFICER,
    ROLE_DISTRICT_OFFICER,
}

TOKEN_TTL = 24 * 3600  # 24 hours

ROLE_PERMISSIONS: dict[str, Set[str]] = {
    ROLE_SUPER_ADMIN: {"*"},
    ROLE_ADMIN: {
        "dashboard:view", "priorities:view", "clusters:view", "projects:view",
        "projects:fund", "projects:reject", "projects:optimize", "brics:view",
        "brief:generate_national", "brief:generate", "officers:view", "officers:manage_state",
        "budget:view_national", "budget:view", "audit:view", "users:view"
    },
    ROLE_STATE_OFFICER: {
        "dashboard:view", "priorities:view", "clusters:view", "projects:view",
        "projects:approve_state", "projects:reject", "officers:view", "officers:manage_district",
        "brief:generate_state", "brief:generate", "budget:view_state", "budget:view",
        "officer:inbox"
    },
    ROLE_DISTRICT_OFFICER: {
        "dashboard:view", "priorities:view", "clusters:view", "projects:view",
        "projects:approve_district", "projects:reject", "projects:complete", "projects:expenditure",
        "complaints:reassign_dept", "officers:view", "officers:manage_dept",
        "brief:generate_district", "brief:generate", "budget:view_district", "budget:view",
        "officer:inbox"
    },
    ROLE_DEPT_OFFICER: {
        "queue:view", "clusters:view", "projects:view", "projects:propose",
        "complaints:assign_field", "proof:review_accept", "proof:review_rework",
        "team:view", "officers:manage_field", "kpi:view_dept", "officer:inbox"
    },
    ROLE_FIELD_OFFICER: {
        "inbox:view_own", "complaints:update_status", "proof:submit", "complaints:escalate",
        "performance:view_own", "officer:inbox"
    },
    ROLE_CITIZEN: {
        "report:create", "request:read_mine", "proof:view_mine",
        "proof:confirm", "proof:dispute", "results:view"
    },
}

# Predefined Demo Accounts with Jurisdictions
DEMO_OFFICERS = [
    {
        "username": "superadmin",
        "password": "admin123",
        "name": "Dr. Rajeshwar Rao",
        "title": "Principal Secretary & Chief Administrator",
        "user_type": "officer",
        "role": ROLE_SUPER_ADMIN,
        "country_code": "IN",
        "state": None,
        "district": None,
        "block": None,
        "department": None,
    },
    {
        "username": "national_admin",
        "password": "admin123",
        "name": "Dr. S. Menon",
        "title": "National Planning Commission Director",
        "user_type": "officer",
        "role": ROLE_ADMIN,
        "country_code": "IN",
        "state": None,
        "district": None,
        "block": None,
        "department": None,
    },
    {
        "username": "state_telangana",
        "password": "state123",
        "name": "K. Chandrasekhar Reddy",
        "title": "State Grievance Commissioner, Telangana",
        "user_type": "officer",
        "role": ROLE_STATE_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": None,
        "block": None,
        "department": None,
    },
    {
        "username": "state_delhi",
        "password": "state123",
        "name": "Priya Sharma, IAS",
        "title": "Special Secretary (Grievances), Govt of NCT Delhi",
        "user_type": "officer",
        "role": ROLE_STATE_OFFICER,
        "country_code": "IN",
        "state": "Delhi",
        "district": None,
        "block": None,
        "department": None,
    },
    {
        "username": "collector_adilabad",
        "password": "district123",
        "name": "Anitha Rao, IAS",
        "title": "District Collector & Magistrate, Adilabad",
        "user_type": "officer",
        "role": ROLE_DISTRICT_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Adilabad",
        "block": None,
        "department": None,
    },
    {
        "username": "dm_southdelhi",
        "password": "district123",
        "name": "Amit Saxena, IAS",
        "title": "District Magistrate, South Delhi",
        "user_type": "officer",
        "role": ROLE_DISTRICT_OFFICER,
        "country_code": "IN",
        "state": "Delhi",
        "district": "South Delhi",
        "block": None,
        "department": None,
    },
    {
        "username": "dept_water_tg",
        "password": "dept123",
        "name": "Er. P. Venkatesh",
        "title": "Superintending Engineer, Mission Bhagiratha / Water Supply",
        "user_type": "officer",
        "role": ROLE_DEPT_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Adilabad",
        "block": None,
        "department": "water",
    },
    {
        "username": "dept_pwd_delhi",
        "password": "dept123",
        "name": "Er. Sanjeev Gupta",
        "title": "Executive Engineer, PWD Delhi",
        "user_type": "officer",
        "role": ROLE_DEPT_OFFICER,
        "country_code": "IN",
        "state": "Delhi",
        "district": "South Delhi",
        "block": None,
        "department": "roads",
    },
    {
        "username": "field_utnoor",
        "password": "field123",
        "name": "Ravi Teja",
        "title": "Assistant Engineer / Field Redressal Officer, Utnoor Block",
        "user_type": "officer",
        "role": ROLE_FIELD_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Adilabad",
        "block": "Utnoor",
        "department": "water",
    },
    {
        "username": "field_mehrauli",
        "password": "field123",
        "name": "Vikram Singh",
        "title": "Junior Engineer / Field Redressal Officer, Mehrauli Zone",
        "user_type": "officer",
        "role": ROLE_FIELD_OFFICER,
        "country_code": "IN",
        "state": "Delhi",
        "district": "South Delhi",
        "block": "Mehrauli",
        "department": "roads",
    },
    {
        "username": "dept_roads_adi",
        "password": "dept123",
        "name": "Er. K. Suresh",
        "title": "Executive Engineer, Roads & Buildings Adilabad",
        "user_type": "officer",
        "role": ROLE_DEPT_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Adilabad",
        "block": None,
        "department": "roads",
    },
    {
        "username": "dept_roads_hyd",
        "password": "dept123",
        "name": "Er. M. Naveen",
        "title": "Superintending Engineer, Roads Hyderabad",
        "user_type": "officer",
        "role": ROLE_DEPT_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Hyderabad",
        "block": None,
        "department": "roads",
    },
    {
        "username": "dm_hyderabad",
        "password": "district123",
        "name": "Hari Chandana, IAS",
        "title": "District Collector & Magistrate, Hyderabad",
        "user_type": "officer",
        "role": ROLE_DISTRICT_OFFICER,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Hyderabad",
        "block": None,
        "department": None,
    },
    {
        "username": "state_mh",
        "password": "state123",
        "name": "S. K. Mukherjee, IAS",
        "title": "State Grievance Secretary, Maharashtra",
        "user_type": "officer",
        "role": ROLE_STATE_OFFICER,
        "country_code": "IN",
        "state": "Maharashtra",
        "district": None,
        "block": None,
        "department": None,
    },
    {
        "username": "field_pune",
        "password": "field123",
        "name": "Sachin Patil",
        "title": "Junior Engineer, Haveli Zone Pune",
        "user_type": "officer",
        "role": ROLE_FIELD_OFFICER,
        "country_code": "IN",
        "state": "Maharashtra",
        "district": "Pune",
        "block": "Haveli",
        "department": "roads",
    },
]

DEMO_CITIZENS = [
    {
        "username": "citizen_ramesh",
        "password": "citizen123",
        "phone": "+91 98111 22233",
        "name": "Ramesh Kumar",
        "title": "Resident, South Delhi",
        "user_type": "citizen",
        "role": ROLE_CITIZEN,
        "country_code": "IN",
        "state": "Delhi",
        "district": "South Delhi",
        "block": "Mehrauli",
        "department": None,
    },
    {
        "username": "citizen_lakshmi",
        "password": "citizen123",
        "phone": "+91 94400 55667",
        "name": "Lakshmi Bai",
        "title": "Resident, Utnoor, Adilabad",
        "user_type": "citizen",
        "role": ROLE_CITIZEN,
        "country_code": "IN",
        "state": "Telangana",
        "district": "Adilabad",
        "block": "Utnoor",
        "department": None,
    },
]

# Legacy compatibility dictionary for existing tests/references
DEMO_USERS = {
    "officer": {"password": "officer123", "role": "field_officer", "name": "Ravi Teja", "title": "Field officer, Utnoor block"},
    "collector": {"password": "collector123", "role": "district", "name": "Anitha Rao", "title": "District Collector, Adilabad"},
    "planner": {"password": "planner123", "role": "national", "name": "Dr. S. Menon", "title": "National planning ministry"},
    "brics": {"password": "brics123", "role": "brics_analyst", "name": "L. Silva", "title": "BRICS / NDB analyst"},
}


def mask_phone(phone_str: Optional[str]) -> str:
    """Mask phone numbers to only show the last 4 digits for officer privacy."""
    if not phone_str:
        return ""
    clean = phone_str.strip()
    if len(clean) <= 4:
        return clean
    return f"••••••{clean[-4:]}"


def hash_password(password: str) -> str:
    """Create a deterministic HMAC-SHA256 password hash using secret salt."""
    return hmac.new(settings.auth_secret.encode(), (password or "").encode(), hashlib.sha256).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a password against its stored hash."""
    expected = hash_password(plain_password)
    return hmac.compare_digest(expected, hashed_password)


def _sign(payload: bytes) -> str:
    return hmac.new(settings.auth_secret.encode(), payload, hashlib.sha256).hexdigest()


def issue_token(
    user_id: int,
    username: str,
    user_type: str,
    role: str,
    name: str,
    title: str = "",
    country_code: str = "IN",
    state: Optional[str] = None,
    district: Optional[str] = None,
    block: Optional[str] = None,
    department: Optional[str] = None,
) -> str:
    """Generate signed JWT-like Bearer token containing full RBAC claims."""
    perms = list(ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS.get(ROLE_CITIZEN, set())))
    claims = {
        "sub": user_id,
        "u": username,
        "ut": user_type,
        "r": role,
        "n": name,
        "t": title,
        "c": country_code,
        "st": state,
        "dist": district,
        "block": block,
        "dept": department,
        "perms": perms,
        "exp": int(time.time()) + TOKEN_TTL,
    }
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode()
    return f"{body}.{_sign(body.encode())}"


def read_token(token: str) -> Optional[dict]:
    """Verify signature and return token payload if valid and not expired."""
    try:
        body, sig = token.split(".", 1)
        if not hmac.compare_digest(_sign(body.encode()), sig):
            return None
        data = json.loads(base64.urlsafe_b64decode(body.encode()))
        if data.get("exp", 0) <= time.time():
            return None
        return data
    except Exception:
        return None


def ensure_default_users(db: Session):
    """Seed default officer and citizen accounts in SQLite if missing, and sync demo credentials."""
    from app.models.user import User

    # Seed Officers
    for o in DEMO_OFFICERS:
        existing = db.query(User).filter_by(username=o["username"]).first()
        if not existing:
            u = User(
                username=o["username"],
                password_hash=hash_password(o["password"]),
                name=o["name"],
                title=o["title"],
                user_type=o["user_type"],
                role=o["role"],
                country_code=o["country_code"],
                state=o["state"],
                district=o["district"],
                block=o.get("block"),
                department=o["department"],
                is_active=True,
            )
            db.add(u)
        else:
            existing.password_hash = hash_password(o["password"])
            existing.name = o["name"]
            existing.title = o["title"]
            existing.user_type = o["user_type"]
            existing.role = o["role"]
            existing.country_code = o["country_code"]
            existing.state = o["state"]
            existing.district = o["district"]
            existing.block = o.get("block") or existing.block
            existing.department = o["department"]
            existing.is_active = True

    # Seed Citizens
    for c in DEMO_CITIZENS:
        existing = db.query(User).filter_by(username=c["username"]).first()
        if not existing:
            u = User(
                username=c["username"],
                password_hash=hash_password(c["password"]),
                phone=c["phone"],
                name=c["name"],
                title=c["title"],
                user_type=c["user_type"],
                role=c["role"],
                country_code=c["country_code"],
                state=c["state"],
                district=c["district"],
                block=c.get("block"),
                department=c["department"],
                is_active=True,
            )
            db.add(u)
        else:
            existing.password_hash = hash_password(c["password"])
            existing.phone = c.get("phone") or existing.phone
            existing.name = c["name"]
            existing.title = c["title"]
            existing.user_type = c["user_type"]
            existing.role = c["role"]
            existing.country_code = c["country_code"]
            existing.state = c["state"]
            existing.district = c["district"]
            existing.block = c.get("block") or existing.block
            existing.department = c["department"]
            existing.is_active = True

    # Legacy accounts compatibility
    for k, v in DEMO_USERS.items():
        existing = db.query(User).filter_by(username=k).first()
        if not existing:
            u = User(
                username=k,
                password_hash=hash_password(v["password"]),
                name=v["name"],
                title=v["title"],
                user_type="officer",
                role=v["role"],
                country_code="IN",
                is_active=True,
            )
            db.add(u)
        else:
            existing.password_hash = hash_password(v["password"])
            existing.role = v["role"]
            existing.name = v["name"]
            existing.title = v["title"]

    db.commit()


def get_current_user_claims(
    authorization: Optional[str] = Header(default=None),
    x_role: Optional[str] = Header(default=None),
) -> dict:
    """Extract claims from Bearer token or return anonymous guest citizen claims."""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        claims = read_token(token)
        if not claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid. Please log in again.",
            )
        return claims

    # Dev/test convenience role header support
    if settings.allow_role_header and x_role and x_role.lower() in ALL_ROLES:
        role = x_role.lower()
        user_type = "citizen" if role == ROLE_CITIZEN else "officer"
        return {
            "sub": 0,
            "u": f"dev_{role}",
            "ut": user_type,
            "r": role,
            "n": f"Dev {role.replace('_', ' ').title()}",
            "t": "Developer Mock User",
            "c": "IN",
            "st": None,
            "dist": None,
            "block": None,
            "dept": None,
            "perms": list(ROLE_PERMISSIONS.get(role, set())),
        }

    # Default unauthenticated citizen guest
    return {
        "sub": 0,
        "u": "anonymous_citizen",
        "ut": "citizen",
        "r": ROLE_CITIZEN,
        "n": "Citizen",
        "t": "Anonymous Citizen",
        "c": "IN",
        "st": None,
        "dist": None,
        "block": None,
        "dept": None,
        "perms": list(ROLE_PERMISSIONS.get(ROLE_CITIZEN, set())),
    }


def current_role(claims: dict = Depends(get_current_user_claims)) -> str:
    """Legacy helper returning user role."""
    return claims.get("r", ROLE_CITIZEN)


def normalize_role(r: str) -> str:
    r = (r or "").lower()
    if r in ("national", "admin", ROLE_ADMIN, ROLE_SUPER_ADMIN):
        return ROLE_ADMIN
    if r in ("district", ROLE_DISTRICT_OFFICER):
        return ROLE_DISTRICT_OFFICER
    if r in ("field_officer", ROLE_FIELD_OFFICER, "officer"):
        return ROLE_FIELD_OFFICER
    if r in ("state_officer", ROLE_STATE_OFFICER):
        return ROLE_STATE_OFFICER
    if r in ("dept_officer", ROLE_DEPT_OFFICER):
        return ROLE_DEPT_OFFICER
    return r


def require_officer(claims: dict = Depends(get_current_user_claims)) -> dict:
    """Ensure authenticated user is an Officer. Missing token gets 401; authenticated citizen gets 403."""
    sub = claims.get("sub", 0)
    user_type = claims.get("ut", "citizen")
    role = claims.get("r", ROLE_CITIZEN)
    if not sub or sub == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Official login required.",
        )
    if user_type != "officer" or role == ROLE_CITIZEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: This area requires an Officer account.",
        )
    return claims


def require_citizen(claims: dict = Depends(get_current_user_claims)) -> dict:
    """Ensure user is a Citizen or guest."""
    if claims.get("ut") not in ("citizen", "guest"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: This area is for Citizens only.",
        )
    return claims


def require(*allowed_roles: str):
    """Dependency factory checking that the officer has one of the allowed roles or is Super Admin."""
    def dep(claims: dict = Depends(get_current_user_claims)) -> str:
        role = claims.get("r", ROLE_CITIZEN)
        user_type = claims.get("ut", "citizen")
        sub = claims.get("sub", 0)
        
        # Missing token
        if not sub or sub == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Official login required.",
            )
        # Authenticated citizen trying to access officer action
        if user_type != "officer" or role == ROLE_CITIZEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This action requires an Officer account.",
            )
        
        # Super Admin and Admin have universal access
        if role in (ROLE_SUPER_ADMIN, ROLE_ADMIN, "admin", "national"):
            return role
        
        norm_user_role = normalize_role(role)
        norm_allowed = {normalize_role(a) for a in allowed_roles}
        norm_allowed.update(allowed_roles)

        if role not in norm_allowed and norm_user_role not in norm_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Your role ({role}) is not authorized for this action.",
            )
        return role
    return dep


def require_claims(*allowed_roles: str):
    """Dependency factory checking that the officer has one of the allowed roles and returning claims dict."""
    def dep(claims: dict = Depends(get_current_user_claims)) -> dict:
        role = claims.get("r", ROLE_CITIZEN)
        user_type = claims.get("ut", "citizen")
        sub = claims.get("sub", 0)
        
        if not sub or sub == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Official login required.",
            )
        if user_type != "officer" or role == ROLE_CITIZEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This action requires an Officer account.",
            )
        
        if role in (ROLE_SUPER_ADMIN, ROLE_ADMIN, "admin", "national"):
            return claims
        
        norm_user_role = normalize_role(role)
        norm_allowed = {normalize_role(a) for a in allowed_roles}
        norm_allowed.update(allowed_roles)

        if role not in norm_allowed and norm_user_role not in norm_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Your role ({role}) is not authorized for this action.",
            )
        return claims
    return dep


def require_permission(permission: str):
    """Dependency factory checking for specific permission string."""
    def dep(claims: dict = Depends(get_current_user_claims)) -> dict:
        perms = set(claims.get("perms", []))
        if "*" in perms or permission in perms:
            return claims
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Missing required permission '{permission}'.",
        )
    return dep


class JurisdictionScope:
    """Helper representing an officer's territorial & department boundaries."""
    def __init__(self, claims: dict | str):
        if isinstance(claims, str):
            claims = {"r": claims, "sub": 1, "u": claims, "ut": "officer"}
        elif not isinstance(claims, dict):
            claims = {}
        self.user_id = claims.get("sub", 0)
        self.username = claims.get("u", "")
        self.role = claims.get("r", ROLE_CITIZEN)
        self.user_type = claims.get("ut", "citizen")
        self.is_super_admin = self.role == ROLE_SUPER_ADMIN
        self.is_admin = self.role in (ROLE_SUPER_ADMIN, ROLE_ADMIN, "admin", "national")
        self.country = claims.get("c", "IN")
        self.state = claims.get("st") if not self.is_super_admin and self.role not in (ROLE_ADMIN, "admin", "national") else None
        self.district = claims.get("dist") if self.role in (ROLE_DISTRICT_OFFICER, ROLE_DEPT_OFFICER, ROLE_FIELD_OFFICER, "district", "field_officer") else None
        self.block = claims.get("block") if self.role in (ROLE_FIELD_OFFICER, "field_officer") else None
        self.department = claims.get("dept") if self.role in (ROLE_DEPT_OFFICER, ROLE_FIELD_OFFICER, "field_officer") else None

    def apply_to_query(self, query, area_model_or_field, dept_field=None):
        """Legacy helper for backward compatibility."""
        if self.is_super_admin or self.is_admin:
            return query
        if self.state and hasattr(area_model_or_field, "state"):
            query = query.filter(area_model_or_field.state == self.state)
        if self.district and hasattr(area_model_or_field, "district"):
            query = query.filter(area_model_or_field.district == self.district)
        if self.department and dept_field is not None:
            query = query.filter(dept_field == self.department)
        return query


def apply_jurisdiction_scope(query, claims_or_user: dict, model_class, db: Optional[Session] = None, is_own_only: bool = False):
    """Central Scoping Helper implementing the Visibility Inheritance Rule (Section 2).
    
    - Field Officer: only complaints assigned to them (or matching username).
    - Dept Officer: all complaints/clusters/projects of their department in their district.
    - District Collector: all departments, clusters, projects, and subordinate officers in their district.
    - State Officer: all districts, departments, and subordinate officers in their state.
    - National Admin / Super Admin: nationwide access.
    """
    from sqlalchemy import or_
    from app.models.geo import Area
    from app.models.request import CitizenRequest
    from app.models.cluster import DemandCluster
    from app.models.project import Project
    from app.models.user import User

    scope = JurisdictionScope(claims_or_user)
    if scope.is_super_admin or scope.is_admin:
        return query

    role = normalize_role(scope.role)

    # 1. CitizenRequest scoping
    if model_class is CitizenRequest:
        if role == ROLE_FIELD_OFFICER:
            # Field Officer sees only their assigned complaints
            user_id = scope.user_id
            username = scope.username
            return query.filter(
                or_(
                    CitizenRequest.assigned_field_officer_id == user_id,
                    CitizenRequest.assigned_officer.ilike(f"%{username}%"),
                )
            )

        # Higher officer roles join Area if state or district filter applies
        if scope.state or scope.district:
            query = query.join(Area, CitizenRequest.area_id == Area.id)
            if scope.state:
                query = query.filter(Area.state == scope.state)
            if scope.district:
                query = query.filter(Area.district == scope.district)

        # Department Officer is restricted to their department/category
        if role == ROLE_DEPT_OFFICER and scope.department:
            query = query.filter(CitizenRequest.category == scope.department)

        return query

    # 2. DemandCluster scoping
    if model_class is DemandCluster:
        if scope.state or scope.district:
            query = query.join(Area, DemandCluster.area_id == Area.id)
            if scope.state:
                query = query.filter(Area.state == scope.state)
            if scope.district:
                query = query.filter(Area.district == scope.district)
        if role == ROLE_DEPT_OFFICER and scope.department:
            query = query.filter(DemandCluster.category == scope.department)
        return query

    # 3. Project scoping
    if model_class is Project:
        if scope.state or scope.district:
            query = query.join(Area, Project.area_id == Area.id)
            if scope.state:
                query = query.filter(Area.state == scope.state)
            if scope.district:
                query = query.filter(Area.district == scope.district)
        if role == ROLE_DEPT_OFFICER and scope.department:
            query = query.filter(Project.sector == scope.department)
        return query

    # 4. User scoping
    if model_class is User:
        if scope.state:
            query = query.filter(User.state == scope.state)
        if scope.district:
            query = query.filter(User.district == scope.district)
        if role == ROLE_DEPT_OFFICER and scope.department:
            query = query.filter(User.department == scope.department, User.role == ROLE_FIELD_OFFICER)
        elif role == ROLE_DISTRICT_OFFICER:
            query = query.filter(User.role.in_([ROLE_DEPT_OFFICER, ROLE_FIELD_OFFICER]))
        elif role == ROLE_STATE_OFFICER:
            query = query.filter(User.role.in_([ROLE_DISTRICT_OFFICER, ROLE_DEPT_OFFICER, ROLE_FIELD_OFFICER]))
        return query

    # 5. Area scoping
    if model_class is Area:
        if scope.state:
            query = query.filter(Area.state == scope.state)
        if scope.district:
            query = query.filter(Area.district == scope.district)
        return query

    return query


def verify_resource_in_scope(claims: dict, resource, db: Session) -> bool:
    """Verify that a specific entity instance (CitizenRequest, Project, Cluster, User) is in the officer's jurisdiction."""
    scope = JurisdictionScope(claims)
    if scope.is_super_admin or scope.is_admin:
        return True

    from app.models.geo import Area
    from app.models.request import CitizenRequest
    from app.models.cluster import DemandCluster
    from app.models.project import Project
    from app.models.user import User

    role = normalize_role(scope.role)

    # 1. CitizenRequest verification
    if isinstance(resource, CitizenRequest):
        if role == ROLE_FIELD_OFFICER:
            if resource.assigned_field_officer_id == scope.user_id:
                return True
            if resource.assigned_officer and scope.username.lower() in resource.assigned_officer.lower():
                return True
            raise HTTPException(status_code=403, detail="Access Denied: This complaint is not assigned to you.")

        area = resource.area or (db.get(Area, resource.area_id) if resource.area_id else None)
        if scope.state and area and area.state != scope.state:
            raise HTTPException(status_code=403, detail=f"Access Denied: Complaint state ({area.state}) is outside your jurisdiction ({scope.state}).")
        if scope.district and area and area.district != scope.district:
            raise HTTPException(status_code=403, detail=f"Access Denied: Complaint district ({area.district}) is outside your jurisdiction ({scope.district}).")
        if role == ROLE_DEPT_OFFICER and scope.department and resource.category != scope.department:
            raise HTTPException(status_code=403, detail=f"Access Denied: Complaint sector ({resource.category}) is outside your department ({scope.department}).")
        return True

    # 2. Project verification
    if isinstance(resource, Project):
        area = resource.area or (db.get(Area, resource.area_id) if resource.area_id else None)
        if scope.state and area and area.state != scope.state:
            raise HTTPException(status_code=403, detail="Access Denied: Project is outside your state jurisdiction.")
        if scope.district and area and area.district != scope.district:
            raise HTTPException(status_code=403, detail="Access Denied: Project is outside your district jurisdiction.")
        if role == ROLE_DEPT_OFFICER and scope.department and resource.sector != scope.department:
            raise HTTPException(status_code=403, detail="Access Denied: Project is outside your department jurisdiction.")
        return True

    # 3. User verification
    if isinstance(resource, User):
        if scope.state and resource.state and resource.state != scope.state:
            raise HTTPException(status_code=403, detail="Access Denied: User is outside your state.")
        if scope.district and resource.district and resource.district != scope.district:
            raise HTTPException(status_code=403, detail="Access Denied: User is outside your district.")
        return True

    return True


def login(username: str, password: str) -> dict:
    """Unified login helper for backward compatibility."""
    from app.core.database import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        ensure_default_users(db)
        u = db.query(User).filter_by(username=(username or "").strip().lower()).first()
        if not u or not verify_password(password or "", u.password_hash):
            raise HTTPException(401, "Wrong username or password")
        
        token = issue_token(
            user_id=u.id,
            username=u.username,
            user_type=u.user_type,
            role=u.role,
            name=u.name,
            title=u.title,
            country_code=u.country_code,
            state=u.state,
            district=u.district,
            block=u.block,
            department=u.department,
        )
        return {
            "token": token,
            "user": {
                "username": u.username,
                "role": u.role,
                "user_type": u.user_type,
                "name": u.name,
                "title": u.title,
                "state": u.state,
                "district": u.district,
                "block": u.block,
                "department": u.department,
            }
        }
    finally:
        db.close()


