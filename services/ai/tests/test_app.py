import logging

import pytest
from fastapi.testclient import TestClient

from opshub_ai.app import create_app
from opshub_ai.config import Settings

INTERNAL_KEY = "test-internal-key-with-32-characters"


def settings(provider: str = "mock") -> Settings:
    return Settings(provider=provider, internal_key=INTERNAL_KEY)


def valid_payload() -> dict[str, object]:
    return {
        "schema_version": "ai-intake-turn-v1",
        "locale": "en",
        "session_id": "session_7J4p9m2Qx5",
        "latest_message": "We need software support for our small team.",
        "draft": {
            "requester_type": "company",
            "service_category": None,
            "request_title": None,
            "description": None,
            "company_name": None,
            "job_title": None,
            "company_website": None,
        },
        "completed_fields": ["contact_name", "email", "phone", "country"],
    }


def test_health_and_readiness_expose_no_secret_configuration() -> None:
    client = TestClient(create_app(settings()))

    health = client.get("/health")
    readiness = client.get("/ready")

    assert health.json() == {"status": "ok"}
    assert readiness.json() == {"status": "ready", "provider": "mock"}
    assert INTERNAL_KEY not in health.text + readiness.text


def test_turn_endpoint_requires_internal_authentication() -> None:
    client = TestClient(create_app(settings()))

    response = client.post("/v1/intake/turn", json=valid_payload())

    assert response.status_code == 401
    assert response.json() == {"detail": "internal_authentication_required"}


def test_mock_turn_returns_a_schema_valid_response(
    caplog: pytest.LogCaptureFixture,
) -> None:
    client = TestClient(create_app(settings()))
    caplog.set_level(logging.INFO)

    response = client.post(
        "/v1/intake/turn",
        headers={"X-OpsHub-AI-Key": INTERNAL_KEY},
        json=valid_payload(),
    )

    assert response.status_code == 200
    assert response.json()["schema_version"] == "ai-intake-turn-v1"
    assert response.json()["status"] == "collecting"
    assert valid_payload()["latest_message"] not in caplog.text


def test_disabled_provider_returns_fixed_form_fallback() -> None:
    client = TestClient(create_app(settings("disabled")))

    response = client.post(
        "/v1/intake/turn",
        headers={"X-OpsHub-AI-Key": INTERNAL_KEY},
        json=valid_payload(),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "fallback"
    assert response.json()["handoff_reason"] == "ai_disabled"
