"""preload_starter_radar.

Insert the versioned starter-radar preload artifact as a data migration.

Reads the committed local artifact (``app/domain/preload/starter_radar_v1.json``)
and inserts it with ``op.bulk_insert`` — no network access, and no dependency on the
evolving ORM models. Run-once is guaranteed by the ``alembic_version`` revision chain,
so restarts and upgrades never duplicate the radar, never overwrite edits, and a
deleted radar does not reappear. Alembic wraps the migration in a transaction, so the
insert is atomic.

Domain validation of the artifact happens in a separate step/test, not here, because
``bulk_insert`` bypasses the service layer.

Revision ID: 8f3c1d2e4b6a
Revises: 04704be95640
Create Date: 2026-07-29 18:10:00.000000

"""

from uuid import UUID

import sqlalchemy as sa
from alembic import op
from app.domain.preload.loader import load_starter_radar

# revision identifiers, used by Alembic.
revision = "8f3c1d2e4b6a"
down_revision = "04704be95640"
branch_labels = None
depends_on = None


_radar = sa.table(
    "radar",
    sa.column("id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("purpose", sa.Text()),
)
_radar_quadrant = sa.table(
    "radar_quadrant",
    sa.column("id", sa.Uuid()),
    sa.column("radar_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("position", sa.Integer()),
)
_radar_ring = sa.table(
    "radar_ring",
    sa.column("id", sa.Uuid()),
    sa.column("radar_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("position", sa.Integer()),
)
_radar_blip = sa.table(
    "radar_blip",
    sa.column("id", sa.Uuid()),
    sa.column("radar_id", sa.Uuid()),
    sa.column("quadrant_id", sa.Uuid()),
    sa.column("ring_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("description", sa.Text()),
)


def upgrade() -> None:
    """Insert the starter radar and its quadrants, rings and blips in FK order."""
    artifact = load_starter_radar()
    radar = artifact["radar"]

    op.bulk_insert(_radar, [{"id": UUID(radar["id"]), "name": radar["name"], "purpose": radar["purpose"]}])
    op.bulk_insert(
        _radar_quadrant,
        [
            {"id": UUID(q["id"]), "radar_id": UUID(q["radar_id"]), "name": q["name"], "position": q["position"]}
            for q in artifact["quadrants"]
        ],
    )
    op.bulk_insert(
        _radar_ring,
        [
            {"id": UUID(r["id"]), "radar_id": UUID(r["radar_id"]), "name": r["name"], "position": r["position"]}
            for r in artifact["rings"]
        ],
    )
    op.bulk_insert(
        _radar_blip,
        [
            {
                "id": UUID(b["id"]),
                "radar_id": UUID(b["radar_id"]),
                "quadrant_id": UUID(b["quadrant_id"]),
                "ring_id": UUID(b["ring_id"]),
                "name": b["name"],
                "description": b["description"],
            }
            for b in artifact["blips"]
        ],
    )


def downgrade() -> None:
    """Remove the starter radar; the cascade clears its quadrants, rings and blips."""
    radar_id = UUID(load_starter_radar()["radar"]["id"])
    op.execute(_radar.delete().where(_radar.c.id == radar_id))
