from __future__ import annotations

import base64
import hashlib

_SOURCE_ID_PREFIX = "C_"
_SOURCE_ID_TOKEN_LENGTH = 10
_SOURCE_ID_ALPHABET = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")


def citation_source_id(source_type: str, source_key: str) -> str:
    """Build a stable, opaque ID for one logical Citation source."""
    identity = f"{source_type}\0{source_key}".encode()
    digest = hashlib.sha256(identity).digest()
    token = base64.b32encode(digest).decode("ascii")[:_SOURCE_ID_TOKEN_LENGTH]
    return f"{_SOURCE_ID_PREFIX}{token}"


def is_citation_source_id(value: str) -> bool:
    """Return whether *value* is a canonical Citation source ID."""
    if not value.startswith(_SOURCE_ID_PREFIX):
        return False
    token = value[len(_SOURCE_ID_PREFIX) :]
    return (
        len(token) == _SOURCE_ID_TOKEN_LENGTH
        and token.isascii()
        and all(character in _SOURCE_ID_ALPHABET for character in token)
    )
