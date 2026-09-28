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
    fixed: bool = True
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str = ""


class ConfirmIn(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str = ""


class ReviewIn(BaseModel):
    category: str | None = None
    area_id: int | None = None
    action: str = "approve"  # approve | reject_spam | mark_emergency_handled


class ProofItemIn(BaseModel):
    file_url: str
    file_name: str = "resolution_proof.jpg"
    file_type: str = "photo"  # photo | document
    file_size: int = 0
    mime_type: str = "image/jpeg"
    lat: float | None = None
    lng: float | None = None
    exif_metadata: dict = Field(default_factory=dict)


class ResolveWithProofIn(BaseModel):
    closure_note: str = Field(..., min_length=5)
    officer_name: str = "Field Officer"
    department: str = ""
    proofs: list[ProofItemIn] = Field(..., min_length=1)
    force: bool = False


class AssignIn(BaseModel):
    officer_name: str
    department: str = ""
    note: str = ""


class ProgressIn(BaseModel):
    officer_name: str = ""
    note: str = "Field work commenced on site"


class DisputeIn(BaseModel):
    reason: str = Field(..., min_length=2)
    photo: str | None = None


class FlagProofIn(BaseModel):
    suspicious: bool = True
    reason: str = "Flagged by supervisor for audit inspection"


class CloseIn(BaseModel):
    closure_note: str
    force: bool = False
    proofs: list[ProofItemIn] = Field(default_factory=list)


class DecisionIn(BaseModel):
    decision: str  # approve | defer | reject | start | complete
    reason: str = ""


class OptimiseIn(BaseModel):
    country: str
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

