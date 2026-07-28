from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Human-readable description of the error.")


class ErrorOut(BaseModel):
    """The single error envelope shared by every API failure response."""

    error: ErrorDetail
