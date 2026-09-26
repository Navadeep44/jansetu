from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CitizenRequest(Base):
    """One citizen voice. Many requests roll up into one DemandCluster."""
    __tablename__ = "requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tracking_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    channel: Mapped[str] = mapped_column(String(20))  # whatsapp|telegram|ivr|sms|web|assisted|community|import
    language: Mapped[str] = mapped_column(String(8))
    original_text: Mapped[str] = mapped_column(Text)
    redacted_text: Mapped[str] = mapped_column(Text)  # PII removed - the only text used in analytics
    translated_text: Mapped[str] = mapped_column(Text, default="")
    translation_mode: Mapped[str] = mapped_column(String(20), default="offline_gist")  # llm|bhashini|offline_gist|source
    audio_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    country_code: Mapped[str] = mapped_column(String(2), index=True)
    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"), nullable=True, index=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_text: Mapped[str] = mapped_column(String(255), default="")

    category: Mapped[str] = mapped_column(String(30), index=True)
    subcategory: Mapped[str] = mapped_column(String(60), default="general")
    request_type: Mapped[str] = mapped_column(String(20), default="new_asset")  # new_asset|repair|service_quality
    severity: Mapped[int] = mapped_column(Integer, default=3)  # 1..5
    affected_people: Mapped[int] = mapped_column(Integer, default=1)
    vulnerable_groups: Mapped[list] = mapped_column(JSON, default=list)
    sdg: Mapped[str] = mapped_column(String(10), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    extraction_mode: Mapped[str] = mapped_column(String(20), default="rules")  # rules | llm

    status: Mapped[str] = mapped_column(String(30), default="received", index=True)
    # received | needs_review | clustered | in_plan | in_progress | resolved_pending_verification | closed | reopened
    cluster_id: Mapped[int | None] = mapped_column(ForeignKey("clusters.id"), nullable=True, index=True)
    household_hash: Mapped[str] = mapped_column(String(32), index=True)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    gender: Mapped[str] = mapped_column(String(12), default="undisclosed")
    assisted_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    supporters: Mapped[int] = mapped_column(Integer, default=1)  # community mode: people endorsing in a meeting
    flags: Mapped[list] = mapped_column(JSON, default=list)  # low_confidence|urgent_safety|abusive|coordinated|duplicate|needs_location
    review_reason: Mapped[str] = mapped_column(String(255), default="")

    closure_note: Mapped[str] = mapped_column(Text, default="")
    closure_flag: Mapped[str] = mapped_column(String(40), default="")  # formulaic_closure
    citizen_verified: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    citizen_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    area = relationship("Area")
    cluster = relationship("DemandCluster", back_populates="requests")


class Notification(Base):
    """Outbound messages to citizens, in their own language, on the channel they used."""
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    language: Mapped[str] = mapped_column(String(8))
    kind: Mapped[str] = mapped_column(String(30))
    message: Mapped[str] = mapped_column(Text)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
