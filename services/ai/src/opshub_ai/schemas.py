from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Locale = Literal["ar", "en"]
RequesterType = Literal["individual", "company"]
ServiceCategory = Literal[
    "consulting",
    "it_software",
    "marketing",
    "training",
    "support_maintenance",
    "other",
]
TurnStatus = Literal["collecting", "answering", "review_ready", "handoff", "fallback"]
NextField = Literal[
    "requester_type",
    "contact_name",
    "email",
    "phone",
    "country",
    "service_category",
    "request_title",
    "description",
    "desired_start_date",
    "preferred_contact_method",
    "company_name",
    "job_title",
    "company_website",
    "consent",
]
HandoffReason = Literal[
    "ai_disabled",
    "provider_unavailable",
    "provider_invalid_output",
    "unsupported_question",
    "sensitive_data",
    "human_requested",
    "rate_limited",
    "budget_exhausted",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ModelSafeDraft(StrictModel):
    requester_type: RequesterType | None = None
    service_category: ServiceCategory | None = None
    request_title: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    company_name: str | None = Field(default=None, max_length=160)
    job_title: str | None = Field(default=None, max_length=120)
    company_website: str | None = Field(default=None, max_length=2048)


class DraftPatch(StrictModel):
    requester_type: RequesterType | None = None
    service_category: ServiceCategory | None = None
    request_title: str | None = Field(default=None, min_length=5, max_length=120)
    description: str | None = Field(default=None, min_length=20, max_length=2000)
    company_name: str | None = Field(default=None, min_length=1, max_length=160)
    job_title: str | None = Field(default=None, min_length=1, max_length=120)
    company_website: str | None = Field(default=None, max_length=2048)


class Citation(StrictModel):
    chunk_id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=200)
    locale: Locale


class TurnRequest(StrictModel):
    schema_version: Literal["ai-intake-turn-v1"]
    locale: Locale
    session_id: str = Field(pattern=r"^[A-Za-z0-9_.-]{12,128}$")
    turn_number: int = Field(default=1, ge=1, le=12)
    latest_message: str = Field(min_length=1, max_length=2000)
    draft: ModelSafeDraft
    completed_fields: list[NextField] = Field(default_factory=list, max_length=15)


class TurnResponse(StrictModel):
    schema_version: Literal["ai-intake-turn-v1"]
    status: TurnStatus
    assistant_message: str = Field(min_length=1, max_length=2000)
    draft_patch: DraftPatch = Field(default_factory=DraftPatch)
    next_field: NextField | None = None
    citations: list[Citation] = Field(default_factory=list, max_length=3)
    handoff_reason: HandoffReason | None = None
