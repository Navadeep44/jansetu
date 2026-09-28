"""Admin & Super-Admin Management Endpoints.

Provides administrative controls for:
- Viewing and managing all registered Users & Officers
- Creating new Officer accounts with designated roles and territorial/departmental jurisdictions
- Updating officer roles, jurisdictions, and active status
- System-wide RBAC statistics and administrative audit logs
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.request import CitizenRequest, ProofUpload
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin & user management"])


class CreateOfficerIn(BaseModel):
    username: str
    password: str
    name: str
    title: str
    role: str
    user_type: str = "officer"
    country_code: str = "IN"
    state: Optional[str] = None
    district: Optional[str] = None
    department: Optional[str] = None


class UpdateOfficerIn(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    role: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.get("/users")
def list_users(
    user_type: Optional[str] = None,
    role: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    claims: dict = Depends(security.require_officer),
    db: Session = Depends(get_db),
):
    """List officers and users. Super Admin sees all; National Admin sees all officers; State Officer sees within state."""
    actor_role = claims.get("r")
    if actor_role not in (security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, security.ROLE_STATE_OFFICER, "admin", "national"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only Super Admins, Admins, and State Officers can view user directory.",
        )

    q = db.query(User)

    # State officer is constrained to their state
    if actor_role == security.ROLE_STATE_OFFICER and claims.get("st"):
        q = q.filter(User.state == claims.get("st"))

    if user_type:
        q = q.filter(User.user_type == user_type)
    if role:
        q = q.filter(User.role == role)
    if state:
        q = q.filter(User.state == state)
    if district:
        q = q.filter(User.district == district)
    if department:
        q = q.filter(User.department == department)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter((User.name.ilike(s)) | (User.username.ilike(s)) | (User.title.ilike(s)))

    total = q.count()
    users = q.order_by(User.user_type.desc(), User.role, User.name).offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [u.to_dict() for u in users],
    }


@router.post("/users")
def create_officer(
    body: CreateOfficerIn,
    role: str = Depends(security.require(security.ROLE_SUPER_ADMIN, "admin")),
    claims: dict = Depends(security.get_current_user_claims),
    db: Session = Depends(get_db),
):
    """Create a new officer account with specific role and jurisdiction (Super Admin only)."""
    clean_username = body.username.strip().lower()
    if db.query(User).filter_by(username=clean_username).first():
        raise HTTPException(status_code=400, detail="Username already exists.")

    if body.role not in security.ALL_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")

    u = User(
        username=clean_username,
        password_hash=security.hash_password(body.password),
        name=body.name.strip(),
        title=body.title.strip(),
        user_type=body.user_type,
        role=body.role,
        country_code=body.country_code or "IN",
        state=body.state,
        district=body.district,
        department=body.department,
        is_active=True,
    )
    db.add(u)
    db.flush()

    # Record in audit log
    db.add(AuditLog(
        actor_role=claims.get("r", "super_admin"),
        action="create_user_account",
        entity="user",
        entity_id=str(u.id),
        detail={
            "username": u.username,
            "role": u.role,
            "state": u.state,
            "district": u.district,
            "department": u.department,
            "created_by": claims.get("u"),
        },
    ))
    db.commit()
    db.refresh(u)

    return {"message": "User created successfully", "user": u.to_dict()}


@router.put("/users/{user_id}")
def update_officer(
    user_id: int,
    body: UpdateOfficerIn,
    role: str = Depends(security.require(security.ROLE_SUPER_ADMIN, "admin")),
    claims: dict = Depends(security.get_current_user_claims),
    db: Session = Depends(get_db),
):
    """Update officer role, jurisdiction or active status (Super Admin only)."""
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        u.name = body.name.strip()
    if body.title is not None:
        u.title = body.title.strip()
    if body.role is not None and body.role in security.ALL_ROLES:
        u.role = body.role
    if body.state is not None:
        u.state = body.state
    if body.district is not None:
        u.district = body.district
    if body.department is not None:
        u.department = body.department
    if body.is_active is not None:
        u.is_active = body.is_active
    if body.password:
        u.password_hash = security.hash_password(body.password)

    u.updated_at = datetime.utcnow()

    db.add(AuditLog(
        actor_role=claims.get("r", "super_admin"),
        action="update_user_account",
        entity="user",
        entity_id=str(u.id),
        detail={"updated_fields": list(body.dict(exclude_unset=True).keys()), "updated_by": claims.get("u")},
    ))
    db.commit()
    return {"message": "User updated successfully", "user": u.to_dict()}


@router.delete("/users/{user_id}")
def delete_officer(
    user_id: int,
    role: str = Depends(security.require(security.ROLE_SUPER_ADMIN)),
    claims: dict = Depends(security.get_current_user_claims),
    db: Session = Depends(get_db),
):
    """Deactivate or remove officer account (Super Admin only)."""
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if u.username == "superadmin":
        raise HTTPException(status_code=400, detail="Cannot delete master Super Admin account.")

    u.is_active = False
    db.add(AuditLog(
        actor_role=claims.get("r", "super_admin"),
        action="deactivate_user_account",
        entity="user",
        entity_id=str(u.id),
        detail={"username": u.username, "deleted_by": claims.get("u")},
    ))
    db.commit()
    return {"message": f"User {u.username} deactivated."}


@router.get("/stats")
def get_admin_stats(
    role: str = Depends(security.require(security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, "admin")),
    db: Session = Depends(get_db),
):
    """Get system-wide RBAC, officer coverage, and grievance redressal metrics."""
    officer_count = db.query(User).filter_by(user_type="officer", is_active=True).count()
    citizen_count = db.query(User).filter_by(user_type="citizen").count()

    roles_breakdown = (
        db.query(User.role, func.count(User.id))
        .filter(User.is_active.is_(True))
        .group_by(User.role)
        .all()
    )

    states_covered = db.query(func.count(func.distinct(User.state))).filter(User.state.isnot(None)).scalar() or 0
    districts_covered = db.query(func.count(func.distinct(User.district))).filter(User.district.isnot(None)).scalar() or 0
    total_proofs = db.query(ProofUpload).count()

    return {
        "total_officers": officer_count,
        "total_citizens": citizen_count,
        "states_covered": states_covered,
        "districts_covered": districts_covered,
        "total_proofs_verified": total_proofs,
        "roles_distribution": {r: count for r, count in roles_breakdown},
    }
