import pytest
from pydantic import ValidationError

from opshub_ai.config import Settings

VALID_INTERNAL_KEY = "test-internal-key-with-32-characters"


def test_mock_provider_does_not_require_an_openai_key() -> None:
    settings = Settings(provider="mock", internal_key=VALID_INTERNAL_KEY)

    assert settings.provider == "mock"
    assert settings.openai_api_key is None


def test_openai_provider_requires_an_api_key() -> None:
    with pytest.raises(ValidationError, match="openai_api_key_required"):
        Settings(provider="openai", internal_key=VALID_INTERNAL_KEY)


def test_internal_key_must_have_at_least_32_characters() -> None:
    with pytest.raises(ValidationError):
        Settings(provider="mock", internal_key="too-short")
