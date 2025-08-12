from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from typing import Any

from langchain_core.messages import (
    HumanMessage,
    SystemMessage,
)
from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.utils.runnable import RunnableLike

from .executors.base import BaseExecutor
from .executors.factory import ExecutorFactory
from .guardrail import GuardrailFunc, with_guardrails
from .hitl import HITLConfig
from .mcp import MCPConfig, MCPToolAdapter
from .memory import MemoryConfig
from .prompt_builder import PromptBuilder
from .types import TaskSpec

# Setup logger
logger = logging.getLogger(__name__)


class Agent:
    def __init__(
        self,
        # CrewAI compatibility
        config: dict[str, Any] | None = None,
        role: str | None = None,
        goal: str | None = None,
        backstory: str | None = None,
        name: str | None = None,
        tools: list[BaseTool] | None = None,
        llm: Any | None = None,
        verbose: bool = False,
        debug: bool = True,
        # Executor configuration
        executor_type: str = "react",
        prompt: str | SystemMessage | Callable | Runnable | None = None,
        executor_kwargs: dict[str, Any] | None = None,
        # MCP support
        mcp_servers: dict[str, dict[str, Any]] | None = None,
        mcp_config: MCPConfig | None = None,
        mcp_tool_filter: list[str] | None = None,
        # Memory support
        memory: bool | MemoryConfig | None = None,
        # Pre-model hook
        pre_model_hook: RunnableLike | None = None,
        # Post-model hook
        post_model_hook: RunnableLike | None = None,
        # HITL support
        hitl: bool | HITLConfig | None = None,
        # Handoff configuration
        handoff_to: list[str] | None = None,
        # Entry agent flag
        is_entry: bool = False,
        # Guardrail support
        input_guards: list[GuardrailFunc] | None = None,
        output_guards: list[GuardrailFunc] | None = None,
    ):
        """Initialize Agent with configuration.

        Args:
            role: The role of the agent
            goal: The goal the agent is trying to achieve
            backstory: The backstory of the agent
            name: Optional custom name for the agent (also used as unique identifier)
            tools: List of tools available to the agent
            llm: Language model to use
            verbose: Whether to log verbose output
            debug: Enable debug mode
            executor_type: Type of executor to use (default: "react")
            prompt: Custom prompt for the agent
            executor_kwargs: Additional kwargs for executor
            mcp_servers: MCP server configurations
            mcp_config: MCP configuration
            mcp_tool_filter: Filter for MCP tools
            memory: Memory configuration (bool, MemoryConfig instance, or None to disable)
            pre_model_hook: Hook to run before model execution
            post_model_hook: Hook to run after model execution

            hitl: HITL configuration (bool, HITLConfig instance, or None to disable)
            config: CrewAI-style configuration dictionary containing role, goal, backstory, etc.
            handoff_to: List of agent names this agent can handoff tasks to
            is_entry: Whether this agent is an entry point for the crew
            input_guards: List of input guardrail functions to apply to all tasks
            output_guards: List of output guardrail functions to apply to all tasks
        """
        # Handle CrewAI-style config
        if config:
            role = role or config.get("role")
            goal = goal or config.get("goal")
            backstory = backstory or config.get("backstory")
            # Handle LLM configuration
            if not llm and config.get("llm"):
                from .llm_factory import LLMFactory

                llm = LLMFactory.create_llm(config["llm"])
            # Handle handoff configuration
            if handoff_to is None and config.get("handoff_to"):
                handoff_to = config.get("handoff_to")
            # Handle entry agent flag
            if not is_entry and config.get("is_entry"):
                is_entry = config.get("is_entry", False)
            # Other config options can be added here as needed

        # Mutual exclusivity check: cannot use both custom prompt and CrewAI-style attributes
        if prompt is not None:
            if role is not None or goal is not None or backstory is not None:
                raise ValueError(
                    "Cannot use both custom 'prompt' and CrewAI-style attributes (role/goal/backstory). "
                    "Choose either:\n"
                    "1. Custom prompt mode: only set 'prompt' parameter\n"
                    "2. CrewAI mode: only set role/goal/backstory parameters"
                )

        # Save original values (might be None)
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.name = name
        self.tools = tools or []
        self.llm = llm
        self.verbose = verbose
        self.debug = debug
        self.config = config

        # Crew dependencies for executor creation
        self.checkpointer = None
        self.store = None

        # Executor configuration
        self.executor: BaseExecutor | None = None
        self.executor_type = executor_type
        self.prompt = prompt
        self.executor_kwargs = executor_kwargs or {}

        # Guardrail configuration
        self.input_guards = input_guards or []
        self.output_guards = output_guards or []

        # MCP configuration
        self.mcp_servers = mcp_servers
        self.mcp_config = mcp_config
        self.mcp_tool_filter = mcp_tool_filter
        self._mcp_adapter = None
        self._mcp_tools = []

        # Load MCP tools if servers are provided
        if self.mcp_servers:
            self._load_mcp_tools()

        # Memory configuration
        if memory is None:
            self.memory_config = MemoryConfig(enabled=False)
            self.memory = False
        elif isinstance(memory, bool):
            self.memory_config = MemoryConfig(enabled=memory)
            self.memory = memory
        elif isinstance(memory, MemoryConfig):
            self.memory_config = memory
            self.memory = memory.enabled
        else:
            raise ValueError(f"Invalid memory parameter type: {type(memory)}")
        self._memory = None  # Will store ShortTermMemory instance from crew
        self._memory_context = None  # For storing injected context
        self._thread_id = None  # For thread management
        self.use_memory = False  # Will be set by crew if memory enabled

        # Hooks
        self.pre_model_hook = pre_model_hook
        self.post_model_hook = post_model_hook

        # Handoff configuration
        self.handoff_to = handoff_to or []

        # Entry agent flag
        self.is_entry = is_entry

        # HITL configuration
        if hitl is None:
            self.hitl_config = HITLConfig(enabled=False)
        elif isinstance(hitl, bool):
            self.hitl_config = HITLConfig(enabled=hitl)
        elif isinstance(hitl, HITLConfig):
            self.hitl_config = hitl
        else:
            raise ValueError(f"Invalid hitl parameter type: {type(hitl)}")

        # Setup HITL configuration
        self._setup_hitl()

    def __repr__(self):
        role_str = self.role if self.role else "N/A"
        goal_str = self.goal if self.goal else "N/A"
        return f"Agent(role='{role_str}', goal='{goal_str}')"

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
            logger.info(f"Loading MCP tools for agent '{self.role or 'Agent'}'...")

        # Check if we're already in an async context
        try:
            # Try to get the running loop
            asyncio.get_running_loop()
            # If we're here, we're in an async context - use ThreadPoolExecutor
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                # Create adapter if not exists (must be done in main thread)
                if self._mcp_adapter is None:
                    self._mcp_adapter = MCPToolAdapter(config=self.mcp_config)

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
                self._mcp_adapter = MCPToolAdapter(config=self.mcp_config)

            tools = asyncio.run(
                self._mcp_adapter.from_servers(
                    servers=self.mcp_servers, tool_filter=self.mcp_tool_filter
                )
            )
            self._setup_and_process_mcp_tools(tools)

    async def _aload_mcp_tools(self):
        """Async version of MCP tools loading for use in async contexts"""
        if self.verbose:
            logger.info(f"Loading MCP tools for agent '{self.role or 'Agent'}'...")

        # Create adapter if not exists
        if self._mcp_adapter is None:
            self._mcp_adapter = MCPToolAdapter(config=self.mcp_config)

        tools = await self._mcp_adapter.from_servers(
            servers=self.mcp_servers, tool_filter=self.mcp_tool_filter
        )

        self._setup_and_process_mcp_tools(tools)

    def _setup_with_memory(self, memory, thread_id):
        """Setup agent with memory context (called by Crew)"""
        self._memory = memory  # ShortTermMemory instance
        self._thread_id = thread_id
        self.use_memory = True

        if self.verbose:
            logger.info(f"Agent '{self.role}' configured with memory support")

    def _create_default_store(self):
        """Create default store based on config"""
        from langcrew.memory.storage import get_storage

        return get_storage(
            provider=self.memory_config.provider,
            config={
                "connection": self.memory_config.connection,
                "path": self.memory_config.path,
            },
        )

    def _setup_hitl(self):
        """Setup HITL tool wrapping for the agent"""
        if not self.hitl_config.enabled:
            return

        from langcrew.hitl import HITLToolWrapper

        wrapper = HITLToolWrapper(self.hitl_config)

        # Wrap main tools
        if hasattr(self, "tools") and self.tools:
            self.tools = wrapper.wrap_tools(self.tools)

    def _create_default_task_spec(self, state: dict[str, Any]) -> TaskSpec:
        """Create a default TaskSpec when no explicit task is provided.

        Args:
            state: Current crew state

        Returns:
            TaskSpec with description based on agent's role and goal
        """
        # Extract content from the last HumanMessage if available
        user_input = None
        if state and "messages" in state and state["messages"]:
            messages = state["messages"]
            if (
                messages
                and hasattr(messages[-1], "type")
                and messages[-1].type == "human"
            ):
                user_input = messages[-1].content

        # Check if user_input is None
        if user_input is None:
            # Log that we're creating a default task spec without user input
            if self.verbose:
                logger.info(
                    f"Creating default task spec for agent '{self.name}' without user input"
                )
            # Create a generic default task spec when no user input is available
            return TaskSpec(
                description="Based on your professional capabilities and role, continue processing the current task",
                expected_output="Provide complete and accurate task results based on your professional judgment",
            )

        return TaskSpec(
            description=f"Process the following request: {user_input}",
            expected_output="Complete and accurate response to the user's request",
        )

    def _create_executor(
        self, state: dict[str, Any], task=None, response_format=None
    ) -> BaseExecutor:
        """Create executor if not already exists.

        Args:
            state: Current crew state
            task: Optional Task instance, if provided will use task._spec
            response_format: Optional response format from task

        Returns:
            Configured BaseExecutor instance
        """
        if self.executor is not None:
            return self.executor

        # Use task's spec if available, otherwise create default
        if task and hasattr(task, "_spec") and task._spec:
            task_spec = task._spec
        else:
            task_spec = self._create_default_task_spec(state)

        # Extract response_format from task's output_json if not provided and task is available
        if (
            response_format is None
            and task
            and hasattr(task, "output_json")
            and task.output_json
        ):
            response_format = task.output_json

        # Decide which prompt to use based on whether custom prompt is provided
        if self.prompt is not None:
            # User provided custom prompt, use it directly
            executor_prompt = self.prompt
        else:
            # Use PromptBuilder to generate CrewAI-style prompt
            prompt_builder = PromptBuilder()
            prompt_messages = prompt_builder.format_prompt(
                agent=self,
                task=task_spec,
                context=state.get("context") if state else None,
            )
            executor_prompt = prompt_messages[0]  # SystemMessage

        # Get interrupt configuration from HITL config
        interrupt_before = (
            self.hitl_config.get_interrupt_before_nodes()
            if self.hitl_config.enabled
            else []
        )
        interrupt_after = (
            self.hitl_config.get_interrupt_after_nodes()
            if self.hitl_config.enabled
            else []
        )

        self.executor = ExecutorFactory.create_executor(
            executor_type=self.executor_type,
            llm=self.llm,
            task_spec=task_spec,
            tools=self.tools,
            prompt=executor_prompt,  # Use the decided prompt
            checkpointer=self.checkpointer,
            store=self.store,
            pre_model_hook=self.pre_model_hook,
            post_model_hook=self.post_model_hook,
            interrupt_before=interrupt_before,  # LangGraph native node-level interrupt
            interrupt_after=interrupt_after,  # LangGraph native node-level interrupt
            response_format=response_format,
            debug=self.debug,
            **self.executor_kwargs,
        )

    def _prepare_executor_input(
        self, input: dict[str, Any] | None, task=None
    ) -> dict[str, Any] | None:
        """Prepare executor input by building and handling user messages.

        Logic flow:
        1. Get task_spec from executor or create default
        2. Ensure input is a dictionary (create empty dict if None)
        3. Based on prompt mode:
           - Native prompt: Create minimal HumanMessage with task details
           - CrewAI mode: Use PromptBuilder to generate HumanMessage content

        Args:
            input: Input dictionary for execution (CrewState or other)
            task: Optional Task instance for task-specific processing

        Returns:
            Modified input dictionary with appropriate user messages

        Raises:
            ValueError: If task_spec is not found in executor
        """
        # Get task_spec from executor or task
        task_spec = getattr(self.executor, "task_spec", None)
        if task_spec is None and task and hasattr(task, "_spec"):
            task_spec = task._spec
        if task_spec is None:
            logger.error("task_spec is required but not found in executor or task")
            raise ValueError("task_spec is required but not found in executor or task")

        # Ensure input is a dictionary
        if input is None:
            input = {}

        if self.prompt is not None:
            # Native prompt mode: minimal framework intervention
            # Only ensure messages exist, let LangGraph's prompt mechanism handle the rest

            # Build task message once
            task_message = task_spec.description
            if task_spec.expected_output:
                task_message += f"\n\nExpected Output: {task_spec.expected_output}"
            context = input.get("context", "")
            if context:
                task_message += f"\n\nContext: {context}"

            if "messages" not in input or not input["messages"]:
                # Create new messages list with task message
                input["messages"] = [HumanMessage(content=task_message)]
            else:
                # Messages exist - check if we need to add task as HumanMessage
                last_message = input["messages"][-1]
                if not isinstance(last_message, HumanMessage):
                    # Last message is not HumanMessage - add task as HumanMessage
                    input["messages"].append(HumanMessage(content=task_message))
            # Don't do additional processing, let user's prompt fully control behavior
        else:
            # CrewAI mode: use PromptBuilder to build complete messages
            context = input.get("context", "")
            prompt_builder = PromptBuilder()
            prompt_messages = prompt_builder.format_prompt(
                agent=self, task=task_spec, context=context
            )

            # Handle messages based on input state
            if "messages" not in input or not input["messages"]:
                # No messages or empty list - use HumanMessage from prompt
                input["messages"] = [prompt_messages[1]]
            else:
                # Messages exist - check the last message type
                last_message = input["messages"][-1]

                if not isinstance(last_message, HumanMessage):
                    # Last message is not HumanMessage - we need to add task as HumanMessage
                    input["messages"].append(prompt_messages[1])

        return input

    def _prepare_execution(
        self, input: dict[str, Any] = None, **kwargs: Any
    ) -> dict[str, Any]:
        """Prepare execution by extracting task and setting up executor.

        Args:
            input: Input dictionary for execution
            **kwargs: Additional arguments

        Returns:
            Prepared input dictionary for executor
        """
        # Extract task from kwargs if provided
        task = kwargs.pop("task", None)

        # Ensure executor exists
        self._create_executor(input or {}, task=task)

        # Prepare input with prompt messages
        prepared_input = self._prepare_executor_input(input, task=task)

        return prepared_input

    @with_guardrails
    def _executor_invoke(
        self,
        prepared_input: dict[str, Any],
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Executor invoke method with guardrails applied to prepared_input.

        This method is called after input preparation and applies guardrails
        to the prepared input before calling the executor.

        Args:
            prepared_input: Prepared input data for executor
            config: Optional runnable configuration
            **kwargs: Additional arguments

        Returns:
            Output dictionary from executor
        """
        return self.executor.invoke(prepared_input, config, **kwargs)

    @with_guardrails
    async def _executor_ainvoke(
        self,
        prepared_input: dict[str, Any],
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Executor async invoke method with guardrails applied to prepared_input.

        This method is called after input preparation and applies guardrails
        to the prepared input before calling the executor.

        Args:
            prepared_input: Prepared input data for executor
            config: Optional runnable configuration
            **kwargs: Additional arguments

        Returns:
            Output dictionary from executor
        """
        return await self.executor.ainvoke(prepared_input, config, **kwargs)

    def invoke(
        self,
        input: dict[str, Any] = None,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Unified synchronous execution entry point.

        Args:
            input: CrewState or other input for execution (no longer wrapped by Task)
            config: Optional runnable configuration
            **kwargs: Additional arguments, may include 'task' for task-mode execution

        Returns:
            Output dictionary for LangGraph
        """
        # Prepare execution
        prepared_input = self._prepare_execution(input, **kwargs)

        # Call executor's invoke method with guardrails applied to prepared_input
        return self._executor_invoke(prepared_input, config, **kwargs)

    async def ainvoke(
        self,
        input: dict[str, Any] = None,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Unified asynchronous execution entry point.

        Args:
            input: CrewState or other input for execution (no longer wrapped by Task)
            config: Optional runnable configuration
            **kwargs: Additional arguments, may include 'task' for task-mode execution

        Returns:
            Output dictionary for LangGraph
        """
        # Prepare execution
        prepared_input = self._prepare_execution(input, **kwargs)

        # Call executor's ainvoke method with guardrails applied to prepared_input
        return await self._executor_ainvoke(prepared_input, config, **kwargs)
