from datetime import datetime
from uuid import UUID

from app.schemas.quadrant import QuadrantOut
from app.schemas.ring import RingOut
from pydantic import BaseModel, ConfigDict, Field


class RadarPost(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    purpose: str | None = Field(default=None, max_length=1000)


class RadarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    purpose: str | None = None
    created_at: datetime
    updated_at: datetime
    quadrants: list[QuadrantOut] = []
    rings: list[RingOut] = []
