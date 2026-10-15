"""Middleware for providing subagents to an agent via a `task` tool."""

import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Literal, cast

from langchain.agents.middleware.types import (
    AgentMiddleware,
    ModelRequest,
    ModelResponse,
)
from langchain.tools import ToolRuntime
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool, StructuredTool
from langgraph.types import Command
from typing_extensions import Required, TypedDict

from ..utils.token_utils import count_message_tokens

logger = logging.getLogger(__name__)


class SubAgent(TypedDict, total=False):
    """Specification for a subagent.

    Only 'name' and 'description' are required by SubAgentMiddleware.
    All other fields are passed directly to Agent constructor via kwargs.

    This design ensures that when Agent adds new parameters, SubAgent
    automatically supports them without modification.

    Required fields:
        name: The name of the subagent (used for routing).
        description: The description (used by LLM to decide when to use it).

    Common Agent parameters (all optional, passed through to Agent):
        llm: The model for the subagent.
        tools: The tools to use for the subagent.
        prompt: The system prompt to use.
        middleware: Additional middleware for the subagent.
        pre_model_hook: Hook to run before model execution.
        post_model_hook: Hook to run after model execution.
        input_guards: Input guardrail functions.
        output_guards: Output guardrail functions.
        ... and any other Agent parameters.
    """

    name: Required[str]
    description: Required[str]


# State keys that should be excluded when passing state to subagents
_EXCLUDED_STATE_KEYS = ("messages", "todos")


# Default prompts and descriptions
DEFAULT_SUBAGENT_PROMPT = "In order to complete the objective that the user asks of you, you have access to a number of standard tools."

TASK_TOOL_DESCRIPTION = """Launch an ephemeral subagent to handle complex, multi-step independent tasks with isolated context windows.

Available agent types and the tools they have access to:
{available_agents}

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

## Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a result to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its returned result. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should include in its final message.
4. The agent's outputs should generally be trusted
5. Clearly tell the agent whether you expect it to create content, perform analysis, or just do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent
6. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.

### Example usage:

<example>
User: "I want to conduct research on the accomplishments of Lebron James, Michael Jordan, and Kobe Bryant, and then compare them."
Assistant: *Uses the task tool in parallel to conduct isolated research on each of the three players*
Assistant: *Synthesizes the results of the three isolated research tasks and responds to the User*
<commentary>
Research is a complex, multi-step task in it of itself.
The research of each individual player is not dependent on the research of the other players.
The assistant uses the task tool to break down the complex objective into three isolated tasks.
Each research task only needs to worry about context and tokens about one player, then returns synthesized information about each player as the Tool Result.
This means each research task can dive deep and spend tokens and context deeply researching each player, but the final result is synthesized information, and saves us tokens in the long run when comparing the players to each other.
</commentary>
</example>

<example>
User: "Analyze a single large code repository for security vulnerabilities and generate a report."
Assistant: *Launches a single `task` subagent for the repository analysis*
Assistant: *Receives report and integrates results into final summary*
<commentary>
Subagent is used to isolate a large, context-heavy task, even though there is only one. This prevents the main thread from being overloaded with details.
If the user then asks followup questions, we have a concise report to reference instead of the entire history of analysis and tool calls, which is good and saves us time and money.
</commentary>
</example>

<example>
User: "Schedule two meetings for me and prepare agendas for each."
Assistant: *Calls the task tool in parallel to launch two `task` subagents (one per meeting) to prepare agendas*
Assistant: *Returns final schedules and agendas*
<commentary>
Tasks are simple individually, but subagents help silo agenda preparation.
Each subagent only needs to worry about the agenda for one meeting.
</commentary>
</example>

<example>
User: "I want to order a pizza from Dominos, order a burger from McDonald's, and order a salad from Subway."
Assistant: *Calls tools directly in parallel to order a pizza from Dominos, a burger from McDonald's, and a salad from Subway*
<commentary>
The assistant did not use the task tool because the objective is super simple and clear and only requires a few trivial tool calls.
It is better to just complete the task directly and NOT use the `task`tool.
</commentary>
</example>"""  # noqa: E501

