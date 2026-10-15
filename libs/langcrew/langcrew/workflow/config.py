"""
Workflow Configuration Schema

This module defines the core data structures for LangCrew workflows.
These structures are compatible with OpenAI Agent Builder protocol
but focused on execution-relevant fields only.
"""

from typing import Any

from pydantic import BaseModel, Field, model_validator


class WorkflowNodeConfig(BaseModel):
    """
    Configuration for a node in the workflow graph.

    Represents a single execution unit (agent, tool, logic, etc.)
    that can be connected to other nodes via edges.
    """

    id: str = Field(..., description="Unique node identifier (e.g., 'node_lde8jox5')")
    node_type: str = Field(
        ..., description="Node type (e.g., 'builtins.Agent', 'builtins.IfElse')"
    )
    label: str = Field(..., description="Human-readable node label")
    config: dict[str, Any] = Field(
        default_factory=dict, description="Node-specific configuration"
    )

    class Config:
        extra = "allow"  # Allow additional fields for future compatibility


class WorkflowEdgeConfig(BaseModel):
    """
    Configuration for an edge connecting two nodes in the workflow graph.

    Defines the flow of execution from one node to another.
    """

    id: str = Field(..., description="Unique edge identifier")
    source_node_id: str = Field(..., description="ID of the source node")
    target_node_id: str = Field(..., description="ID of the target node")
    source_port_id: str | None = Field(
        None, description="Source port ID for conditional edges (optional)"
    )
    target_port_id: str | None = Field(
        None, description="Target port ID for UI compatibility (optional)"
    )

    class Config:
        extra = "allow"  # Allow additional fields for future compatibility


class WorkflowConfig(BaseModel):
    """
    Core workflow configuration for LangCrew execution.

    This is the minimal, execution-focused configuration that langcrew needs.
    Studio extensions (id, version, ui_metadata, etc.) should be in WorkflowData.

    Compatible with OpenAI Agent Builder protocol but focused on execution.
    """

    name: str = Field(..., description="Workflow name")
    workflow_type: str = Field(default="chat", description="Workflow type: 'chat'")
    nodes: list[WorkflowNodeConfig] = Field(
        default_factory=list, description="List of workflow nodes"
    )
    edges: list[WorkflowEdgeConfig] = Field(
        default_factory=list, description="List of workflow edges"
    )

    # OpenAI compatible: workflow-level state initialization
    state_variable_json_schema: dict | None = Field(
        None,
        description="State variables JSON Schema (injected into Start node)",
    )

    # OpenAI compatible: workflow entry point
    start_node_id: str | None = Field(
        None,
        description="Workflow entry point node ID (defaults to Start node)",
    )

    class Config:
        extra = "allow"  # Allow additional fields for future compatibility

    @model_validator(mode="after")
    def validate_workflow_structure(self) -> "WorkflowConfig":
        """
        Validate workflow structure.

        Ensures:
        - Exactly one Start node exists
        - No duplicate node IDs
        - No duplicate edge IDs
        - All edge references point to valid nodes

        Note:
        - While node body validation is performed at execution time (in WorkflowBuilder)
          to allow draft/incomplete workflows in list/edit operations

        Optimized for O(N + E) time complexity.

        Raises:
            ValueError: If validation fails
        """
        # Single pass over nodes: collect IDs and count Start nodes
        start_count = 0
        node_ids = []
        for node in self.nodes:
            node_ids.append(node.id)
            if node.node_type == "builtins.Start":
                start_count += 1

        # Validate Start node requirement
        if start_count == 0:
            raise ValueError(
                "Workflow must have exactly one Start node (builtins.Start). "
                "No Start node found in configuration."
            )
        elif start_count > 1:
            raise ValueError(
                f"Workflow must have exactly one Start node (builtins.Start). "
                f"Found {start_count} Start nodes."
            )

        # Validate unique node IDs (O(N))
        node_id_set = set(node_ids)
        if len(node_id_set) < len(node_ids):
            raise ValueError("Duplicate node IDs found in workflow")

        # Validate edges (if any)
        if self.edges:
            # Validate unique edge IDs (O(E))
            edge_ids = [edge.id for edge in self.edges]
            if len(set(edge_ids)) < len(edge_ids):
                raise ValueError("Duplicate edge IDs found in workflow")

            # Validate edge references (O(E))
            for edge in self.edges:
                if edge.source_node_id not in node_id_set:
                    raise ValueError(
                        f"Edge '{edge.id}' references non-existent source node: "
                        f"'{edge.source_node_id}'"
                    )
                if edge.target_node_id not in node_id_set:
                    raise ValueError(
                        f"Edge '{edge.id}' references non-existent target node: "
                        f"'{edge.target_node_id}'"
                    )

        return self

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary format"""
        return self.model_dump(exclude_none=True)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WorkflowConfig":
        """Create from dictionary format"""
        return cls(**data)
