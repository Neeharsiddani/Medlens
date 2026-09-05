"""Base Pydantic schema configurations for MedLens."""
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema configured for ORM compatibility (Pydantic v2)."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )
