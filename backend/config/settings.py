import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator

class Settings(BaseSettings):
    """
    Centralized, Pydantic-validated environment configuration settings for CA-OS.
    """
    ENV: str = Field("development", validation_alias="ENV")
    DEBUG: bool = Field(False, validation_alias="DEBUG")
    ENABLE_DEMO_MODE: bool = Field(False, validation_alias="ENABLE_DEMO_MODE")

    # Auth secrets
    SECRET_KEY: str = Field(..., validation_alias="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(1440, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")  # 24 hours

    # Supabase credentials
    SUPABASE_URL: str = Field("mock_url", validation_alias="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field("mock_key", validation_alias="SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str = Field("mock_key", validation_alias="SUPABASE_SERVICE_ROLE_KEY")

    # Supabase JWT secret — for offline token verification (avoids SDK round-trip)
    SUPABASE_JWT_SECRET: str = Field("mock_secret", validation_alias="SUPABASE_JWT_SECRET")

    # AI API keys
    OPENAI_API_KEY: str = Field("mock_key", validation_alias="OPENAI_API_KEY")
    GROQ_API_KEY: str = Field("mock_key", validation_alias="GROQ_API_KEY")
    GEMINI_API_KEY: str = Field("mock_key", validation_alias="GEMINI_API_KEY")

    # Redis — used by background job queue
    REDIS_URL: str = Field("redis://localhost:6379", validation_alias="REDIS_URL")

    # CORS parameters — configurable via comma-separated CORS_ORIGINS env var.
    # Production deployments should set CORS_ORIGINS explicitly (e.g. https://reckon-ai.vercel.app).
    # Default: localhost only (safe for development).
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias="CORS_ORIGINS",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: object) -> List[str]:
        """Accept a comma-separated string (from env) or a list (from code)."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return list(v)  # type: ignore[arg-type]

    # Rate limit parameters
    RATE_LIMIT_CALLS: int = Field(100, validation_alias="RATE_LIMIT_CALLS")
    RATE_LIMIT_WINDOW_SECONDS: int = Field(60, validation_alias="RATE_LIMIT_WINDOW_SECONDS")

    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = Field(10, validation_alias="MAX_UPLOAD_SIZE_MB")

    # Scheduler
    SCHEDULER_INTERVAL_SECONDS: int = Field(60, validation_alias="SCHEDULER_INTERVAL_SECONDS")

    @field_validator("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", mode="after")
    @classmethod
    def warn_mock_values(cls, v: str, info) -> str:
        """Warn at startup if critical Supabase fields still use mock defaults (non-test envs only)."""
        _mock_defaults = {"mock_url", "mock_key"}
        env = os.environ.get("ENV", "development")
        if v in _mock_defaults and env not in ("test", "testing"):
            import warnings
            warnings.warn(
                f"[WARN] {info.field_name} is using a mock default value. "
                "Set it in your .env file before going to production.",
                stacklevel=2,
            )
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

# Global settings reference singleton
settings = Settings()
