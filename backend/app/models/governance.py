"""JanSetu Governance & Multi-Tier Administrative Models (V2 Addendum).

Includes models for:
- Field verification, checklist, and before/after verification media
- Citizen communication relay & templated messaging
- Citizen document check & registry verification
- Show-cause notices & responses
- Jan Sunwai public hearings, items & compliance orders
- Emergency incidents, broadcasts & relief ledgers
- Utilisation Certificates (UC)
- Circulars & acknowledgements
- Citizen appeals to State
- Versioned SLA rule tables
- Append-only hash-chained AuditEvents
- In-app notification center
- Resource documents (SOPs, policies, FAQs)
- Integration connector registry
- Officer public profiles
"""
from datetime import datetime
from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class FieldVerification(Base):
    """Field Officer on-site verification with category checklist, distance check, and citizen sign-off."""
    __tablename__ = "field_verifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    officer_id: Mapped[int] = mapped_column(Integer, index=True)
    officer_name: Mapped[str] = mapped_column(String(100), default="")
    checklist_json: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    device_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    citizen_confirmation_type: Mapped[str] = mapped_column(String(20), default="otp")  # otp | signature | direct
    citizen_confirmation_ref: Mapped[str] = mapped_column(String(100), default="")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    media = relationship("VerificationMedia", back_populates="verification", cascade="all, delete-orphan")


class VerificationMedia(Base):
    """Before, after, and inspection photo/document records with geotag metadata."""
    __tablename__ = "verification_media"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    verification_id: Mapped[int | None] = mapped_column(ForeignKey("field_verifications.id"), nullable=True, index=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30), default="after")  # before | after | inspection | site_plan
    url: Mapped[str] = mapped_column(Text)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    taken_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    verification = relationship("FieldVerification", back_populates="media")


class CitizenMessage(Base):
    """Templated messages sent to citizens through the communication relay."""
    __tablename__ = "citizen_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    sender_id: Mapped[int] = mapped_column(Integer)
    sender_name: Mapped[str] = mapped_column(String(100), default="")
    sender_role: Mapped[str] = mapped_column(String(40), default="")
    template_id: Mapped[str] = mapped_column(String(60))
    channel: Mapped[str] = mapped_column(String(20), default="sms")  # sms | whatsapp | in_app
    message_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent | delivered | read | failed
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MessageTemplate(Base):
    """Standard predefined officer message templates for communication relay."""
    __tablename__ = "message_templates"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    channel: Mapped[str] = mapped_column(String(20), default="all")
    category: Mapped[str] = mapped_column(String(40), default="general")
    template_text: Mapped[str] = mapped_column(Text)


class DocumentCheck(Base):
    """Citizen-submitted supporting document verification ledger."""
    __tablename__ = "document_checks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    doc_ref: Mapped[str] = mapped_column(String(80), default="")
    doc_name: Mapped[str] = mapped_column(String(150))
    doc_url: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | received | verified | rejected | needs_more
    checked_by: Mapped[str] = mapped_column(String(100), default="")
    checked_by_role: Mapped[str] = mapped_column(String(40), default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ShowCauseNotice(Base):
    """District Collector show-cause notice issued to subordinate officers."""
    __tablename__ = "show_cause_notices"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district: Mapped[str] = mapped_column(String(60), index=True)
    issued_by_id: Mapped[int] = mapped_column(Integer)
    issued_by_name: Mapped[str] = mapped_column(String(100))
    to_user_id: Mapped[int] = mapped_column(Integer, index=True)
    to_username: Mapped[str] = mapped_column(String(60), index=True)
    to_user_name: Mapped[str] = mapped_column(String(100))
    to_role: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text)
    linked_request_ids: Mapped[list] = mapped_column(JSON, default=list)
    due_at: Mapped[datetime] = mapped_column(DateTime)
    response_text: Mapped[str] = mapped_column(Text, default="")
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="issued")  # issued | responded | accepted | referred | overdue
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Hearing(Base):
    """Jan Sunwai (Public Hearing) sessions scheduled by District Collector."""
    __tablename__ = "hearings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district: Mapped[str] = mapped_column(String(60), index=True)
    title: Mapped[str] = mapped_column(String(200))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    venue: Mapped[str] = mapped_column(String(200))
    attending_depts: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(30), default="scheduled")  # scheduled | in_progress | concluded | adjourned
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items = relationship("HearingItem", back_populates="hearing", cascade="all, delete-orphan")


