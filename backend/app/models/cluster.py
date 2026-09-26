from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DemandCluster(Base):
    """One real-world development need expressed by many citizens
    (e.g. '212 households in Utnoor need an all-weather road')."""
    __tablename__ = "clusters"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)
    subcategory: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    request_count: Mapped[int] = mapped_column(Integer, default=0)
    unique_households: Mapped[int] = mapped_column(Integer, default=0)
    supporters: Mapped[int] = mapped_column(Integer, default=0)
    severity_avg: Mapped[float] = mapped_column(Float, default=3.0)
    languages: Mapped[list] = mapped_column(JSON, default=list)
    channels: Mapped[dict] = mapped_column(JSON, default=dict)
    vulnerable_groups: Mapped[list] = mapped_column(JSON, default=list)
    campaign_share: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="open")  # open | in_plan | in_progress | resolved
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    area = relationship("Area")
    requests = relationship("CitizenRequest", back_populates="cluster")
