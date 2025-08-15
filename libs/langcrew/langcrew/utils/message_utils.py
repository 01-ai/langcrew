"""Message utilities for generating IDs and handling message-related operations."""

import random
import string
import time


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
