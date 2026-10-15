"""
Browser automation middleware
"""

from .page_state_injection import (
    inject_page_state_before_model,
    remove_page_state_after_model,
)

__all__ = [
    "inject_page_state_before_model",
    "remove_page_state_after_model",
]