TASK_SYSTEM_PROMPT = """## `task` (subagent spawner)

You have access to a `task` tool to launch short-lived subagents that handle isolated tasks. These agents are ephemeral — they live only for the duration of the task and return a result.

When to use the task tool:
- When a task is complex and multi-step, and can be fully delegated in isolation
- When a task is independent of other tasks and can run in parallel
- When a task requires focused reasoning or heavy token/context usage that would bloat the orchestrator thread
- When sandboxing improves reliability (e.g. code execution, structured searches, data formatting)
- When you only care about the output of the subagent, and not the intermediate steps (ex. performing a lot of research and then returned a synthesized report, performing a series of computations or lookups to achieve a concise, relevant answer.)

Subagent lifecycle:
1. **Spawn** → Provide clear role, instructions, and expected output
2. **Run** → The subagent completes the task autonomously
3. **Return** → The subagent provides a result
4. **Reconcile** → Incorporate or synthesize the result into the main thread

When NOT to use the task tool:
- If the task is trivial (a few tool calls or simple lookup)
- If delegating does not reduce token usage, complexity, or context switching
- If splitting would add latency without benefit

## Important Task Tool Usage Notes to Remember
- Whenever possible, parallelize the work that you do. This is true for both tool_calls, and for tasks. Whenever you have independent steps to complete - make tool_calls, or kick off tasks (subagents) in parallel to accomplish them faster. This saves time for the user, which is incredibly important.
- Remember to use the `task` tool to silo independent tasks within a multi-part objective.
- You should use the `task` tool whenever you have a complex task that will take multiple steps, and is independent from other tasks that the agent needs to complete. These agents are highly competent and efficient."""  # noqa: E501

SUBAGENT_SUMMARY_SYSTEM_PROMPT = """You summarize oversized subagent transcripts for a parent agent.

Return plain text only.
Preserve critical facts, decisions, failures, and incomplete work.
Explicitly call out files the subagent created or updated, including their paths, when tool messages indicate them.
Keep the summary concise and useful for continued work."""

DEFAULT_RESULT_SUMMARY_TOKEN_LIMIT = 4000


def _validate_subagent_specs(subagents: list[SubAgent]) -> list[SubAgent]:
    """Validate and normalize subagent specifications."""
    validated: list[SubAgent] = []
    seen_names: set[str] = set()

    for idx, agent_spec in enumerate(subagents):
        if not isinstance(agent_spec, dict):
            raise ValueError(
                f"Invalid subagent spec at index {idx}: expected dict, got {type(agent_spec).__name__}"  # noqa: E501
            )

        raw_name = agent_spec.get("name")
        raw_description = agent_spec.get("description")
        name = raw_name.strip() if isinstance(raw_name, str) else ""
        description = raw_description.strip() if isinstance(raw_description, str) else ""

        if not name:
            raise ValueError(
                f"Invalid subagent spec at index {idx}: 'name' must be a non-empty string"  # noqa: E501
            )
        if not description:
            raise ValueError(
                f"Invalid subagent spec for '{name}' at index {idx}: 'description' must be a non-empty string"  # noqa: E501
            )
        if name in seen_names:
            raise ValueError(
                f"Duplicate subagent name '{name}' at index {idx}. Subagent names must be unique."  # noqa: E501
            )

        seen_names.add(name)
        normalized_spec = cast(SubAgent, dict(agent_spec))
        normalized_spec["name"] = name
        normalized_spec["description"] = description
        validated.append(normalized_spec)

    return validated


def _get_subagents(
    subagents: list[SubAgent],
    parent_model: Any | None,
) -> tuple[dict[str, Runnable], list[str]]:
    """Create subagent instances from specifications.

    Args:
        subagents: List of subagent specifications. Each spec must have 'name' and
            'description'. All other fields are passed directly to Agent constructor.

    Returns:
        Tuple of (agent_dict, description_list) where agent_dict maps agent names
        to agent instances and description_list contains formatted descriptions.
    """
    # Import here to avoid circular imports
    from langcrew import Agent

    agents: dict[str, Runnable] = {}
    subagent_descriptions = []

    # Fields used by SubAgentMiddleware (not passed to Agent)
    middleware_fields = {"name", "description"}

    # Process subagents
    for idx, agent_spec in enumerate(subagents):
        name = agent_spec["name"]
        description = agent_spec.get("description", "")
        subagent_descriptions.append(f"- {name}: {description}")

        # Extract Agent kwargs (all fields except middleware-specific ones)
        # Users should use Agent's parameter names directly (e.g., 'llm', 'prompt')
        agent_kwargs = {
            k: v for k, v in agent_spec.items() if k not in middleware_fields
        }

        # Inherit parent model if subagent-specific model is not configured.
        if agent_kwargs.get("llm") is None:
            if parent_model is None:
                raise ValueError(
                    f"Subagent '{name}' at index {idx} does not define 'llm' and no parent model is available yet."  # noqa: E501
                )
            agent_kwargs["llm"] = parent_model

        # Create Agent with all kwargs passed through
        agent = Agent(**agent_kwargs)
        agents[name] = agent

    return agents, subagent_descriptions


