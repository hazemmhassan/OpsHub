import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, TypedDict

TOKEN_PATTERN = re.compile(
    r"[a-z0-9\u0621-\u063a\u0641-\u064a\u0660-\u0669]+",
    re.IGNORECASE,
)
ARABIC_DIACRITICS = re.compile(r"[\u0617-\u061a\u064b-\u0652\u0670\u06d6-\u06ed]")
SECTION_PATTERN = re.compile(r"^## (ar|en) \| (.+)$")
ARABIC_QUESTION_STOPWORDS = {"هل", "يمكن"}
ENGLISH_STOPWORDS = {
    "a",
    "an",
    "and",
    "can",
    "could",
    "do",
    "does",
    "for",
    "how",
    "i",
    "in",
    "include",
    "includes",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "the",
    "to",
    "we",
    "what",
    "when",
    "where",
    "will",
    "with",
    "you",
    "your",
}


@dataclass(frozen=True)
class KnowledgeChunk:
    chunk_id: str
    document_id: str
    locale: Literal["ar", "en"]
    title: str
    text: str


@dataclass(frozen=True)
class SearchResult:
    chunk: KnowledgeChunk
    score: float


@dataclass(frozen=True)
class RetrievalMetrics:
    case_count: int
    recall_at_k: float
    mean_reciprocal_rank: float


class RetrievalCase(TypedDict):
    query: str
    relevant: list[str]


def _normalize(value: str) -> str:
    value = ARABIC_DIACRITICS.sub("", value.lower())
    for source, replacement in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي")):
        value = value.replace(source, replacement)
    return value


def _tokens(value: str) -> list[str]:
    tokens: list[str] = []
    for token in TOKEN_PATTERN.findall(_normalize(value)):
        if token in ARABIC_QUESTION_STOPWORDS or token in ENGLISH_STOPWORDS:
            continue
        tokens.append(token)
        if not re.search(r"[\u0621-\u063a\u0641-\u064a]", token):
            if token.endswith("s") and len(token) > 4:
                tokens.append(token[:-1])
            continue

        stem = token
        for prefix in ("بال", "لل", "ال", "ب", "ل"):
            if stem.startswith(prefix) and len(stem) - len(prefix) >= 3:
                stem = stem[len(prefix) :]
                break
        if stem.endswith("ا") and len(stem) > 4:
            stem = stem[:-1]
        if stem != token:
            tokens.append(stem)
    return tokens


def _slug(value: str) -> str:
    return "-".join(TOKEN_PATTERN.findall(_normalize(value)))


class KnowledgeBase:
    def __init__(self, chunks: tuple[KnowledgeChunk, ...]) -> None:
        self.chunks = chunks
        self._token_counts = [Counter(_tokens(chunk.text)) for chunk in chunks]
        self._document_lengths = [sum(counts.values()) for counts in self._token_counts]
        self._average_length = (
            sum(self._document_lengths) / len(self._document_lengths) if chunks else 0
        )
        self._document_frequency = Counter(
            token for counts in self._token_counts for token in counts
        )

    @classmethod
    def from_directory(cls, directory: Path) -> "KnowledgeBase":
        chunks: list[KnowledgeChunk] = []
        for path in sorted(directory.glob("*.md")):
            chunks.extend(_load_document(path))
        return cls(tuple(chunks))

    def search(
        self,
        query: str,
        *,
        limit: int = 3,
        locale: Literal["ar", "en"] | None = None,
    ) -> list[SearchResult]:
        query_tokens = set(_tokens(query))
        if not query_tokens or not self.chunks or self._average_length == 0:
            return []

        results: list[SearchResult] = []
        document_count = len(self.chunks)
        for index, chunk in enumerate(self.chunks):
            if locale is not None and chunk.locale != locale:
                continue
            counts = self._token_counts[index]
            document_length = self._document_lengths[index]
            score = 0.0
            for token in query_tokens:
                frequency = counts.get(token, 0)
                if frequency == 0:
                    continue
                document_frequency = self._document_frequency[token]
                inverse_frequency = math.log(
                    1
                    + (document_count - document_frequency + 0.5)
                    / (document_frequency + 0.5)
                )
                saturation = frequency + 1.5 * (
                    0.25 + 0.75 * document_length / self._average_length
                )
                score += inverse_frequency * frequency * 2.5 / saturation
            if score > 0:
                results.append(SearchResult(chunk=chunk, score=score))

        return sorted(
            results, key=lambda result: (-result.score, result.chunk.chunk_id)
        )[:limit]


def _load_document(path: Path) -> list[KnowledgeChunk]:
    lines = path.read_text("utf-8").splitlines()
    if not lines or not lines[0].startswith("# "):
        raise ValueError(f"knowledge_title_missing:{path.name}")
    titles = [title.strip() for title in lines[0][2:].split("|", maxsplit=1)]
    if len(titles) != 2:
        raise ValueError(f"knowledge_bilingual_title_missing:{path.name}")

    chunks: list[KnowledgeChunk] = []
    locale: Literal["ar", "en"] | None = None
    section = ""
    content: list[str] = []

    def append_chunk() -> None:
        if locale is None:
            return
        body = "\n".join(content).strip()
        if not body:
            raise ValueError(f"knowledge_section_empty:{path.name}:{section}")
        localized_title = titles[1] if locale == "ar" else titles[0]
        chunks.append(
            KnowledgeChunk(
                chunk_id=f"{path.stem}.{locale}.{_slug(section)}",
                document_id=path.stem,
                locale=locale,
                title=f"{localized_title} — {section}",
                text=body,
            )
        )

    for line in lines[1:]:
        match = SECTION_PATTERN.match(line)
        if match:
            append_chunk()
            locale = match.group(1)  # type: ignore[assignment]
            section = match.group(2).strip()
            content = []
        else:
            content.append(line)
    append_chunk()
    return chunks


def evaluate_retrieval(
    knowledge: KnowledgeBase,
    cases: list[RetrievalCase],
    *,
    limit: int,
) -> RetrievalMetrics:
    recall_total = 0.0
    reciprocal_rank_total = 0.0
    for case in cases:
        ranked = [
            result.chunk.chunk_id
            for result in knowledge.search(case["query"], limit=limit)
        ]
        relevant = set(case["relevant"])
        recall_total += len(relevant.intersection(ranked)) / len(relevant)
        ranks = [
            ranked.index(chunk_id) + 1 for chunk_id in relevant if chunk_id in ranked
        ]
        reciprocal_rank_total += 1 / min(ranks) if ranks else 0

    case_count = len(cases)
    return RetrievalMetrics(
        case_count=case_count,
        recall_at_k=recall_total / case_count if case_count else 0,
        mean_reciprocal_rank=reciprocal_rank_total / case_count if case_count else 0,
    )
