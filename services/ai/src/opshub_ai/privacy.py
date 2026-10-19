import re

from opshub_ai.schemas import ModelSafeDraft, TurnRequest

EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    flags=re.IGNORECASE,
)
PHONE_CANDIDATE_PATTERN = re.compile(
    r"(?<!\w)(?:\+|00)?[\d\u0660-\u0669\u06f0-\u06f9]"
    r"[\d\u0660-\u0669\u06f0-\u06f9 ()-]{5,}"
    r"[\d\u0660-\u0669\u06f0-\u06f9](?!\w)"
)
DIGIT_PATTERN = re.compile(r"[\d\u0660-\u0669\u06f0-\u06f9]")
ISO_DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


def redact_contact_values(value: str) -> str:
    without_email = EMAIL_PATTERN.sub("[email removed]", value)

    def replace_phone(match: re.Match[str]) -> str:
        candidate = match.group(0)
        if ISO_DATE_PATTERN.fullmatch(candidate):
            return candidate
        if len(DIGIT_PATTERN.findall(candidate)) < 7:
            return candidate
        return "[phone removed]"

    return PHONE_CANDIDATE_PATTERN.sub(replace_phone, without_email)


def provider_safe_turn(turn: TurnRequest) -> TurnRequest:
    safe_draft = {
        field: redact_contact_values(value) if isinstance(value, str) else value
        for field, value in turn.draft.model_dump().items()
    }
    return turn.model_copy(
        update={
            "latest_message": redact_contact_values(turn.latest_message),
            "draft": ModelSafeDraft.model_validate(safe_draft),
        }
    )
