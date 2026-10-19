import json
from typing import Any, Protocol, cast

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    ContentFilterFinishReasonError,
    LengthFinishReasonError,
    RateLimitError,
)
from pydantic import ValidationError

from opshub_ai.privacy import provider_safe_turn
from opshub_ai.providers.base import (
    ProviderBudgetError,
    ProviderContext,
    ProviderPermanentError,
    ProviderTemporaryError,
)
from opshub_ai.schemas import TurnRequest, TurnResponse


class ResponsesClient(Protocol):
    async def parse(self, **kwargs: Any) -> Any: ...


class OpenAIClient(Protocol):
    @property
    def responses(self) -> ResponsesClient: ...


class OpenAIProvider:
    name = "openai"

    def __init__(
        self,
        *,
        client: OpenAIClient,
        model: str,
        max_input_bytes: int,
        max_output_tokens: int,
    ) -> None:
        self.client = client
        self.model = model
        self.max_input_bytes = max_input_bytes
        self.max_output_tokens = max_output_tokens

    @classmethod
    def from_api_key(
        cls,
        *,
        api_key: str,
        model: str,
        max_input_bytes: int,
        max_output_tokens: int,
    ) -> "OpenAIProvider":
        client = cast(
            OpenAIClient,
            AsyncOpenAI(api_key=api_key, max_retries=0),
        )
        return cls(
            client=client,
            model=model,
            max_input_bytes=max_input_bytes,
            max_output_tokens=max_output_tokens,
        )

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse:
        safe_turn = provider_safe_turn(turn)
        instructions = (
            "You are the optional OpsHub intake assistant. Return only the typed "
            "response. Never approve, reject, submit, call tools, invent facts, or "
            "request secrets. Answer knowledge questions only from the supplied "
            "chunks and cite only their exact chunk_id values. If the chunks do not "
            "support an answer, hand off. Ask one concise question when collecting."
        )
        provider_payload = {
            "turn": safe_turn.model_dump(exclude_none=True),
            "knowledge_chunks": [
                {
                    "chunk_id": chunk.chunk_id,
                    "title": chunk.title,
                    "locale": chunk.locale,
                    "text": chunk.text,
                }
                for chunk in context.chunks
            ],
        }
        provider_content = json.dumps(provider_payload, ensure_ascii=False)
        input_size = len(instructions.encode("utf-8")) + len(
            provider_content.encode("utf-8")
        )
        if input_size > self.max_input_bytes:
            raise ProviderBudgetError("provider_input_budget_exceeded")

        try:
            response = await self.client.responses.parse(
                model=self.model,
                instructions=instructions,
                input=[
                    {
                        "role": "user",
                        "content": provider_content,
                    }
                ],
                text_format=TurnResponse,
                max_output_tokens=self.max_output_tokens,
                store=False,
            )
        except (APIConnectionError, APITimeoutError, RateLimitError) as error:
            raise ProviderTemporaryError("provider_temporary_failure") from error
        except APIStatusError as error:
            if error.status_code >= 500:
                raise ProviderTemporaryError("provider_temporary_failure") from error
            raise ProviderPermanentError("provider_rejected_request") from error
        except (
            ContentFilterFinishReasonError,
            LengthFinishReasonError,
            ValidationError,
        ) as error:
            raise ProviderPermanentError("provider_invalid_output") from error

        parsed = response.output_parsed
        if not isinstance(parsed, TurnResponse):
            raise ProviderPermanentError("provider_invalid_output")
        return parsed