def _extract_final_message_content(result: Any) -> tuple[str | None, str | None]:
    """Extract the final message content from a subagent result dict."""
    if not isinstance(result, dict):
        return None, "result must be a dictionary"

    messages = result.get("messages")
    if not isinstance(messages, list) or not messages:
        return None, "result['messages'] must be a non-empty list"

    final_message = messages[-1]
    final_content = getattr(final_message, "content", None)
    if final_content is None:
        return None, "final message is missing 'content'"

    return _normalize_message_content(final_content), None


def _normalize_message_content(content: Any) -> str:
    """Normalize message content into a readable text string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
                    continue
                # Fallback for non-text content blocks
                parts.append(json.dumps(item, ensure_ascii=False, default=str))
                continue
            parts.append(str(item))
        return "".join(parts)
    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text
        return json.dumps(content, ensure_ascii=False, default=str)
    return str(content)


def _serialize_subagent_message(message: Any) -> dict[str, Any]:
    """Serialize a subagent message into a JSON-safe dictionary."""
    content = getattr(message, "content", None)
    payload: dict[str, Any] = {
        "type": getattr(message, "type", "unknown"),
        "content": _normalize_message_content(content),
    }

    if isinstance(message, AIMessage) and getattr(message, "tool_calls", None):
        payload["tool_calls"] = cast(list, message.tool_calls)
    elif isinstance(message, ToolMessage):
        payload["tool_call_id"] = message.tool_call_id
        if message.name:
            payload["name"] = message.name

    return payload


def _extract_subagent_transcript_messages(
    result: Any,
) -> tuple[list[dict[str, Any]] | None, str | None]:
    """Extract AI + Tool transcript from a subagent result dict."""
    if not isinstance(result, dict):
        return None, "result must be a dictionary"

    messages = result.get("messages")
    if not isinstance(messages, list) or not messages:
        return None, "result['messages'] must be a non-empty list"

    transcript = [
        _serialize_subagent_message(message)
        for message in messages
        if isinstance(message, (AIMessage, ToolMessage))
    ]
    return transcript, None


def _create_task_tool_result_payload(transcript: list[dict[str, Any]]) -> str:
    """Build the JSON payload returned to the parent model."""
    return json.dumps(transcript, ensure_ascii=False, default=str)


def _normalize_summary_result(result: Any) -> str:
    """Normalize LLM summary output to plain text."""
    content = getattr(result, "content", result)
    return _normalize_message_content(content).strip()


def _summarization_messages(
    *,
    transcript_payload: str,
) -> list[SystemMessage | HumanMessage]:
    """Build prompt messages for transcript summarization."""
    human_prompt = f"""Summarize this subagent transcript for the parent agent.

