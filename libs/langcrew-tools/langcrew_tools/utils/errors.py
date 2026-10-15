"""Standardized error response utilities for LangCrew tools."""


def error_response(message: str) -> tuple[str, dict]:
    """Create a standardized error response tuple for content_and_artifact tools."""
    return (message, {"error": message})
