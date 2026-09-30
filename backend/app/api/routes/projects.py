"""AI-recommended projects + existing investment plans. AI recommends; humans decide (audited),
and every citizen in the underlying demand cluster is notified in their own language."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.i18n import t
from app.core import security
from app.core.security import PLANNER_ROLES, require
from app.models import Area, AuditLog, CitizenRequest, DemandCluster, Project
from app.schemas.inputs import DecisionIn, OptimiseIn
from app.schemas.serializers import project_out
from app.services import analytics_cache, pipeline, recommender

router = APIRouter(prefix="/projects", tags=["projects"])
TRANSITIONS = {"approve": "approved", "defer": "deferred", "reject": "rejected", "start": "in_progress", "complete": "completed"}


@router.get("")
def list_projects(source: str | None = None, country: str | None = None, state: str | None = None, district: str | None = None, status: str | None = None, sector: str | None = None,
                  limit: int = 100, claims: dict = Depends(security.get_current_user_claims), db: Session = Depends(get_db)):
    q = db.query(Project)
    
    # Jurisdiction Scoping
    q = security.apply_jurisdiction_scope(q, claims, Project, db)

    if source:
        q = q.filter(Project.source == source)
    already_joined = bool((claims.get("st") or claims.get("dist")) and claims.get("r") not in security.NATIONWIDE_ROLES)
    if state or district:
        if not already_joined:
            q = q.join(Area, Project.area_id == Area.id)
        if state:
            q = q.filter(Area.state == state)
        if district:
            q = q.filter(Area.district == district)
    if status:
        q = q.filter(Project.status.in_(status.split(",")))
    if sector:
        q = q.filter(Project.sector == sector)
    return [project_out(p) for p in q.order_by(Project.score.desc(), Project.cost_local.desc()).limit(limit).all()]


@router.get("/{project_id}")
def detail(project_id: int, db: Session = Depends(get_db)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404)
    out = project_out(p)
    out["explanation"] = recommender.explain(db, p) if p.source == "recommended" else None
    if p.cluster_id:
        c = db.get(DemandCluster, p.cluster_id)
        out["cluster"] = {"id": c.id, "title": c.title, "unique_households": c.unique_households,
                          "languages": c.languages, "request_count": c.request_count} if c else None
    return out


@router.post("/regenerate")
def regenerate(min_ngi: float = 40.0, role: str = Depends(require(*PLANNER_ROLES)), db: Session = Depends(get_db)):
    n = recommender.regenerate(db, min_ngi=min_ngi)
    db.add(AuditLog(actor_role=role, action="regenerate_recommendations", entity="project", entity_id="*", detail={"created": n}))
    db.commit()
    return {"created": n}


DECIDERS = {security.ROLE_SUPER_ADMIN, security.ROLE_ADMIN, security.ROLE_STATE_OFFICER, security.ROLE_DISTRICT_OFFICER}


@router.post("/{project_id}/decision")
def decide(project_id: int, body: DecisionIn, claims: dict = Depends(security.require_officer), db: Session = Depends(get_db)):
    role = claims.get("r")
    if security.normalize_role(role) not in DECIDERS and role != security.ROLE_SUPER_ADMIN:
        raise HTTPException(403, "Only the District Collector, the State or the national planners can decide on projects.")
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404)
    security.verify_resource_in_scope(claims, p, db)  # a Collector can only decide projects in their own district
    if body.decision not in TRANSITIONS:
        raise HTTPException(400, f"decision must be one of {list(TRANSITIONS)}")
    if body.decision in ("reject", "defer") and len(body.reason.strip()) < 5:
        raise HTTPException(422, "A reason is required to reject or defer an AI recommendation (accountability).")
    p.status, p.decision_reason, p.decided_by = TRANSITIONS[body.decision], body.reason, f"{role}:{claims.get('u')}"
    now = datetime.utcnow()
    if body.decision == "start":
        p.started_at = now
    if body.decision == "complete":
        p.completed_at = now
    notified = 0
    if p.cluster_id and body.decision in ("approve", "start", "complete"):
        reqs = db.query(CitizenRequest).filter(CitizenRequest.cluster_id == p.cluster_id,
                                               CitizenRequest.status.notin_(["closed"])).all()
        for r in reqs:
            if body.decision == "approve":
                r.status, kind, msg = "in_plan", "approved", t("approved", r.language, project=p.title)
            elif body.decision == "start":
                r.status, kind, msg = "in_progress", "approved", t("approved", r.language, project=p.title)
            else:
                r.status, kind, msg = "resolved_pending_verification", "resolved", t("resolved", r.language, tid=r.tracking_id)
                r.closure_note = f"Project {p.code} completed: {p.title}."
                r.closed_at = now
            pipeline.notify(db, r, kind, msg)
            notified += 1
        c = db.get(DemandCluster, p.cluster_id)
        if c:
            c.status = {"approve": "in_plan", "start": "in_progress", "complete": "resolved"}[body.decision]
    db.add(AuditLog(actor_role=role, action=f"project_{body.decision}", entity="project", entity_id=p.code,
                    detail={"reason": body.reason, "score": p.score, "citizens_notified": notified}))
    db.commit()
    analytics_cache.bump()
    return {"project": project_out(p), "citizens_notified": notified}


@router.post("/optimise")
def optimise(body: OptimiseIn, claims: dict = Depends(security.require_officer), db: Session = Depends(get_db)):
    statuses = ["recommended", "approved"] if body.include_approved else ["recommended"]
    q = db.query(Project).filter(Project.source == "recommended", Project.status.in_(statuses))
    q = security.apply_jurisdiction_scope(q, claims, Project, db)
    if body.state and not claims.get("st"):
        q = q.join(Area, Project.area_id == Area.id).filter(Area.state == body.state)
    cands = q.all()
    res = recommender.optimise(cands, body.budget)
    res["projects"] = [project_out(p) for p in cands if p.id in set(res["selected"])]
    res["candidates"] = len(cands)
    res["candidate_total_cost"] = sum(p.cost_local for p in cands)
    return res