Transcript JSON:
{transcript_payload}
"""
    return [
        SystemMessage(content=SUBAGENT_SUMMARY_SYSTEM_PROMPT),
        HumanMessage(content=human_prompt),
    ]


def _should_summarize_payload(
    *,
    payload: str,
    tool_call_id: str,
    parent_model: Any | None,
    token_limit: int | None,
) -> bool:
    """Return True when the payload exceeds the configured token limit."""
    if not token_limit or token_limit <= 0 or parent_model is None:
        return False

    try:
        token_count = count_message_tokens(
            [ToolMessage(content=payload, tool_call_id=tool_call_id)],
            llm=parent_model,
        )
    except Exception:
        return False

    return token_count > token_limit


def _maybe_summarize_payload(
    *,
    payload: str,
    subagent_type: str,
    parent_model: Any | None,
) -> str:
    """Synchronously summarize the transcript payload with the parent model."""
    if parent_model is None:
        return payload

    summary_messages = _summarization_messages(
        transcript_payload=payload,
    )
    try:
        summary = _normalize_summary_result(parent_model.invoke(summary_messages))
        if summary:
            return summary
        logger.warning(
            "Subagent summary was empty; returning oversized transcript payload. subagent_type=%s",
            subagent_type,
        )
    except Exception as exc:
        logger.warning(
            "Subagent summary failed; returning oversized transcript payload. subagent_type=%s error=%s",
            subagent_type,
            exc,
        )

    return payload


async def _amaybe_summarize_payload(
    *,
    payload: str,
    subagent_type: str,
    parent_model: Any | None,
) -> str:
    """Asynchronously summarize the transcript payload with the parent model."""
    if parent_model is None:
        return payload

    summary_messages = _summarization_messages(
        transcript_payload=payload,
    )
    try:
        summary = _normalize_summary_result(await parent_model.ainvoke(summary_messages))
        if summary:
            return summary
        logger.warning(
            "Subagent async summary was empty; returning oversized transcript payload. subagent_type=%s",
            subagent_type,
        )
    except Exception as exc:
        logger.warning(
            "Subagent async summary failed; returning oversized transcript payload. subagent_type=%s error=%s",
            subagent_type,
            exc,
        )

    return payload


def _return_command_with_state_update(
    result: dict,
    tool_call_id: str,
    tool_result_payload: str,
) -> Command:
    """Create Command from subagent result, excluding sensitive state keys.

    Args:
        result: Result dictionary from subagent execution
        tool_call_id: Tool call ID for the ToolMessage

    Returns:
        Command object with state update
    """
    state_update = {k: v for k, v in result.items() if k not in _EXCLUDED_STATE_KEYS}
    return Command(
        update={
            **state_update,
            "messages": [ToolMessage(tool_result_payload, tool_call_id=tool_call_id)],
        }
    )


def _create_task_tool(
    *,
    resolve_subagent_graphs: Callable[[], dict[str, Runnable]],
    get_parent_model: Callable[[], Any | None],
    subagent_descriptions: list[str],
    task_description: str | None = None,
    stream_subagent_events: bool = False,
    result_summary_token_limit: int | None = DEFAULT_RESULT_SUMMARY_TOKEN_LIMIT,
    result_mode: Literal["transcript", "final_message"] = "transcript",
) -> BaseTool:
    """Create a task tool for invoking subagents.

    Args:
        resolve_subagent_graphs: Callable that returns the current subagent registry.
        subagent_descriptions: Subagent descriptions for tool prompt rendering.
        task_description: Custom description for the task tool. If `None`,
            uses default template. Supports `{available_agents}` placeholder.
        stream_subagent_events: If `True`, sub-agent internal events will be
            visible in the main event stream via langcrew_allow_tool_nested_events
            metadata flag.
        result_summary_token_limit: Maximum transcript size, in tokens, before
            using the parent model to summarize the result. If `None` or
            non-positive, summarization is disabled.
        result_mode: How subagent execution results are returned to the parent
            model. 'transcript' (default) returns the full transcript JSON
            (summarized if exceeding result_summary_token_limit). 'final_message'
            returns only the normalized text of the final message.

    Returns:
        A StructuredTool that can invoke subagents by type.
    """
    subagent_description_str = "\n".join(subagent_descriptions)

    def _validate_and_prepare_state(
        subagent_graphs: dict[str, Runnable],
        subagent_type: str,
        description: str,
        runtime: ToolRuntime,
    ) -> tuple[Runnable, dict]:
        """Prepare state for invocation."""
        subagent = subagent_graphs[subagent_type]
        # Create a new state dict to avoid mutating the original
        subagent_state = {
            k: v for k, v in runtime.state.items() if k not in _EXCLUDED_STATE_KEYS
        }
        subagent_state["messages"] = [HumanMessage(content=description)]
        return subagent, subagent_state

    # Use custom description if provided, otherwise use default template
    if task_description is None:
        task_description = TASK_TOOL_DESCRIPTION.format(
            available_agents=subagent_description_str
        )
    elif "{available_agents}" in task_description:
        # If custom description has placeholder, format with agent descriptions
        task_description = task_description.format(
            available_agents=subagent_description_str
        )

    def task(
        description: str,
        subagent_type: str,
        runtime: ToolRuntime,
    ) -> str | Command:
        try:
            subagent_graphs = resolve_subagent_graphs()
        except Exception as e:  # pragma: no cover - defensive
            return f"Failed to initialize subagent registry: {e}"

        if subagent_type not in subagent_graphs:
            allowed_types = ", ".join([f"`{k}`" for k in subagent_graphs])
            return f"We cannot invoke subagent {subagent_type} because it does not exist, the only allowed types are {allowed_types}"

        if not runtime.tool_call_id:
            return "Cannot invoke subagent because tool_call_id is missing from tool runtime."

        subagent, subagent_state = _validate_and_prepare_state(
            subagent_graphs,
            subagent_type,
            description,
            runtime,
        )
        try:
            config = {"metadata": {"langcrew_agent": subagent_type}}
            if stream_subagent_events:
                config["metadata"]["langcrew_allow_tool_nested_events"] = True
            result = subagent.invoke(subagent_state, config=config)
        except Exception as e:
            return f"Subagent `{subagent_type}` invocation failed: {e}"

        final_content, final_content_error = _extract_final_message_content(result)
        if final_content_error is not None:
            return (
                f"Subagent `{subagent_type}` returned malformed result: "
                f"{final_content_error}"
            )

        if result_mode == "final_message":
            tool_result_payload = final_content
        else:
            transcript, transcript_error = _extract_subagent_transcript_messages(result)
            if transcript_error is not None:
                return (
                    f"Subagent `{subagent_type}` returned malformed result: "
                    f"{transcript_error}"
                )

            tool_result_payload = _create_task_tool_result_payload(transcript)
            parent_model = get_parent_model()
            if _should_summarize_payload(
                payload=tool_result_payload,
                tool_call_id=runtime.tool_call_id,
                parent_model=parent_model,
                token_limit=result_summary_token_limit,
            ):
                tool_result_payload = _maybe_summarize_payload(
                    payload=tool_result_payload,
                    subagent_type=subagent_type,
                    parent_model=parent_model,
                )

        return _return_command_with_state_update(
            result,
            runtime.tool_call_id,
            tool_result_payload,
        )

    async def atask(
        description: str,
        subagent_type: str,
        runtime: ToolRuntime,
    ) -> str | Command:
        try:
            subagent_graphs = resolve_subagent_graphs()
        except Exception as e:  # pragma: no cover - defensive
            return f"Failed to initialize subagent registry: {e}"

        if subagent_type not in subagent_graphs:
            allowed_types = ", ".join([f"`{k}`" for k in subagent_graphs])
            return f"We cannot invoke subagent {subagent_type} because it does not exist, the only allowed types are {allowed_types}"

        if not runtime.tool_call_id:
            return "Cannot invoke subagent because tool_call_id is missing from tool runtime."

        subagent, subagent_state = _validate_and_prepare_state(
            subagent_graphs,
            subagent_type,
            description,
            runtime,
        )
        try:
            config = {"metadata": {"langcrew_agent": subagent_type}}
            if stream_subagent_events:
                config["metadata"]["langcrew_allow_tool_nested_events"] = True
            result = await subagent.ainvoke(subagent_state, config=config)
        except Exception as e:
            return f"Subagent `{subagent_type}` invocation failed: {e}"

        final_content, final_content_error = _extract_final_message_content(result)
        if final_content_error is not None:
            return (
                f"Subagent `{subagent_type}` returned malformed result: "
                f"{final_content_error}"
            )

        if result_mode == "final_message":
            tool_result_payload = final_content
        else:
            transcript, transcript_error = _extract_subagent_transcript_messages(result)
            if transcript_error is not None:
                return (
                    f"Subagent `{subagent_type}` returned malformed result: "
                    f"{transcript_error}"
                )

            tool_result_payload = _create_task_tool_result_payload(transcript)
            parent_model = get_parent_model()
            if _should_summarize_payload(
                payload=tool_result_payload,
                tool_call_id=runtime.tool_call_id,
                parent_model=parent_model,
                token_limit=result_summary_token_limit,
            ):
                tool_result_payload = await _amaybe_summarize_payload(
                    payload=tool_result_payload,
                    subagent_type=subagent_type,
                    parent_model=parent_model,
                )

        return _return_command_with_state_update(
            result,
            runtime.tool_call_id,
            tool_result_payload,
        )

    return StructuredTool.from_function(
        name="task",
        func=task,
        coroutine=atask,
        description=task_description,
    )


class SubAgentMiddleware(AgentMiddleware):
    """Middleware for providing subagents to an agent via a `task` tool.

    This middleware adds a `task` tool to the agent that can be used to invoke subagents.
    Subagents are useful for handling complex tasks that require multiple steps, or tasks
    that require a lot of context to resolve.

    A chief benefit of subagents is that they can handle multi-step tasks, and then return
    a clean, concise response to the main agent.

    Subagents are also great for different domains of expertise that require a narrower
    subset of tools and focus.

    This middleware is fully compatible with langchain.agents.middleware interface and
    can be mixed with other middleware from the langchain ecosystem.

    Args:
        subagents: A list of subagent specifications. Each spec requires 'name' and
            'description'. All other fields are passed directly to Agent constructor
            (e.g., model/llm, tools, prompt/system_prompt, middleware,
            pre_model_hook, input_guards, etc.).
        system_prompt: System prompt to inject into the main agent explaining how to
            use the task tool. If `None`, no system prompt injection is performed.
        task_description: Custom description for the task tool. If `None`, uses the
            default description template.
        stream_subagent_events: If `True`, sub-agent internal events (token streaming,
            tool calls, etc.) will be visible in the main event stream. If `False`
            (default), only the final result is shown, keeping the stream clean.
        result_summary_token_limit: Maximum transcript size, in tokens, before the
            parent model summarizes it. If `None` or non-positive, summarization is
            disabled.
        result_mode: How subagent execution results are returned to the parent
            model. 'transcript' (default) returns the full transcript JSON
            (summarized if exceeding result_summary_token_limit). 'final_message'
            returns only the normalized text of the final message.

    Example:
        ```python
        from langcrew import Agent
        from langcrew.middleware import SubAgentMiddleware

        # Define subagents - all Agent parameters can be passed through
        subagents = [
            {
                "name": "researcher",
                "description": "Specialized in research and information gathering",
                # Agent parameters (passed through via kwargs)
                "llm": research_llm,
                "tools": [web_search_tool, fetch_tool],
                "prompt": "You are a professional researcher...",
                "middleware": [SomeMiddleware()],
                # ... any other Agent parameters
            }
        ]

        # Create main agent with SubAgentMiddleware
        agent = Agent(
            prompt="You are a project coordinator...",
            llm=main_llm,
            tools=[basic_tools],
            middleware=[
                SubAgentMiddleware(subagents=subagents)
            ]
        )
        ```
    """

    def __init__(
        self,
        *,
        subagents: list[SubAgent],
        system_prompt: str | None = TASK_SYSTEM_PROMPT,
        task_description: str | None = None,
        stream_subagent_events: bool = False,
        result_summary_token_limit: int | None = DEFAULT_RESULT_SUMMARY_TOKEN_LIMIT,
        result_mode: Literal["transcript", "final_message"] = "transcript",
    ) -> None:
        """Initialize the SubAgentMiddleware."""
        super().__init__()
        if result_mode not in ("transcript", "final_message"):
            raise ValueError(
                f"result_mode must be 'transcript' or 'final_message', got {result_mode!r}"
            )
        self.system_prompt = system_prompt
        self._result_mode = result_mode
        self._subagent_specs = _validate_subagent_specs(subagents)
        self._subagent_graphs: dict[str, Runnable] | None = None
        self._subagent_descriptions = [
            f"- {agent_spec['name']}: {agent_spec['description']}"
            for agent_spec in self._subagent_specs
        ]
        self._parent_model: Any | None = None
        self._stream_subagent_events = stream_subagent_events
        self._result_summary_token_limit = result_summary_token_limit
        task_tool = _create_task_tool(
            resolve_subagent_graphs=self._get_subagent_graphs,
            get_parent_model=lambda: self._parent_model,
            subagent_descriptions=self._subagent_descriptions,
            task_description=task_description,
            stream_subagent_events=stream_subagent_events,
            result_summary_token_limit=result_summary_token_limit,
            result_mode=result_mode,
        )
        self.tools = [task_tool]

    def _capture_parent_model(self, model: Any) -> None:
        """Capture parent model and invalidate cache if model changes."""
        if self._parent_model is not model:
            self._parent_model = model
            self._subagent_graphs = None

    def _get_subagent_graphs(self) -> dict[str, Runnable]:
        """Return lazily constructed subagent registry."""
        if self._subagent_graphs is None:
            subagent_graphs, _ = _get_subagents(
                subagents=self._subagent_specs,
                parent_model=self._parent_model,
            )
            self._subagent_graphs = subagent_graphs
        return self._subagent_graphs

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        """Update the system prompt to include instructions on using subagents."""
        self._capture_parent_model(request.model)
        if self.system_prompt is not None:
            system_prompt = (
                request.system_prompt + "\n\n" + self.system_prompt
                if request.system_prompt
                else self.system_prompt
            )
            return handler(request.override(system_prompt=system_prompt))
        return handler(request)

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[ModelResponse]],
    ) -> ModelResponse:
        """(async) Update the system prompt to include instructions on using subagents."""
        self._capture_parent_model(request.model)
        if self.system_prompt is not None:
            system_prompt = (
                request.system_prompt + "\n\n" + self.system_prompt
                if request.system_prompt
                else self.system_prompt
            )
            return await handler(request.override(system_prompt=system_prompt))
        return await handler(request)
