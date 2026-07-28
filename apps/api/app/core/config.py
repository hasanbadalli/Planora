from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration loaded from the API environment."""

    app_name: str = "Planora API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = ""
    frontend_origins: str = "http://localhost:3000"
    jwt_secret_key: str = ""
    access_token_expire_minutes: int = 60
    auth_cookie_name: str = "planora_access_token"

    model_config = SettingsConfigDict(
        env_file=API_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Return normalized origins from a comma-separated setting."""
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