class HearingItem(Base):
    """Agenda items and complaint cases taken up during a Jan Sunwai hearing."""
    __tablename__ = "hearing_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hearing_id: Mapped[int] = mapped_column(ForeignKey("hearings.id"), index=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    tracking_id: Mapped[str] = mapped_column(String(30))
    citizen_name_masked: Mapped[str] = mapped_column(String(100), default="Citizen")
    category: Mapped[str] = mapped_column(String(40), default="general")
    outcome: Mapped[str] = mapped_column(String(40), default="directed_with_deadline")  # resolved | directed_with_deadline | adjourned
    direction: Mapped[str] = mapped_column(Text, default="")

    hearing = relationship("Hearing", back_populates="items")
    compliance_orders = relationship("ComplianceOrder", back_populates="hearing_item", cascade="all, delete-orphan")


class ComplianceOrder(Base):
    """Binding directives and compliance deadlines issued by District Collector."""
    __tablename__ = "compliance_orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hearing_id: Mapped[int] = mapped_column(Integer, index=True)
    hearing_item_id: Mapped[int] = mapped_column(ForeignKey("hearing_items.id"), index=True)
    request_id: Mapped[int] = mapped_column(Integer, index=True)
    dept: Mapped[str] = mapped_column(String(100))
    responsible_officer: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text)
    due_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | in_progress | completed | overdue
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    hearing_item = relationship("HearingItem", back_populates="compliance_orders")


class EmergencyIncident(Base):
    """District disaster/crisis declaration with priority boosts and relief ledger."""
    __tablename__ = "emergency_incidents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district: Mapped[str] = mapped_column(String(60), index=True)
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(50))  # flood | heatwave | infrastructure_collapse | epidemic | water_crisis
    severity: Mapped[str] = mapped_column(String(30), default="high")  # critical | high | moderate
    blocks_json: Mapped[list] = mapped_column(JSON, default=list)
    priority_multiplier: Mapped[float] = mapped_column(Float, default=2.0)
    status: Mapped[str] = mapped_column(String(30), default="active")  # active | contained | closed
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")

    broadcasts = relationship("IncidentBroadcast", back_populates="incident", cascade="all, delete-orphan")
    relief_ledger = relationship("ReliefLedger", back_populates="incident", cascade="all, delete-orphan")


class IncidentBroadcast(Base):
    """Alert messages broadcasted to field and dept officers during an emergency."""
    __tablename__ = "incident_broadcasts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("emergency_incidents.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String(30), default="all")
    target_blocks: Mapped[list] = mapped_column(JSON, default=list)
    sent_by: Mapped[str] = mapped_column(String(100), default="District Collector")
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incident = relationship("EmergencyIncident", back_populates="broadcasts")


class ReliefLedger(Base):
    """Emergency relief fund allocations, disbursements, and beneficiary tracking."""
    __tablename__ = "relief_ledgers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("emergency_incidents.id"), index=True)
    block: Mapped[str] = mapped_column(String(80))
    amount_allocated: Mapped[float] = mapped_column(Float, default=0.0)
    amount_disbursed: Mapped[float] = mapped_column(Float, default=0.0)
    beneficiaries_served: Mapped[int] = mapped_column(Integer, default=0)
    items_distributed: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incident = relationship("EmergencyIncident", back_populates="relief_ledger")


