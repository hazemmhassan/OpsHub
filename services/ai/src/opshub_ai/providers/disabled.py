from opshub_ai.providers.base import ProviderContext
from opshub_ai.schemas import DraftPatch, TurnRequest, TurnResponse


class DisabledProvider:
    name = "disabled"
    model = "none"

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse:
        message = (
            "المساعد غير متاح الآن. يمكنك متابعة الطلب من خلال النموذج العادي."
            if turn.locale == "ar"
            else "The assistant is unavailable. You can continue with the normal form."
        )
        return TurnResponse(
            schema_version="ai-intake-turn-v1",
            status="fallback",
            assistant_message=message,
            draft_patch=DraftPatch(),
            handoff_reason="ai_disabled",
        )
