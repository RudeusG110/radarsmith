from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BlipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    quadrant_id: UUID
    ring_id: UUID
    created_at: datetime
    updated_at: datetime
