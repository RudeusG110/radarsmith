from enum import StrEnum

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_LOG_FORMAT = "%(asctime)s (%(name)s) [%(levelname)s] %(filename)s:%(funcName)s:%(lineno)d %(message)s"


class LogType(StrEnum):
    JSON = "JSON"
    STREAM = "STREAM"


class LogSettings(BaseSettings):
    log_level: str = "DEBUG"
    log_format: str = DEFAULT_LOG_FORMAT
    log_type: LogType = LogType.STREAM
    log_application: str = "radarsmith"

    model_config = SettingsConfigDict(env_prefix="rs_", env_file="log_settings.env", env_file_encoding="utf-8")
