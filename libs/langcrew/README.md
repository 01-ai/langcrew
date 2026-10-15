# LangCrew

> **LangGraph-based Agent Application Kit for building production web agent services**

LangCrew sits on top of LangChain / LangGraph / DeepAgents and fills the gap between "building an agent" and "running an agent as a web service". It provides a Web runtime, ChatKit UI widgets, a visual Workflow engine, and MCP tool integration — so you can go from an agent definition to a deployable HTTP service with minimal boilerplate.

## Ecosystem Position

```
LangChain          — LLM primitives, chains, tools, retrievers
LangGraph          — Stateful graph execution, checkpointing
DeepAgents         — Agent Harness: create_agent, middleware, skills
────────────────────────────────────────────────────────────────
LangCrew           — Agent Application Kit: Web runtime, ChatKit,
                     Workflow engine, MCP integration
```

**Target user**: LangChain-familiar developers who need to ship agents as web services.

## Install

```bash
pip install langcrew
```

## Quick Start

```python
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langcrew import Agent, Crew

agent = Agent(
    prompt="You are a helpful assistant.",
    llm=ChatOpenAI(model="gpt-4o-mini"),
)
crew = Crew(agent=agent)

result = crew.invoke({
    "messages": [HumanMessage(content="What is the capital of France?")]
})
print(result["messages"][-1].content)
```

## Core Features

### Agent

Thin wrapper around LangChain's `create_agent`. Supports all standard LangGraph capabilities out of the box.

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langcrew import Agent

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    return f"Sunny, 22°C in {city}"

agent = Agent(
    prompt="You are a weather assistant.",
    llm=ChatOpenAI(model="gpt-4o-mini"),
    tools=[get_weather],
    verbose=True,
)
```

**Key parameters:**

| Parameter | Description |
|-----------|-------------|
| `prompt` | System prompt string |
| `llm` | Any LangChain `BaseChatModel` |
| `tools` | List of LangChain tools |
| `middleware` | LangChain `AgentMiddleware` list (HITL, summarization, retry, etc.) |
| `mcp_servers` | MCP server configs — loaded lazily on first invoke |
| `response_format` | Structured output schema |
| `checkpointer` | Subgraph checkpointer (`None` / `True` / `BaseCheckpointSaver`) |

### Crew

Orchestration wrapper that compiles the agent graph and provides `invoke` / `stream` / `astream_events` entry points.

```python
from langcrew import Crew

crew = Crew(
    agent=agent,
    memory=True,   # enable checkpointing (InMemorySaver by default)
)

# Sync
result = crew.invoke(
    {"messages": [HumanMessage(content="Hello")]},
    config={"configurable": {"thread_id": "session-1"}},
)

# Async streaming
async for event in crew.astream_events(
    {"messages": [HumanMessage(content="Hello")]},
    config={"configurable": {"thread_id": "session-1"}},
    version="v2",
):
    print(event)
```

### Citations

Enable source citations at the Crew boundary. When enabled, LangCrew's built-in
Web Search, Web Fetch, and LangMem search integrations declare their sources to
Citation Middleware. Their normal Tool content and artifact are unchanged when
citations are disabled.

```python
crew = Crew(agent=agent, citation=True)
```

`citation=True` enables Citation processing; it does not add any Tool to the
Agent. Choose the integration that matches where the evidence comes from:

- Built-in Web Search, Web Fetch, and LangMem search already added to the Agent
  need no additional Citation setup.
- For a class-based Tool you own, implement `CitationResultProvider`.
- For a function Tool, return `citation_result()` with LangChain's
  `content_and_artifact` response format.
- For an external Tool that cannot be changed, configure a
  `CitationToolAdapter`.
- For evidence already in a prompt, call `attach_citation_sources()`.

For a class-based Tool you own, implement `CitationResultProvider`. The Tool
continues to return its normal result; Citation Middleware calls the provider
only when Citation is enabled, then adds IDs and private source artifacts.
This path does not require `content_and_artifact`. The provider receives the
final LangChain `ToolMessage`, so its content or artifact format is an explicit
contract of the Tool. Return `None` when the result intentionally has no
citable source; raise an exception for an unexpected result format. Citation
extraction failures are logged while the original Tool result remains usable.
If model-visible content is not a stable format, extract from a structured
artifact instead.

```python
import json

from langchain_core.tools import BaseTool
from langcrew.citation import CitationResultItem, CitationResultProvider

class TicketSearchTool(BaseTool, CitationResultProvider):
    # Define the normal Tool fields and execution methods as usual.

    def extract_citation_items(self, request, message):
        rows = json.loads(message.content)
        return [
            CitationResultItem(value=row, source=source_for_ticket(row))
            for row in rows
        ]
```

For a function Tool, use LangChain's `content_and_artifact` response format
and return a `citation_result`. `value` is the existing result shown to the
model; `source.data` is the application-defined, complete source object
returned to the client. LangCrew adds only the registered `id` and `type`.

```python
from langchain_core.tools import tool
from langcrew.citation import CitationResultItem, CitationSource, citation_result

@tool(response_format="content_and_artifact")
def search_tickets(query: str):
    """Search support tickets."""
    rows = [{"ticket_id": "T-1", "summary": "Login failed"}]
    return citation_result(items=[
        CitationResultItem(
            value=row,
            source=CitationSource(
                type="ticket",
                source_key=row["ticket_id"],
                data={
                    "title": row["ticket_id"],
                    "summary": row["summary"],
                },
            ),
        )
        for row in rows
    ])
