from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable, Iterator, Sequence
from contextlib import asynccontextmanager, contextmanager
from typing import (
    Any,
    Literal,
)

from langchain_core.runnables import RunnableConfig, ensure_config
from langchain_core.tools import BaseTool
from langgraph.constants import END, START
from langgraph.graph import StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import All, StreamMode

from .agent import Agent
from .citation import CitationMiddleware
from .citation.config import (
    CitationConfigValue,
    resolve_citation_config,
)
from .controllable import ControllableCrew
from .memory import MemoryConfig
from .memory.context import MemoryContextManager
from .memory.rewind import rewind_compiled_graph
from .types import CrewState

logger = logging.getLogger(__name__)


class Crew(ControllableCrew):
    """LangCrew main orchestration class with controllable capabilities.

    Args:
        # Core configuration (most users only need these)
        agent: Agent to execute
        workflow: Workflow configuration dict (for visual workflow builder)

        # Memory & persistence
        memory: Simple memory setup - use True for defaults, MemoryConfig for advanced setup
        citation: Crew-wide citation defaults for programmatic and workflow agents

        # Advanced configuration (for experts)
        graph: Custom LangGraph StateGraph (overrides agent/workflow)
        verbose: Enable detailed logging and debug output

    Usage patterns:
        # Beginner: Just use memory=True
        crew = Crew(agent=agent, memory=True)

        # Intermediate: Configure memory details
        crew = Crew(agent=agent,
                   memory=MemoryConfig(provider="postgres", connection_string="..."))

        # Workflow mode: Visual workflow builder
        crew = Crew(workflow=workflow_config, memory=True)
    """

    def __init__(
        self,
        # Core
        agent: Agent | None = None,
        workflow: dict | None = None,
        graph: StateGraph | None = None,
        # Runtime
        memory: MemoryConfig | bool | None = None,
        citation: CitationConfigValue = None,
        verbose: bool = False,
    ):
        """
        Initialize Crew.

        Core (choose one):
            - agent: Programmatic agent workflow
            - workflow: Declarative workflow configuration
            - graph: Custom LangGraph StateGraph

        Runtime (optional):
            - memory: State persistence across conversations
            - citation: Source citation defaults
            - verbose: Detailed logging and debug output
        """

        # ===== Validate configuration =====
        if graph is None and workflow is None and agent is None:
            raise ValueError("Must provide at least one of: graph, workflow, or agent")

        # ===== Initialize core =====
        self.agent = agent
        self.workflow = workflow
        self.graph = graph

        self.citation_config = resolve_citation_config(citation)
        if agent is not None:
            middleware = tuple(
                item
                for item in agent.middleware
                if not isinstance(item, CitationMiddleware)
            )
            if self.citation_config.enabled:
                # Agent middleware wraps in declaration order. Citation must be
                # the innermost Tool-result transformer so outer middleware
                # (for example LargeToolResultMiddleware) sees final content.
                middleware = (*middleware, CitationMiddleware(self.citation_config))
            agent.middleware = middleware

        # ===== Initialize runtime =====
        # 1. Verbose
        self.verbose = verbose

        # 2. Memory
        if isinstance(memory, bool):
            from .memory import MemoryConfig

            self.memory_config = MemoryConfig() if memory else None
        else:
            self.memory_config = memory

        # 3. Memory manager
        self._memory_manager = MemoryContextManager(
            self.memory_config,
        )

        # ===== Setup =====
        # Setup agent memory
        if self.agent is not None:
            self._setup_agent_memory()

        # Initialize Controllable (stop control)
        super().__init__()

    def _sync_subgraph_message_deletions(
        self, state: CrewState, result: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Process messages in subgraph results to ensure deletion operations sync to parent graph.

        Design rationale:
        When LangGraph subgraph runs as a node, if messages are trimmed via pre_model_hook,
        the root namespace will not sync the RemoveMessage actions.
        Explicit message state synchronization at node level is required to avoid
        inconsistent message state between parent and child graphs.

        Args:
            state: Current CrewState
            result: Result dictionary returned from ainvoke/invoke
            item: The executing component instance

        Returns:
            Processed result dictionary with synchronized message deletion operations
        """
        if "messages" not in result:
            return result

        # Extract message IDs that are preserved in the result
        result_message_ids = {
            msg.id
            for msg in result["messages"]
            if hasattr(msg, "id") and msg.id is not None
        }

        # Create RemoveMessage markers for original messages not in result
        from langchain_core.messages.modifier import RemoveMessage

        remove_messages = [
            RemoveMessage(id=msg.id)
            for msg in state.get("messages", [])
            if hasattr(msg, "id")
            and msg.id is not None
            and msg.id not in result_message_ids
        ]

        # Build final message list: deletion operations + preserved messages
        final_messages = remove_messages + result["messages"]

        if self.verbose and remove_messages:
            logger.info(
                f"Message cleanup: removing {len(remove_messages)} messages from state"
            )

        return {**result, "messages": final_messages}

    def _get_agent_node_name(self, agent: Agent) -> str:
        """Unified agent node naming rule with namespace isolation"""
        base_name = agent.name if agent.name else "agent"
        return f"agent__{base_name}"

    def _compile_graph(
        self, builder: StateGraph, checkpointer=None, store=None
    ) -> CompiledStateGraph:
        """Compile graph with memory components."""
        return builder.compile(
            checkpointer=checkpointer,
            store=store,
        )

    def _create_generic_node_factory(
        self,
        is_async: bool,
        item_type: str,
        get_invoke_args_fn: Callable,
        process_result_fn: Callable | None = None,
    ):
        """Generic factory for creating node functions

        Args:
            is_async: Whether to create async nodes
            item_type: Type of item
            get_invoke_args_fn: Function to get invoke arguments
            process_result_fn: Optional function to process results
        """
        if is_async:

            def create_async_node(item):
                async def async_node(state: CrewState) -> dict[str, Any]:
                    # Get invoke args
                    invoke_args = get_invoke_args_fn(item, state, is_async=True)

                    # Invoke the item
                    result = await item.ainvoke(*invoke_args)

                    # Process result if needed
                    if process_result_fn:
                        result = process_result_fn(state, result, item)

                    return result

                return async_node

            return create_async_node
        else:

            def create_sync_node(item):
                def sync_node(state: CrewState) -> dict[str, Any]:
                    # Get invoke args
                    invoke_args = get_invoke_args_fn(item, state, is_async=False)

                    # Invoke the item
                    result = item.invoke(*invoke_args)

                    # Process result if needed
                    if process_result_fn:
                        result = process_result_fn(state, result, item)

                    return result

                return sync_node

            return create_sync_node

    def _create_agent_node_factory(self, is_async: bool = False):
        """Factory for creating agent node functions"""

        def get_agent_invoke_args(agent: Agent, state: CrewState, is_async: bool):
            """Get invoke arguments for agent"""
            config = ensure_config()
            # Create config with langcrew metadata
            if "metadata" not in config:
                config["metadata"] = {}
            config["metadata"]["langcrew_agent"] = agent.name
            return (state, config)

        def process_result_fn(state: CrewState, result: dict[str, Any], agent: Agent):
            """Process Agent execution result with message synchronization functionality"""
            return self._sync_subgraph_message_deletions(state, result)

        return self._create_generic_node_factory(
            is_async=is_async,
            item_type="agent",
            get_invoke_args_fn=get_agent_invoke_args,
            process_result_fn=process_result_fn,
        )

    def _build_agent_sequential_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a graph from a single agent.

        Args:
            checkpointer: Optional checkpointer for state persistence
            store: Optional store for data persistence
            is_async: Whether to create async agent nodes
        """
        builder = StateGraph(CrewState)
        create_agent_node = self._create_agent_node_factory(is_async=is_async)

        if self.agent is None:
            raise ValueError("No agent provided to build graph")

        node_name = self._get_agent_node_name(self.agent)
        self.agent.tools = self._prepare_tools(self.agent.tools)
        builder.add_node(node_name, create_agent_node(self.agent))
        builder.add_edge(START, node_name)
        builder.add_edge(node_name, END)
        return self._compile_graph(builder, checkpointer, store)

    def _prepare_tools(self, tools: list[BaseTool]) -> list[BaseTool]:
        """Prepare tools for execution"""
        return tools

    def _get_compiled_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """
        Get the compiled graph for execution.

        Priority (highest to lowest):
        1. graph - Custom StateGraph (most specific)
        2. workflow - Declarative configuration
        3. agent - Programmatic configuration
        """
        # Priority 1: Custom graph (highest - most specific)
        if self.graph is not None:
            return self._compile_graph(self.graph, checkpointer, store)

        # Priority 2: Workflow configuration
        if self.workflow is not None:
            from .workflow.builder import WorkflowBuilder

            builder = WorkflowBuilder(
                self.workflow,
                is_async=is_async,
                citation=self.citation_config,
            )
            graph = builder.build_graph()
            return self._compile_graph(graph, checkpointer, store)

        # Priority 3: Build from agent (lowest)
        if self.agent is not None:
            return self._build_agent_sequential_graph(
                checkpointer, store, is_async=is_async
            )
        else:
            raise ValueError("No workflow, agent, or graph provided to build graph")

    def _setup_agent_memory(self):
        """Push Crew's memory configuration down to the agent."""
        if self.memory_config is None or self.agent is None:
            return

        if self.agent.memory_config is None:
            self.agent.memory_config = self.memory_config
            if not self.agent.memory_tools:
                self.agent._setup_memory(self.memory_config)

        if self.verbose:
            logger.info(
                f"Memory configuration applied to agent with provider: {self.memory_config.provider}"
            )

    def invoke(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Execute crew with optional memory support and execution control.

        Args:
            input: The input to the graph
            config: The configuration to use for the run
            output_keys: The keys to return from output, defaults to all
            interrupt_before: Nodes to interrupt before executing
            interrupt_after: Nodes to interrupt after executing
            **kwargs: Additional keyword arguments passed to the graph

        Returns:
            The output of the graph run
        """

        def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=False
            )
            return compiled_graph.invoke(
                input,
                config=config,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                **kwargs,
            )

        return self._memory_manager.execute_sync(execute_with_memory)

    async def ainvoke(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Asynchronously execute crew with memory and execution control support.

        Args:
            input: Data input to the graph
            config: Configuration used at runtime
            output_keys: Keys to return from output, defaults to all
            interrupt_before: Nodes to interrupt before execution
            interrupt_after: Nodes to interrupt after execution
            **kwargs: Additional keyword arguments passed to the graph

        Returns:
            Output from graph execution
        """

        async def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=True
            )
            return await compiled_graph.ainvoke(
                input,
                config=config,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                **kwargs,
            )

        return await self._memory_manager.execute_async(execute_with_memory)

    async def rewind_thread(self, thread_id: str) -> None:
        """Rewind this Crew before its latest HumanMessage.

        Uses LangGraph time travel on the compiled graph so nested subgraph
        state stays aligned with the kept prefix. Persistent callers can
        recreate a Crew with the same MemoryConfig and call this method.
        """

        async def operation(checkpointer, store):
            compiled = self._get_compiled_graph(checkpointer, store, is_async=True)
            await rewind_compiled_graph(compiled, thread_id)

        await self._memory_manager.execute_async(operation)

    def stream(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        stream_mode: StreamMode | Sequence[StreamMode] | None = None,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        subgraphs: bool = False,
        **kwargs: Any,
    ) -> Iterator[dict[str, Any] | Any]:
        """
        Stream graph execution steps for a single input.

        Args:
            input: The input to the graph
            config: The configuration to use for the run
            stream_mode: The mode to stream output. Options:
                - "values": Emit all values in the state after each step
                - "updates": Emit only the node names and updates after each step
                - "custom": Emit custom data from inside nodes using StreamWriter
                - "messages": Emit LLM messages token-by-token
                - "debug": Emit debug events with maximum information
            output_keys: The keys to stream, defaults to all non-context channels
            interrupt_before: Nodes to interrupt before
            interrupt_after: Nodes to interrupt after
            subgraphs: Whether to stream events from inside subgraphs
            **kwargs: Additional keyword arguments

        Yields:
            The output of each step in the graph
        """

        def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=False
            )
            yield from compiled_graph.stream(
                input,
                config=config,
                stream_mode=stream_mode,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                subgraphs=subgraphs,
                **kwargs,
            )

        yield from self._memory_manager.execute_sync_generator(execute_with_memory)

    async def astream(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        stream_mode: StreamMode | Sequence[StreamMode] | None = None,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        subgraphs: bool = False,
        **kwargs: Any,
    ) -> AsyncIterator[dict[str, Any] | Any]:
        """
        Asynchronously stream graph execution steps for a single input.

        Args:
            input: The input to the graph
            config: The configuration to use for the run
            stream_mode: The mode to stream output. Options:
                - "values": Emit all values in the state after each step
                - "updates": Emit only the node names and updates after each step
                - "custom": Emit custom data from inside nodes using StreamWriter
                - "messages": Emit LLM messages token-by-token
                - "debug": Emit debug events with maximum information
            output_keys: The keys to stream, defaults to all non-context channels
            interrupt_before: Nodes to interrupt before
            interrupt_after: Nodes to interrupt after
            subgraphs: Whether to stream events from inside subgraphs
            **kwargs: Additional keyword arguments

        Yields:
            The output of each step in the graph
        """

        async def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=True
            )
            async for chunk in compiled_graph.astream(
                input,
                config=config,
                stream_mode=stream_mode,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                subgraphs=subgraphs,
                **kwargs,
            ):
                yield chunk

        async for chunk in self._memory_manager.execute_async_generator(
            execute_with_memory
        ):
            yield chunk

    async def astream_events(
        self,
        input: Any,
        config: RunnableConfig | None = None,
        *,
        version: Literal["v1", "v2"] = "v2",
        include_names: Sequence[str] | None = None,
        include_types: Sequence[str] | None = None,
        include_tags: Sequence[str] | None = None,
        exclude_names: Sequence[str] | None = None,
        exclude_types: Sequence[str] | None = None,
        exclude_tags: Sequence[str] | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Generate a stream of fine-grained events during crew execution.

        This method provides detailed insights into the execution process, including
        events from LLMs, tools, agents, and other components. Useful for
        debugging, monitoring, and building real-time UIs.

        Args:
            input: The input to the crew
            config: Configuration for the run
            version: Event schema version ("v1" or "v2"). v2 is recommended
            include_names: Only include events from runnables with matching names
            include_types: Only include events from runnables with matching types
            include_tags: Only include events from runnables with matching tags
            exclude_names: Exclude events from runnables with matching names
            exclude_types: Exclude events from runnables with matching types
            exclude_tags: Exclude events from runnables with matching tags
            **kwargs: Additional keyword arguments

        Yields:
            StreamEvent dictionaries with the following structure:
            - event: Event name (e.g., "on_chat_model_start", "on_tool_end")
            - name: Name of the component that generated the event
            - run_id: Unique ID for this execution
            - parent_ids: IDs of parent runnables (v2 only)
            - tags: Tags associated with the component
            - metadata: Metadata about the component
            - data: Event-specific data (input, output, chunk, etc.)

        Examples:
            # Monitor all events
            async for event in crew.astream_events(input_data):
                print(f"{event['event']}: {event['name']}")

            # Only track LLM events
            async for event in crew.astream_events(
                input_data,
                include_types=["chat_model", "llm"]
            ):
                if event["event"] == "on_chat_model_stream":
                    print(event["data"]["chunk"])

            # Custom crew monitoring
            async for event in crew.astream_events(
                input_data,
                include_tags=["crew", "agent"]
            ):
                if event["event"] == "on_crew_agent_start":
                    print(f"Starting agent: {event['data']['agent_name']}")
        """

        async def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=True
            )
            async for event in compiled_graph.astream_events(
                input,
                config=config,
                version=version,
                include_names=include_names,
                include_types=include_types,
                include_tags=include_tags,
                exclude_names=exclude_names,
                exclude_types=exclude_types,
                exclude_tags=exclude_tags,
                **kwargs,
            ):
                yield event

        async for event in self._memory_manager.execute_async_generator(
            execute_with_memory
        ):
            yield event

    # Agent lookup methods

    def get_agent_by_name(self, name: str) -> Agent:
        """Get an agent by name

        Args:
            name: The name of the agent

        Returns:
            Agent instance

        Raises:
            ValueError: When the agent with the specified name is not found
        """
        if self.agent is not None and self.agent.name == name:
            return self.agent

        raise ValueError(f"Agent with name '{name}' not found")

    @contextmanager
    def get_sync_compiled_graph(self):
        """
        Get synchronous compiled graph.

        Returns:
            ContextManager: Synchronous context manager

        Example:
            with crew.get_sync_compiled_graph() as graph:
                result = graph.invoke({"messages": [{"role": "user", "content": "Hello"}]})

                # Multiple operations supported
                for chunk in graph.stream({"messages": [{"role": "user", "content": "World"}]}):
                    print(chunk)
        """
        with self._memory_manager._get_sync_context() as (checkpointer, store):
            compiled = self._get_compiled_graph(checkpointer, store, is_async=False)
            yield compiled

    @asynccontextmanager
    async def get_async_compiled_graph(self):
        """
        Get asynchronous compiled graph.

        Returns:
            AsyncContextManager: Asynchronous context manager

        Example:
            async with crew.get_async_compiled_graph() as graph:
                result = await graph.ainvoke({"messages": [{"role": "user", "content": "Hello"}]})

                # Async streaming
                async for chunk in graph.astream({"messages": [{"role": "user", "content": "World"}]}):
                    print(chunk)
        """
        async with self._memory_manager._get_async_context() as (checkpointer, store):
            compiled = self._get_compiled_graph(checkpointer, store, is_async=True)
            yield compiled

    @asynccontextmanager
    async def get_checkpointer_for_migration(self):
        """Get checkpointer for legacy data migration (application layer only).

        This method provides access to the underlying checkpointer for reading
        old session_state data before migrating to LangGraph State.

        Example:
            ```python
            # Create migration helper in your app layer (app/helpers/legacy_state_migration.py)
            async def read_legacy_state(checkpointer, session_id):
                config = {"configurable": {"thread_id": session_id, "checkpoint_ns": ""}}
                checkpoint_tuple = await checkpointer.aget_tuple(config)
                if checkpoint_tuple and checkpoint_tuple.checkpoint:
                    channel_values = checkpoint_tuple.checkpoint.get("channel_values", {})
                    return channel_values.get("session_state", {})
                return {}

            # Use it in your application
            crew = Crew(agent=..., memory=True)

            async with crew.get_checkpointer_for_migration() as checkpointer:
                old_data = await read_legacy_state(checkpointer, session_id)

                # Migrate old data to new State
                result = await crew.ainvoke(
                    {
                        "sandbox_id": old_data.get("sandbox_id"),
                        "upload_files": old_data.get("upload_files", []),
                    },
                    config={"configurable": {"thread_id": session_id}}
                )
            ```

        Note:
            This is intended for one-time data migration only. Tools should
            read data from runtime.state, not directly access the checkpointer.
        """
        async with self._memory_manager._get_async_context() as (checkpointer, store):
            yield checkpointer
