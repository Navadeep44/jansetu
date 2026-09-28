"""Officer Routes for JanSetu 5-Tier Hierarchical RBAC & Dashboard System.

Implements:
1. Role-specific Dashboard KPIs & Queue Aggregators (/api/officer/dashboard)
2. Comparison views: /departments (District+), /districts (State+), /states (National)
3. Team & Subordinate Performance (/api/officer/team)
4. Complaint Workflow:
   - /requests/{id}/assign (Dept Officer)
   - /requests/{id}/escalate (Field Officer)
   - /requests/{id}/proof/review (Dept Officer: accept or rework)
   - /requests/{id}/reassign-department (District Collector)
5. Project Pipeline & Budget Tracking:
   - /projects/propose (Dept Officer)
   - /projects/{id}/approve (District / State Officer)
   - /projects/{id}/reject (District / State / National)
   - /projects/{id}/fund (National Admin)
   - /projects/{id}/expenditure (District Collector)
   - /projects/{id}/complete (District Collector)
   - /budget/summary (Scoped budget roll-up)
6. Subordinate Account Management (/api/officer/accounts)
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import DEFAULT_SLA_HOURS, settings
from app.core.database import get_db
from app.core.i18n import t
from app.models import (
    Area, AuditLog, CitizenRequest, DemandCluster,
    Project, ProjectExpenditure, ProjectFunding, ProjectHistory,
    ProofUpload, StatusHistory, User
)
from app.schemas.serializers import (
    cluster_out, iso, project_out, proof_out, request_out, status_history_out
)
from app.services import analytics_cache, pipeline

router = APIRouter(tags=["officer dashboards & pipeline"])


# Request Schemas
class AssignFieldOfficerIn(BaseModel):
    field_officer_id: Optional[int] = None
    officer_name: Optional[str] = None
    department: Optional[str] = None
    note: Optional[str] = None


class SubmitProofIn(BaseModel):
    proof_photo_url: Optional[str] = None
    proof_notes: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    file_url: Optional[str] = None
    note: Optional[str] = ""
    proofs: Optional[list] = None


class EscalateIn(BaseModel):
    reason: str = Field(..., min_length=5)


class ProofReviewIn(BaseModel):
    decision: Optional[str] = None
    action: Optional[str] = None
    note: Optional[str] = None


class ReassignDeptIn(BaseModel):
    new_department: str
    note: str = Field(..., min_length=5)


class ProposeProjectIn(BaseModel):
    cluster_id: Optional[int] = None
    area_id: Optional[int] = None
    sector: Optional[str] = "roads"
    title: str = Field(..., min_length=5)
    description: Optional[str] = ""
    estimated_cost_inr: Optional[float] = None
    cost_inr: Optional[float] = None
    beneficiaries: Optional[int] = 0
    scheme: Optional[str] = ""
    sdg: Optional[str] = ""


class ProjectDecisionIn(BaseModel):
    note: Optional[str] = ""
    reason: Optional[str] = ""


class ProjectRejectIn(BaseModel):
    reason: str = Field(..., min_length=5)


class FundProjectIn(BaseModel):
    sanctioned_amount_inr: float = Field(..., gt=0)
    change_reason: Optional[str] = None


class RecordExpenditureIn(BaseModel):
    amount_inr: float = Field(..., gt=0)
    description: str = Field(..., min_length=3)
    spent_on: str  # YYYY-MM-DD
    bill_reference: Optional[str] = None


class CreateSubordinateOfficerIn(BaseModel):
    username: str
    password: str
    name: str
    title: Optional[str] = ""
    role: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    department: Optional[str] = None


# Helper calculation for resolution hours
def _avg_resolution_hours(requests_list: list[CitizenRequest]) -> float:
    resolved_times = []
    for r in requests_list:
        end_time = r.resolved_at or r.closed_at
        if end_time and r.created_at:
            hrs = (end_time - r.created_at).total_seconds() / 3600.0
            if hrs >= 0:
                resolved_times.append(hrs)
    return round(sum(resolved_times) / len(resolved_times), 1) if resolved_times else 0.0


# ---------------------------------------------------------------------------
# 1. Unified Dashboard Endpoint (/api/officer/dashboard)
# ---------------------------------------------------------------------------
@router.get("/officer/dashboard")
def get_officer_dashboard(
    claims: dict = Depends(security.require_officer),
    db: Session = Depends(get_db),
):
    """Returns role-specific, jurisdiction-scoped KPIs and queues."""
    role = security.normalize_role(claims.get("r", security.ROLE_CITIZEN))
    scope = security.JurisdictionScope(claims)
    now = datetime.utcnow()

    # Query scoped requests
    base_q = security.apply_jurisdiction_scope(db.query(CitizenRequest), claims, CitizenRequest, db)
    reqs = base_q.all()

    total = len(reqs)
    resolved_items = [r for r in reqs if r.status in ("closed", "closed_verified", "resolved_pending_verification")]
    resolved_count = len(resolved_items)
    pending_items = [r for r in reqs if r.status not in ("closed", "closed_verified", "resolved_pending_verification")]
    pending_count = len(pending_items)

    overdue_items = [r for r in pending_items if r.sla_due_at and r.sla_due_at < now]
    overdue_count = len(overdue_items)

    reopened_items = [r for r in reqs if r.status == "reopened" or r.closure_flag == "citizen_disputed"]
    reopened_count = len(reopened_items)
    reopen_rate = round((reopened_count / total * 100), 1) if total > 0 else 0.0

    avg_hrs = _avg_resolution_hours(resolved_items)

    citizen_confirmed = [r for r in reqs if r.status == "closed_verified" or r.citizen_verified is True]
    confirmation_rate = round((len(citizen_confirmed) / resolved_count * 100), 1) if resolved_count > 0 else 0.0

    # 1. FIELD OFFICER DASHBOARD
    if role == security.ROLE_FIELD_OFFICER:
        # Sorted by SLA due date asc, then severity desc
        def sort_key(r):
            sla_val = r.sla_due_at.isoformat() if r.sla_due_at else "9999-12-31"
            return (sla_val, -r.severity)

        sorted_inbox = sorted(reqs, key=sort_key)
        
        return {
            "role": role,
            "designation": claims.get("t") or "Field Redressal Officer",
            "jurisdiction_label": f"{scope.block or ''}, {scope.district or ''}, {scope.state or ''}".strip(", "),
            "kpis": {
                "assigned": total,
                "resolved": resolved_count,
                "pending": pending_count,
                "overdue": overdue_count,
                "reopened": reopened_count,
                "avg_resolution_hours": avg_hrs,
            },
            "inbox": [request_out(r, full=True) for r in sorted_inbox],
        }

    # 2. DEPARTMENT OFFICER DASHBOARD
    if role == security.ROLE_DEPT_OFFICER:
        unassigned = [r for r in reqs if not r.assigned_field_officer_id and r.status in ("received", "needs_review", "clustered")]
        escalated = [r for r in reqs if r.escalated]
        proof_review_queue = [r for r in reqs if r.status == "resolved_pending_verification" and r.proof_count and r.proof_count > 0]

        # Scoped clusters
        clusters_q = security.apply_jurisdiction_scope(db.query(DemandCluster), claims, DemandCluster, db)
        clusters = clusters_q.filter(DemandCluster.status == "open").all()

        # Scoped proposals
        proj_q = security.apply_jurisdiction_scope(db.query(Project), claims, Project, db)
        proposals = proj_q.all()

        return {
            "role": role,
            "designation": claims.get("t") or "Department Officer",
            "department": scope.department,
            "jurisdiction_label": f"{scope.department.upper() if scope.department else ''} · {scope.district}, {scope.state}",
            "kpis": {
                "total": total,
                "resolved": resolved_count,
                "pending": pending_count,
                "overdue": overdue_count,
                "reopen_rate": reopen_rate,
                "avg_resolution_hours": avg_hrs,
                "proof_reviews_pending": len(proof_review_queue),
            },
            "unassigned_queue": [request_out(r) for r in unassigned],
            "escalated_queue": [request_out(r) for r in escalated],
            "overdue_queue": [request_out(r) for r in overdue_items],
            "proof_review_queue": [request_out(r, full=True) for r in proof_review_queue],
            "clusters": [cluster_out(c) for c in clusters],
            "proposals": [project_out(p) for p in proposals],
        }

    # 3. DISTRICT COLLECTOR DASHBOARD
    if role == security.ROLE_DISTRICT_OFFICER:
        escalated_and_overdue = [r for r in reqs if (r.escalated or (r.sla_due_at and r.sla_due_at < now and r.status not in ("closed", "closed_verified")))]
        
        # Scoped projects for approval and budget
        proj_q = security.apply_jurisdiction_scope(db.query(Project), claims, Project, db)
        projects_list = proj_q.all()

        # Department performance summaries
        dept_breakdown = {}
        for r in reqs:
            dept = r.category or "other"
            if dept not in dept_breakdown:
                dept_breakdown[dept] = {"total": 0, "resolved": 0, "pending": 0, "overdue": 0, "reopened": 0}
            dept_breakdown[dept]["total"] += 1
            if r.status in ("closed", "closed_verified", "resolved_pending_verification"):
                dept_breakdown[dept]["resolved"] += 1
            else:
                dept_breakdown[dept]["pending"] += 1
                if r.sla_due_at and r.sla_due_at < now:
                    dept_breakdown[dept]["overdue"] += 1
            if r.status == "reopened":
                dept_breakdown[dept]["reopened"] += 1

        dept_summary = []
        for dept, stats in dept_breakdown.items():
            tot = stats["total"]
            dept_summary.append({
                "department": dept,
                "total": tot,
                "resolved": stats["resolved"],
                "pending": stats["pending"],
                "overdue": stats["overdue"],
                "reopen_rate": round(stats["reopened"] / tot * 100, 1) if tot > 0 else 0.0,
            })

        return {
            "role": role,
            "designation": claims.get("t") or "District Collector & Magistrate",
            "jurisdiction_label": f"{scope.district}, {scope.state}",
            "kpis": {
                "total": total,
                "resolved": resolved_count,
                "pending": pending_count,
                "overdue": overdue_count,
                "reopen_rate": reopen_rate,
                "avg_resolution_hours": avg_hrs,
                "citizen_confirmation_rate": confirmation_rate,
            },
            "departments_summary": dept_summary,
            "escalated_and_overdue": [request_out(r) for r in escalated_and_overdue],
            "pending_approvals": [project_out(p) for p in projects_list if p.status == "proposed"],
            "funded_projects": [project_out(p) for p in projects_list if p.status in ("funded", "in_execution", "completed")],
        }

    # 4. STATE OFFICER DASHBOARD
    if role == security.ROLE_STATE_OFFICER:
        proj_q = security.apply_jurisdiction_scope(db.query(Project), claims, Project, db)
        state_projects = proj_q.all()

        # District performance summaries
        district_breakdown = {}
        for r in reqs:
            dist = r.area.district if r.area else "Unknown"
            if dist not in district_breakdown:
                district_breakdown[dist] = {"total": 0, "resolved": 0, "pending": 0, "overdue": 0, "reopened": 0, "confirmed": 0}
            district_breakdown[dist]["total"] += 1
            if r.status in ("closed", "closed_verified", "resolved_pending_verification"):
                district_breakdown[dist]["resolved"] += 1
            else:
                district_breakdown[dist]["pending"] += 1
                if r.sla_due_at and r.sla_due_at < now:
                    district_breakdown[dist]["overdue"] += 1
            if r.status == "reopened":
                district_breakdown[dist]["reopened"] += 1
            if r.status == "closed_verified" or r.citizen_verified is True:
                district_breakdown[dist]["confirmed"] += 1

        districts_summary = []
        for dist, stats in district_breakdown.items():
            tot = stats["total"]
            res = stats["resolved"]
            districts_summary.append({
                "district": dist,
                "total": tot,
                "resolved": res,
                "pending": stats["pending"],
                "overdue": stats["overdue"],
                "reopen_rate": round(stats["reopened"] / tot * 100, 1) if tot > 0 else 0.0,
                "confirmation_rate": round(stats["confirmed"] / res * 100, 1) if res > 0 else 0.0,
            })

        return {
            "role": role,
            "designation": claims.get("t") or "State Grievance Commissioner",
            "jurisdiction_label": f"Govt of {scope.state}",
            "kpis": {
                "total": total,
                "resolved": resolved_count,
                "pending": pending_count,
                "overdue": overdue_count,
                "reopen_rate": reopen_rate,
                "avg_resolution_hours": avg_hrs,
                "citizen_confirmation_rate": confirmation_rate,
            },
            "districts_summary": districts_summary,
            "pending_approvals": [project_out(p) for p in state_projects if p.status == "district_approved"],
            "pipeline_projects": [project_out(p) for p in state_projects],
        }

    # 5. NATIONAL ADMIN DASHBOARD
    proj_q = db.query(Project).all()
    state_breakdown = {}
    for r in reqs:
        st = r.area.state if r.area else "Unknown"
        if st not in state_breakdown:
            state_breakdown[st] = {"total": 0, "resolved": 0, "pending": 0, "overdue": 0}
        state_breakdown[st]["total"] += 1
        if r.status in ("closed", "closed_verified", "resolved_pending_verification"):
            state_breakdown[st]["resolved"] += 1
        else:
            state_breakdown[st]["pending"] += 1
            if r.sla_due_at and r.sla_due_at < now:
                state_breakdown[st]["overdue"] += 1

    states_summary = []
    for st, stats in state_breakdown.items():
        states_summary.append({
            "state": st,
            "total": stats["total"],
            "resolved": stats["resolved"],
            "pending": stats["pending"],
            "overdue": stats["overdue"],
        })

    return {
        "role": role,
        "designation": claims.get("t") or "National Admin / Planner",
        "jurisdiction_label": "All India (National)",
        "kpis": {
            "total": total,
            "resolved": resolved_count,
            "pending": pending_count,
            "overdue": overdue_count,
            "reopen_rate": reopen_rate,
            "avg_resolution_hours": avg_hrs,
            "citizen_confirmation_rate": confirmation_rate,
        },
        "states_summary": states_summary,
        "awaiting_funding": [project_out(p) for p in proj_q if p.status == "state_approved"],
        "pipeline_projects": [project_out(p) for p in proj_q],
    }


# ---------------------------------------------------------------------------
# 2. Comparison Endpoints (/departments, /districts, /states)
# ---------------------------------------------------------------------------
@router.get("/officer/departments")
def get_departments_comparison(
    claims: dict = Depends(security.require_claims(security.ROLE_DISTRICT_OFFICER, security.ROLE_STATE_OFFICER, security.ROLE_ADMIN, security.ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """District+: comparison table of departments within the officer's jurisdiction."""
    scope = security.JurisdictionScope(claims)
    base_q = security.apply_jurisdiction_scope(db.query(CitizenRequest), claims, CitizenRequest, db)
    reqs = base_q.all()
    now = datetime.utcnow()

    dept_stats = {}
    for r in reqs:
        dept = r.category or "other"
        if dept not in dept_stats:
            dept_stats[dept] = {"total": 0, "resolved": 0, "pending": 0, "overdue": 0, "reopened": 0, "resolution_hrs": []}
        dept_stats[dept]["total"] += 1
        if r.status in ("closed", "closed_verified", "resolved_pending_verification"):
            dept_stats[dept]["resolved"] += 1
            end_t = r.resolved_at or r.closed_at
            if end_t and r.created_at:
                dept_stats[dept]["resolution_hrs"].append((end_t - r.created_at).total_seconds() / 3600.0)
        else:
            dept_stats[dept]["pending"] += 1
            if r.sla_due_at and r.sla_due_at < now:
                dept_stats[dept]["overdue"] += 1
        if r.status == "reopened":
            dept_stats[dept]["reopened"] += 1

    result = []
    for dept, s in dept_stats.items():
        tot = s["total"]
        hrs_list = s["resolution_hrs"]
        avg_h = round(sum(hrs_list) / len(hrs_list), 1) if hrs_list else 0.0
        result.append({
            "department": dept,
            "total": tot,
            "resolved": s["resolved"],
            "pending": s["pending"],
            "overdue": s["overdue"],
            "reopen_rate": round(s["reopened"] / tot * 100, 1) if tot > 0 else 0.0,
            "avg_resolution_hours": avg_h,
        })
    return {"departments": sorted(result, key=lambda x: -x["total"])}


