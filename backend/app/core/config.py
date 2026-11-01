from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = "postgresql+psycopg://oracy:change_me_for_local_dev@localhost:5432/oracy"
    mongodb_uri: str = ""
    mongodb_database: str = "oracy"
    auth_secret: str = "development-only-change-this-secret-before-deploying-please"
    access_token_minutes: int = 720
    cors_allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000,https://oracy-two.vercel.app"

    # LLM Settings (optional; template fallback used when not configured)
    llm_provider: str = ""  # "groq", "openai", "gemini", or "openai_compatible"
    llm_api_key: str = ""
    llm_model: str = ""
    llm_base_url: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
