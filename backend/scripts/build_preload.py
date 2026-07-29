"""Build the versioned starter-radar preload artifact from the extracted corpus.

Dev-time / build-time only: this script converts ``corpus.json`` into the committed,
versioned artifact ``app/domain/preload/starter_radar_v1.json`` that the Alembic data
migration inserts. It is never run at migration time or application startup.

Run from the ``backend`` directory:

    poetry run python -m scripts.build_preload

The snapshot is the latest Technology Radar volume only, giving one complete, editable
starter radar. Each blip takes its latest-volume entry for ring, description and
quadrant. IDs are deterministic ``uuid5`` values so regenerating never churns them.

Once ``starter_radar_v1.json`` has shipped it is frozen; future changes ship as a new
versioned artifact plus a new migration.
"""

import json
from pathlib import Path
from typing import Any
from uuid import UUID, uuid5

from app.domain.enums import QuadrantType, RingType
from app.domain.preload.loader import ARTIFACT_PATH
from app.domain.preload.validation import validate_starter_radar
from app.log.logging import get_logger

logger = get_logger()

# Fixed namespace so uuid5-derived IDs are stable and reproducible across regenerations.
NAMESPACE = UUID("6f9619ff-8b86-d011-b42d-00c04fc964ff")

CORPUS_PATH = Path(__file__).resolve().parents[2] / "corpus.json"

RADAR_NAME = "Technology Radar"
RADAR_PURPOSE = "Starter radar preloaded from the Thoughtworks Technology Radar, Volume 34 (April 2026)."

NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 4000

_QUADRANT_BY_SLUG: dict[str, QuadrantType] = {
    "techniques": QuadrantType.TECHNIQUES,
    "tools": QuadrantType.TOOLS,
    "platforms": QuadrantType.PLATFORMS,
    "languages-and-frameworks": QuadrantType.LANGUAGES_AND_FRAMEWORKS,
}

_RING_BY_SLUG: dict[str, RingType] = {
    "adopt": RingType.ADOPT,
    "trial": RingType.TRIAL,
    "assess": RingType.ASSESS,
    "caution": RingType.CAUTION,
    "hold": RingType.CAUTION,
}

_QUADRANT_POSITIONS: dict[QuadrantType, int] = {
    QuadrantType.TECHNIQUES: 1,
    QuadrantType.TOOLS: 2,
    QuadrantType.PLATFORMS: 3,
    QuadrantType.LANGUAGES_AND_FRAMEWORKS: 4,
}

_RING_POSITIONS: dict[RingType, int] = {
    RingType.ADOPT: 1,
    RingType.TRIAL: 2,
    RingType.ASSESS: 3,
    RingType.CAUTION: 4,
}


def _stable_id(*parts: str) -> str:
    return str(uuid5(NAMESPACE, "/".join(("starter-radar", *parts))))


def _clean(value: str, limit: int) -> str:
    stripped = value.strip()
    return stripped[:limit].strip()


def build_artifact() -> dict[str, Any]:
    """Transform the corpus into the starter-radar artifact dict."""
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    blips_in = corpus["blips"]

    latest_volume = max(entry["volume"] for blip in blips_in for entry in blip["entries"])
    logger.info(f"Building starter radar from corpus volume {latest_volume}")

    radar_id = _stable_id("radar")

    quadrants = [
        {
            "id": _stable_id("quadrant", quadrant.value),
            "radar_id": radar_id,
            "name": quadrant.value,
            "position": _QUADRANT_POSITIONS[quadrant],
        }
        for quadrant in QuadrantType
    ]
    quadrant_id_by_type = {q["name"]: q["id"] for q in quadrants}

    rings = [
        {
            "id": _stable_id("ring", ring.value),
            "radar_id": radar_id,
            "name": ring.value,
            "position": _RING_POSITIONS[ring],
        }
        for ring in RingType
    ]
    ring_id_by_type = {r["name"]: r["id"] for r in rings}

    blips_out: list[dict[str, Any]] = []
    for blip in blips_in:
        entry = next((e for e in blip["entries"] if e["volume"] == latest_volume), None)
        if entry is None:
            continue

        quadrant_type = _QUADRANT_BY_SLUG[entry["quadrant"]]
        ring_type = _RING_BY_SLUG[entry["ring"]]
        blips_out.append(
            {
                "id": _stable_id("blip", blip["name"]),
                "radar_id": radar_id,
                "quadrant_id": quadrant_id_by_type[quadrant_type.value],
                "ring_id": ring_id_by_type[ring_type.value],
                "name": _clean(blip["name"], NAME_MAX_LENGTH),
                "description": _clean(entry["description"], DESCRIPTION_MAX_LENGTH),
            }
        )

    blips_out.sort(key=lambda b: b["name"].lower())

    return {
        "version": 1,
        "source": f"corpus.json volume {latest_volume}",
        "radar": {"id": radar_id, "name": RADAR_NAME, "purpose": RADAR_PURPOSE},
        "quadrants": quadrants,
        "rings": rings,
        "blips": blips_out,
    }


def main() -> Path:
    """Build, validate and write the starter-radar artifact deterministically."""
    artifact = build_artifact()
    validate_starter_radar(artifact)
    ARTIFACT_PATH.write_text(json.dumps(artifact, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    logger.info(f"Wrote {len(artifact['blips'])} blips to {ARTIFACT_PATH}")
    return ARTIFACT_PATH


if __name__ == "__main__":
    main()
