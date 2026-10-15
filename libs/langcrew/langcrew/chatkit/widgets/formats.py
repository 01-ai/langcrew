"""
Widget Format for LangCrew - ChatKit Compatible Widget Definition

This module provides WidgetFormat class for defining and rendering widgets
compatible with OpenAI ChatKit .widget files.
"""

import json
import logging
from typing import Any

# Import required dependencies for ChatKit widget functionality
try:
    import jsonschema
    from jinja2 import Template
except ImportError as e:
    raise ImportError(
        "Widget format dependencies are missing. "
        "Install with: pip install langcrew[chatkit]"
    ) from e

logger = logging.getLogger(__name__)


class Widget:
    """
    Widget definition class compatible with ChatKit .widget files.

    Supports loading from .widget files and rendering with data to generate
    interactive UI components that can be displayed in the frontend.
    """

    def __init__(
        self, name: str, template: str, schema: dict[str, Any], version: str = "1.0"
    ):
        """
        Initialize WidgetFormat.

        Args:
            name: Widget name identifier
            template: Jinja2 template string for rendering UI
            schema: JSON Schema for validating input data
            version: Widget format version
        """
        self.name = name
        self.template = template
        self.schema = schema
        self.version = version
        self._compiled_template = None

    @classmethod
    def from_file(cls, widget_path: str) -> "Widget":
        """
        Load Widget from .widget file.

        Args:
            widget_path: Path to the .widget file

        Returns:
            Widget instance

        Raises:
            FileNotFoundError: If widget file doesn't exist
            ValueError: If widget file format is invalid
        """
        try:
            with open(widget_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Widget file not found: {widget_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in widget file: {e}")

        # Validate required fields
        required_fields = ["name", "template", "jsonSchema"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise ValueError(f"Missing required fields in widget: {missing_fields}")

        return cls(
            name=data["name"],
            template=data["template"],
            schema=data["jsonSchema"],
            version=data.get("version", "1.0"),
        )

    @classmethod
    def from_dict(cls, widget_dict: dict[str, Any]) -> "Widget":
        """
        Create Widget from dictionary.

        Args:
            widget_dict: Dictionary containing widget definition

        Returns:
            Widget instance
        """
        return cls(
            name=widget_dict["name"],
            template=widget_dict["template"],
            schema=widget_dict["jsonSchema"],
            version=widget_dict.get("version", "1.0"),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "Widget":
        """
        Create Widget from JSON string.

        Args:
            json_str: JSON string containing widget definition

        Returns:
            Widget instance
        """
        return cls.from_dict(json.loads(json_str))

    def get_json_schema(self) -> dict[str, Any]:
        """
        Get JSON Schema for LLM output validation.

        Returns:
            JSON Schema dictionary
        """
        return self.schema

    def render(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Render widget template with data to generate UI.

        Args:
            data: Data dictionary matching the widget schema

        Returns:
            Rendered widget as dictionary

        Raises:
            ValueError: If data doesn't match schema or template rendering fails
            ImportError: If Jinja2 is not available
        """
        # Validate data against schema first
        if not self.validate_data(data):
            raise ValueError("Data doesn't match widget schema")

        # Compile template if not already done
        if not self._compiled_template:
            try:
                self._compiled_template = Template(self.template)
            except Exception as e:
                raise ValueError(f"Invalid Jinja2 template: {e}")

        # Render template with data
        try:
            rendered_json = self._compiled_template.render(**data)
            return json.loads(rendered_json)
        except Exception as e:
            raise ValueError(f"Template rendering failed: {e}")

    def validate_data(self, data: dict[str, Any]) -> bool:
        """
        Validate data against widget schema.

        Args:
            data: Data to validate

        Returns:
            True if data is valid, False if data doesn't match schema

        Raises:
            jsonschema.SchemaError: If the widget schema itself is invalid
        """
        try:
            jsonschema.validate(data, self.schema)
            return True
        except jsonschema.ValidationError as e:
            logger.error(f"Widget '{self.name}' validation failed: {e}")
            return False

    def to_dict(self) -> dict[str, Any]:
        """
        Convert Widget to dictionary.

        Returns:
            Dictionary representation
        """
        return {
            "name": self.name,
            "template": self.template,
            "jsonSchema": self.schema,
            "version": self.version,
        }

    def to_json(self) -> str:
        """
        Convert Widget to JSON string.

        Returns:
            JSON string representation
        """
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    def __repr__(self) -> str:
        return f"Widget(name='{self.name}', version='{self.version}')"
