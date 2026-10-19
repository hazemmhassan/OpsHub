import argparse
import asyncio
import json
from pathlib import Path

from opshub_ai.evaluation import EvaluationCase, evaluate_cases
from opshub_ai.providers.mock import MockProvider
from opshub_ai.retrieval import KnowledgeBase
from opshub_ai.turn_service import TurnService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the deterministic OpsHub Phase 8 evaluation set."
    )
    parser.add_argument(
        "--cases",
        type=Path,
        required=True,
        help="Path to the reviewed synthetic evaluation JSON file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional path for the JSON metrics report.",
    )
    return parser.parse_args()


async def run(
    cases: list[EvaluationCase], knowledge: KnowledgeBase
) -> dict[str, object]:
    service = TurnService(
        provider=MockProvider(),
        knowledge=knowledge,
        timeout_seconds=1,
        max_retries=0,
    )
    report = await evaluate_cases(cases, service, knowledge)
    return report.model_dump(mode="json")


def main() -> None:
    args = parse_args()
    raw_cases = json.loads(args.cases.resolve().read_text(encoding="utf-8"))
    cases = [EvaluationCase.model_validate(case) for case in raw_cases]
    knowledge = KnowledgeBase.from_directory(Path(__file__).parent / "knowledge")
    report = asyncio.run(run(cases, knowledge))
    rendered = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(f"{rendered}\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