@router.get("/officer/districts")
def get_districts_comparison(
    claims: dict = Depends(security.require_claims(security.ROLE_STATE_OFFICER, security.ROLE_ADMIN, security.ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """State+: leaderboard & comparison of districts within state or nation."""
    base_q = security.apply_jurisdiction_scope(db.query(CitizenRequest), claims, CitizenRequest, db)
    reqs = base_q.all()
    now = datetime.utcnow()

    dist_stats = {}
    for r in reqs:
        dist = r.area.district if r.area else "Unknown"
        state = r.area.state if r.area else ""
        key = (state, dist)
        if key not in dist_stats:
            dist_stats[key] = {"total": 0, "resolved": 0, "pending": 0, "overdue": 0, "reopened": 0, "confirmed": 0, "resolution_hrs": []}
        dist_stats[key]["total"] += 1
        if r.status in ("closed", "closed_verified", "resolved_pending_verification"):
            dist_stats[key]["resolved"] += 1
            end_t = r.resolved_at or r.closed_at
            if end_t and r.created_at:
                dist_stats[key]["resolution_hrs"].append((end_t - r.created_at).total_seconds() / 3600.0)
        else:
            dist_stats[key]["pending"] += 1
            if r.sla_due_at and r.sla_due_at < now:
                dist_stats[key]["overdue"] += 1
        if r.status == "reopened":
            dist_stats[key]["reopened"] += 1
        if r.status == "closed_verified" or r.citizen_verified is True:
            dist_stats[key]["confirmed"] += 1

    result = []
    for (state, dist), s in dist_stats.items():
        tot = s["total"]
        res = s["resolved"]
        hrs_list = s["resolution_hrs"]
        avg_h = round(sum(hrs_list) / len(hrs_list), 1) if hrs_list else 0.0
        result.append({
            "state": state,
            "district": dist,
            "total": tot,
            "resolved": res,
            "pending": s["pending"],
            "overdue": s["overdue"],
            "reopen_rate": round(s["reopened"] / tot * 100, 1) if tot > 0 else 0.0,
            "citizen_confirmation_rate": round(s["confirmed"] / res * 100, 1) if res > 0 else 0.0,
            "avg_resolution_hours": avg_h,
        })
    return {"districts": sorted(result, key=lambda x: -x["total"])}


@router.get("/officer/states")
def get_states_comparison(
    claims: dict = Depends(security.require_claims(security.ROLE_ADMIN, security.ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """National: leaderboard and comparison of all states in India."""
    reqs = db.query(CitizenRequest).all()
    now = datetime.utcnow()

    st_stats = {}
    for r in reqs:
        state = r.area.state if r.area else "Unknown"
        if state not in st_stats:
            st_stats[state] = {"total": 0, "resolved": 0, "pending": 0, "overdue": 0, "reopened": 0}
        st_stats[state]["total"] += 1
        if r.status in ("closed", "closed_verified", "resolved_pending_verification"):
            st_stats[state]["resolved"] += 1
        else:
            st_stats[state]["pending"] += 1
            if r.sla_due_at and r.sla_due_at < now:
                st_stats[state]["overdue"] += 1
        if r.status == "reopened":
            st_stats[state]["reopened"] += 1

    result = []
    for state, s in st_stats.items():
        tot = s["total"]
        result.append({
            "state": state,
            "total": tot,
            "resolved": s["resolved"],
            "pending": s["pending"],
            "overdue": s["overdue"],
            "reopen_rate": round(s["reopened"] / tot * 100, 1) if tot > 0 else 0.0,
        })
    return {"states": sorted(result, key=lambda x: -x["total"])}


# ---------------------------------------------------------------------------
# 3. Team & Subordinates Management (/api/officer/team)
# ---------------------------------------------------------------------------
@router.get("/officer/team")
def get_officer_team(
    claims: dict = Depends(security.require_officer),
    db: Session = Depends(get_db),
):
    """Returns field officers (Dept Officer) or subordinate officers (District/State/National)."""
    role = security.normalize_role(claims.get("r"))
    scope = security.JurisdictionScope(claims)
    now = datetime.utcnow()

    users_q = security.apply_jurisdiction_scope(db.query(User), claims, User, db)
    officers = users_q.filter(User.is_active == True).all()

    # Pre-aggregate complaint metrics per field officer
    reqs = security.apply_jurisdiction_scope(db.query(CitizenRequest), claims, CitizenRequest, db).all()

    team_data = []
    for o in officers:
        assigned_reqs = [r for r in reqs if r.assigned_field_officer_id == o.id or (r.assigned_officer and o.username.lower() in r.assigned_officer.lower())]
        tot = len(assigned_reqs)
        resolved = [r for r in assigned_reqs if r.status in ("closed", "closed_verified", "resolved_pending_verification")]
        pending = [r for r in assigned_reqs if r.status not in ("closed", "closed_verified", "resolved_pending_verification")]
        overdue = [r for r in pending if r.sla_due_at and r.sla_due_at < now]
        reopened = [r for r in assigned_reqs if r.status == "reopened"]
        avg_h = _avg_resolution_hours(resolved)

        team_data.append({
            "id": o.id,
            "username": o.username,
            "name": o.name,
            "title": o.title,
            "role": o.role,
            "state": o.state,
            "district": o.district,
            "block": o.block,
            "department": o.department,
            "assigned_count": tot,
            "open_workload": len(pending),
            "resolved_count": len(resolved),
            "overdue_count": len(overdue),
            "reopen_rate": round(len(reopened) / tot * 100, 1) if tot > 0 else 0.0,
            "avg_resolution_hours": avg_h,
        })

    return {"team": team_data}


# ---------------------------------------------------------------------------
# 4. Complaint Action Endpoints
# ---------------------------------------------------------------------------
@router.post("/requests/{request_id}/assign")
def assign_to_field_officer(
    request_id: int,
    body: AssignFieldOfficerIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DEPT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, security.ROLE_DISTRICT_OFFICER, "admin", "national", "district")),
    db: Session = Depends(get_db),
):
    """Dept Officer assigns or reassigns complaint to a field officer in the same district and department."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    security.verify_resource_in_scope(claims, r, db)

    now = datetime.utcnow()
    sla_hrs = DEFAULT_SLA_HOURS.get(r.severity, 168)

    if body.field_officer_id:
        fo = db.get(User, body.field_officer_id)
        if not fo or not fo.is_active or fo.role != security.ROLE_FIELD_OFFICER:
            raise HTTPException(400, "Invalid field officer selected.")

        scope = security.JurisdictionScope(claims)
        if not scope.is_super_admin and not scope.is_admin:
            if fo.district != scope.district or fo.department != scope.department:
                raise HTTPException(403, "Field officer must belong to your district and department.")

        r.assigned_field_officer_id = fo.id
        r.assigned_officer = fo.name
        r.assigned_department = fo.department
        off_name = fo.name
        dept_name = fo.department
    else:
        off_name = body.officer_name or "Assigned Officer"
        dept_name = body.department or pipeline.get_department_for_sector(r.category)
        r.assigned_officer = off_name
        r.assigned_department = dept_name

    r.assigned_at = now
    r.sla_due_at = now + timedelta(hours=sla_hrs)
    r.status = "assigned"

    note_text = body.note or f"Assigned to {off_name} ({dept_name}) for on-ground redressal (SLA: {sla_hrs}h)."
    pipeline.record_status_transition(
        db, r,
        status="assigned",
        stage_label="Verified & Assigned to Officer",
        actor_role=claims.get("r", "dept_officer"),
        actor_name=claims.get("n", "Department Officer"),
        department=r.assigned_department,
        note=note_text,
        notify_message=f"Grievance {r.tracking_id} has been assigned to {off_name} ({dept_name}).",
        notify_kind="assigned",
    )
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="assign_field_officer",
        entity="request",
        entity_id=r.tracking_id,
        detail={"field_officer_name": off_name, "department": dept_name, "sla_hours": sla_hrs},
    ))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True), "message": "Assigned successfully.", "status": "assigned"}


@router.post("/requests/{request_id}/escalate")
def escalate_complaint(
    request_id: int,
    body: EscalateIn,
    claims: dict = Depends(security.require_claims(security.ROLE_FIELD_OFFICER)),
    db: Session = Depends(get_db),
):
    """Field Officer escalates 'cannot resolve' with mandatory reason."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    security.verify_resource_in_scope(claims, r, db)

    r.escalated = True
    r.escalation_reason = body.reason.strip()

    note_text = f"Escalated by Field Officer: {r.escalation_reason}"
    pipeline.record_status_transition(
        db, r,
        status="in_progress",
        stage_label="Escalated to Supervisor",
        actor_role=claims.get("r", "field_officer"),
        actor_name=claims.get("n", "Field Officer"),
        department=r.assigned_department or r.category,
        note=note_text,
    )
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="escalate_complaint",
        entity="request",
        entity_id=r.tracking_id,
        detail={"reason": body.reason},
    ))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True), "message": "Complaint escalated to supervisor."}


