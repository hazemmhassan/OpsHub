from typing import Any

import pytest

from opshub_ai.providers.base import (
    ProviderBudgetError,
    ProviderContext,
    ProviderPermanentError,
)
from opshub_ai.providers.openai_provider import OpenAIProvider
from opshub_ai.schemas import TurnRequest, TurnResponse


class ParsedResponse:
    output_parsed = TurnResponse.model_validate(
        {
            "schema_version": "ai-intake-turn-v1",
            "status": "collecting",
            "assistant_message": "What outcome do you need?",
            "draft_patch": {"service_category": "it_software"},
            "next_field": "description",
            "citations": [],
            "handoff_reason": None,
        }
    )


class FakeResponses:
    def __init__(self) -> None:
        self.arguments: dict[str, Any] | None = None

    async def parse(self, **kwargs: Any) -> ParsedResponse:
        self.arguments = kwargs
        return ParsedResponse()


class FakeClient:
    def __init__(self) -> None:
        self.responses = FakeResponses()


class InvalidResponses:
    async def parse(self, **kwargs: Any) -> ParsedResponse:
        TurnResponse.model_validate({"status": "not-valid"})
        raise AssertionError("validation should fail first")


class InvalidClient:
    def __init__(self) -> None:
        self.responses = InvalidResponses()


def request() -> TurnRequest:
    return TurnRequest.model_validate(
        {
            "schema_version": "ai-intake-turn-v1",
            "locale": "en",
            "session_id": "session_7J4p9m2Qx5",
            "latest_message": (
                "Contact private@example.test or call +20 101 234 5678. "
                "Arabic digits: ٠١٠١٢٣٤٥٦٧٨."
            ),
            "draft": {
                "requester_type": "company",
                "service_category": None,
                "request_title": None,
                "description": "Email backup@example.test about the support portal.",
                "company_name": None,
                "job_title": None,
                "company_website": None,
            },
            "completed_fields": ["email", "phone"],
        }
    )


@pytest.mark.asyncio
async def test_openai_provider_disables_storage_and_uses_typed_output() -> None:
    client = FakeClient()
    provider = OpenAIProvider(
        client=client,
        model="gpt-6-luna",
        max_input_bytes=16_000,
        max_output_tokens=600,
    )

    result = await provider.complete(request(), ProviderContext())

    assert result.status == "collecting"
    assert client.responses.arguments is not None
    assert client.responses.arguments["store"] is False
    assert client.responses.arguments["model"] == "gpt-6-luna"
    assert client.responses.arguments["text_format"] is TurnResponse
    assert client.responses.arguments["max_output_tokens"] == 600
    provider_input = client.responses.arguments["input"]
    serialized_payload = str(provider_input[0]["content"])
    assert "private@example.test" not in serialized_payload
    assert "backup@example.test" not in serialized_payload
    assert "+20 101 234 5678" not in serialized_payload
    assert "٠١٠١٢٣٤٥٦٧٨" not in serialized_payload
    assert "[email removed]" in serialized_payload
    assert "[phone removed]" in serialized_payload


@pytest.mark.asyncio
async def test_openai_provider_maps_invalid_structured_output_to_safe_error() -> None:
    provider = OpenAIProvider(
        client=InvalidClient(),
        model="gpt-6-luna",
        max_input_bytes=16_000,
        max_output_tokens=600,
    )

    with pytest.raises(ProviderPermanentError, match="provider_invalid_output"):
        await provider.complete(request(), ProviderContext())


@pytest.mark.asyncio
async def test_openai_provider_rejects_an_over_budget_payload_before_calling_api() -> (
    None
):
    client = FakeClient()
    provider = OpenAIProvider(
        client=client,
        model="gpt-6-luna",
        max_input_bytes=100,
        max_output_tokens=600,
    )

    with pytest.raises(ProviderBudgetError, match="provider_input_budget_exceeded"):
        await provider.complete(request(), ProviderContext())

    assert client.responses.arguments is None
