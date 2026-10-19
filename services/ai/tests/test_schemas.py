import pytest
from pydantic import ValidationError

from opshub_ai.schemas import TurnRequest, TurnResponse


def valid_turn_request() -> dict[str, object]:
    return {
        "schema_version": "ai-intake-turn-v1",
        "locale": "en",
        "session_id": "session_7J4p9m2Qx5",
        "latest_message": "We need help organizing incoming support requests.",
        "draft": {
            "requester_type": "company",
            "service_category": None,
            "request_title": None,
            "description": None,
            "company_name": None,
            "job_title": None,
            "company_website": None,
        },
        "completed_fields": ["contact_name", "email", "phone", "country"],
    }


@pytest.mark.parametrize("forbidden_field", ["email", "phone", "phone_e164"])
def test_model_safe_draft_rejects_contact_values(forbidden_field: str) -> None:
    payload = valid_turn_request()
    draft = dict(payload["draft"])  # type: ignore[arg-type]
    draft[forbidden_field] = "private@example.test"
    payload["draft"] = draft

    with pytest.raises(ValidationError):
        TurnRequest.model_validate(payload)


def test_latest_message_is_limited_to_2000_characters() -> None:
    payload = valid_turn_request()
    payload["latest_message"] = "x" * 2001

    with pytest.raises(ValidationError):
        TurnRequest.model_validate(payload)


def test_response_rejects_unknown_patch_fields() -> None:
    with pytest.raises(ValidationError):
        TurnResponse.model_validate(
            {
                "schema_version": "ai-intake-turn-v1",
                "status": "collecting",
                "assistant_message": "Tell me more.",
                "draft_patch": {"approval_status": "approved"},
                "next_field": "description",
                "citations": [],
                "handoff_reason": None,
            }
        )