@router.post("/requests/{request_id}/proof")
def submit_proof_of_resolution(
    request_id: int,
    body: SubmitProofIn,
    claims: dict = Depends(security.require_claims(security.ROLE_FIELD_OFFICER, security.ROLE_DEPT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, security.ROLE_DISTRICT_OFFICER, "officer", "field_officer")),
    db: Session = Depends(get_db),
):
    """Field Officer submits resolution photo proof with optional GPS coordinates."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    security.verify_resource_in_scope(claims, r, db)

    import hashlib
    now = datetime.utcnow()
    photo_url = body.proof_photo_url or body.file_url or "https://images.unsplash.com/photo-resolution-default.jpg"
    notes = body.proof_notes or body.note or "Work completed on site with photo proof."
    sha256 = hashlib.sha256(f"{r.tracking_id}_{photo_url}_{now}".encode()).hexdigest()

    p_upload = ProofUpload(
        request_id=r.id,
        officer_id=str(claims.get("sub", "")),
        officer_name=claims.get("n", "Field Officer"),
        department=r.assigned_department or r.category,
        file_url=photo_url,
        file_name=f"proof_{r.tracking_id}.jpg",
        file_type="photo",
        file_size=1024 * 500,
        mime_type="image/jpeg",
        sha256_hash=sha256,
        uploaded_at=now,
        lat=body.latitude or r.lat,
        lng=body.longitude or r.lng,
        exif_metadata={"GPSLatitude": body.latitude or r.lat, "GPSLongitude": body.longitude or r.lng},
        is_suspicious=False,
    )
    db.add(p_upload)

    r.status = "resolved_pending_verification"
    r.resolved_at = now
    r.proof_count = (r.proof_count or 0) + 1
    r.rework_note = ""

    pipeline.record_status_transition(
        db, r,
        status="resolved_pending_verification",
        stage_label="Resolved (Pending Citizen Confirmation)",
        actor_role=claims.get("r", "field_officer"),
        actor_name=claims.get("n", "Field Officer"),
        department=r.assigned_department or r.category,
        note=f"Resolution proof submitted: {notes}",
        notify_message=f"Grievance {r.tracking_id} has been resolved on ground. Please review proof and confirm.",
        notify_kind="resolved",
    )
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="submit_resolution_proof",
        entity="request",
        entity_id=r.tracking_id,
        detail={"photo_url": photo_url, "notes": notes},
    ))
    db.commit()
    analytics_cache.bump()
    return request_out(r, full=True)


@router.post("/requests/{request_id}/proof/review")
def review_proof_decision(
    request_id: int,
    body: ProofReviewIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DEPT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """Dept Officer reviews submitted proof: accept or send back for rework."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    security.verify_resource_in_scope(claims, r, db)

    action = (body.decision or body.action or "accept").lower()
    if action == "accept":
        r.status = "resolved_pending_verification"
        r.rework_note = ""
        if not r.resolved_at:
            r.resolved_at = datetime.utcnow()
        note_txt = body.note or "Proof of resolution reviewed and accepted by Department Supervisor."
        pipeline.record_status_transition(
            db, r,
            status="resolved_pending_verification",
            stage_label="Proof Accepted by Department",
            actor_role=claims.get("r"),
            actor_name=claims.get("n", "Department Officer"),
            department=r.assigned_department,
            note=note_txt,
            public_visible=True,
            notify_message=f"Department accepted resolution for grievance {r.tracking_id}.",
            notify_kind="resolved",
        )
        msg = "Proof accepted."
    else:
        # Send back for rework
        if not body.note or len(body.note.strip()) < 5:
            raise HTTPException(422, "A specific note is mandatory when requesting rework.")
        r.rework_note = body.note.strip()
        r.status = "assigned"  # Returns to Field Officer
        note_txt = f"Rework requested by Department: {r.rework_note}"
        pipeline.record_status_transition(
            db, r,
            status="assigned",
            stage_label="Rework Requested by Department",
            actor_role=claims.get("r"),
            actor_name=claims.get("n", "Department Officer"),
            department=r.assigned_department,
            note=note_txt,
            public_visible=True,
            notify_message=f"Department requested additional rework for grievance {r.tracking_id}.",
            notify_kind="rework_requested",
        )
        msg = "Sent back for rework."

    db.add(AuditLog(
        actor_role=claims.get("r"),
        action=f"proof_review_{action}",
        entity="request",
        entity_id=r.tracking_id,
        detail={"decision": action, "note": body.note},
    ))
    db.commit()
    analytics_cache.bump()
    out = request_out(r, full=True)
    out["message"] = msg
    out["request"] = request_out(r, full=True)
    return out


