import json
from collections.abc import Generator, MutableMapping
from contextlib import contextmanager
from logging import Formatter, Logger, LoggerAdapter, LogRecord, StreamHandler, getLogger

from .log_types import LogSettings, LogType

CTX_FIELDS = ["tenant"]


class JSONFormatter(Formatter):
    def format(self, record: LogRecord) -> str:
        log_record: dict[str, object] = {
            "timestamp": record.created,
            "level": record.levelname,
            "message": record.getMessage(),
            "logger_name": record.name,
            "path": record.pathname,
            "line_number": record.lineno,
            "function_name": record.funcName,
        }

        for field in CTX_FIELDS:
            if hasattr(record, field):
                log_record[field] = getattr(record, field)

        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


class ContextLogger(LoggerAdapter[Logger]):
    def __init__(self, logger: Logger) -> None:
        super().__init__(logger, extra=None)
        self.context: dict[str, str] = {}

    def set_context(self, key: str, value: str) -> None:
        if key in self.context:
            raise ValueError(f"Context for '{key}' already set")
        self.context[key] = value

    def clear_context(self, key: str) -> None:
        if key in self.context:
            del self.context[key]

    def process(self, msg: object, kwargs: MutableMapping[str, object]) -> tuple[object, MutableMapping[str, object]]:
        kwargs["extra"] = self.context
        return (msg, kwargs)


@contextmanager
def log_context(logger: ContextLogger, key: str, value: str) -> Generator[None]:
    """Set a logging context for the duration of the context manager."""
    logger.set_context(key, value)
    try:
        yield
    finally:
        logger.clear_context(key)


class StreamFormatter(Formatter):
    def format(self, record: LogRecord) -> str:
        default_msg = super().format(record)
        fields_to_add = [f"{f}={getattr(record, f)}" for f in CTX_FIELDS if hasattr(record, f)]
        ctx_fields = ", ".join(fields_to_add)
        if not ctx_fields.strip():
            return default_msg
        return f"{default_msg} [{ctx_fields}]"


_logger: ContextLogger | None = None


def get_logger() -> ContextLogger:
    """Provide a configured application logger."""
    global _logger  # noqa: PLW0603
    if _logger is not None:
        return _logger
    log_settings = LogSettings()

    logger = getLogger(log_settings.log_application)
    logger.setLevel(log_settings.log_level)

    stream_handler = StreamHandler()
    match log_settings.log_type:
        case LogType.JSON:
            formatter = JSONFormatter(fmt=log_settings.log_format)
            stream_handler.setFormatter(formatter)
        case LogType.STREAM:
            formatter = StreamFormatter(fmt=log_settings.log_format)
            stream_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)
    _logger = ContextLogger(logger)

    return _logger
