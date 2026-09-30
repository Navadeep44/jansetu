from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    """Both (a) existing public-investment-plan items (source='plan', e.g. GPDP / PPA /
    municipal IDP) and (b) AI-recommended projects (source='recommended')."""
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(20), index=True)  # plan | recommended
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), index=True)
    cluster_id: Mapped[int | None] = mapped_column(ForeignKey("clusters.id"), nullable=True)
    sector: Mapped[str] = mapped_column(String(30), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    scheme: Mapped[str] = mapped_column(String(120), default="")
    sdg: Mapped[str] = mapped_column(String(10), default="")
    cost_local: Mapped[float] = mapped_column(Float)  # in local currency
    cost_usd: Mapped[float] = mapped_column(Float)
    beneficiaries: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), index=True)
    # plan items: planned | sanctioned | in_progress | completed
    # recommended: recommended | approved | deferred | rejected | in_progress | completed
    score: Mapped[float] = mapped_column(Float, default=0.0)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    decision_reason: Mapped[str] = mapped_column(Text, default="")
    decided_by: Mapped[str] = mapped_column(String(40), default="")
    proposer_user: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proposed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    district_approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    district_approved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state_approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    state_approved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sanctioned_amount_inr: Mapped[float] = mapped_column(Float, default=0.0)
    spent_amount_inr: Mapped[float] = mapped_column(Float, default=0.0)
    funded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    funded_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    area = relationship("Area")
    fundings = relationship("ProjectFunding", back_populates="project", cascade="all, delete-orphan", order_by="ProjectFunding.funded_at.desc()")
    expenditures = relationship("ProjectExpenditure", back_populates="project", cascade="all, delete-orphan", order_by="ProjectExpenditure.created_at.desc()")
    history = relationship("ProjectHistory", back_populates="project", cascade="all, delete-orphan", order_by="ProjectHistory.timestamp.asc()")


class ProjectFunding(Base):
    """Sanctioned budget allocations for approved projects."""
    __tablename__ = "project_funding"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    sanctioned_amount_inr: Mapped[float] = mapped_column(Float, default=0.0)
    funded_by: Mapped[str] = mapped_column(String(100), default="National Admin")
    funded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    project = relationship("Project", back_populates="fundings")


class ProjectExpenditure(Base):
    """Immutable, append-only records of actual funds spent against a sanctioned project."""
    __tablename__ = "project_expenditures"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    amount_inr: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text, default="")
    spent_on: Mapped[str] = mapped_column(String(30))  # ISO date string e.g. "2026-09-28"
    bill_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    recorded_by: Mapped[str] = mapped_column(String(100), default="District Collector")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="expenditures")


class ProjectHistory(Base):
    """Lifecycle transitions audit for projects (proposed -> district_approved -> state_approved -> funded -> in_execution -> completed / rejected)."""
    __tablename__ = "project_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40))
    actor_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    actor_name: Mapped[str] = mapped_column(String(100), default="")
    actor_role: Mapped[str] = mapped_column(String(40), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="history")
