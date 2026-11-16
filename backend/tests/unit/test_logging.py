import json
import sys
from logging import ERROR, LogRecord

from app.log.logging import JSONFormatter


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
