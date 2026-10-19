import asyncio

import pytest

from opshub_ai.providers.base import (
    ProviderBudgetError,
    ProviderContext,
    ProviderTemporaryError,
)
from opshub_ai.schemas import TurnRequest, TurnResponse
from opshub_ai.turn_service import TurnService


def request() -> TurnRequest:
    return TurnRequest.model_validate(
        {
            "schema_version": "ai-intake-turn-v1",
            "locale": "ar",
            "session_id": "session_7J4p9m2Qx5",
            "latest_message": "أحتاج مساعدة في تنظيم طلبات الدعم.",
            "draft": {
                "requester_type": "company",
                "service_category": None,
                "request_title": None,
                "description": None,
                "company_name": None,
                "job_title": None,
                "company_website": None,
            },
            "completed_fields": ["email", "phone"],
        }
    )


def success_response() -> TurnResponse:
    return TurnResponse.model_validate(
        {
            "schema_version": "ai-intake-turn-v1",
            "status": "collecting",
            "assistant_message": "ما النتيجة الأساسية التي تريدها؟",
            "draft_patch": {"service_category": "support_maintenance"},
            "next_field": "description",
            "citations": [],
            "handoff_reason": None,
        }
    )


class TemporaryThenSuccessfulProvider:
    name = "test"
    model = "test-model"

    def __init__(self) -> None:
        self.attempts = 0

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse:
        self.attempts += 1
        if self.attempts == 1:
            raise ProviderTemporaryError("temporary")
        return success_response()


class SlowProvider:
    name = "test"
    model = "test-model"

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse:
        await asyncio.sleep(0.1)
        return success_response()


class OverBudgetProvider:
    name = "test"
    model = "test-model"

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse:
        raise ProviderBudgetError("provider_input_budget_exceeded")


@pytest.mark.asyncio
async def test_temporary_provider_failure_is_retried_once() -> None:
    provider = TemporaryThenSuccessfulProvider()
    service = TurnService(provider=provider, timeout_seconds=1, max_retries=1)

    result = await service.run(request())

    assert result.status == "collecting"
    assert provider.attempts == 2


@pytest.mark.asyncio
async def test_timeout_returns_fixed_form_fallback() -> None:
    service = TurnService(provider=SlowProvider(), timeout_seconds=0.01, max_retries=1)

    result = await service.run(request())
    expected_message = (
        "تعذر تشغيل المساعد الآن. يمكنك متابعة الطلب من خلال النموذج العادي."
    )

    assert result.model_dump(exclude_none=True) == {
        "schema_version": "ai-intake-turn-v1",
        "status": "fallback",
        "assistant_message": expected_message,
        "draft_patch": {},
        "citations": [],
        "handoff_reason": "provider_unavailable",
    }


@pytest.mark.asyncio
async def test_input_budget_exhaustion_returns_fixed_form_fallback() -> None:
    service = TurnService(
        provider=OverBudgetProvider(),
        timeout_seconds=1,
        max_retries=1,
    )

    result = await service.run(request())

    assert result.status == "fallback"
    assert result.handoff_reason == "budget_exhausted"