class UtilisationCertificate(Base):
    """Project completion and expenditure Utilisation Certificate (UC) uploaded for State verification."""
    __tablename__ = "utilisation_certificates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    uploaded_by: Mapped[str] = mapped_column(String(60))
    uploaded_by_name: Mapped[str] = mapped_column(String(100), default="")
    doc_url: Mapped[str] = mapped_column(Text)
    amount_inr: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="submitted")  # pending | submitted | verified | queried
    query_note: Mapped[str] = mapped_column(Text, default="")
    verified_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Circular(Base):
    """Policy circulars and executive instructions published by State Officer to District Collectors."""
    __tablename__ = "circulars"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    state: Mapped[str] = mapped_column(String(60), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    attachment_url: Mapped[str] = mapped_column(Text, default="")
    target_districts: Mapped[list] = mapped_column(JSON, default=lambda: ["all"])
    effective_on: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    published_by: Mapped[str] = mapped_column(String(60))
    published_by_name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    acknowledgements = relationship("CircularAck", back_populates="circular", cascade="all, delete-orphan")


class CircularAck(Base):
    """District Collector acknowledgement record for State circulars."""
    __tablename__ = "circular_acks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    circular_id: Mapped[int] = mapped_column(ForeignKey("circulars.id"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    user_name: Mapped[str] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(60))
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    circular = relationship("Circular", back_populates="acknowledgements")


class Appeal(Base):
    """Citizen appeals escalated to State Officer against District-level closure/orders."""
    __tablename__ = "appeals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), index=True)
    tracking_id: Mapped[str] = mapped_column(String(30), index=True)
    citizen_phone: Mapped[str] = mapped_column(String(30), default="")
    reason: Mapped[str] = mapped_column(Text)
    evidence_url: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="pending")  # pending | upheld | overturned_with_direction | remanded_to_district
    order_text: Mapped[str] = mapped_column(Text, default="")
    decided_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    decided_by_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    due_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SlaRule(Base):
    """Versioned SLA and escalation parameters editable only by National Admin."""
    __tablename__ = "sla_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    scope: Mapped[str] = mapped_column(String(60), default="national")
    critical_hours: Mapped[int] = mapped_column(Integer, default=48)
    high_hours: Mapped[int] = mapped_column(Integer, default=72)
    routine_days: Mapped[int] = mapped_column(Integer, default=7)
    district_escalation_days: Mapped[int] = mapped_column(Integer, default=7)
    state_escalation_days: Mapped[int] = mapped_column(Integer, default=14)
    state_review_days: Mapped[int] = mapped_column(Integer, default=30)
    ack_target_hours: Mapped[int] = mapped_column(Integer, default=24)
    composite_weights_json: Mapped[dict] = mapped_column(JSON, default=lambda: {"sla": 40, "speed": 25, "reopen": 20, "rating": 15})
    values_json: Mapped[dict] = mapped_column(JSON, default=dict)
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    author: Mapped[str] = mapped_column(String(100), default="National Admin")
    reason: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditEvent(Base):
    """Append-only, hash-chained cryptographic audit event."""
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prev_hash: Mapped[str] = mapped_column(String(64), default="0"*64, index=True)
    hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    actor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_username: Mapped[str] = mapped_column(String(60), default="")
    actor_name: Mapped[str] = mapped_column(String(100), default="")
    role: Mapped[str] = mapped_column(String(40), default="")
    jurisdiction: Mapped[str] = mapped_column(String(100), default="")
    action: Mapped[str] = mapped_column(String(80), index=True)
    target_type: Mapped[str] = mapped_column(String(40), default="")
    target_id: Mapped[str] = mapped_column(String(80), default="")
    detail_json: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[str] = mapped_column(String(50), default="127.0.0.1")
    result: Mapped[str] = mapped_column(String(20), default="success")  # success | rejected | error
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class InAppNotification(Base):
    """In-app live notification center events for officials."""
    __tablename__ = "inapp_notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    role: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    type: Mapped[str] = mapped_column(String(40))  # assigned | escalated | proof_submitted | rework_requested | dispute | approval_needed | project_decision | show_cause | circular | hearing | emergency | sla_warning | sla_breached
    title: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str] = mapped_column(String(200), default="/officer")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ResourceDocument(Base):
    """SOPs, grievance redressal policies, and codes of conduct."""
    __tablename__ = "resource_documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50))  # policy | sop | code_of_conduct | faq | escalation_matrix
    version: Mapped[str] = mapped_column(String(20), default="v1.0")
    url: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    uploaded_by: Mapped[str] = mapped_column(String(100), default="National Admin")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Integration(Base):
    """External connector and data feed registry."""
    __tablename__ = "integrations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    category: Mapped[str] = mapped_column(String(50))  # open311 | cpgrams_stub | sso_epramaan | digilocker_mock | esign_mock | sms_gateway | whatsapp_gateway
    status: Mapped[str] = mapped_column(String(30), default="connected")  # connected | degraded | not_connected | syncing
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    config_ref: Mapped[str] = mapped_column(String(100), default="")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    endpoint_url: Mapped[str] = mapped_column(Text, default="")


class OfficerProfile(Base):
    """Publicly displayed official contact card for citizens."""
    __tablename__ = "officer_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    office_address: Mapped[str] = mapped_column(Text, default="")
    working_hours: Mapped[str] = mapped_column(String(100), default="10:00 AM - 5:00 PM (Mon-Sat)")
    helpline: Mapped[str] = mapped_column(String(40), default="1800-111-222")
    official_email: Mapped[str] = mapped_column(String(100), default="grievance.cell@gov.in")
    photo_url: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
