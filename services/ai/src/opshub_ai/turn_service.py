import asyncio
import logging

from opshub_ai.providers.base import (
    IntakeProvider,
    ProviderBudgetError,
    ProviderContext,
    ProviderPermanentError,
    ProviderTemporaryError,
)
from opshub_ai.retrieval import KnowledgeBase
from opshub_ai.schemas import (
    DraftPatch,
    HandoffReason,
    ModelSafeDraft,
    NextField,
    TurnRequest,
    TurnResponse,
)

logger = logging.getLogger("opshub_ai.turn")


class TurnService:
    def __init__(
        self,
        *,
        provider: IntakeProvider,
        knowledge: KnowledgeBase | None = None,
        timeout_seconds: float,
        max_retries: int,
    ) -> None:
        self.provider = provider
        self.knowledge = knowledge
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    async def run(self, turn: TurnRequest) -> TurnResponse:
        results = (
            self.knowledge.search(turn.latest_message, limit=3, locale=turn.locale)
            if self.knowledge
            else []
        )
        handoff_reason = _deterministic_handoff_reason(turn.latest_message)
        if handoff_reason is not None:
            return self._handoff(turn, handoff_reason)
        context = ProviderContext(chunks=tuple(result.chunk for result in results))
        attempts = self.max_retries + 1
        for attempt in range(1, attempts + 1):
            try:
                result = await asyncio.wait_for(
                    self.provider.complete(turn, context), timeout=self.timeout_seconds
                )
                result = self._finalize(turn, result, context)
                logger.info(
                    "ai_turn_completed provider=%s model=%s locale=%s "
                    "status=%s attempt=%d",
                    self.provider.name,
                    self.provider.model,
                    turn.locale,
                    result.status,
                    attempt,
                )
                return result
            except TimeoutError:
                logger.warning(
                    "ai_turn_fallback provider=%s model=%s locale=%s "
                    "code=provider_timeout",
                    self.provider.name,
                    self.provider.model,
                    turn.locale,
                )
                return self._fallback(turn, "provider_unavailable")
            except ProviderTemporaryError:
                if attempt < attempts:
                    logger.warning(
                        "ai_turn_retry provider=%s model=%s locale=%s attempt=%d",
                        self.provider.name,
                        self.provider.model,
                        turn.locale,
                        attempt,
                    )
                    continue
                return self._fallback(turn, "provider_unavailable")
            except ProviderBudgetError:
                return self._fallback(turn, "budget_exhausted")
            except ProviderPermanentError:
                return self._fallback(turn, "provider_invalid_output")

        return self._fallback(turn, "provider_unavailable")

    @staticmethod
    def _finalize(
        turn: TurnRequest,
        result: TurnResponse,
        context: ProviderContext,
    ) -> TurnResponse:
        allowed_citations = {chunk.chunk_id for chunk in context.chunks}
        if any(
            citation.chunk_id not in allowed_citations for citation in result.citations
        ):
            raise ProviderPermanentError("provider_invalid_citation")

        patch = result.draft_patch.model_dump(exclude_none=True)
        updated_draft = turn.draft.model_copy(update=patch)
        next_field = next_required_field(turn, updated_draft)
        if next_field is None:
            return result.model_copy(
                update={"status": "review_ready", "next_field": None}
            )
        if result.status in {"fallback", "handoff"}:
            return result
        status = "answering" if result.status == "answering" else "collecting"
        return result.model_copy(update={"status": status, "next_field": next_field})

    @staticmethod
    def _fallback(
        turn: TurnRequest,
        reason: HandoffReason,
    ) -> TurnResponse:
        message = (
            "تعذر تشغيل المساعد الآن. يمكنك متابعة الطلب من خلال النموذج العادي."
            if turn.locale == "ar"
            else "The assistant is unavailable. You can continue with the normal form."
        )
        return TurnResponse(
            schema_version="ai-intake-turn-v1",
            status="fallback",
            assistant_message=message,
            draft_patch=DraftPatch(),
            handoff_reason=reason,
        )

    @staticmethod
    def _handoff(turn: TurnRequest, reason: HandoffReason) -> TurnResponse:
        messages = {
            "ar": {
                "unsupported_question": (
                    "هذا الطلب خارج نطاق المساعد. تابع بالنموذج العادي "
                    "أو تواصل مع الفريق."
                ),
                "sensitive_data": (
                    "لا تشارك بيانات حساسة هنا. احذفها وتابع بالنموذج العادي."
                ),
                "human_requested": (
                    "يمكنك متابعة الطلب بالنموذج العادي ليتواصل معك الفريق."
                ),
            },
            "en": {
                "unsupported_question": (
                    "That request is outside the assistant's scope. Continue with the "
                    "normal form or contact the team."
                ),
                "sensitive_data": (
                    "Do not share sensitive data here. Remove it and continue with the "
                    "normal form."
                ),
                "human_requested": (
                    "Continue with the normal form and the team can contact you."
                ),
            },
        }
        message = messages[turn.locale].get(
            reason,
            messages[turn.locale]["unsupported_question"],
        )
        return TurnResponse(
            schema_version="ai-intake-turn-v1",
            status="handoff",
            assistant_message=message,
            draft_patch=DraftPatch(),
            handoff_reason=reason,
        )


def _deterministic_handoff_reason(message: str) -> HandoffReason | None:
    normalized = message.casefold()
    injection_markers = (
        "ignore previous instructions",
        "system prompt",
        "reveal your hidden",
        "انسى التعليمات",
        "اكشف التعليمات",
        "التعليمات السرية",
    )
    sensitive_markers = (
        "password",
        "passcode",
        "credit card",
        "payment details",
        "identity document",
        "medical record",
        "كلمة المرور",
        "بيانات الدفع",
        "بطاقة ائتمان",
        "مستند الهوية",
        "معلومات صحية",
    )
    human_markers = (
        "speak to a human",
        "talk to a person",
        "human agent",
        "أكلم شخص",
        "اكلم شخص",
        "أكلم موظف",
        "اكلم موظف",
        "أتواصل مع شخص",
    )
    if any(marker in normalized for marker in injection_markers):
        return "unsupported_question"
    if any(marker in normalized for marker in sensitive_markers):
        return "sensitive_data"
    if any(marker in normalized for marker in human_markers):
        return "human_requested"
    return None


def next_required_field(
    turn: TurnRequest,
    draft: ModelSafeDraft,
) -> NextField | None:
    completed = set(turn.completed_fields)
    if draft.requester_type is None:
        return "requester_type"
    deterministic_fields: tuple[NextField, ...] = (
        "contact_name",
        "email",
        "phone",
        "country",
    )
    for field in deterministic_fields:
        if field not in completed:
            return field
    if draft.service_category is None:
        return "service_category"
    if draft.request_title is None:
        return "request_title"
    if draft.description is None:
        return "description"
    if draft.requester_type == "company" and draft.company_name is None:
        return "company_name"
    if "consent" not in completed:
        return "consent"
    return None
