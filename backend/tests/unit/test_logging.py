import json
import sys
from logging import ERROR, LogRecord

import pytest
from app.log.log_types import LogSettings, LogType
from app.log.logging import JSONFormatter


def test_log_settings_read_rs_log_variables(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("rs_log_level", "WARNING")
    monkeypatch.setenv("rs_log_type", "JSON")
    monkeypatch.setenv("rs_log_application", "radarsmith-test")

    settings = LogSettings(_env_file=None)  # pyright: ignore[reportCallIssue] -- pydantic-settings init option

    assert settings.log_level == "WARNING"
    assert settings.log_type == LogType.JSON
    assert settings.log_application == "radarsmith-test"


def test_log_settings_defaults_to_radarsmith_application(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("rs_log_application", raising=False)

    assert LogSettings(_env_file=None).log_application == "radarsmith"  # pyright: ignore[reportCallIssue] -- pydantic-settings init option


def test_json_formatter_includes_stack_trace() -> None:
    try:
        raise RuntimeError("boom")
    except RuntimeError:
        exc_info = sys.exc_info()

    record = LogRecord("radarsmith", ERROR, __file__, 1, "Unhandled error", None, exc_info)
    log_record = json.loads(JSONFormatter().format(record))

    assert log_record["message"] == "Unhandled error"
    assert "Traceback" in log_record["exc_info"]
    assert "RuntimeError: boom" in log_record["exc_info"]


def test_json_formatter_omits_stack_trace_without_exception() -> None:
    record = LogRecord("radarsmith", ERROR, __file__, 1, "Plain error", None, None)

    assert "exc_info" not in json.loads(JSONFormatter().format(record))
