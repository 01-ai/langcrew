"""
Base classes for workflow nodes.

Provides the foundation for all workflow node implementations.
"""

from abc import ABC, abstractmethod
from typing import Any

from ...utils import extract_text_content


def create_llm_from_config(
    config: dict[str, Any],
    state: dict[str, Any] | None = None,
    default_model: str | None = None,
    default_temperature: float | None = None,
    default_max_tokens: int | None = None,
) -> Any:
    """
    Create LLM instance from configuration.

    This is the unified function for creating LLM instances across all nodes
    and guardrails. It handles multiple configuration formats and parameter merging.

    Args:
        config: Configuration dict containing 'llm' or 'model' field
        state: Current workflow state (for CEL expression evaluation)
        default_model: Default model name if not specified in config
        default_temperature: Default temperature if not specified
        default_max_tokens: Default max tokens if not specified

    Returns:
        LLM instance

    Raises:
        ValueError: If LLM configuration is invalid
    """
    from ...llm_factory import LLMFactory
    from ..utils.expression_evaluator import ExpressionEvaluator

    state = state or {}

    # Prefer llm field, fallback to model field (backward compatible)
    llm_config = config.get("llm")
    if llm_config is None:
        llm_config = config.get("model")
    if llm_config is None:
        if default_model is None:
            raise ValueError(
                "No LLM model configured for this node. "
                "Set a model on the node, or configure a default 'general' model."
            )
        llm_config = default_model

    # Use ExpressionEvaluator to evaluate (supports CEL expressions)
    llm_value = ExpressionEvaluator.evaluate(llm_config, state)

    # Handle string
    if isinstance(llm_value, str):
        llm_config_dict = {
            "provider": "openai",
            "model": llm_value,
        }

        # Extract other parameters from config
        if "temperature" in config:
            llm_config_dict["temperature"] = config["temperature"]
        elif default_temperature is not None:
            llm_config_dict["temperature"] = default_temperature

        if "max_tokens" in config:
            llm_config_dict["max_tokens"] = config["max_tokens"]
        elif default_max_tokens is not None:
            llm_config_dict["max_tokens"] = default_max_tokens

        # Other optional parameters
        for param in [
            "timeout",
            "max_retries",
            "top_p",
            "frequency_penalty",
            "presence_penalty",
        ]:
            if param in config:
                llm_config_dict[param] = config[param]

        return LLMFactory.create_llm(llm_config_dict)

    # Handle dict
    elif isinstance(llm_value, dict):
        llm_config_dict = llm_value.copy()

        # Ensure provider exists
        if "provider" not in llm_config_dict:
            llm_config_dict["provider"] = "openai"

        # Config parameters have higher priority
        if "temperature" in config:
            llm_config_dict["temperature"] = config["temperature"]
        elif default_temperature is not None and "temperature" not in llm_config_dict:
            llm_config_dict["temperature"] = default_temperature

        if "max_tokens" in config:
            llm_config_dict["max_tokens"] = config["max_tokens"]
        elif default_max_tokens is not None and "max_tokens" not in llm_config_dict:
            llm_config_dict["max_tokens"] = default_max_tokens

        # Merge other parameters
        for param in [
            "timeout",
            "max_retries",
            "top_p",
            "frequency_penalty",
            "presence_penalty",
        ]:
            if param in config:
                llm_config_dict[param] = config[param]

        return LLMFactory.create_llm(llm_config_dict)

    else:
        # Unsupported type (including None when model not found)
        raise ValueError(f"Invalid LLM configuration type: {type(llm_value).__name__}")


class NodeRegistry:
    """
    Registry for workflow node types.

    Uses decorator pattern for node registration, allowing clean
    and maintainable node type management.

    Example:
        @NodeRegistry.register("builtins.Agent")
        class AgentNode(WorkflowNode):
            async def execute(self, state: dict) -> dict:
                # Implementation
                pass
    """

    _registry: dict[str, type["WorkflowNode"]] = {}

    @classmethod
    def register(cls, node_type: str):
        """
        Decorator for registering a node class.

        Args:
            node_type: The node type identifier (e.g., "builtins.Agent")

        Returns:
            Decorator function
        """

        def decorator(node_class: type["WorkflowNode"]):
            cls._registry[node_type] = node_class
            return node_class

        return decorator

    @classmethod
    def create_node(cls, config) -> "WorkflowNode | None":
        """
        Create a node instance from configuration.

        Args:
            config: Node configuration (WorkflowNodeConfig or dict)

        Returns:
            WorkflowNode instance or None for special nodes

        Raises:
            ValueError: If node type is not registered
            TypeError: If config type is unsupported
        """
        from ..config import WorkflowNodeConfig

        # Extract fields: adapt both Pydantic model and raw dict
        if isinstance(config, WorkflowNodeConfig):
            node_type = config.node_type
            node_id = config.id
            label = config.label
            node_config = config.config
        elif isinstance(config, dict):
            node_type = config.get("node_type")
            node_id = config["id"]
            label = config.get("label", "")
            node_config = config.get("config", {})
        else:
            raise TypeError(f"Unsupported config type: {type(config)}")

        # Special nodes that don't need node instances
        # Note: Start and End now have instances to emit node_start/end events
        if node_type in ["builtins.Note"]:
            return None

        if node_type not in cls._registry:
            raise ValueError(
                f"Unknown node type: {node_type}. "
                f"Available types: {list(cls._registry.keys())}"
            )

        node_class = cls._registry[node_type]
        return node_class(
            id=node_id, node_type=node_type, label=label, config=node_config
        )

    @classmethod
    def get_registered_types(cls) -> list[str]:
        """Get list of all registered node types"""
        return list(cls._registry.keys())


