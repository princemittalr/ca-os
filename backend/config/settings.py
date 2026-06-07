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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(1440, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES") # 24 Hours
    
    # Supabase credentials
    SUPABASE_URL: str = Field("mock_url", validation_alias="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field("mock_key", validation_alias="SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str = Field("mock_key", validation_alias="SUPABASE_SERVICE_ROLE_KEY")
    
    # AI API keys
    OPENAI_API_KEY: str = Field("mock_key", validation_alias="OPENAI_API_KEY")
    GROQ_API_KEY: str = Field("mock_key", validation_alias="GROQ_API_KEY")  # ← add this
    
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
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

# Global settings reference singleton
settings = Settings()
