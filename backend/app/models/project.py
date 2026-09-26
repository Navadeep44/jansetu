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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    area = relationship("Area")