class WorkflowNode(ABC):
    """
    Abstract base class for all workflow nodes.

    Each node represents a unit of work in the workflow graph.
    Nodes are stateless and thread-safe.
    """

    def __init__(self, id: str, node_type: str, label: str, config: dict[str, Any]):
        """
        Initialize the node.

        Args:
            id: Unique node identifier
            node_type: Node type (e.g., "builtins.Agent")
            label: Human-readable node label
            config: Node-specific configuration dict
        """
        self.id = id
        self.type = node_type
        self.label = label
        self.config = config

    @abstractmethod
    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the node logic asynchronously.

        Args:
            state: Current workflow state (CrewState as dict)

        Returns:
            Dict with state updates to merge. Common patterns:
            - {"messages": [...]}              # Add messages (recommended for agents)
            - {"output": value}                # Custom output (for data nodes)
            - {}                               # No state update (side effect only)

        The returned dict will be merged into state by LangGraph.
        Additionally, if "output" key is present, it will be stored in
        state["nodes"][self.id]["output"] for OpenAI-style access.

        Raises:
            Exception: If execution fails
        """
        pass

    def execute_sync(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the node logic synchronously.

        Default implementation runs the async execute method in a new event loop.
        Override this method if you have a native synchronous implementation.

        Args:
            state: Current workflow state (CrewState as dict)

        Returns:
            Dict with state updates to merge

        Raises:
            RuntimeError: If called from within an async context
            Exception: If execution fails
        """
        import asyncio

        try:
            # Try to get the current loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                raise RuntimeError(
                    "Cannot call execute_sync from async context. "
                    "Use 'await execute(state)' instead."
                )
            # Run in existing loop
            return loop.run_until_complete(self.execute(state))
        except RuntimeError:
            # No loop exists, create new one
            return asyncio.run(self.execute(state))

    def create_handler(self, is_async: bool = True):
        """
        Create a LangGraph-compatible handler function.

        This wraps the execute method and handles state updates:
        1. Standard LangGraph state updates (messages, user state, etc.)
        2. OpenAI-compatible previous_node_output for CEL access

        Args:
            is_async: Whether to create an async handler (default: True)

        Returns:
            Async or sync callable for LangGraph node
        """
        if is_async:

            async def async_handler(state: dict[str, Any]) -> dict[str, Any]:
                """Async handler function for LangGraph"""
                result = await self.execute(state)

                if not result:
                    # Even if result is empty, clear previous_node_output
                    # This ensures every node execution updates the state
                    return {"previous_node_output": {}}

                # Direct state updates (messages, user_state, __next__)
                updates = dict(result)

                # Build previous_node_output for OpenAI-style CEL access
                node_output = {}

                # 1. output_text: Extract from message streams
                if "messages" in result:
                    messages = result["messages"]
                    if messages and hasattr(messages[-1], "content"):
                        node_output["output_text"] = extract_text_content(
                            messages[-1].content
                        )

                # 2. output_parsed: Structured output (most important for CEL)
                if "output_parsed" in result:
                    node_output["output_parsed"] = result["output_parsed"]

                    # Automatically extract all top-level fields from output_parsed
                    # This allows input.field_name access (OpenAI frontend compatible)
                    if isinstance(result["output_parsed"], dict):
                        for key, value in result["output_parsed"].items():
                            if key not in node_output:
                                node_output[key] = value

                # 3. output_display: Formatted display content (for UI only)
                if "output_display" in result:
                    node_output["output_display"] = result["output_display"]

                # Always update previous_node_output (even if empty)
                # This ensures downstream nodes know this node was executed
                updates["previous_node_output"] = node_output

                return updates

            return async_handler
        else:

            def sync_handler(state: dict[str, Any]) -> dict[str, Any]:
                """Sync handler function for LangGraph"""
                result = self.execute_sync(state)

                if not result:
                    # Even if result is empty, clear previous_node_output
                    # This ensures every node execution updates the state
                    return {"previous_node_output": {}}

                # Direct state updates (messages, user_state, __next__)
                updates = dict(result)

                # Build previous_node_output for OpenAI-style CEL access
                node_output = {}

                # 1. output_text: Extract from message streams
                if "messages" in result:
                    messages = result["messages"]
                    if messages and hasattr(messages[-1], "content"):
                        node_output["output_text"] = extract_text_content(
                            messages[-1].content
                        )

                # 2. output_parsed: Structured output (most important for CEL)
                if "output_parsed" in result:
                    node_output["output_parsed"] = result["output_parsed"]

                    # Automatically extract all top-level fields from output_parsed
                    # This allows input.field_name access (OpenAI frontend compatible)
                    if isinstance(result["output_parsed"], dict):
                        for key, value in result["output_parsed"].items():
                            if key not in node_output:
                                node_output[key] = value

                # 3. output_display: Formatted display content (for UI only)
                if "output_display" in result:
                    node_output["output_display"] = result["output_display"]

                # Always update previous_node_output (even if empty)
                # This ensures downstream nodes know this node was executed
                updates["previous_node_output"] = node_output

                return updates

            return sync_handler

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(id={self.id}, type={self.type}, label={self.label})"
