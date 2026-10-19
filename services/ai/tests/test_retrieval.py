import json
from pathlib import Path

from opshub_ai.retrieval import KnowledgeBase, evaluate_retrieval

ROOT = Path(__file__).parents[1]


def test_content_aware_loader_preserves_document_section_and_locale() -> None:
    knowledge = KnowledgeBase.from_directory(ROOT / "src" / "opshub_ai" / "knowledge")

    chunks = {chunk.chunk_id: chunk for chunk in knowledge.chunks}

    assert len(chunks) == 12
    assert chunks["it-software.ar.نطاق-الخدمة"].locale == "ar"
    assert chunks["it-software.ar.نطاق-الخدمة"].title == (
        "تقنية المعلومات والبرمجيات — نطاق الخدمة"
    )
    assert "ربط الأنظمة" in chunks["it-software.ar.نطاق-الخدمة"].text


def test_bm25_returns_ranked_chunks_with_positive_scores() -> None:
    knowledge = KnowledgeBase.from_directory(ROOT / "src" / "opshub_ai" / "knowledge")

    results = knowledge.search("workflow automation and system integrations", limit=3)

    assert results[0].chunk.chunk_id == "it-software.en.scope"
    assert results[0].score > 0
    assert len(results) <= 3


def test_unrelated_query_returns_no_false_citations() -> None:
    knowledge = KnowledgeBase.from_directory(ROOT / "src" / "opshub_ai" / "knowledge")

    assert knowledge.search("quantum astronomy telescope", limit=3) == []


def test_arabic_tracking_question_ranks_request_process_first() -> None:
    knowledge = KnowledgeBase.from_directory(ROOT / "src" / "opshub_ai" / "knowledge")

    results = knowledge.search("هل يمكن تتبع حالة الطلب بالرقم المرجعي؟", limit=3)

    assert results[0].chunk.chunk_id == "request-process.ar.المراجعة-والتواصل"


def test_locale_filter_never_returns_the_other_language() -> None:
    knowledge = KnowledgeBase.from_directory(ROOT / "src" / "opshub_ai" / "knowledge")

    results = knowledge.search(
        "هل الـ marketing يشمل audience research؟",
        limit=3,
        locale="ar",
    )

    assert results
    assert all(result.chunk.locale == "ar" for result in results)
    assert results[0].chunk.chunk_id == "marketing.ar.نطاق-الخدمة"


def test_seed_retrieval_set_meets_checkpoint_baseline() -> None:
    knowledge = KnowledgeBase.from_directory(ROOT / "src" / "opshub_ai" / "knowledge")
    cases = json.loads((ROOT / "eval" / "retrieval_cases.json").read_text("utf-8"))

    metrics = evaluate_retrieval(knowledge, cases, limit=3)

    assert metrics.case_count == 12
    assert metrics.recall_at_k >= 0.95
    assert metrics.mean_reciprocal_rank >= 0.9
