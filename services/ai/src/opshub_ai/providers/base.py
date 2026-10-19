from dataclasses import dataclass
from typing import Protocol

from opshub_ai.retrieval import KnowledgeChunk
from opshub_ai.schemas import TurnRequest, TurnResponse


@dataclass(frozen=True)
class ProviderContext:
    chunks: tuple[KnowledgeChunk, ...] = ()


class ProviderError(Exception):
    """Base class for safe provider errors."""


class ProviderTemporaryError(ProviderError):
    """A provider failure that may succeed once retried."""


class ProviderPermanentError(ProviderError):
    """A provider failure that should not be retried."""


class ProviderBudgetError(ProviderError):
    """A request that exceeds the configured provider budget."""


class IntakeProvider(Protocol):
    name: str
    model: str

    async def complete(
        self,
        turn: TurnRequest,
        context: ProviderContext,
    ) -> TurnResponse: ...
