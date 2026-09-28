from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StatusHistory(Base):
    """Immutable audit trail of complaint lifecycle transitions."""
    __tablename__ = "status_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    stage_label: Mapped[str] = mapped_column(String(100))
    actor_role: Mapped[str] = mapped_column(String(30), default="system")  # citizen | field_officer | district_officer | supervisor | system
    actor_name: Mapped[str] = mapped_column(String(100), default="System")
    department: Mapped[str] = mapped_column(String(120), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    public_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    request = relationship("CitizenRequest", back_populates="status_history")


class ProofUpload(Base):
    """Mandatory resolution proof uploaded by field officers (photos, inspection reports, documents).
    Permanently preserved for auditability and citizen inspection."""
    __tablename__ = "proof_uploads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    officer_id: Mapped[str] = mapped_column(String(60), default="")
    officer_name: Mapped[str] = mapped_column(String(100), default="")
    department: Mapped[str] = mapped_column(String(120), default="")
    file_url: Mapped[str] = mapped_column(Text)
    file_name: Mapped[str] = mapped_column(String(255), default="proof_file")
    file_type: Mapped[str] = mapped_column(String(20), default="photo")  # photo | document
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(60), default="image/jpeg")
    sha256_hash: Mapped[str] = mapped_column(String(64), default="", index=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    exif_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False)
    suspicious_reason: Mapped[str] = mapped_column(String(255), default="")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    request = relationship("CitizenRequest", back_populates="proofs")


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
    # received | assigned | in_progress | resolved_pending_verification | closed_verified | closed | reopened | needs_review | clustered
    cluster_id: Mapped[int | None] = mapped_column(ForeignKey("clusters.id"), nullable=True, index=True)
    household_hash: Mapped[str] = mapped_column(String(32), index=True)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    gender: Mapped[str] = mapped_column(String(12), default="undisclosed")
    assisted_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    supporters: Mapped[int] = mapped_column(Integer, default=1)  # community mode: people endorsing in a meeting
    flags: Mapped[list] = mapped_column(JSON, default=list)  # low_confidence|urgent_safety|abusive|coordinated|duplicate|needs_location
    review_reason: Mapped[str] = mapped_column(String(255), default="")

    assigned_officer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assigned_field_officer_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    assigned_department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    block: Mapped[str] = mapped_column(String(80), default="", index=True)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    escalation_reason: Mapped[str] = mapped_column(Text, default="")
    rework_note: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    in_progress_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    closure_note: Mapped[str] = mapped_column(Text, default="")
    closure_flag: Mapped[str] = mapped_column(String(40), default="")  # formulaic_closure | suspicious_proof
    citizen_verified: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    citizen_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dispute_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispute_photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    proof_count: Mapped[int] = mapped_column(Integer, default=0, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    area = relationship("Area")
    cluster = relationship("DemandCluster", back_populates="requests")
    status_history = relationship("StatusHistory", back_populates="request", cascade="all, delete-orphan", order_by="StatusHistory.created_at")
    proofs = relationship("ProofUpload", back_populates="request", cascade="all, delete-orphan", order_by="ProofUpload.uploaded_at")


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
