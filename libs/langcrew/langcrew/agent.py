from __future__ import annotations

import asyncio
import inspect
import logging
from collections.abc import Callable, Sequence
from typing import Any

from langchain.agents import AgentState, create_agent
from langchain.agents.middleware import after_model, before_model
from langchain.agents.middleware.types import AgentMiddleware
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.runtime import Runtime
from langgraph.types import Checkpointer
from langgraph.utils.runnable import RunnableLike
from pydantic import BaseModel

from .controllable import ControllableAgent
from .guardrail import GuardrailFunc, with_guardrails
from .memory import MemoryConfig
from .middleware._thinking_blocks import _ThinkingBlockNormalizationMiddleware
from .tools.mcp import MCPToolAdapter
from .utils import extract_text_content

# Setup logger
logger = logging.getLogger(__name__)


class Agent(ControllableAgent):
    def __init__(
        self,
        prompt: str | SystemMessage | Callable | Runnable | None = None,
        llm: Any | None = None,
        tools: list[BaseTool | dict] | None = None,
        middleware: Sequence[AgentMiddleware] = (),
        *,
        name: str | None = None,
        response_format: None | type[BaseModel] | dict[str, Any] = None,
        mcp_servers: dict[str, dict[str, Any]] | None = None,
        mcp_tool_filter: list[str] | None = None,
        checkpointer: Checkpointer = None,
        pre_model_hook: RunnableLike | None = None,
        post_model_hook: RunnableLike | None = None,
        input_guards: list[GuardrailFunc] | None = None,
        output_guards: list[GuardrailFunc] | None = None,
        widgets: list[dict[str, Any]] | None = None,
        state_schema: type[AgentState] | None = None,
        verbose: bool = False,
        debug: bool = False,
    ):
        """Initialize Agent.

        Args:
            prompt: System prompt for the agent
            llm: Language model to use
            tools: List of tools available to the agent
            middleware: Langchain middleware list
            name: Optional custom name for the agent
            response_format: None for text, Pydantic BaseModel or dict for structured output
            mcp_servers: MCP server configurations
            mcp_tool_filter: Filter for MCP tools
            pre_model_hook: Hook to run before model execution.
                TODO: Migrate callers to ``middleware`` (``@before_model``)
                and remove this parameter.
            post_model_hook: Hook to run after model execution.
                TODO: Migrate callers to ``middleware`` (``@after_model``)
                and remove this parameter.
            input_guards: Input guardrail functions
            output_guards: Output guardrail functions
            widgets: Widget configurations (requires langcrew[chatkit])
            state_schema: Custom state schema class (subclass of AgentState)
            verbose: Enable verbose logging
            debug: Enable debug mode
        """
        self.name = name
        self.tools = tools or []
        self.llm = llm
        self.verbose = verbose
        self.debug = debug

        # Graph configuration
        self.graph = None
        self.prompt = prompt

        # Graph cache for compiled agent executors
        self._graphs: dict[str, Any] = {}

        # Guardrail configuration
        self.input_guards = input_guards or []
        self.output_guards = output_guards or []

        # MCP configuration (lazy-loaded on first graph build)
        self.mcp_servers = mcp_servers
        self.mcp_tool_filter = mcp_tool_filter
        self._mcp_adapter = None
        self._mcp_tools: list[BaseTool] = []

        # Memory (configured by Crew via _setup_memory, not by user directly)
        self.memory_config = None
        self.memory_tools: dict[str, dict[str, BaseTool]] = {}

        # Checkpointer (can be set here or managed by Crew)
        self.checkpointer = checkpointer

        # Widget configuration (lazy-loaded on first graph build)
        self.widgets = widgets or []

        # langchain middleware
        self.middleware = tuple(middleware)

        # State schema
        self.state_schema = state_schema

        # Hooks
        self.pre_model_hook = pre_model_hook
        self.post_model_hook = post_model_hook

        # Response format configuration
        self.response_format = response_format

        # Lazy initialization flag
        self._lazy_initialized = False

        # Initialize ControllableAgent
        super().__init__()

    def __repr__(self):
        name_str = self.name or "unnamed"
        return f"Agent(name='{name_str}')"

    def invoke(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Unified synchronous execution entry point.

        Args:
            input: CrewState or other input for execution
            config: Optional runnable configuration
            **kwargs: Additional arguments

        Returns:
            Output dictionary for LangGraph
        """
        runtime_kwargs = dict(kwargs)

        prepared_input = self._prepare_execution(input, **runtime_kwargs)
        return self._graph_invoke(prepared_input, config, **runtime_kwargs)

    async def ainvoke(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Unified asynchronous execution entry point (LangChain interface).

        Args:
            input: CrewState or other input for execution
            config: Optional runnable configuration
            **kwargs: Additional arguments

        Returns:
            Output dictionary for LangGraph
        """
        runtime_kwargs = dict(kwargs)

        prepared_input = self._prepare_execution(input, **runtime_kwargs)
        return await self._graph_ainvoke(prepared_input, config, **runtime_kwargs)

    def get_memory_tools(self, scope: str | None = None) -> dict | list:
        """Get memory tools by scope or all memory tools"""
        if scope:
            return self.memory_tools.get(scope, {})
        return self.memory_tools

    def _setup_memory(self, config: MemoryConfig):
        """Setup memory system - only handles long-term memory tools (checkpointer managed by Crew)"""
        # Short-term memory (checkpointer) is managed at Crew level and auto-propagated by LangGraph
        # Agent only needs to setup long-term memory tools
        if config.long_term.enabled:
            self._setup_long_term_memory(config)

    def _setup_long_term_memory(self, config: MemoryConfig):
        """Setup long-term memory tools that work with both sync and async execution"""
        from langmem import create_manage_memory_tool, create_search_memory_tool

        ltm_config = config.long_term

        # LangMem automatically gets store from LangGraph context

        # User memory tools
        if ltm_config.user_memory.enabled:
            # Create user namespace with or without app_id for isolation
            user_namespace: tuple[str, str] | tuple[str, str, str]
            if ltm_config.app_id:
                # With app_id: ("user_memories", app_id, "{user_id}")
                user_namespace = ("user_memories", ltm_config.app_id, "{user_id}")
            else:
                # Without app_id: ("user_memories", "{user_id}")
                # Note: No app-level isolation, memories may mix between applications
                user_namespace = ("user_memories", "{user_id}")

            user_manage = create_manage_memory_tool(
                namespace=user_namespace,
                name="manage_user_memory",
                instructions=ltm_config.user_memory.manage_instructions,
                schema=ltm_config.user_memory.schema,
                actions_permitted=ltm_config.user_memory.actions_permitted,
            )

            user_search = create_search_memory_tool(
                namespace=user_namespace,
                name="search_user_memory",
                instructions=ltm_config.user_memory.search_instructions,
                response_format="content_and_artifact",
            )

            # Add memory tools directly to agent.tools for unified access
            self.tools.extend([user_manage, user_search])

            # Store in internal memory_tools dictionary for debugging/querying
            self.memory_tools["user"] = {"manage": user_manage, "search": user_search}

        # App memory tools
        if ltm_config.app_memory.enabled:
            # Create app namespace with or without app_id for isolation
            app_namespace: tuple[str] | tuple[str, str]
            if ltm_config.app_id:
                # With app_id: ("app_memories", app_id)
                app_namespace = ("app_memories", ltm_config.app_id)
            else:
                # Without app_id: ("app_memories",)
                # Note: No app-level isolation, memories may mix between applications
                app_namespace = ("app_memories",)

            app_manage = create_manage_memory_tool(
                namespace=app_namespace,
                name="manage_app_memory",
                instructions=ltm_config.app_memory.manage_instructions,
                schema=ltm_config.app_memory.schema,
                actions_permitted=ltm_config.app_memory.actions_permitted,
            )

            app_search = create_search_memory_tool(
                namespace=app_namespace,
                name="search_app_memory",
                instructions=ltm_config.app_memory.search_instructions,
                response_format="content_and_artifact",
            )

            # Add memory tools directly to agent.tools for unified access
            self.tools.extend([app_manage, app_search])

            # Store in internal memory_tools dictionary for debugging/querying
            self.memory_tools["app"] = {"manage": app_manage, "search": app_search}

    def _setup_widgets(self):
        """Setup widget tools (requires langcrew[chatkit])"""
        # Delayed import - only when widgets are actually used
        try:
            from langcrew.chatkit import Widget, create_widget_tool
        except ImportError as e:
            raise ImportError(
                "Widget support requires ChatKit dependencies. "
                "Install with: pip install langcrew[chatkit]"
            ) from e

        for config in self.widgets:
            # Validate config is dict
            if not isinstance(config, dict):
                raise TypeError(
                    f"Widget config must be dict, got {type(config)}. "
                    f"Example: {{'widget_file': 'email.widget', 'description': 'Compose emails'}}"
                )

            # Extract configuration
            widget_file = config.get("widget_file")
            widget_json = config.get("widget_json")
            widget_obj = config.get("widget")
            description = config.get("description")
            tool_name = config.get("name")

            # Validate: must have exactly one widget source
            widget_source_count = sum([
                bool(widget_file),
                bool(widget_json),
                bool(widget_obj),
            ])
            if widget_source_count == 0:
                raise ValueError(
                    "Widget config must contain one of: 'widget_file', 'widget_json', or 'widget'"
                )
            if widget_source_count > 1:
                raise ValueError(
                    "Widget config can only contain one of: 'widget_file', 'widget_json', or 'widget'"
                )

            # Validate: must have description
            if not description:
                raise ValueError(
                    "Widget config dict must contain 'description' field. "
                    "Widget files don't include usage descriptions."
                )

            # Load widget from different sources
            if widget_file:
                widget = Widget.from_file(widget_file)
            elif widget_json:
                widget = Widget.from_json(widget_json)
            else:
                # widget_obj should be a Widget object
                if not isinstance(widget_obj, Widget):
                    raise TypeError(
                        f"'widget' must be a Widget object, got {type(widget_obj)}"
                    )
                widget = widget_obj

            # Create tool (only accepts Widget object)
            tool = create_widget_tool(
                widget=widget, description=description, name=tool_name
            )

            # Add tool to agent's tools list
            self.tools.append(tool)

    def _ensure_lazy_setup(self):
        """Run deferred setup (MCP, widgets) once before first graph build."""
        if self._lazy_initialized:
            return
        self._lazy_initialized = True

        if self.mcp_servers:
            self._load_mcp_tools()
        if self.widgets:
            self._setup_widgets()

    def _setup_and_process_mcp_tools(self, tools):
        """Process MCP tools result and add to agent's tool list"""
        # Add MCP tools to agent's tool list
        if tools:
            self.tools.extend(tools)
            self._mcp_tools = tools
        else:
            self._mcp_tools = []

        if self.verbose:
            logger.info(
                f"Loaded {len(self._mcp_tools)} MCP tools: {[t.name for t in self._mcp_tools]}"
            )

    def _load_mcp_tools(self):
        """Load MCP tools with smart async/sync context detection"""
        if self.verbose:
            logger.info(f"Loading MCP tools for agent '{self.name or 'Agent'}'...")

        # Check if we're already in an async context
        try:
            # Try to get the running loop
            asyncio.get_running_loop()
            # If we're here, we're in an async context - use ThreadPoolExecutor
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                # Create adapter if not exists (must be done in main thread)
                if self._mcp_adapter is None:
                    self._mcp_adapter = MCPToolAdapter()

                # Submit the async work to thread pool
                future = executor.submit(
                    asyncio.run,
                    self._mcp_adapter.from_servers(
                        servers=self.mcp_servers, tool_filter=self.mcp_tool_filter
                    ),
                )
                tools = future.result()
                self._setup_and_process_mcp_tools(tools)
        except RuntimeError:
            # No running loop, safe to use asyncio.run directly
            if self._mcp_adapter is None:
                self._mcp_adapter = MCPToolAdapter()

            tools = asyncio.run(
                self._mcp_adapter.from_servers(
                    servers=self.mcp_servers, tool_filter=self.mcp_tool_filter
                )
            )
            self._setup_and_process_mcp_tools(tools)

    async def _aload_mcp_tools(self):
        """Async version of MCP tools loading for use in async contexts"""
        if self.verbose:
            logger.info(f"Loading MCP tools for agent '{self.name or 'Agent'}'...")

        # Create adapter if not exists
        if self._mcp_adapter is None:
            self._mcp_adapter = MCPToolAdapter()

        tools = await self._mcp_adapter.from_servers(
            servers=self.mcp_servers, tool_filter=self.mcp_tool_filter
        )

        self._setup_and_process_mcp_tools(tools)

    def _build_agent_graph(
        self,
        llm: Any,
        tools: list[BaseTool],
        prompt: str | SystemMessage | Callable | Runnable | None,
        response_format: Any | None,
        debug: bool,
        pre_model_hook: RunnableLike | None,
        post_model_hook: RunnableLike | None,
        middleware: Sequence[Any],
        checkpointer: Checkpointer,
        state_schema: type[AgentState] | None = None,
        interrupt_before: list[str] | None = None,
        interrupt_after: list[str] | None = None,
    ):
        """Build the agent graph using langgraph's create_agent.

        This method integrates the core logic from StandardExecutor, converting
        hooks to middleware and building the agent graph.

        Note: checkpointer can be passed here for Agent-level state persistence,
        or managed at the Crew level via _get_compiled_graph(). When Agent is used
        within a Crew, Crew-level checkpointer takes precedence.

        Args:
            llm: Language model to use
            tools: List of tools available to the agent
            prompt: Optional prompt for the LLM
            response_format: Expected response format
            debug: Enable debug mode
            pre_model_hook: Hook to run before model execution
            post_model_hook: Hook to run after model execution
            middleware: Langchain middleware
            checkpointer: Optional checkpointer for state persistence
            interrupt_before: Nodes to interrupt before (compile-time)
            interrupt_after: Nodes to interrupt after (compile-time)

        Returns:
            Compiled state graph ready for execution
        """

        async def _call_hook_safe(hook: RunnableLike, state: AgentState) -> None:
            """Call hook safely, supporting both regular callables and Runnable."""
            if hook is None:
                return

            try:
                # 优先检查 Runnable（必须先检查，因为 Runnable 也是 callable）
                if isinstance(hook, Runnable):
                    if hasattr(hook, "ainvoke"):
                        await hook.ainvoke(state)
                    else:
                        hook.invoke(state)
                # 大部分情况：普通函数
                elif inspect.iscoroutinefunction(hook):
                    await hook(state)
                else:
                    hook(state)

            except Exception as e:
                logger.error(f"Error executing hook: {e}", exc_info=True)

        # Create middleware - always use async to support both sync and async hooks
        middleware_list = []

        if pre_model_hook:

            @before_model
            async def pre_model_hook_middleware(
                state: AgentState, runtime: Runtime
            ) -> dict[str, Any] | None:
                if self.verbose:
                    logger.info(
                        f"About to call model with {len(state['messages'])} messages"
                    )
                await _call_hook_safe(pre_model_hook, state)
                return None

            middleware_list.append(pre_model_hook_middleware)

        if post_model_hook:

            @after_model
            async def post_model_hook_middleware(
                state: AgentState, runtime: Runtime
            ) -> dict[str, Any] | None:
                if self.verbose:
                    logger.info(f"Model called with {len(state['messages'])} messages")
                await _call_hook_safe(post_model_hook, state)
                return None

            middleware_list.append(post_model_hook_middleware)

        if middleware:
            middleware_list.extend(middleware)

        # Keep this innermost so every model attempt receives valid content blocks,
        # including retries performed by caller-provided fallback middleware.
        middleware_list.append(_ThinkingBlockNormalizationMiddleware())

        create_agent_kwargs = {
            "model": llm,
            "tools": tools,
            "checkpointer": checkpointer,
            "response_format": response_format,
            "middleware": middleware_list,
            "interrupt_before": interrupt_before,
            "interrupt_after": interrupt_after,
            "debug": debug,
        }

        # Forward custom state schema if provided
        if state_schema is not None:
            create_agent_kwargs["state_schema"] = state_schema

        # Add prompt if provided
        if prompt is not None:
            create_agent_kwargs["system_prompt"] = prompt

        return create_agent(**create_agent_kwargs)

    def _create_graph(self, state: dict[str, Any], response_format=None):
        """Create agent graph if not already exists.

        Args:
            state: Current crew state
            response_format: Optional response format override

        Returns:
            Compiled state graph ready for execution
        """
        key = "default"
        if key in self._graphs:
            self.graph = self._graphs[key]
            return self.graph

        self._ensure_lazy_setup()

        # Extract response_format priority: parameter > agent.response_format
        if response_format is None and self.response_format:
            response_format = self.response_format

        self.graph = self._build_agent_graph(
            llm=self.llm,  # type: ignore[arg-type]
            tools=self.tools,
            prompt=self.prompt,
            checkpointer=self.checkpointer,
            pre_model_hook=self.pre_model_hook,
            post_model_hook=self.post_model_hook,
            response_format=response_format,
            debug=self.debug,
            middleware=self.middleware,
            state_schema=self.state_schema,
        )

        # Store in cache and return
        self._graphs[key] = self.graph
        return self.graph

    def _build_fallback_request_message(self, state: dict[str, Any]) -> str:
        """Build a fallback user request message when no HumanMessage is available.

        Args:
            state: Current crew state

        Returns:
            Fallback user request text
        """
        messages = state.get("messages", []) if state else []
        if messages:
            last_message = messages[-1]
            if (
                hasattr(last_message, "type")
                and last_message.type == "human"
                and hasattr(last_message, "content")
            ):
                message_text = extract_text_content(last_message.content).strip()
                if message_text:
                    return message_text

        context = (state.get("context") if state else "") or ""
        if context:
            return f"Please continue with the current request.\n\nContext: {context}"
        return "Please continue with the current request."

    def _prepare_execution(
        self, input: dict[str, Any] | None = None, **kwargs: Any
    ) -> dict[str, Any]:
        """Prepare execution and ensure graph availability.

        Args:
            input: Input dictionary for execution
            **kwargs: Additional arguments

        Returns:
            Prepared input dictionary for graph
        """
        # Ensure graph exists
        self._create_graph(input or {})

        # Prepare input with prompt messages
        prepared_input = self._prepare_graph_input(input)

        # Ensure we always return a dict, never None
        if prepared_input is None:
            prepared_input = {}

        return prepared_input

    def _prepare_graph_input(
        self, input: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        """Prepare graph input by building and handling user messages.

        Logic flow:
        1. Ensure input is a dictionary
        2. Ensure there is at least one HumanMessage for model execution

        Args:
            input: Input dictionary for execution (CrewState or other)

        Returns:
            Modified input dictionary with appropriate user messages
        """
        # Ensure input is a dictionary
        if input is None:
            input = {}

        if "messages" not in input or not input["messages"]:
            fallback_message = self._build_fallback_request_message(input)
            input["messages"] = [HumanMessage(content=fallback_message)]
        else:
            last_message = input["messages"][-1]
            if not isinstance(last_message, HumanMessage):
                fallback_message = self._build_fallback_request_message(input)
                input["messages"].append(HumanMessage(content=fallback_message))

        return input

    def _append_structured_response_message(self, result: dict[str, Any]) -> None:
        """Expose the structured response as a readable trailing AIMessage.

        When ``response_format`` is set, downstream consumers that only look at
        the last message in ``result["messages"]`` (e.g. UI rendering, streaming
        adapters, agent-as-node callers) expect that last message to be a plain
        ``AIMessage`` whose content is the final answer. The structured result,
        however, also lives in ``result["structured_response"]``.

        We surface it by APPENDING a new ``AIMessage`` rather than OVERWRITING
        the last message, and only when the last message is a ``ToolMessage``.

        Why this matters: the ToolStrategy structured output path (used when the
        model/provider does not support native structured output, e.g. some
        OpenAI-compatible providers like DeepSeek) represents the structured
        result as an ``AIMessage(tool_calls=[response_schema])`` immediately
        followed by a matching ``ToolMessage`` synthesized by ``create_agent``
        (this ``ToolMessage`` is the last message). Overwriting that trailing
        ``ToolMessage`` would leave the ``tool_calls`` dangling with no matching
        ``ToolMessage``. Once such a broken history is persisted to a
        checkpointer and replayed on the next turn, the provider rejects it with
        a 400 ("an assistant message with 'tool_calls' must be followed by tool
        messages responding to each 'tool_call_id'"). Appending preserves the
        tool_call/ToolMessage pairing while still ending the history with a
        readable ``AIMessage``.

        Strategy-specific behavior:
            - ToolStrategy path: last message is a ``ToolMessage`` -> append a
              readable ``AIMessage`` so the pairing stays intact AND the history
              ends with a plain assistant answer.
            - ProviderStrategy / native path: last message is already a plain
              ``AIMessage`` carrying the answer, so nothing needs to be done; we
              leave ``messages`` untouched to avoid emitting a duplicate message.

        Args:
            result: The graph output dict. Mutated in place when applicable.
        """
        if not (self.response_format and "structured_response" in result):
            return

        messages = result.get("messages")
        if not messages:
            return

        # Only the ToolStrategy path ends with a ToolMessage that must be kept
        # paired; appending here preserves that pairing. For other paths the last
        # message is already the plain AIMessage answer, so we do not duplicate it.
        if isinstance(messages[-1], ToolMessage):
            messages.append(AIMessage(content=str(result["structured_response"])))

    @with_guardrails
    def _graph_invoke(
        self,
        prepared_input: dict[str, Any],
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Graph invoke method with guardrails applied to prepared_input.

        This method is called after input preparation and applies guardrails
        to the prepared input before calling the graph.

        Args:
            prepared_input: Prepared input data for graph
            config: Optional runnable configuration
            **kwargs: Additional arguments

        Returns:
            Output dictionary from graph
        """
        if self.graph is None:
            raise RuntimeError("Graph not initialized. Call _create_graph first.")

        result = self.graph.invoke(prepared_input, config, **kwargs)

        self._append_structured_response_message(result)

        return result

    @with_guardrails
    async def _graph_ainvoke(
        self,
        prepared_input: dict[str, Any],
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Graph async invoke method with guardrails applied.

        Args:
            prepared_input: Prepared input data for graph
            config: Optional runnable configuration
            **kwargs: Additional arguments

        Returns:
            Output dictionary from graph
        """
        if self.graph is None:
            raise RuntimeError("Graph not initialized. Call _create_graph first.")

        result = await self.graph.ainvoke(prepared_input, config, **kwargs)

        self._append_structured_response_message(result)

        return result
