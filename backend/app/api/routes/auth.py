"""Authentication Endpoints for JanSetu RBAC System.

Provides separate endpoints and workflows for:
- Citizen Login & Registration (accessible without administrative privileges)
- Officer Login with Role & Jurisdiction selection and validation
- Session introspection (/api/auth/me)
- Demo accounts directory grouped by Citizen and Officer roles
- Available roles and administrative jurisdictions directory
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import get_db
from app.models.geo import Area
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth & rbac"])


# Request / Response Schemas
class CitizenLoginIn(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    demo_user: Optional[str] = None


class CitizenRegisterIn(BaseModel):
    name: str
    phone: str
    state: Optional[str] = "Delhi"
    district: Optional[str] = "South Delhi"
    password: Optional[str] = "citizen123"


class OfficerLoginIn(BaseModel):
    username: str
    password: str
    selected_role: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    department: Optional[str] = None


class LegacyLoginIn(BaseModel):
    username: str
    password: str


@router.on_event("startup")
def startup_users_init():
    """Ensure database has default seed users on startup."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        security.ensure_default_users(db)
    finally:
        db.close()


@router.post("/citizen/login")
def citizen_login(body: CitizenLoginIn, db: Session = Depends(get_db)):
    """Authenticate citizen using phone number, username/password, or quick demo login."""
    security.ensure_default_users(db)

    # 1. Quick demo login
    if body.demo_user:
        u = db.query(User).filter_by(username=body.demo_user.strip().lower(), user_type="citizen").first()
        if u:
            token = security.issue_token(
                user_id=u.id,
                username=u.username,
                user_type=u.user_type,
                role=u.role,
                name=u.name,
                title=u.title or "Citizen",
                country_code=u.country_code,
                state=u.state,
                district=u.district,
                department=u.department,
            )
            return {"token": token, "user": u.to_dict()}

    # 2. Phone number based authentication (or auto-create citizen session)
    if body.phone and not body.username:
        phone_clean = body.phone.strip()
        u = db.query(User).filter_by(phone=phone_clean).first()
        if not u:
            # Create a lightweight citizen account for this phone
            u = User(
                username=f"citizen_{phone_clean.replace('+', '').replace(' ', '')[-8:]}",
                password_hash=security.hash_password("citizen123"),
                phone=phone_clean,
                name=f"Citizen ({phone_clean[-4:]})",
                title="Registered Citizen",
                user_type="citizen",
                role=security.ROLE_CITIZEN,
                country_code="IN",
                is_active=True,
            )
            db.add(u)
            db.commit()
            db.refresh(u)

        token = security.issue_token(
            user_id=u.id,
            username=u.username,
            user_type=u.user_type,
            role=u.role,
            name=u.name,
            title=u.title,
            country_code=u.country_code,
            state=u.state,
            district=u.district,
        )
        return {"token": token, "user": u.to_dict()}

    # 3. Username + Password authentication
    if body.username:
        u = db.query(User).filter_by(username=body.username.strip().lower()).first()
        if not u or not security.verify_password(body.password or "", u.password_hash):
            raise HTTPException(status_code=401, detail="Invalid citizen credentials")
        if u.user_type != "citizen":
            raise HTTPException(
                status_code=403,
                detail="This account is an Officer account. Please use Officer Login.",
            )
        token = security.issue_token(
            user_id=u.id,
            username=u.username,
            user_type=u.user_type,
            role=u.role,
            name=u.name,
            title=u.title,
            country_code=u.country_code,
            state=u.state,
            district=u.district,
        )
        return {"token": token, "user": u.to_dict()}

    raise HTTPException(status_code=400, detail="Provide username & password or phone number.")


