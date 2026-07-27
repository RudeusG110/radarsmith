from datetime import datetime
from uuid import UUID

from app.schemas.blip import BlipOut
from app.schemas.quadrant import QuadrantOut
from app.schemas.ring import RingOut
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RadarPost(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    purpose: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class RadarPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    purpose: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None:
            stripped = value.strip()
            if not stripped:
                raise ValueError("name must not be blank")
            return stripped
        return value


class RadarSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    purpose: str | None = None
    created_at: datetime
    updated_at: datetime


class RadarDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    purpose: str | None = None
    created_at: datetime
    updated_at: datetime
    quadrants: list[QuadrantOut] = []
    rings: list[RingOut] = []
    blips: list[BlipOut] = []


class BlipPost(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    quadrant_id: UUID
    ring_id: UUID

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class BlipDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    radar_id: UUID
    quadrant_id: UUID
    ring_id: UUID
    name: str
    description: str | None = None
    created_at: datetime
