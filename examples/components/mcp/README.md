# LangCrew MCP Demo Collection

## Introduction
This project demonstrates the integration of **Model Context Protocol (MCP)** with the **LangCrew framework**, showcasing three different MCP transport methods through practical AI agent examples. LangCrew orchestrates autonomous AI agents that can seamlessly interact with external tools and services via MCP.

- [MCP Transport Types](#mcp-transport-types)
- [Quick Start](#quick-start)
- [Demo Examples](#demo-examples)
- [Project Structure](#project-structure)
- [Configuration](#configuration)

## MCP Transport Types

This project implements **3 different MCP transport methods**:

### 🌐 **SSE (Server-Sent Events)**
- **Use Case**: Real-time route planning with live updates
- **Example**: Map route planning with real-time data streaming

### 📡 **Stream HTTP**  
- **Use Case**: HTTP-based streaming communication
- **Example**: Tool querying and route planning via HTTP streaming

### 💻 **STDIO**
- **Use Case**: Local tool integration via standard input/output
- **Example**: Mathematics calculator supporting basic arithmetic operations

## Quick Start

### Prerequisites
- Python 3.11+
- OpenAI API access for the agent demos (uses gpt-4o-mini by default)
- The Parallel Search example below needs only internet access, with no API keys or LLM

### Installation
```bash
# Install dependencies
uv sync

# Configure environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### Running Examples
```bash
# Run Calculator Demo (STDIO)
python src/mcp/main.py

# Or modify main.py to run other demos:
# asyncio.run(map_sse_mcp())        # SSE Route Planning
# asyncio.run(map_streamHttp_mcp()) # Stream HTTP Route Planning
# asyncio.run(calculator_stdio_mcp()) # STDIO Calculator
```

## Demo Examples

### Parallel Search and Fetch (Streamable HTTP)

From `examples/components/mcp`, run:

```bash
uv run parallel_search.py "LangCrew MCP tools"
uv run parallel_search.py "LangCrew MCP tools" \
  --fetch-url https://github.com/01-ai/langcrew
```

This example loads `web_search` and `web_fetch` through LangCrew's
`MCPToolAdapter.from_servers` and invokes the resulting LangChain tools directly.
It prints search sources and excerpts as JSON; `--fetch-url` also extracts excerpts
from a URL you choose. Neither a `.env` file nor a model API key is needed.

`parallel_search.py` contains the reusable `PARALLEL_SERVERS` configuration for
`https://search.parallel.ai/mcp`, using `streamable_http` and a project User-Agent.
You can pass it as `mcp_servers=PARALLEL_SERVERS` to a LangCrew `Agent`; model
inference then requires your usual LLM configuration and may incur separate costs.
The direct example reuses one session ID across its search and fetch calls.

The [Parallel Search MCP documentation](https://docs.parallel.ai/integrations/mcp/search-mcp)
describes the anonymous free tier and its lower rate limits. Requests can fail
when the service is unavailable or rate limited; the example lets those errors
surface instead of silently returning an empty result. Existing agent demos are
unchanged.

### 📊 **Calculator Demo (STDIO)**
```python
async def calculator_stdio_mcp():
    inputs = {"user_instruction": "Calculate 100+100 using tools, and explain which tool you used"}
    crew = CalculatorCrew().crew()
    result = await crew.akickoff(inputs=inputs)
```

**Features:**
- Addition, subtraction, multiplication, division
- Error handling (division by zero)
- Tool usage reporting

### 🗺️ **Route Planning Demo (SSE/HTTP)**
```python
async def map_sse_mcp():
    inputs = {"user_instruction": "Optimal route from Shanghai to Beijing"}
    crew = MapCrew().crew()
    result = await crew.akickoff(inputs=inputs)
```

**Features:**
- Multi-factor route analysis (time, cost, convenience)
- Transportation mode comparison
- Markdown-formatted reports

## Project Structure

```
src/mcp/
├── main.py                 # Demo entry points
├── crew.py                 # AI agent crew definitions
├── config/
│   ├── agents.yaml         # Route planning agents
│   ├── tasks.yaml          # Route planning tasks
│   └── calculator/
│       ├── agents.yaml     # Calculator agent
│       └── tasks.yaml      # Calculator tasks
└── tools/
    └── calculator_stdio.py # MCP calculator implementation
```

## Configuration

### Agent Configuration
Agents are defined in YAML files with roles, goals, and backstories:
- **Route Planning**: `config/agents.yaml` - Route Planning Expert & Result Generation Expert
- **Calculator**: `config/calculator/agents.yaml` - Mathematics Calculation Expert

### Task Configuration  
Tasks specify detailed instructions and expected outputs:
- **Route Planning**: `config/tasks.yaml` - Multi-factor analysis and reporting
- **Calculator**: `config/calculator/tasks.yaml` - Mathematical computation

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key_here
AMAP_TOKEN=your_amap_token_here  # For route planning demos
```

## Key Features

- **🔧 Flexible MCP Integration**: Supports multiple transport protocols
- **🤖 AI Agent Collaboration**: Multiple specialized agents working together  
- **📝 Dynamic Configuration**: YAML-based agent and task definitions
- **🛠️ Custom Tool Development**: Easy-to-extend MCP tool framework
- **📊 Structured Output**: Professional reports in Markdown format

## License
This project is released under the MIT License.