@router.post("/citizen/register")
def citizen_register(body: CitizenRegisterIn, db: Session = Depends(get_db)):
    """Register a new citizen account."""
    clean_phone = body.phone.strip()
    if len(clean_phone) < 6:
        raise HTTPException(status_code=400, detail="Invalid phone number.")

    existing = db.query(User).filter_by(phone=clean_phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="A citizen account with this phone number already exists.")

    username = f"citizen_{clean_phone.replace('+', '').replace(' ', '')[-8:]}_{int(datetime.utcnow().timestamp()) % 1000}"
    u = User(
        username=username,
        password_hash=security.hash_password(body.password or "citizen123"),
        phone=clean_phone,
        name=body.name.strip(),
        title=f"Resident, {body.district or 'India'}",
        user_type="citizen",
        role=security.ROLE_CITIZEN,
        country_code="IN",
        state=body.state,
        district=body.district,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    token = security.issue_token(
        user_id=u.id,
        username=u.username,
        user_type=u.user_type,
        role=u.role,
        name=u.name,
        title=u.title,
        country_code=u.country_code,
        state=u.state,
        district=u.district,
    )
    return {"token": token, "user": u.to_dict(), "message": "Citizen account registered successfully."}


@router.post("/officer/login")
def officer_login(body: OfficerLoginIn, db: Session = Depends(get_db)):
    """Authenticate government official with role & jurisdiction verification."""
    security.ensure_default_users(db)
    username = (body.username or "").strip().lower()
    u = db.query(User).filter_by(username=username).first()

    if not u or not security.verify_password(body.password or "", u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid officer username or password.")

    if u.user_type != "officer":
        raise HTTPException(
            status_code=403,
            detail="Access Denied: This is a Citizen account. Please use Citizen Login.",
        )

    if not u.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated. Contact the Super Administrator.",
        )

    # If the officer selected a specific role during login, verify or adapt jurisdiction
    effective_role = u.role
    effective_state = u.state
    effective_district = u.district
    effective_department = u.department

    # Super Admin can switch / simulate any subordinate officer role/jurisdiction
    effective_block = u.block
    if u.role == security.ROLE_SUPER_ADMIN and body.selected_role and body.selected_role in security.OFFICER_ROLES:
        effective_role = body.selected_role
        effective_state = body.state or u.state
        effective_district = body.district or u.district
        effective_block = body.block or u.block
        effective_department = body.department or u.department

    token = security.issue_token(
        user_id=u.id,
        username=u.username,
        user_type=u.user_type,
        role=effective_role,
        name=u.name,
        title=u.title,
        country_code=u.country_code,
        state=effective_state,
        district=effective_district,
        block=effective_block,
        department=effective_department,
    )

    user_data = u.to_dict()
    user_data["role"] = effective_role
    user_data["state"] = effective_state
    user_data["district"] = effective_district
    user_data["block"] = effective_block
    user_data["department"] = effective_department
    user_data["permissions"] = list(security.ROLE_PERMISSIONS.get(effective_role, set()))

    return {"token": token, "user": user_data}


@router.post("/login")
def legacy_login(body: LegacyLoginIn, db: Session = Depends(get_db)):
    """Unified login for backward compatibility."""
    security.ensure_default_users(db)
    username = (body.username or "").strip().lower()
    u = db.query(User).filter_by(username=username).first()

    if not u or not security.verify_password(body.password or "", u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = security.issue_token(
        user_id=u.id,
        username=u.username,
        user_type=u.user_type,
        role=u.role,
        name=u.name,
        title=u.title,
        country_code=u.country_code,
        state=u.state,
        district=u.district,
        department=u.department,
    )
    user_data = u.to_dict()
    user_data["permissions"] = list(security.ROLE_PERMISSIONS.get(u.role, set()))
    return {"token": token, "user": user_data}


@router.get("/me")
def get_my_session(claims: dict = Depends(security.get_current_user_claims), db: Session = Depends(get_db)):
    """Return session claims and profile for the authenticated user/officer."""
    user_id = claims.get("sub", 0)
    user_obj = db.get(User, user_id) if user_id else None
    
    return {
        "authenticated": claims.get("r") != security.ROLE_CITIZEN or claims.get("sub", 0) > 0,
        "user_id": claims.get("sub"),
        "username": claims.get("u"),
        "user_type": claims.get("ut", "citizen"),
        "role": claims.get("r", security.ROLE_CITIZEN),
        "name": claims.get("n", "Citizen"),
        "title": claims.get("t", ""),
        "country_code": claims.get("c", "IN"),
        "state": claims.get("st"),
        "district": claims.get("dist"),
        "department": claims.get("dept"),
        "permissions": claims.get("perms", []),
        "is_active": user_obj.is_active if user_obj else True,
    }


@router.get("/demo-accounts")
def list_demo_accounts(db: Session = Depends(get_db)):
    """List all pre-configured demo accounts categorized by Citizen and Officer roles."""
    security.ensure_default_users(db)
    return {
        "citizens": security.DEMO_CITIZENS,
        "officers": security.DEMO_OFFICERS,
    }


@router.get("/roles-jurisdictions")
def get_roles_and_jurisdictions(db: Session = Depends(get_db)):
    """Return available officer roles, states, districts, and departments for role selection."""
    areas = db.query(Area).filter_by(country_code="IN").all()
    states_dict = {}
    for a in areas:
        if a.state not in states_dict:
            states_dict[a.state] = set()
        if a.district:
            states_dict[a.state].add(a.district)

    states_tree = [{"state": st, "districts": sorted(list(dist_set))} for st, dist_set in states_dict.items()]

    roles = [
        {
            "role": security.ROLE_SUPER_ADMIN,
            "label": "Super Admin (National Master)",
            "description": "Full unrestricted access across all states, departments, officers, users, and audit logs.",
            "requires_state": False,
            "requires_district": False,
            "requires_department": False,
        },
        {
            "role": security.ROLE_ADMIN,
            "label": "National Admin / Planner",
            "description": "National level planning, cross-state policy briefs, budget optimizer, and BRICS analytics.",
            "requires_state": False,
            "requires_district": False,
            "requires_department": False,
        },
        {
            "role": security.ROLE_STATE_OFFICER,
            "label": "State Grievance Officer",
            "description": "Jurisdiction scoped to an entire State. Manages state priorities, districts, and inter-district needs.",
            "requires_state": True,
            "requires_district": False,
            "requires_department": False,
        },
        {
            "role": security.ROLE_DISTRICT_OFFICER,
            "label": "District Collector / Magistrate",
            "description": "Jurisdiction scoped to a District. Approves projects, monitors district grievance resolution, allocates local budget.",
            "requires_state": True,
            "requires_district": True,
            "requires_department": False,
        },
        {
            "role": security.ROLE_DEPT_OFFICER,
            "label": "Department Officer (e.g. Water, PWD)",
            "description": "Jurisdiction scoped to a specific Department. Manages sector complaints and assigns to field staff.",
            "requires_state": True,
            "requires_district": False,
            "requires_department": True,
        },
        {
            "role": security.ROLE_FIELD_OFFICER,
            "label": "Field Redressal Officer / Engineer",
            "description": "Ground-level resolution officer. Uploads geo-tagged photos and resolution proof to close complaints.",
            "requires_state": True,
            "requires_district": True,
            "requires_department": True,
        },
    ]

    departments = [
        {"id": "water", "label": "Drinking Water & Sanitation (JJM)"},
        {"id": "roads", "label": "Public Works / Roads & Bridges (PWD)"},
        {"id": "electricity", "label": "Power & Electricity Discom"},
        {"id": "health", "label": "Public Health & Primary Health Centers"},
        {"id": "sanitation", "label": "Urban Local Body / Solid Waste Management"},
        {"id": "education", "label": "School Education & Infrastructure"},
    ]

    return {
        "roles": roles,
        "states_and_districts": states_tree,
        "departments": departments,
    }
