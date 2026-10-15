from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, replace
from typing import Any, Protocol

from langchain.tools.tool_node import ToolCallRequest
from langchain_core.messages import ToolMessage


@dataclass(frozen=True)
class CitationSource:
    """One source candidate resolvable by clients."""

    type: str
    source_key: str
    data: dict[str, Any] = field(default_factory=dict)
    id: str | None = None

    def with_id(self, source_id: str) -> CitationSource:
        return replace(self, id=source_id)

    def to_public_dict(self) -> dict[str, Any]:
        if self.id is None:
            raise ValueError("Citation source must be registered before serialization")
        return {**self.data, "id": self.id, "type": self.type}

    def to_artifact_dict(self) -> dict[str, Any]:
        value = {
            **self.data,
            "type": self.type,
            "source_key": self.source_key,
        }
        if self.id is not None:
            value["id"] = self.id
        return value

    @classmethod
    def from_artifact_dict(cls, value: dict[str, Any]) -> CitationSource:
        internal_fields = {"id", "type", "source_key"}
        return cls(
            id=value.get("id"),
            type=str(value["type"]),
            source_key=str(value["source_key"]),
            data={
                key: item for key, item in value.items() if key not in internal_fields
            },
        )


@dataclass(frozen=True)
class CitationResultItem:
    """One model-visible Tool result with an optional Citation source."""

    value: Any
    source: CitationSource | None = None


class CitationResultProvider(ABC):
    """Interface for a modifiable Tool that declares sources from its output."""

    @abstractmethod
    def extract_citation_items(
        self,
        request: ToolCallRequest,
        message: ToolMessage,
    ) -> list[CitationResultItem] | None:
        """Extract citable items from the final ToolMessage."""


class CitationToolAdapter(Protocol):
    """Extract citable result items from an external, unmodifiable Tool."""

    def __call__(
        self,
        request: ToolCallRequest,
        message: ToolMessage,
    ) -> list[CitationResultItem] | None: ...


@dataclass(frozen=True)
class CitationParseResult:
    content: str
    citation_sources: list[dict[str, Any]] = field(default_factory=list)
