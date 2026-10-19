from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OPSHUB_AI_",
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    provider: Literal["disabled", "mock", "openai"] = "mock"
    internal_key: SecretStr = Field(min_length=32)
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-6-luna"
    provider_timeout_seconds: float = Field(default=12, gt=0, le=12)
    max_retries: int = Field(default=1, ge=0, le=1)
    max_input_bytes: int = Field(default=4000, ge=100, le=4000)
    max_output_tokens: int = Field(default=600, ge=1, le=600)

    @model_validator(mode="after")
    def require_provider_credentials(self) -> Self:
        if self.provider == "openai" and self.openai_api_key is None:
            raise ValueError("openai_api_key_required")
        return self
