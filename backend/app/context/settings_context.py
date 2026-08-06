from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """Application settings loaded from environment variables."""

    db_url: str = ""
    # Set only in the production image; empty disables built-frontend serving.
    static_dir: str = ""

    def __init__(self, env_file: str | None = None, **kwargs: Any) -> None:  # noqa: ANN401
        """Initialize the AppSettings instance with optional environment file and additional keyword arguments."""
        if env_file:
            super().__init__(_env_file=env_file)
        else:
            super().__init__(**kwargs)

    model_config = SettingsConfigDict(env_prefix="rs_api_", env_file_encoding="utf-8", env_file="settings.env", hide_input_in_errors=True)


@lru_cache
def get_settings() -> AppSettings:
    """Get application settings from the environment or config file."""
    return AppSettings("settings.env")
