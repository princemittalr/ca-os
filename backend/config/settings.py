import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """
    Centralized, Pydantic-validated environment configuration settings for CA-OS.
    """
    ENV: str = Field("development", env="ENV")
    DEBUG: bool = Field(True, env="DEBUG")
    
    # Auth secrets
    SECRET_KEY: str = Field("reckon-ai-litigation-audit-super-secret-key-108", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(1440, env="ACCESS_TOKEN_EXPIRE_MINUTES") # 24 Hours
    
    # Supabase credentials
    SUPABASE_URL: str = Field("mock_url", env="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field("mock_key", env="SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str = Field("mock_key", env="SUPABASE_SERVICE_ROLE_KEY")
    
    # AI API keys
    OPENAI_API_KEY: str = Field("mock_key", env="OPENAI_API_KEY")
    GROQ_API_KEY: str = Field("mock_key", env="GROQ_API_KEY")  # ← add this
    
    # CORS parameters
    CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://reckon-ai.vercel.app",
]
    
    # Rate limit parameters
    RATE_LIMIT_CALLS: int = Field(100, env="RATE_LIMIT_CALLS")
    RATE_LIMIT_WINDOW_SECONDS: int = Field(60, env="RATE_LIMIT_WINDOW_SECONDS")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

# Global settings reference singleton
settings = Settings()
