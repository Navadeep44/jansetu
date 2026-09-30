from pydantic import BaseModel, Field


class TextIntake(BaseModel):
    text: str = Field(..., min_length=2, max_length=5000)
    language: str | None = None
    channel: str = "web"
    lat: float | None = None
    lng: float | None = None
    location_text: str = ""
    area_id: int | None = None
    phone: str | None = None
    anonymous: bool = False
    gender: str = "undisclosed"
    assisted_by: str | None = None
    country: str | None = None


class CommunityIntake(BaseModel):
    transcript: str = Field(..., min_length=10)
    area_id: int
    facilitator: str = "Gram Sabha secretary"
    language: str | None = None
    default_supporters: int = 1


class PreviewIn(BaseModel):
    text: str
    language: str | None = None


class VerifyIn(BaseModel):
    fixed: bool
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str = ""


class ReviewIn(BaseModel):
    category: str | None = None
    area_id: int | None = None
    action: str = "approve"  # approve | reject_spam | mark_emergency_handled


class CloseIn(BaseModel):
    closure_note: str
    force: bool = False


class DecisionIn(BaseModel):
    decision: str  # approve | defer | reject | start | complete
    reason: str = ""


class OptimiseIn(BaseModel):
    country: str | None = "IN"
    state: str | None = None
    budget: float
    include_approved: bool = True


class QueryIn(BaseModel):
    question: str


class SimulateIn(BaseModel):
    channel: str = "whatsapp"
    sender: str = "+910000000001"
    text: str = ""
    language: str | None = None
    lat: float | None = None
    lng: float | None = None


class ReplyIn(BaseModel):
    text: str = ""
    area_id: int | None = None
    lat: float | None = None
    lng: float | None = None