```

`response_format="content_and_artifact"` is required: LangChain decides how to
build the `ToolMessage` before the function result is available, so it cannot
be enabled automatically by `citation_result()`.

For a single result, pass `value` and `source`. `content` can preserve the
Tool's existing model-visible content, and `artifact` can preserve an existing
public artifact.

```python
@tool(response_format="content_and_artifact")
def get_ticket(ticket_id: str):
    row = {"ticket_id": ticket_id, "summary": "Login failed"}
    return citation_result(
        value=row,
        source=CitationSource(
            type="ticket",
            source_key=ticket_id,
            data={"title": ticket_id, "summary": row["summary"]},
        ),
        content=row,
        artifact=None,
    )
```

For evidence already present in a prompt, attach the source to the message that
carries it. Use `SystemMessage` for current system context such as prompt
memory, and `HumanMessage` for user-provided context such as uploaded files.
The same `citation_id` must also be present in the message content so the model
can cite it.

```python
from langchain_core.messages import HumanMessage
from langcrew.citation import (
    CitationSource,
    attach_citation_sources,
    citation_source_id,
)

source = CitationSource(
    type="file",
    source_key="file-sha256",
    data={"filename": "report.pdf", "url": "https://example.com/report.pdf"},
)
source_id = citation_source_id(source.type, source.source_key)
message = attach_citation_sources(
    HumanMessage(content=f"report.pdf citation_id={source_id}"),
    [source.with_id(source_id)],
)
```

For an external Tool that cannot be changed, provide a `CitationToolAdapter`
through `CitationConfig(tool_adapters=[...])`. The adapter converts the
external `ToolMessage` into `CitationResultItem` values; this is a fallback
extension point, not required for tools that can return `citation_result()`.

```python
import json

from langcrew.citation import CitationConfig

class McpSearchCitationAdapter:
    def __call__(self, request, message):
        if request.tool_call["name"] != "mcp_search":
            return None
        rows = json.loads(message.content)
        return [
            CitationResultItem(
                value=row,
                source=CitationSource(
                    type="web",
                    source_key=row["url"],
                    data={
                        "title": row.get("title", ""),
                        "url": row["url"],
                        "snippet": row.get("snippet", ""),
                    },
                ),
            )
            for row in rows
        ]

crew = Crew(
    agent=agent,
    citation=CitationConfig(
        enabled=True,
        tool_adapters=[McpSearchCitationAdapter()],
    ),
)
```

The Web adapter keeps the existing wire protocol: streaming `text` messages
contain newly referenced `detail.citation_sources`, and `message_result`
contains the complete source list for that model run. Applications that share
or export responses can call `filter_citations(content, sources, allowed_ids)`
to remove disallowed and unknown markers without execution-time state.

### HITL (Human-in-the-Loop)

Use LangChain's built-in `HumanInTheLoopMiddleware` — no custom wrappers needed.

```python
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.types import Command

agent = Agent(
    prompt="You are a file management assistant.",
    llm=llm,
    tools=[delete_file],
    middleware=[HumanInTheLoopMiddleware(interrupt_on=["delete_file"])],
)
crew = Crew(agent=agent, memory=True)
config = {"configurable": {"thread_id": "t1"}}

result = crew.invoke({"messages": [HumanMessage(content="Delete /tmp/test.txt")]}, config=config)

if "__interrupt__" in result:
    # Resume after human approval
    result = crew.invoke(Command(resume=True), config=config)
```

### MCP Tools

MCP servers are declared on `Agent` and loaded lazily on first invoke.

```python
agent = Agent(
    prompt="You are a route planning assistant.",
    llm=llm,
    mcp_servers={
        "amap": {
            "url": "https://mcp.amap.com/sse?key=YOUR_KEY",
            "transport": "sse",
        }
    },
)
```

Supports `sse`, `streamable_http`, and `stdio` transports.

### Guardrails

```python
from langcrew.guardrail import input_guard, output_guard

@input_guard
def no_sensitive_data(data):
    if "password:" in str(data).lower():
        return False, "Sensitive data blocked"
    return True, "OK"

agent = Agent(
    prompt="You are a safe assistant.",
    llm=llm,
    input_guards=[no_sensitive_data],
)
```

### LLMFactory

Convenience wrapper for creating LLM instances from a plain dict config — useful when LLM parameters come from external configuration files or API requests.

```python
from langcrew.llm_factory import LLMFactory

llm = LLMFactory.create_llm({
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
})
```

## Examples

| Example | Description |
|---------|-------------|
| [`guardrail/`](../../examples/guardrail/) | Input/output guardrails |
| [`hitl/`](../../examples/hitl/) | Human-in-the-loop with interrupt/resume |
| [`mcp/`](../../examples/mcp/) | MCP tool integration (SSE / HTTP / stdio) |
| [`workflow/`](../../examples/workflow/) | Visual workflow engine |
| [`apps/web_chat/`](../../examples/apps/web_chat/) | Full web chat service |
| [`apps/super_agent/`](../../examples/apps/super_agent/) | Full-featured agent with sandbox tools |

## Related Projects

| Project | Role |
|---------|------|
| [LangChain](https://github.com/langchain-ai/langchain) | LLM primitives, tools, retrievers |
| [LangGraph](https://github.com/langchain-ai/langgraph) | Stateful graph execution engine |
| [DeepAgents](https://github.com/langchain-ai/deepagents) | Agent Harness — `create_agent`, middleware |

## License

MIT — see [LICENSE](LICENSE).
