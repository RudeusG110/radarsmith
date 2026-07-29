import json
from pathlib import Path
from typing import Any

ARTIFACT_VERSION = 1
ARTIFACT_PATH = Path(__file__).resolve().parent / f"starter_radar_v{ARTIFACT_VERSION}.json"


def load_starter_radar() -> dict[str, Any]:
    """Load the versioned starter-radar preload artifact from local disk.

    Reads a bundled JSON file only; performs no network access. The same artifact
    feeds both the Alembic data migration and the validation step, so they always
    agree on one source of truth.
    """
    return json.loads(ARTIFACT_PATH.read_text(encoding="utf-8"))