@router.post("/requests/{request_id}/reassign-department")
def reassign_cross_department(
    request_id: int,
    body: ReassignDeptIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DISTRICT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """District Collector reassigns a complaint across departments within the district."""
    r = db.get(CitizenRequest, request_id)
    if not r:
        raise HTTPException(404, "Complaint not found")
    security.verify_resource_in_scope(claims, r, db)

    old_dept = r.category
    new_dept = body.new_department.strip().lower()
    r.category = new_dept
    r.assigned_department = pipeline.get_department_for_sector(new_dept)
    r.assigned_field_officer_id = None
    r.assigned_officer = None
    r.status = "received"  # Goes into new department's unassigned queue

    note_txt = f"Cross-department reassignment from {old_dept} to {new_dept} by District Collector. Reason: {body.note}"
    pipeline.record_status_transition(
        db, r,
        status="received",
        stage_label="Reassigned to New Department",
        actor_role=claims.get("r"),
        actor_name=claims.get("n", "District Collector"),
        department=r.assigned_department,
        note=note_txt,
        notify_message=f"Grievance {r.tracking_id} reassigned to {r.assigned_department}.",
        notify_kind="reassigned_dept",
    )
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="reassign_department",
        entity="request",
        entity_id=r.tracking_id,
        detail={"old_department": old_dept, "new_department": new_dept, "reason": body.note},
    ))
    db.commit()
    analytics_cache.bump()
    return {"request": request_out(r, full=True), "message": f"Reassigned to {new_dept} department."}


