import copy
from typing import Any
from uuid import uuid4

import pytest
from app.domain.preload.loader import load_starter_radar
from app.domain.preload.validation import PreloadValidationError, validate_starter_radar
from pydantic import ValidationError


def _artifact() -> dict[str, Any]:
    return copy.deepcopy(load_starter_radar())


def test_real_artifact_is_valid() -> None:
    validate_starter_radar(_artifact())


def test_wrong_version_fails() -> None:
    artifact = _artifact()
    artifact["version"] = 2

    with pytest.raises(PreloadValidationError, match="version"):
        validate_starter_radar(artifact)


def test_duplicate_uuid_across_records_fails() -> None:
    artifact = _artifact()
    artifact["quadrants"][0]["id"] = artifact["radar"]["id"]

    with pytest.raises(PreloadValidationError, match="duplicate UUID"):
        validate_starter_radar(artifact)


def test_missing_quadrant_fails() -> None:
    artifact = _artifact()
    artifact["quadrants"].pop()

    with pytest.raises(PreloadValidationError, match="quadrants must cover"):
        validate_starter_radar(artifact)


def test_duplicate_quadrant_position_fails() -> None:
    artifact = _artifact()
    artifact["quadrants"][1]["position"] = artifact["quadrants"][0]["position"]

    with pytest.raises(PreloadValidationError, match="quadrant positions"):
        validate_starter_radar(artifact)


def test_ring_radar_id_mismatch_fails() -> None:
    artifact = _artifact()
    artifact["rings"][0]["radar_id"] = str(uuid4())

    with pytest.raises(PreloadValidationError, match="ring.radar_id"):
        validate_starter_radar(artifact)


def test_blip_referencing_unknown_quadrant_fails() -> None:
    artifact = _artifact()
    artifact["blips"][0]["quadrant_id"] = str(uuid4())

    with pytest.raises(PreloadValidationError, match="unknown quadrant_id"):
        validate_starter_radar(artifact)


def test_no_blips_fails() -> None:
    artifact = _artifact()
    artifact["blips"] = []

    with pytest.raises(PreloadValidationError, match="at least one blip"):
        validate_starter_radar(artifact)


def test_blank_blip_name_fails() -> None:
    artifact = _artifact()
    artifact["blips"][0]["name"] = "   "

    with pytest.raises(ValidationError):
        validate_starter_radar(artifact)


def test_blank_radar_name_fails() -> None:
    artifact = _artifact()
    artifact["radar"]["name"] = ""

    with pytest.raises(ValidationError):
        validate_starter_radar(artifact)
