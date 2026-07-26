from app.domain.enums import RingType
from pydantic import BaseModel, Field


class RingPost(BaseModel):
    name: RingType = Field(max_length=100)
    position: int = Field(ge=1, le=4)
