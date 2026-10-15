"""
Workflow Builder

Converts WorkflowConfig into executable LangGraph StateGraph.
"""

from typing import Any

from langchain_core.runnables import ensure_config
from langgraph.graph import END, START, StateGraph

from ..citation import CitationConfig
from ..types import CrewState
from .config import WorkflowConfig
from .nodes import NodeRegistry


class WorkflowBuilder:
    """
    Builds executable LangGraph from WorkflowConfig.

    Responsibilities:
    1. Parse WorkflowConfig
    2. Instantiate nodes using NodeRegistry
    3. Build LangGraph StateGraph
    4. Connect nodes with edges (including conditional edges)

    Example:
        config = WorkflowConfig.from_dict(workflow_dict)
        builder = WorkflowBuilder(config)
        graph = builder.build_graph()
        compiled = graph.compile()
    """

    def __init__(
        self,
        config: WorkflowConfig | dict,
        is_async: bool = True,
        citation: CitationConfig | None = None,
    ):
        """
        Initialize builder with configuration.

        Args:
            config: WorkflowConfig instance or dict
            is_async: Whether to create async nodes (default: True)

        Note:
            Validation (e.g., Start node requirement) is performed by WorkflowConfig
        """
        if isinstance(config, dict):
            self.config = WorkflowConfig.from_dict(config)
        else:
            self.config = config

        self.nodes = {}  # node_id -> WorkflowNode instance
        self.graph = None
        self.is_async = is_async
        self.citation_config = citation or CitationConfig()

        # Track While node body mappings for edge connection
        self._while_body_nodes = {}  # while_node_id -> body_node_id

    def build_graph(self) -> StateGraph:
        """
        Build LangGraph StateGraph from configuration.

        Returns:
            Uncompiled StateGraph instance

        Raises:
            ValueError: If workflow contains While nodes with empty body
        """
        # Validate node configurations before building (execution-time validation)
        self._validate_node_configs()

        # Create state graph with unified CrewState
        self.graph = StateGraph(CrewState)

        # Instantiate all nodes
        self._instantiate_nodes()

        # Get start_node_id (prioritize configured value)
        start_node_id = self.config.start_node_id
        if not start_node_id:
            # Find Start node
            for node_id, node_instance in self.nodes.items():
                if node_instance.type == "builtins.Start":
                    start_node_id = node_id
                    break

        # Build graph structure using unified method
        self._build_graph_internal(
            graph=self.graph,
            nodes=self.nodes,
            edges_config=self.config.edges,
            start_node_id=start_node_id,
            is_main_graph=True,
        )

        return self.graph

    def _validate_node_configs(self):
        """
        Validate node configurations at build time.

        This validation is performed at execution time (not at config load time)
        to allow draft/incomplete workflows in list/edit operations.

        Currently validates:
        - While nodes have non-empty body

        Future validations can be added here:
        - Classify nodes have categories and input
        - IfElse nodes have cases or fallback

        Raises:
            ValueError: If any node configuration is invalid for execution
        """
        for node_config in self.config.nodes:
            if node_config.node_type == "builtins.While":
                body_config = node_config.config.get("body", {})
                if not body_config or not body_config.get("nodes"):
                    raise ValueError(
                        f"While node '{node_config.id}' (label: '{node_config.label}') "
                        "must have a non-empty body. "
                        "Please add at least one node inside the loop body."
                    )

    def _instantiate_nodes(self):
        """Instantiate all workflow nodes"""
        for node_config in self.config.nodes:
            # For Start node: inject workflow-level state_variable_json_schema (OpenAI compatible)
            if (
                node_config.node_type == "builtins.Start"
                and self.config.state_variable_json_schema
            ):
                # Only inject if node doesn't already have state_variable_json_schema
                if not node_config.config.get("state_variable_json_schema"):
                    node_config.config["state_variable_json_schema"] = (
                        self.config.state_variable_json_schema
                    )

            node_instance = NodeRegistry.create_node(node_config)
            self._configure_node(node_instance)

            # Store node instance (None for special nodes like Note)
            if node_instance:
                self.nodes[node_config.id] = node_instance

    def _configure_node(self, node_instance: Any) -> None:
        if node_instance is None or node_instance.type != "builtins.Agent":
            return
        node_instance.citation_default = self.citation_config

    def _build_graph_internal(
        self,
        graph: StateGraph,
        nodes: dict[str, Any],
        edges_config: list,
        start_node_id: str = None,
        is_main_graph: bool = False,
    ):
        """
        Internal graph building method (shared by main graph and subgraphs).

        This unified method handles the core graph construction logic for both
        main graphs and subgraphs, reducing code duplication.

        Args:
            graph: The StateGraph to build
            nodes: Dict of node_id -> node_instance
            edges_config: List of edge configurations
            start_node_id: Entry point node ID
            is_main_graph: Whether this is the main graph (enables START edge and While handling)
        """
        # 1. Add nodes
        for node_id, node_instance in nodes.items():
            if is_main_graph and node_instance.type == "builtins.While":
                # While node: add with subgraph (main graph only)
                self._add_while_node_with_subgraph(node_id, node_instance)
            else:
                # Regular node
                handler = node_instance.create_handler(is_async=self.is_async)
                metadata = {
                    "node_type": node_instance.type,
                    "node_label": node_instance.label,
                }
                graph.add_node(node_id, handler, metadata=metadata)

        # 2. Set entry point
        if is_main_graph:
            # Main graph: add START edge
            if start_node_id:
                graph.add_edge(START, start_node_id)
        else:
            # Subgraph: set_entry_point
            if start_node_id:
                graph.set_entry_point(start_node_id)

        # 3. Add edges
        edges = [
            e.model_dump() if hasattr(e, "model_dump") else e for e in edges_config
        ]
        edges_by_source = self._group_edges_by_source(edges)

        for source_id, source_edges in edges_by_source.items():
            # While node special handling (only in main graph)
            if (
                is_main_graph
                and source_id in nodes
                and nodes[source_id].type == "builtins.While"
            ):
                self._add_while_conditional_edges(source_id, source_edges)
                continue

            if len(source_edges) == 1:
                # Single edge
                target_id = source_edges[0]["target_node_id"]
                graph.add_edge(source_id, target_id)
            else:
                # Multiple edges - conditional routing
                self._add_conditional_edges(graph, source_id, source_edges)

        # 4. Connect leaf nodes to END
        all_node_ids = set(nodes.keys())
        nodes_with_edges = set(edges_by_source.keys())
        leaf_nodes = all_node_ids - nodes_with_edges

        for leaf_node_id in leaf_nodes:
            graph.add_edge(leaf_node_id, END)

    def _add_while_node_with_subgraph(self, while_node_id: str, while_node):
        """
        Add While node with its body as a subgraph node.

        This uses LangGraph's "Add a graph as a node" pattern for proper state sharing.

        Structure:
            While node (condition check)
              ↓ (condition true)
            Body subgraph node
              ↓ (after execution)
            While node (loop back)
              ↓ (condition false)
            Next node (out)
        """
        # 1. Add While node itself
        handler = while_node.create_handler(is_async=self.is_async)
        metadata = {
            "node_type": while_node.type,
            "node_label": while_node.label,
        }
        self.graph.add_node(while_node_id, handler, metadata=metadata)

        # 2. Build and add body subgraph if present
        body_config = while_node.config.get("body", {})
        if body_config and body_config.get("nodes"):
            body_subgraph = self._build_subgraph(body_config)
            body_node_id = f"{while_node_id}__body"

            # Add compiled subgraph as a node (key for state sharing!)
            self.graph.add_node(body_node_id, body_subgraph)

            # Track mapping for edge connection
            self._while_body_nodes[while_node_id] = body_node_id

    def _group_edges_by_source(self, edges: list[dict]) -> dict[str, list[dict]]:
        """Group edges by source node ID"""
        edges_by_source = {}
        for edge in edges:
            source_id = edge.get("source_node_id")
            if source_id not in edges_by_source:
                edges_by_source[source_id] = []
            edges_by_source[source_id].append(edge)
        return edges_by_source

    def _add_conditional_edges(
        self, graph: StateGraph, source_node: str, edges: list[dict]
    ):
        """Add conditional edges to a graph (works for both main graph and subgraph)"""

        def route_function(state: dict[str, Any]) -> str:
            """Determine next node based on __next__ in state"""
            next_port = state.get("__next__")
            if next_port:
                for edge in edges:
                    if edge.get("source_port_id") == next_port:
                        return edge["target_node_id"]
            # Fallback to first edge
            return edges[0]["target_node_id"]

        # Build path mapping
        path_map = {edge["target_node_id"]: edge["target_node_id"] for edge in edges}

        graph.add_conditional_edges(source_node, route_function, path_map)

    def _build_subgraph(self, subgraph_config: dict):
        """
        Build a subgraph from configuration.

        This method builds subgraphs (e.g., While loop body) using the same
        unified graph building logic as the main graph.

        Args:
            subgraph_config: Subgraph configuration with nodes, edges, start_node_id

        Returns:
            Node function that invokes the compiled subgraph with proper config propagation.
            This ensures that recursion_limit and other config parameters are inherited
            from the parent workflow.
        """
        # Create subgraph using same CrewState (for state sharing)
        subgraph = StateGraph(CrewState)

        # Instantiate nodes from config
        nodes = {}
        for node_cfg in subgraph_config.get("nodes", []):
            node_instance = NodeRegistry.create_node(node_cfg)
            self._configure_node(node_instance)
            if node_instance:
                nodes[node_instance.id] = node_instance

        # Get configuration
        edges = subgraph_config.get("edges", [])
        start_node_id = subgraph_config.get("start_node_id")

        # Default to first node if no start_node_id
        if not start_node_id and nodes:
            start_node_id = list(nodes.keys())[0]

        # Build graph structure using unified method
        self._build_graph_internal(
            graph=subgraph,
            nodes=nodes,
            edges_config=edges,
            start_node_id=start_node_id,
            is_main_graph=False,  # Mark as subgraph
        )

        # Compile subgraph without checkpointer
        # The parent workflow's checkpointer will manage state persistence
        # Subgraph state changes are merged back to parent via return values
        compiled = subgraph.compile()

        # Return a node function that properly propagates config from parent workflow
        # This follows LangGraph's "invoke a graph from a node" pattern
        # See: https://langchain-ai.github.io/langgraph/how-tos/subgraph/

        # Support both sync and async execution based on builder configuration
        if self.is_async:

            async def subgraph_node(state, config=None):
                """
                Async node function that invokes compiled subgraph with config propagation.

                This ensures that execution control parameters (recursion_limit, callbacks,
                tags, metadata) are properly inherited from the parent workflow.
                """
                # Get config from context variable (set by parent workflow)
                config = ensure_config(config)
                # Explicitly pass config to subgraph
                return await compiled.ainvoke(state, config=config)

        else:

            def subgraph_node(state, config=None):
                """
                Sync node function that invokes compiled subgraph with config propagation.

                This ensures that execution control parameters (recursion_limit, callbacks,
                tags, metadata) are properly inherited from the parent workflow.
                """
                # Get config from context variable (set by parent workflow)
                config = ensure_config(config)
                # Explicitly pass config to subgraph
                return compiled.invoke(state, config=config)

        return subgraph_node

    def _add_while_conditional_edges(self, while_node_id: str, edges: list[dict]):
        """
        Add conditional edges for While node.

        Routes to:
        - body subgraph (if condition true, __next__ = "body")
        - out target (if condition false, __next__ = "out")

        Also adds loop-back edge from body to While node.

        Args:
            while_node_id: While node ID
            edges: List of edges from this While node (typically one "out" edge)
        """
        body_node_id = self._while_body_nodes.get(while_node_id)

        # Find the "out" edge target
        out_target = None
        for edge in edges:
            if edge.get("source_port_id") == "out":
                out_target = edge["target_node_id"]
                break

        # If no explicit "out" edge, default to END
        if not out_target:
            out_target = END

        def route_function(state: dict[str, Any]) -> str:
            """Route based on While node's __next__ value"""
            next_port = state.get("__next__")
            if next_port == "body" and body_node_id:
                return body_node_id  # Enter body subgraph
            else:  # "out"
                return out_target

        # Build path mapping
        path_map = {}
        if body_node_id:
            path_map[body_node_id] = body_node_id
        if out_target:
            path_map[out_target] = out_target

        self.graph.add_conditional_edges(while_node_id, route_function, path_map)

        # Add loop-back edge: body -> While node (forms the loop)
        if body_node_id:
            self.graph.add_edge(body_node_id, while_node_id)
