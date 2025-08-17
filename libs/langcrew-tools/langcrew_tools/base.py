"""Base classes for LangCrew tools.

This module provides base classes that can be inherited by all tool input models
to ensure consistency and reduce code duplication.
"""

from pydantic import BaseModel, Field


class BaseToolInput(BaseModel):
    """Base class for all tool input models.

    Provides common fields that all tool inputs should have.
    This ensures consistency across all tools and makes it easier
    to add new common fields in the future.
    """

    brief: str = Field(
        default="", description="One brief sentence to explain this action"
    )