# ---------------------------------------------------------------------------
# 5. Project Pipeline & Budget Tracking Endpoints
# ---------------------------------------------------------------------------
@router.post("/projects/propose")
def propose_project(
    body: ProposeProjectIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DEPT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """Dept Officer proposes a project from a sector demand cluster or area."""
    cost = body.estimated_cost_inr or body.cost_inr or 100000.0
    c = None
    if body.cluster_id:
        c = db.get(DemandCluster, body.cluster_id)
        if not c:
            raise HTTPException(404, "Demand Cluster not found")
        security.verify_resource_in_scope(claims, c, db)

    area_id = body.area_id
    sector = body.sector or "roads"
    country_code = "IN"
    beneficiaries = body.beneficiaries or 1000

    if c:
        area_id = c.area_id
        sector = c.category
        country_code = c.country_code
        beneficiaries = c.unique_households or c.request_count
    elif area_id:
        area = db.get(Area, area_id)
        if not area:
            raise HTTPException(404, "Area not found")
        country_code = area.country_code
    else:
        scope = security.JurisdictionScope(claims)
        area = db.query(Area).filter_by(district=scope.district).first() or db.query(Area).first()
        area_id = area.id if area else 1
        country_code = area.country_code if area else "IN"

    import uuid
    code = f"PRJ-{sector.upper()[:3]}-{uuid.uuid4().hex[:6].upper()}"
    p = Project(
        code=code,
        source="recommended",
        country_code=country_code,
        area_id=area_id,
        cluster_id=c.id if c else None,
        sector=sector,
        title=body.title.strip(),
        description=body.description or (c.summary if c else "") or "",
        scheme=body.scheme or "",
        sdg=body.sdg or "SDG 9",
        cost_local=cost,
        cost_usd=cost * settings.fx_inr_usd,
        beneficiaries=beneficiaries,
        status="proposed",
        score=75.0 if not c else c.severity_avg * 10,
        score_breakdown={"cluster_severity": c.severity_avg if c else 7.5, "beneficiaries": beneficiaries},
        created_at=datetime.utcnow(),
    )
    db.add(p)
    db.flush()

    db.add(ProjectHistory(
        project_id=p.id,
        from_status="none",
        to_status="proposed",
        actor_id=str(claims.get("sub", "")),
        actor_name=claims.get("n", "Department Officer"),
        actor_role=claims.get("r", "dept_officer"),
        note="Project proposal submitted by Department Officer.",
    ))
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="propose_project",
        entity="project",
        entity_id=p.code,
        detail={"cluster_id": c.id if c else None, "cost_inr": cost},
    ))
    if c:
        c.status = "in_plan"
    db.commit()
    db.refresh(p)
    return {"project": project_out(p), "message": "Project proposed successfully."}


