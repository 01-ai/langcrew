"""
Element Indexing System - Core Module (inspired by browser-use)

This module provides browser-use-like element indexing functionality:
1. Assigns a unique index to each element
2. Stores index-to-element mappings
3. Supports direct element location and click via index

Usage example:
    # Register element
    index = register_element(session_id, selector="button.submit", text="Submit")

    # Get element by index
    elem = get_element(session_id, index=5)

    # Clear (when switching pages)
    clear_index(session_id)
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Global index storage (independent for each session)
_element_index_map: dict[str, dict[int, dict[str, Any]]] = {}
# Structure: {session_id: {index: {selector, text, xpath, ...}}}


def register_element(
    session_id: str, selector: str, text: str = "", xpath: str = "", **extra_info
) -> int:
    """
    Register element and return its index

    Args:
        session_id: Session ID
        selector: CSS selector
        text: Element text
        xpath: XPath (optional, more reliable)
        **extra_info: Additional element info (tag, href, onclick, etc.)

    Returns:
        Element index (starts from 1)
    """
    # Ensure session exists
    if session_id not in _element_index_map:
        _element_index_map[session_id] = {}

    # Assign index (starts from 1)
    index = len(_element_index_map[session_id]) + 1

    # Store element info
    _element_index_map[session_id][index] = {
        "selector": selector,
        "text": text,
        "xpath": xpath,
        **extra_info,
    }

    logger.debug(f"📌 Registered element #{index}: {text[:30]} ({selector[:50]})")

    return index


def get_element(session_id: str, index: int) -> dict[str, Any] | None:
    """
    Get element info by index

    Args:
        session_id: Session ID
        index: Element index

    Returns:
        Element info dictionary, or None if not found
    """
    if session_id not in _element_index_map:
        logger.warning(f"⚠️ No elements registered for session: {session_id}")
        return None

    elem = _element_index_map[session_id].get(index)

    if not elem:
        logger.warning(f"⚠️ Element #{index} not found in session {session_id}")
        return None

    logger.debug(f"🎯 Retrieved element #{index}: {elem.get('text', '')[:30]}")
    return elem


def clear_index(session_id: str):
    """
    Clear index for specified session (called when switching pages)

    Args:
        session_id: Session ID
    """
    if session_id in _element_index_map:
        count = len(_element_index_map[session_id])
        _element_index_map[session_id] = {}
        logger.debug(f"🧹 Cleared {count} elements for session {session_id}")


def remove_session(session_id: str):
    """
    Completely remove session from index map (called when agent ends)

    Args:
        session_id: Session ID
    """
    if session_id in _element_index_map:
        del _element_index_map[session_id]


def get_element_count(session_id: str) -> int:
    """
    Get element count for specified session

    Args:
        session_id: Session ID

    Returns:
        Element count
    """
    if session_id not in _element_index_map:
        return 0
    return len(_element_index_map[session_id])


def get_all_elements(session_id: str) -> dict[int, dict[str, Any]]:
    """
    Get all elements for specified session

    Args:
        session_id: Session ID

    Returns:
        {index: element_info} dictionary
    """
    return _element_index_map.get(session_id, {})
