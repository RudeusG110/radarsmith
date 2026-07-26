from pydantic import BaseModel, Field


class RadarPost(BaseModel):
    name: str = Field(max_length=100)
    purpose: str | None = Field(default=None, max_length=1000)
