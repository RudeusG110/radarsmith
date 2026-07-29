"""Validate the starter-radar preload artifact against the domain rules the service layer enforces.

The Alembic data migration inserts the artifact with ``op.bulk_insert``, which
bypasses the service layer and its Pydantic validation. This module re-applies
those rules as a separate step (exercised by a test) so malformed preload data is
caught *before* it can ship — never during the insert, and never leaving partial
rows.
"""

from collections.abc import Callable
from typing import Any, cast
from uuid import UUID

from app.domain.enums import QuadrantType, RingType
from app.schemas.blip import BlipPost
from app.schemas.quadrant import QuadrantPost
from app.schemas.radar import RadarPost
from app.schemas.ring import RingPost

_ClaimId = Callable[[object, str], UUID]


class PreloadValidationError(ValueError):
    """Raised when the starter-radar artifact violates a domain rule."""


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise PreloadValidationError(message)


def _parse_uuid(value: object, field: str) -> UUID:
    try:
        return UUID(str(value))
    except (ValueError, TypeError) as exc:
        raise PreloadValidationError(f"{field} is not a valid UUID: {value!r}") from exc


def _validate_quadrants(artifact: dict[str, Any], radar_id: UUID, claim_id: _ClaimId) -> set[UUID]:
    quadrants = artifact.get("quadrants")
    if not isinstance(quadrants, list):
        raise PreloadValidationError("artifact must contain a quadrants list")
    quadrants = cast("list[Any]", quadrants)

    quadrant_ids: set[UUID] = set()
    quadrant_names: set[str] = set()
    quadrant_positions: set[int] = set()
    for quadrant in quadrants:
        quadrant_ids.add(claim_id(quadrant["id"], "quadrant.id"))
        _require(_parse_uuid(quadrant["radar_id"], "quadrant.radar_id") == radar_id, "quadrant.radar_id must reference the radar")
        validated = QuadrantPost(name=quadrant["name"], position=quadrant["position"])
        quadrant_names.add(validated.name)
        quadrant_positions.add(validated.position)
    _require(quadrant_names == set(QuadrantType), "quadrants must cover every quadrant exactly once")
    _require(quadrant_positions == {1, 2, 3, 4}, "quadrant positions must be 1..4 with no duplicates")
    return quadrant_ids


def _validate_rings(artifact: dict[str, Any], radar_id: UUID, claim_id: _ClaimId) -> set[UUID]:
    rings = artifact.get("rings")
    if not isinstance(rings, list):
        raise PreloadValidationError("artifact must contain a rings list")
    rings = cast("list[Any]", rings)

    ring_ids: set[UUID] = set()
    ring_names: set[str] = set()
    ring_positions: set[int] = set()
    for ring in rings:
        ring_ids.add(claim_id(ring["id"], "ring.id"))
        _require(_parse_uuid(ring["radar_id"], "ring.radar_id") == radar_id, "ring.radar_id must reference the radar")
        validated = RingPost(name=ring["name"], position=ring["position"])
        ring_names.add(validated.name)
        ring_positions.add(validated.position)
    _require(ring_names == set(RingType), "rings must cover every ring exactly once")
    _require(ring_positions == {1, 2, 3, 4}, "ring positions must be 1..4 with no duplicates")
    return ring_ids


def _validate_blips(artifact: dict[str, Any], radar_id: UUID, quadrant_ids: set[UUID], ring_ids: set[UUID], claim_id: _ClaimId) -> None:
    blips = artifact.get("blips")
    if not isinstance(blips, list):
        raise PreloadValidationError("artifact must contain a blips list")
    blips = cast("list[Any]", blips)
    _require(len(blips) > 0, "artifact must contain at least one blip")

    for blip in blips:
        claim_id(blip["id"], "blip.id")
        _require(_parse_uuid(blip["radar_id"], "blip.radar_id") == radar_id, "blip.radar_id must reference the radar")
        quadrant_id = _parse_uuid(blip["quadrant_id"], "blip.quadrant_id")
        ring_id = _parse_uuid(blip["ring_id"], "blip.ring_id")
        _require(quadrant_id in quadrant_ids, f"blip references unknown quadrant_id: {quadrant_id}")
        _require(ring_id in ring_ids, f"blip references unknown ring_id: {ring_id}")
        BlipPost(name=blip["name"], description=blip["description"], quadrant_id=quadrant_id, ring_id=ring_id)


def validate_starter_radar(artifact: dict[str, Any]) -> None:
    """Validate the preload artifact, raising ``PreloadValidationError`` on any breach.

    Field-level rules (blank/length checks, quadrant/ring vocabulary) are enforced by
    reusing the API's Pydantic schemas; cross-record rules the migration relies on
    (unique IDs and positions, full quadrant/ring sets, referential integrity) are
    checked here.
    """
    seen_ids: set[UUID] = set()

    def _claim_id(value: object, field: str) -> UUID:
        parsed = _parse_uuid(value, field)
        _require(parsed not in seen_ids, f"duplicate UUID across artifact: {parsed}")
        seen_ids.add(parsed)
        return parsed

    _require(artifact.get("version") == 1, "artifact version must be 1")

    radar = artifact.get("radar")
    if not isinstance(radar, dict):
        raise PreloadValidationError("artifact must contain a radar object")
    radar = cast("dict[str, Any]", radar)
    radar_id = _claim_id(radar["id"], "radar.id")
    RadarPost(name=radar["name"], purpose=radar.get("purpose"))

    quadrant_ids = _validate_quadrants(artifact, radar_id, _claim_id)
    ring_ids = _validate_rings(artifact, radar_id, _claim_id)
    _validate_blips(artifact, radar_id, quadrant_ids, ring_ids, _claim_id)
