import re

from opshub_ai.providers.base import ProviderContext
from opshub_ai.schemas import (
    Citation,
    DraftPatch,
    ServiceCategory,
    TurnRequest,
    TurnResponse,
)


class MockProvider:
    name = "mock"
    model = "deterministic-mock-v1"

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse:
        if context.chunks and _looks_like_question(turn.latest_message):
            chunk = context.chunks[0]
            return TurnResponse(
                schema_version="ai-intake-turn-v1",
                status="answering",
                assistant_message=chunk.text,
                citations=[
                    Citation(
                        chunk_id=chunk.chunk_id,
                        title=chunk.title,
                        locale=chunk.locale,
                    )
                ],
            )
        if _looks_like_question(turn.latest_message):
            message = (
                "هذا السؤال خارج نطاق المعلومات المتاحة. تابع بالنموذج العادي."
                if turn.locale == "ar"
                else "That question is outside the available information. Continue "
                "with the normal form."
            )
            return TurnResponse(
                schema_version="ai-intake-turn-v1",
                status="handoff",
                assistant_message=message,
                handoff_reason="unsupported_question",
            )
        message = (
            "ما النتيجة الأساسية التي تريد الوصول إليها؟"
            if turn.locale == "ar"
            else "What is the main outcome you want to achieve?"
        )
        category = _classify_category(turn.latest_message)
        title = _propose_title(turn.latest_message)
        description = (
            turn.latest_message.strip()
            if len(turn.latest_message.strip()) >= 20
            else None
        )
        return TurnResponse(
            schema_version="ai-intake-turn-v1",
            status="collecting",
            assistant_message=message,
            draft_patch=DraftPatch(
                service_category=category,
                request_title=title,
                description=description,
            ),
            next_field="description",
        )


def _looks_like_question(message: str) -> bool:
    normalized = message.strip().lower()
    question_starts = (
        "can ",
        "could ",
        "do ",
        "does ",
        "how ",
        "is ",
        "what ",
        "when ",
        "where ",
        "will ",
        "هل ",
        "كيف ",
        "ما ",
        "ماذا ",
        "متى ",
        "أين ",
    )
    return (
        "?" in normalized or "؟" in normalized or normalized.startswith(question_starts)
    )


def _classify_category(message: str) -> ServiceCategory | None:
    normalized = message.lower()
    keyword_groups: tuple[tuple[ServiceCategory, tuple[str, ...]], ...] = (
        (
            "it_software",
            ("software", "website", "automation", "system", "برمج", "موقع", "أتمت"),
        ),
        ("marketing", ("marketing", "campaign", "audience", "تسويق", "حملة", "جمهور")),
        ("training", ("training", "workshop", "learners", "تدريب", "ورشة", "متدرب")),
        (
            "support_maintenance",
            ("support", "maintenance", "issue", "دعم", "صيانة", "مشكلة"),
        ),
        (
            "consulting",
            ("consulting", "strategy", "process map", "استشار", "خطة", "عملية"),
        ),
    )
    scored = [
        (sum(keyword in normalized for keyword in keywords), index, category)
        for index, (category, keywords) in enumerate(keyword_groups)
    ]
    score, _, category = max(scored, key=lambda item: (item[0], -item[1]))
    return category if score else None


def _propose_title(message: str) -> str | None:
    value = message.strip()
    value = re.sub(
        r"^(?:we need|i need)\s+(?:an?\s+)?|^(?:نحتاج|محتاجين|أحتاج)\s+",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = value.rstrip(".!؟? ")
    if not 5 <= len(value) <= 120:
        return None
    return value[0].upper() + value[1:] if value[0].isascii() else value
