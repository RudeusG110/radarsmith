"""Export the FastAPI OpenAPI document to a deterministic JSON file.

Run with ``make export-openapi`` (or ``poetry run python -m scripts.export_openapi``
from the ``backend`` directory). Keys are sorted so repeated runs on the same
application produce byte-identical output, which lets CI detect stale generated types.
"""

import json
from pathlib import Path

from app.log.logging import get_logger
from app.main import app

OUTPUT_PATH = Path(__file__).resolve().parents[1] / "openapi.json"
logger = get_logger()


def export_openapi() -> Path:
    """Write the application's OpenAPI document to ``OUTPUT_PATH`` deterministically."""
    document = app.openapi()
    OUTPUT_PATH.write_text(json.dumps(document, indent=2, sort_keys=True) + "\n")
    return OUTPUT_PATH


if __name__ == "__main__":
    written = export_openapi()
    logger.info(f"Wrote OpenAPI document to {written}")
