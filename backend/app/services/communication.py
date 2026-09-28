"""Citizen Communication Relay Adapter with Mock SMS/WhatsApp Gateway."""
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.governance import CitizenMessage, MessageTemplate
from app.models.request import CitizenRequest
from app.services import pipeline, audit_chain


DEFAULT_TEMPLATES = [
    {
        "id": "arrival_notice",
        "title": "Field Officer Arrival Notice",
        "channel": "all",
        "category": "field",
        "template_text": "Namaste! JanSetu Field Officer {officer_name} is arriving at your location ({location}) today between {time_window} for inspection of grievance {tracking_id}.",
    },
    {
        "id": "doc_request",
        "title": "Request Supporting Document / Photo",
        "channel": "all",
        "category": "verification",
        "template_text": "Regarding grievance {tracking_id}: To proceed with resolution, please upload or provide a copy of {doc_name} via your JanSetu tracking link.",
    },
    {
        "id": "progress_update",
        "title": "Work in Progress Update",
        "channel": "all",
        "category": "field",
        "template_text": "JanSetu Update on {tracking_id}: Repair work has commenced on site under Department supervision. Expected completion within {est_days} days.",
    },
    {
        "id": "closure_notice",
        "title": "Work Completed & Confirmation Request",
        "channel": "all",
        "category": "closure",
        "template_text": "JanSetu: Work for grievance {tracking_id} is completed with geotagged photo proof. Please check your status link to confirm or provide feedback.",
    },
]


def ensure_default_templates(db: Session):
    """Seed standard messaging templates if missing."""
    for t in DEFAULT_TEMPLATES:
        existing = db.query(MessageTemplate).filter_by(id=t["id"]).first()
        if not existing:
            db.add(MessageTemplate(
                id=t["id"],
                title=t["title"],
                channel=t["channel"],
                category=t["category"],
                template_text=t["template_text"],
            ))
    db.commit()


class MockSmsGateway:
    """Mock SMS Gateway Adapter (e.g. CDAC / NIC SMS Gateway or Twilio stub)."""
    @staticmethod
    def send_sms(phone: str, message: str) -> dict:
        return {
            "status": "delivered",
            "provider": "Mock-NIC-SMS-Gateway",
            "message_id": f"msg_sms_{int(datetime.utcnow().timestamp())}",
            "delivered_at": datetime.utcnow().isoformat(),
        }


class MockWhatsAppGateway:
    """Mock WhatsApp Business API Gateway Adapter."""
    @staticmethod
    def send_whatsapp(phone: str, message: str) -> dict:
        return {
            "status": "delivered",
            "provider": "Mock-WhatsApp-Business-Cloud",
            "message_id": f"msg_wa_{int(datetime.utcnow().timestamp())}",
            "delivered_at": datetime.utcnow().isoformat(),
        }


def send_citizen_relay_message(
    db: Session,
    *,
    request_id: int,
    sender_id: int,
    sender_name: str,
    sender_role: str,
    template_id: str,
    channel: str = "sms",
    variables: Optional[Dict[str, str]] = None,
    custom_text: Optional[str] = None,
) -> CitizenMessage:
    """Dispatches a templated communication to the citizen and logs it in the grievance timeline."""
    req = db.get(CitizenRequest, request_id)
    if not req:
        raise ValueError(f"CitizenRequest {request_id} not found")

    ensure_default_templates(db)
    tpl = db.query(MessageTemplate).filter_by(id=template_id).first()

    vars_dict = {
        "tracking_id": req.tracking_id,
        "officer_name": sender_name,
        "location": req.location_text or (req.area.name if req.area else "Your locality"),
        "doc_name": "additional site photo",
        "time_window": "11:00 AM - 3:00 PM",
        "est_days": "2",
    }
    if variables:
        vars_dict.update(variables)

    if custom_text:
        rendered_msg = custom_text
    elif tpl:
        try:
            rendered_msg = tpl.template_text.format(**vars_dict)
        except Exception:
            rendered_msg = tpl.template_text
    else:
        rendered_msg = f"Update regarding grievance {req.tracking_id} from {sender_name}."

    # Dispatch via selected gateway adapter
    if channel.lower() == "whatsapp":
        res = MockWhatsAppGateway.send_whatsapp(phone="masked", message=rendered_msg)
    else:
        res = MockSmsGateway.send_sms(phone="masked", message=rendered_msg)

    # Record message log
    c_msg = CitizenMessage(
        request_id=req.id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        template_id=template_id,
        channel=channel.lower(),
        message_text=rendered_msg,
        status=res.get("status", "sent"),
        sent_at=datetime.utcnow(),
    )
    db.add(c_msg)

    # Append to StatusHistory timeline for citizen visibility
    pipeline.record_status_transition(
        db, req,
        status=req.status,
        stage_label=f"Officer Message Sent ({channel.upper()})",
        actor_role=sender_role,
        actor_name=sender_name,
        department=req.assigned_department or req.category,
        note=rendered_msg,
        public_visible=True,
    )

    audit_chain.record_audit_event(
        db,
        actor_id=sender_id,
        actor_username=sender_name,
        actor_name=sender_name,
        role=sender_role,
        jurisdiction=req.block or req.area.district if req.area else "Local",
        action="send_citizen_message",
        target_type="request",
        target_id=req.tracking_id,
        detail={"template_id": template_id, "channel": channel, "status": c_msg.status},
    )

    db.commit()
    return c_msg
