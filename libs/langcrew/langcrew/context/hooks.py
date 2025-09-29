"""
Context Management Hooks

Provides hooks for dynamic context management during agent execution,
including token monitoring, message compression, and execution context injection.
Also includes hook composition utilities.
"""

import inspect
import logging
from typing import Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.messages import AIMessage, BaseMessage, RemoveMessage, ToolMessage
from langchain_core.runnables import Runnable, RunnableConfig, RunnableLambda
from langgraph.utils.runnable import RunnableLike

from ..types import CrewState
from .config import (
    AdaptiveWindowConfig,
    CompressToolsConfig,
    ContextConfig,
    ContextConfigType,
    KeepLastConfig,
    SummaryConfig,
)
from .processor import MessageProcessor
from .token_utils import count_message_tokens

logger = logging.getLogger(__name__)


class ContextManagementHook(Runnable):
    """
    Pre-model hook for React Agent context management.

    Executes before each agent node to optimize message history using configured strategies:
    - KeepLastConfig: Retain only recent messages
    - AdaptiveWindowConfig: Maintain messages within token budget
    - SummaryConfig: Summarize old messages when threshold exceeded
    - CompressToolsConfig: Compress tool outputs with custom compressor

    Runs before user hooks to provide baseline optimization while preserving user control.
    """

    def __init__(
        self, context_config: ContextConfigType, llm: BaseLanguageModel | None = None
    ):
        """
        Initialize the context management hook.

        Args:
            context_config: Type-safe configuration object with all necessary settings
            llm: Language model instance for token counting
        """
        self.config = context_config  # Store configuration object directly
        self.llm = llm
        self.call_count = 0

    def invoke(
        self,
        input: CrewState,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> CrewState:
        """Process state with configured context management strategy."""
        state = input
        self.call_count += 1

        initial_message_count = len(state["messages"])

        logger.info(
            f"ContextManagementHook.invoke called: call_count={self.call_count}, messages={initial_message_count}"
        )

        # Check if we need to inject execution context
        self._inject_context(state)

        # Check token count and apply compression if needed
        if self._should_compress(state):
            state["messages"] = self._compress(state)

        return state

    async def ainvoke(
        self,
        input: CrewState,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> CrewState:
        """Async version of invoke for LLM-based strategies like summarization."""
        state = input
        self.call_count += 1

        initial_message_count = len(state["messages"])

        logger.info(
            f"ContextManagementHook.ainvoke called: call_count={self.call_count}, messages={initial_message_count}"
        )

        # Check if we need to inject execution context (reuse sync logic)
        self._inject_context(state)

        # Check token count and apply compression if needed
        if self._should_compress(state):
            state["messages"] = await self._acompress(state)

        return state

    def _inject_context(self, state: CrewState):
        """Inject execution context at configured intervals."""
        # Access base class attribute directly
        interval = self.config.execution_context_interval

        # Skip injection if interval is 0
        if interval == 0:
            logger.info("Execution context injection disabled (interval=0)")
            return

        # Calculate injection decision
        should_inject = (interval is None) or (self.call_count % interval == 1)
        has_execution_plan = bool(state.get("execution_plan"))

        logger.info(
            f"Execution context injection decision: should_inject={should_inject} "
            f"(interval={interval}, call_count={self.call_count}), has_execution_plan={has_execution_plan}"
        )

        # Early return: not scheduled for injection
        if not should_inject:
            logger.info(
                f"Skipping context injection - not scheduled (call_count={self.call_count}, interval={interval})"
            )
            return

        # Early return: no execution plan available
        if not has_execution_plan:
            logger.info("Skipping context injection - no execution plan available")
            return

        # Get execution context
        execution_context = state["execution_plan"].build_context_prompt()

        # Early return: execution context is empty
        if not execution_context or not execution_context.strip():
            logger.info("Skipping context injection - execution context is empty")
            return

        # Early return: empty messages list
        messages = state["messages"]
        if not messages:
            logger.info("Skipping context injection for empty message list")
            return

        # Inject execution context
        context_content = f"[Execution Context Reference]\n{execution_context}"
        last_message = messages[-1]

        if isinstance(last_message, ToolMessage):
            # Last message is ToolMessage - inject context after tool execution
            context_message = AIMessage(content=context_content)
            messages.append(context_message)
            logger.info("Injected context after ToolMessage")
        elif isinstance(last_message, AIMessage):
            # Last message is AI - merge context to avoid consecutive AI messages
            # This can happen if injection was triggered multiple times
            original_content = last_message.content or ""
            if original_content.strip():
                # Append context to existing AI message
                last_message.content = f"{original_content}\n\n{context_content}"
                logger.info("Merged context with existing AIMessage")
            else:
                # Replace empty AI message content
                last_message.content = context_content
                logger.info("Replaced empty AIMessage content with context")
        else:
            # Other message types (HumanMessage, SystemMessage, etc.) - skip injection
            logger.info(
                f"Skipping context injection - last message type: {type(last_message).__name__}"
            )

    def _should_compress(self, state: CrewState) -> bool:
        """Check if compression is needed based on strategy and thresholds."""
        messages = state.get("messages", [])

        if not messages:
            logger.info("Skipping compression - message list is empty")
            return False

        # KeepLastConfig always applies (no threshold check)
        if isinstance(self.config, KeepLastConfig):
            logger.info("KeepLastConfig detected - always applying compression")
            return True

        # CompressToolsConfig always applies (immediate compression)
        if isinstance(self.config, CompressToolsConfig):
            logger.info("CompressToolsConfig detected - always applying compression")
            return True

        # AdaptiveWindowConfig always applies (maintain window size)
        if isinstance(self.config, AdaptiveWindowConfig):
            logger.info(
                "AdaptiveWindowConfig detected - always applying window trimming"
            )
            return True

        # SummaryConfig uses compression_threshold
        if isinstance(self.config, SummaryConfig):
            token_count = count_message_tokens(messages, self.llm)
            compression_threshold = self.config.compression_threshold
            should_compress = token_count > compression_threshold

            if should_compress:
                logger.info(
                    f"Token count {token_count} exceeds threshold {compression_threshold}, applying compression"
                )
            else:
                logger.info(
                    f"Token count {token_count} below threshold {compression_threshold}, skipping compression"
                )

            return should_compress
        else:
            logger.warning(
                f"Unknown config type {type(self.config).__name__}, skipping compression"
            )
            return False

    def _compress_summary(
        self, state: CrewState, messages: list[BaseMessage]
    ) -> list[BaseMessage]:
        """
        Apply summary-based compression using synchronous LLM calls.
        """
        # Get LLM for summarization
        summary_llm = self.config.llm or self.llm
        if not summary_llm:
            raise ValueError("No LLM available for summarization")

        # Perform summarization
        result = MessageProcessor().summarize_and_trim(
            messages=messages,
            keep_recent_tokens=self.config.keep_recent_tokens,
            running_summary=state.get("running_summary"),
            llm=summary_llm,
        )

        # Update state and return
        state["running_summary"] = result["running_summary"]
        return result["messages"]

    async def _acompress_summary(
        self, state: CrewState, messages: list[BaseMessage]
    ) -> list[BaseMessage]:
        """
        Apply summary-based compression using asynchronous LLM calls.
        """
        # Get LLM for summarization
        summary_llm = self.config.llm or self.llm
        if not summary_llm:
            raise ValueError("No LLM available for summarization")

        # Perform asynchronous summarization
        result = await MessageProcessor().asummarize_and_trim(
            messages=messages,
            keep_recent_tokens=self.config.keep_recent_tokens,
            running_summary=state.get("running_summary"),
            llm=summary_llm,
        )

        # Update state and return
        state["running_summary"] = result["running_summary"]
        return result["messages"]

    def _execute_compression_strategy(
        self, messages: list[BaseMessage]
    ) -> list[BaseMessage] | None:
        """Execute compression strategy. Returns None for SummaryConfig."""
        if isinstance(self.config, KeepLastConfig):
            logger.info(
                f"Applying keep_last compression: keep_last={self.config.keep_last}"
            )
            return MessageProcessor().keep_last_n(messages, self.config.keep_last)
        elif isinstance(self.config, AdaptiveWindowConfig):
            logger.info(
                f"Applying adaptive window trimming: window_size={self.config.window_size}"
            )
            return MessageProcessor().adaptive_window_trim(
                messages, self.config.window_size, self.llm
            )
        elif isinstance(self.config, CompressToolsConfig):
            logger.info(
                f"Applying custom compressor: {type(self.config.compressor).__name__} "
                f"with keep_recent_rounds={self.config.keep_recent_rounds}"
            )
            return MessageProcessor().compress_earlier_tool_rounds(
                messages, self.config.compressor, self.config.keep_recent_rounds
            )
        # SummaryConfig returns None, handled by caller
        return None

    def _compress(self, state: CrewState) -> list[BaseMessage]:
        """Apply configured compression strategy synchronously."""
        messages = state["messages"]
        initial_count = len(messages)

        # Try executing non-async strategies
        result = self._execute_compression_strategy(messages)

        # Handle special SummaryConfig case
        if result is None and isinstance(self.config, SummaryConfig):
            logger.info(
                f"Applying summary compression: keep_recent_tokens={self.config.keep_recent_tokens}"
            )
            result = self._compress_summary(state, messages)
        elif result is None:
            error_msg = f"Unknown config type: {type(self.config).__name__}"
            logger.error(f"Configuration error: {error_msg}")
            raise ValueError(error_msg)

        final_count = sum(1 for msg in messages if not isinstance(msg, RemoveMessage))
        logger.info(f"Compression completed: {initial_count} -> {final_count} messages")
        return result

    async def _acompress(self, state: CrewState) -> list[BaseMessage]:
        """Apply configured compression strategy asynchronously."""
        messages = state["messages"]
        initial_count = len(messages)

        # Try executing non-async strategies
        result = self._execute_compression_strategy(messages)

        # Handle special SummaryConfig case
        if result is None and isinstance(self.config, SummaryConfig):
            logger.info(
                f"Applying summary compression: compression_threshold={self.config.compression_threshold} keep_recent_tokens={self.config.keep_recent_tokens}"
            )
            result = await self._acompress_summary(state, messages)
        elif result is None:
            error_msg = f"Unknown config type: {type(self.config).__name__}"
            logger.error(f"Configuration error: {error_msg}")
            raise ValueError(error_msg)

        final_count = sum(1 for msg in messages if not isinstance(msg, RemoveMessage))
        logger.info(f"Compression completed: {initial_count} -> {final_count} messages")
        return result


class ComposedHook(Runnable):
    """Sequential hook executor that chains multiple hooks together."""

    def __init__(self, hooks: list[RunnableLike]):
        self.hooks = hooks or []
        # Only log in debug level to avoid interfering with verbose control
        # logger.info(f"ComposedHook initialized with {len(self.hooks)} hooks: {[type(h).__name__ for h in self.hooks]}")

    def invoke(
        self,
        input: CrewState,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> CrewState:
        """Execute hooks sequentially."""
        logger.info(f"ComposedHook.invoke executing {len(self.hooks)} hooks")
        current_state = input
        for i, hook in enumerate(self.hooks):
            hook_name = type(hook).__name__ if hasattr(hook, "__name__") else str(hook)
            logger.info(f"Executing hook {i + 1}/{len(self.hooks)}: {hook_name}")
            current_state = hook.invoke(current_state, config, **kwargs)
        logger.info("ComposedHook.invoke completed")
        return current_state

    async def ainvoke(
        self,
        input: CrewState,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> CrewState:
        """Execute hooks sequentially (async)."""
        logger.info(f"ComposedHook.ainvoke executing {len(self.hooks)} hooks")
        current_state = input
        for i, hook in enumerate(self.hooks):
            hook_name = type(hook).__name__ if hasattr(hook, "__name__") else str(hook)
            logger.info(f"Executing async hook {i + 1}/{len(self.hooks)}: {hook_name}")
            # If hook is Runnable, pass full arguments
            current_state = await hook.ainvoke(current_state, config, **kwargs)
        logger.info("ComposedHook.ainvoke completed")
        return current_state


def create_context_hooks(
    context_config: "ContextConfig | None" = None,
    user_pre_hook: RunnableLike | None = None,
    llm: BaseLanguageModel | None = None,
    verbose: bool = False,
) -> ComposedHook | None:
    """
    Create composed hook chain for pre-model context management.

    Context hooks run first for baseline optimization, followed by user hooks
    for final control. Returns None if no hooks configured.
    """
    hooks = []

    if context_config and context_config.pre_model:
        # Normalize context configs to list
        context_configs = context_config.pre_model
        if not isinstance(context_configs, list):
            context_configs = [context_configs]

        # Add context management hooks
        for config in context_configs:
            context_hook = ContextManagementHook(config, llm)
            hooks.append(context_hook)
            if verbose:
                logger.info(f"Added {type(config).__name__} context hook")

    # Add user hook last (final control)
    if user_pre_hook:
        # Wrap user hook if needed
        if isinstance(user_pre_hook, Runnable):
            wrapped_hook = user_pre_hook
            if verbose:
                logger.info("User hook is already Runnable")
        elif callable(user_pre_hook):
            if inspect.iscoroutinefunction(user_pre_hook):
                wrapped_hook = RunnableLambda(user_pre_hook).with_config({
                    "run_async": True
                })
                if verbose:
                    logger.info("Wrapped async user hook in RunnableLambda")
            else:
                wrapped_hook = RunnableLambda(user_pre_hook)
                if verbose:
                    logger.info("Wrapped sync user hook in RunnableLambda")
        else:
            logger.warning("User hook is not callable, ignoring")
            wrapped_hook = None

        if wrapped_hook:
            hooks.append(wrapped_hook)

    # Return composed hook or None
    if hooks:
        result = ComposedHook(hooks)
        if verbose:
            logger.info(f"Created ComposedHook with {len(hooks)} hooks")
        return result

    return None
