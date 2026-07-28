from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BlipPost(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    quadrant_id: UUID
    ring_id: UUID

    @field_validator("name", "description")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped


class BlipPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    quadrant_id: UUID | None = None
    ring_id: UUID | None = None

    @field_validator("name", "description")
    @classmethod
    def must_not_be_blank(cls, value: str | None) -> str:
        # The validator only runs when the client sends the field, so an explicit
        # null (which cannot clear a required column) is rejected while an omitted
        # field is left untouched.
        if value is None or not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class BlipDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    radar_id: UUID
    quadrant_id: UUID
    ring_id: UUID
    name: str
    description: str
    created_at: datetime
    updated_at: datetime


class BlipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    quadrant_id: UUID
    ring_id: UUID
    created_at: datetime
    updated_at: datetime