@router.post("/projects/{project_id}/approve")
def approve_project(
    project_id: int,
    body: ProjectDecisionIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DISTRICT_OFFICER, security.ROLE_STATE_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """District Collector approves 'proposed' -> 'district_approved'; State Officer approves 'district_approved' -> 'state_approved'."""
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    security.verify_resource_in_scope(claims, p, db)

    role = security.normalize_role(claims.get("r"))
    from_st = p.status

    if from_st == "proposed":
        if role not in (security.ROLE_DISTRICT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN):
            raise HTTPException(403, "Only District Collector can approve department proposals.")
        to_st = "district_approved"
        actor_label = "District Collector"
    elif from_st == "district_approved":
        if role not in (security.ROLE_STATE_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN):
            raise HTTPException(403, "Only State Officer can approve district-approved projects.")
        to_st = "state_approved"
        actor_label = "State Officer"
    else:
        raise HTTPException(400, f"Cannot approve project currently in '{from_st}' status.")

    p.status = to_st
    note_txt = body.note or f"Approved by {actor_label}."
    db.add(ProjectHistory(
        project_id=p.id,
        from_status=from_st,
        to_status=to_st,
        actor_id=claims.get("sub"),
        actor_name=claims.get("n", actor_label),
        actor_role=role,
        note=note_txt,
    ))
    db.add(AuditLog(
        actor_role=role,
        action=f"approve_project_{to_st}",
        entity="project",
        entity_id=p.code,
        detail={"from_status": from_st, "to_status": to_st, "note": note_txt},
    ))
    db.commit()
    db.refresh(p)
    return {"project": project_out(p), "message": f"Project advanced to '{to_st}'."}


@router.post("/projects/{project_id}/reject")
def reject_project(
    project_id: int,
    body: ProjectRejectIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DISTRICT_OFFICER, security.ROLE_STATE_OFFICER, security.ROLE_ADMIN, security.ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """Rejects a project at District, State, or National level with mandatory reason."""
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    security.verify_resource_in_scope(claims, p, db)

    role = security.normalize_role(claims.get("r"))
    from_st = p.status
    to_st = "rejected"

    p.status = to_st
    p.decision_reason = body.reason.strip()
    db.add(ProjectHistory(
        project_id=p.id,
        from_status=from_st,
        to_status=to_st,
        actor_id=str(claims.get("sub", "")),
        actor_name=claims.get("n", "Officer"),
        actor_role=role,
        note=f"Rejected by {role}: {p.decision_reason}",
    ))
    db.add(AuditLog(
        actor_role=role,
        action="reject_project",
        entity="project",
        entity_id=p.code,
        detail={"from_status": from_st, "to_status": to_st, "reason": p.decision_reason},
    ))
    db.commit()
    db.refresh(p)
    return {"project": project_out(p), "message": "Project rejected."}


@router.post("/projects/{project_id}/fund")
def fund_project(
    project_id: int,
    body: FundProjectIn,
    claims: dict = Depends(security.require_claims(security.ROLE_ADMIN, security.ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    """National Admin funds a state-approved project."""
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    if p.status != "state_approved":
        raise HTTPException(400, "Only 'state_approved' projects can be funded.")

    if body.sanctioned_amount_inr != p.cost_local and not (body.change_reason and len(body.change_reason.strip()) >= 5):
        raise HTTPException(422, "A mandatory reason is required when sanctioned amount differs from estimated cost.")

    p.status = "funded"
    f = ProjectFunding(
        project_id=p.id,
        sanctioned_amount_inr=body.sanctioned_amount_inr,
        funded_by=claims.get("n", "National Admin"),
        funded_at=datetime.utcnow(),
        change_reason=body.change_reason,
    )
    db.add(f)
    db.add(ProjectHistory(
        project_id=p.id,
        from_status="state_approved",
        to_status="funded",
        actor_id=claims.get("sub"),
        actor_name=claims.get("n", "National Admin"),
        actor_role=claims.get("r", "admin"),
        note=f"Sanctioned INR {body.sanctioned_amount_inr:,.0f}. {body.change_reason or ''}".strip(),
    ))
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="fund_project",
        entity="project",
        entity_id=p.code,
        detail={"sanctioned_inr": body.sanctioned_amount_inr, "reason": body.change_reason},
    ))
    db.commit()
    db.refresh(p)
    return {"project": project_out(p), "message": "Project funded successfully."}


@router.post("/projects/{project_id}/expenditure")
def record_expenditure(
    project_id: int,
    body: RecordExpenditureIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DISTRICT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """District Collector records expenditure against a funded project. Total cannot exceed sanctioned amount."""
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    security.verify_resource_in_scope(claims, p, db)

    if p.status not in ("funded", "in_execution"):
        raise HTTPException(400, "Expenditure can only be recorded against 'funded' or 'in_execution' projects.")

    sanctioned = sum(f.sanctioned_amount_inr for f in (p.fundings or []))
    spent = sum(e.amount_inr for e in (p.expenditures or []))
    remaining = sanctioned - spent

    if body.amount_inr > remaining:
        raise HTTPException(400, f"Expenditure exceeds sanctioned balance. Sanctioned: INR {sanctioned:,.0f}, Spent: INR {spent:,.0f}, Remaining: INR {remaining:,.0f}.")

    # Move to in_execution on first expenditure
    if p.status == "funded":
        p.status = "in_execution"
        p.started_at = datetime.utcnow()
        db.add(ProjectHistory(
            project_id=p.id,
            from_status="funded",
            to_status="in_execution",
            actor_id=claims.get("sub"),
            actor_name=claims.get("n", "District Collector"),
            actor_role=claims.get("r"),
            note="Project entered active execution upon first expenditure recording.",
        ))

    exp = ProjectExpenditure(
        project_id=p.id,
        amount_inr=body.amount_inr,
        description=body.description.strip(),
        spent_on=body.spent_on,
        bill_reference=body.bill_reference,
        recorded_by=claims.get("n", "District Collector"),
        created_at=datetime.utcnow(),
    )
    db.add(exp)
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="record_expenditure",
        entity="project",
        entity_id=p.code,
        detail={"amount_inr": body.amount_inr, "description": body.description, "bill_ref": body.bill_reference},
    ))
    db.commit()
    db.refresh(p)

    new_spent = spent + body.amount_inr
    warn_at_90 = (new_spent / sanctioned >= 0.9) if sanctioned > 0 else False

    return {
        "project": project_out(p),
        "expenditure": {
            "id": exp.id,
            "amount_inr": exp.amount_inr,
            "description": exp.description,
            "spent_on": exp.spent_on,
            "bill_reference": exp.bill_reference,
        },
        "warning": "Warning: Budget utilization has reached 90%+." if warn_at_90 else None,
        "warning_90_pct": warn_at_90,
        "message": "Expenditure recorded successfully." + (" Warning: Budget utilization has reached 90%+." if warn_at_90 else ""),
    }


@router.post("/projects/{project_id}/complete")
def complete_project(
    project_id: int,
    body: ProjectDecisionIn,
    claims: dict = Depends(security.require_claims(security.ROLE_DISTRICT_OFFICER, security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """District Collector marks a project completed when on-ground work is done."""
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    security.verify_resource_in_scope(claims, p, db)

    if p.status != "in_execution":
        raise HTTPException(400, "Only projects currently 'in_execution' can be marked 'completed'.")

    now = datetime.utcnow()
    p.status = "completed"
    p.completed_at = now

    # Update underlying cluster & complaints
    if p.cluster_id:
        c = db.get(DemandCluster, p.cluster_id)
        if c:
            c.status = "resolved"
        reqs = db.query(CitizenRequest).filter(CitizenRequest.cluster_id == p.cluster_id).all()
        for r in reqs:
            if r.status not in ("closed", "closed_verified"):
                r.status = "resolved_pending_verification"
                r.resolved_at = now
                r.closure_note = f"Completed under Project {p.code}: {p.title}."
                pipeline.notify(db, r, "resolved", t("resolved", r.language, tid=r.tracking_id))

    db.add(ProjectHistory(
        project_id=p.id,
        from_status="in_execution",
        to_status="completed",
        actor_id=claims.get("sub"),
        actor_name=claims.get("n", "District Collector"),
        actor_role=claims.get("r"),
        note=body.note or "On-ground infrastructure execution completed.",
    ))
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="complete_project",
        entity="project",
        entity_id=p.code,
        detail={"note": body.note},
    ))
    db.commit()
    db.refresh(p)
    return {"project": project_out(p), "message": "Project completed successfully."}


@router.get("/budget/summary")
def get_budget_summary(
    claims: dict = Depends(security.require_officer),
    db: Session = Depends(get_db),
):
    """Returns budget roll-up (sanctioned, spent, remaining, utilization %) scoped to caller's jurisdiction."""
    role = security.normalize_role(claims.get("r"))
    scope = security.JurisdictionScope(claims)

    proj_q = security.apply_jurisdiction_scope(db.query(Project), claims, Project, db)
    projects_list = proj_q.all()

    total_sanctioned = sum(sum(f.sanctioned_amount_inr for f in (p.fundings or [])) for p in projects_list)
    total_spent = sum(sum(e.amount_inr for e in (p.expenditures or [])) for p in projects_list)
    total_remaining = max(0.0, total_sanctioned - total_spent)
    total_utilization = round((total_spent / total_sanctioned * 100), 1) if total_sanctioned > 0 else 0.0

    # Breakdowns by scope
    breakdown = []
    if role in (security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN):
        # By State
        st_map = {}
        for p in projects_list:
            st = p.area.state if p.area else "National"
            if st not in st_map:
                st_map[st] = {"sanctioned": 0.0, "spent": 0.0, "project_count": 0}
            sanc = sum(f.sanctioned_amount_inr for f in (p.fundings or []))
            spt = sum(e.amount_inr for e in (p.expenditures or []))
            st_map[st]["sanctioned"] += sanc
            st_map[st]["spent"] += spt
            st_map[st]["project_count"] += 1
        for st, data in st_map.items():
            rem = max(0.0, data["sanctioned"] - data["spent"])
            ut = round(data["spent"] / data["sanctioned"] * 100, 1) if data["sanctioned"] > 0 else 0.0
            breakdown.append({"label": st, "sanctioned": data["sanctioned"], "spent": data["spent"], "remaining": rem, "utilization_pct": ut, "project_count": data["project_count"]})
    elif role == security.ROLE_STATE_OFFICER:
        # By District
        dist_map = {}
        for p in projects_list:
            dist = p.area.district if p.area else "State Level"
            if dist not in dist_map:
                dist_map[dist] = {"sanctioned": 0.0, "spent": 0.0, "project_count": 0}
            sanc = sum(f.sanctioned_amount_inr for f in (p.fundings or []))
            spt = sum(e.amount_inr for e in (p.expenditures or []))
            dist_map[dist]["sanctioned"] += sanc
            dist_map[dist]["spent"] += spt
            dist_map[dist]["project_count"] += 1
        for dist, data in dist_map.items():
            rem = max(0.0, data["sanctioned"] - data["spent"])
            ut = round(data["spent"] / data["sanctioned"] * 100, 1) if data["sanctioned"] > 0 else 0.0
            breakdown.append({"label": dist, "sanctioned": data["sanctioned"], "spent": data["spent"], "remaining": rem, "utilization_pct": ut, "project_count": data["project_count"]})
    else:
        # By Project
        for p in projects_list:
            sanc = sum(f.sanctioned_amount_inr for f in (p.fundings or []))
            spt = sum(e.amount_inr for e in (p.expenditures or []))
            rem = max(0.0, sanc - spt)
            ut = round(spt / sanc * 100, 1) if sanc > 0 else 0.0
            breakdown.append({"label": f"{p.code} - {p.title}", "sanctioned": sanc, "spent": spt, "remaining": rem, "utilization_pct": ut, "status": p.status, "project_id": p.id})

    return {
        "total_sanctioned": total_sanctioned,
        "total_sanctioned_inr": total_sanctioned,
        "total_spent": total_spent,
        "total_spent_inr": total_spent,
        "total_remaining": total_remaining,
        "total_remaining_inr": total_remaining,
        "total_utilization_pct": total_utilization,
        "utilization_rate": total_utilization,
        "breakdown": breakdown,
        "projects": [project_out(p) for p in projects_list],
    }


# ---------------------------------------------------------------------------
# 6. Tier-by-Tier Subordinate Account Management (/api/officer/accounts)
# ---------------------------------------------------------------------------
@router.post("/officer/accounts")
def create_subordinate_officer(
    body: CreateSubordinateOfficerIn,
    claims: dict = Depends(security.require_officer),
    db: Session = Depends(get_db),
):
    """Each tier creates officer accounts one level below inside its own jurisdiction:
    - Dept Officer creates Field Officers (same district & dept)
    - District Collector creates Dept Officers (same district)
    - State Officer creates District Officers (same state)
    - National Admin creates State Officers
    """
    creator_role = security.normalize_role(claims.get("r"))
    scope = security.JurisdictionScope(claims)

    clean_username = body.username.strip().lower()
    if db.query(User).filter_by(username=clean_username).first():
        raise HTTPException(400, "Username already exists.")

    if creator_role == security.ROLE_DEPT_OFFICER:
        target_role = security.ROLE_FIELD_OFFICER
        st = scope.state
        dist = scope.district
        blk = body.block or "Ward 1"
        dept = scope.department
    elif creator_role == security.ROLE_DISTRICT_OFFICER:
        target_role = security.ROLE_DEPT_OFFICER
        st = scope.state
        dist = scope.district
        blk = None
        dept = body.department or "water"
    elif creator_role == security.ROLE_STATE_OFFICER:
        target_role = security.ROLE_DISTRICT_OFFICER
        st = scope.state
        dist = body.block or "Central"  # district name
        blk = None
        dept = None
    elif creator_role in (security.ROLE_ADMIN, security.ROLE_SUPER_ADMIN):
        target_role = security.ROLE_STATE_OFFICER
        st = body.block or "Telangana"
        dist = None
        blk = None
        dept = None
    else:
        raise HTTPException(403, "Your role cannot provision subordinate accounts.")

    u = User(
        username=clean_username,
        password_hash=security.hash_password(body.password),
        name=body.name.strip(),
        title=body.title.strip(),
        user_type="officer",
        role=target_role,
        country_code="IN",
        state=st,
        district=dist,
        block=blk,
        department=dept,
        is_active=True,
    )
    db.add(u)
    db.flush()

    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="create_subordinate_officer",
        entity="user",
        entity_id=str(u.id),
        detail={"creator": claims.get("u"), "created_role": target_role, "username": u.username},
    ))
    db.commit()
    db.refresh(u)
    return {"user": u.to_dict(), "message": f"Created {target_role} account for {u.name}."}


@router.patch("/officer/accounts/{officer_id}/deactivate")
def toggle_subordinate_officer_status(
    officer_id: int,
    claims: dict = Depends(security.require_officer),
    db: Session = Depends(get_db),
):
    """Deactivates/reactivates a subordinate officer account within caller's jurisdiction."""
    u = db.get(User, officer_id)
    if not u:
        raise HTTPException(404, "Officer not found")
    security.verify_resource_in_scope(claims, u, db)

    creator_role = security.normalize_role(claims.get("r"))
    # Check hierarchy
    allowed_subordinate = {
        security.ROLE_DEPT_OFFICER: [security.ROLE_FIELD_OFFICER],
        security.ROLE_DISTRICT_OFFICER: [security.ROLE_DEPT_OFFICER, security.ROLE_FIELD_OFFICER],
        security.ROLE_STATE_OFFICER: [security.ROLE_DISTRICT_OFFICER, security.ROLE_DEPT_OFFICER, security.ROLE_FIELD_OFFICER],
        security.ROLE_ADMIN: [security.ROLE_STATE_OFFICER, security.ROLE_DISTRICT_OFFICER, security.ROLE_DEPT_OFFICER, security.ROLE_FIELD_OFFICER],
        security.ROLE_SUPER_ADMIN: security.ALL_ROLES,
    }
    if u.role not in allowed_subordinate.get(creator_role, []):
        raise HTTPException(403, f"Cannot deactivate an account with role '{u.role}'.")

    u.is_active = not u.is_active
    db.add(AuditLog(
        actor_role=claims.get("r"),
        action="toggle_officer_active_status",
        entity="user",
        entity_id=str(u.id),
        detail={"username": u.username, "is_active": u.is_active, "by": claims.get("u")},
    ))
    db.commit()
    return {
        "user": u.to_dict(),
        "status": "active" if u.is_active else "deactivated",
        "is_active": u.is_active,
        "message": f"Officer {u.name} is now {'active' if u.is_active else 'deactivated'}.",
    }
