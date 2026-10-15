"""Message utilities for generating IDs and handling message-related operations."""

import random
import string
import time
import uuid
from typing import Any


def generate_message_id() -> str:
    """
    Generate message ID
    Format: {timestamp_ms}_{random_suffix}
    Example: 1748438204041_a7k9
    """
    timestamp = int(time.time() * 1000)
    # Generate 4-character random suffix to avoid ID conflicts in high concurrency
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{timestamp}_{suffix}"


def generate_session_id() -> str:
    """Generate a session identifier using the existing public format."""
    return f"session_{uuid.uuid4().hex[:16]}"


def generate_response_id() -> str:
    """Generate an identifier for one Agent execution."""
    return uuid.uuid4().hex


def extract_text_content(content: Any) -> str:
    """Extract readable text from message content.

    This keeps only textual portions from structured content-block payloads,
    avoiding Python repr strings for multimodal messages.
    """
    if content is None:
        return ""

    if isinstance(content, str):
        return content

    # Booleans (and other primitives we explicitly don't want to stringify into
    # things like "True"/"False" or "42") have no meaningful textual form for a
    # user-facing surface like a chat title. Treat them as empty so callers
    # don't have to special-case the typing.
    if isinstance(content, bool) or isinstance(content, (int, float)):
        return ""

    if isinstance(content, list):
        return "".join(extract_text_content(item) for item in content)

    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text

        for key in ("content", "content_blocks"):
            nested = content.get(key)
            if nested is not None:
                return extract_text_content(nested)

        return ""

    return str(content)
