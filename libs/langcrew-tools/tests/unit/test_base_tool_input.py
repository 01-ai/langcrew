"""Tests for BaseToolInput class."""

from pydantic import Field

from langcrew_tools.base import BaseToolInput


class TestBaseToolInput:
    """Test BaseToolInput base class functionality."""

    def test_brief_field_exists_with_default(self):
        """Test that BaseToolInput has brief field with default empty string."""
        input_instance = BaseToolInput()
        assert hasattr(input_instance, "brief")
        assert input_instance.brief == ""

    def test_brief_field_can_be_set(self):
        """Test that brief field can be set to custom value."""
        custom_brief = "This is a test action"
        input_instance = BaseToolInput(brief=custom_brief)
        assert input_instance.brief == custom_brief

    def test_brief_field_inheritance(self):
        """Test that classes inheriting from BaseToolInput preserve brief field."""

        class CustomToolInput(BaseToolInput):
            name: str = Field(..., description="Tool name")
            value: int = Field(default=42, description="Some value")

        # Test with default brief
        instance = CustomToolInput(name="test")
        assert instance.brief == ""
        assert instance.name == "test"
        assert instance.value == 42

        # Test with custom brief
        instance_with_brief = CustomToolInput(
            name="test", brief="Custom action description"
        )
        assert instance_with_brief.brief == "Custom action description"
        assert instance_with_brief.name == "test"

    def test_pydantic_serialization_includes_brief(self):
        """Test that Pydantic serialization includes brief field."""
        input_instance = BaseToolInput(brief="Test brief")

        # Test dict serialization
        as_dict = input_instance.model_dump()
        assert "brief" in as_dict
        assert as_dict["brief"] == "Test brief"

        # Test JSON serialization
        as_json = input_instance.model_dump_json()
        assert "brief" in as_json
        assert "Test brief" in as_json
