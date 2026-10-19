import hmac
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException

from opshub_ai.config import Settings
from opshub_ai.providers.base import IntakeProvider
from opshub_ai.providers.disabled import DisabledProvider
from opshub_ai.providers.mock import MockProvider
from opshub_ai.providers.openai_provider import OpenAIProvider
from opshub_ai.retrieval import KnowledgeBase
from opshub_ai.schemas import TurnRequest, TurnResponse
from opshub_ai.turn_service import TurnService


def build_provider(settings: Settings) -> IntakeProvider:
    if settings.provider == "disabled":
        return DisabledProvider()
    if settings.provider == "mock":
        return MockProvider()
    if settings.openai_api_key is None:
        raise RuntimeError("openai_api_key_required")
    return OpenAIProvider.from_api_key(
        api_key=settings.openai_api_key.get_secret_value(),
        model=settings.openai_model,
        max_input_bytes=settings.max_input_bytes,
        max_output_tokens=settings.max_output_tokens,
    )


def create_app(settings: Settings) -> FastAPI:
    provider = build_provider(settings)
    knowledge = KnowledgeBase.from_directory(Path(__file__).parent / "knowledge")
    service = TurnService(
        provider=provider,
        knowledge=knowledge,
        timeout_seconds=settings.provider_timeout_seconds,
        max_retries=settings.max_retries,
    )
    app = FastAPI(
        title="OpsHub AI Intake",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    def require_internal_key(
        supplied_key: str | None = Header(default=None, alias="X-OpsHub-AI-Key"),
    ) -> None:
        expected = settings.internal_key.get_secret_value()
        if supplied_key is None or not hmac.compare_digest(supplied_key, expected):
            raise HTTPException(
                status_code=401,
                detail="internal_authentication_required",
            )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def ready() -> dict[str, str]:
        return {"status": "ready", "provider": provider.name}

    @app.post(
        "/v1/intake/turn",
        response_model=TurnResponse,
        response_model_exclude_none=True,
        dependencies=[Depends(require_internal_key)],
    )
    async def intake_turn(turn: TurnRequest) -> TurnResponse:
        return await service.run(turn)

    return app
