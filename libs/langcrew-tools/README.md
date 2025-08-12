# 🧰 LangCrew Tools

> Official toolset for LangCrew: plug-and-play capabilities for multi‑agent applications (browser automation, cloud phone, code interpreter, command execution, data fetching, and more) with streaming events and human‑in‑the‑loop support.

[![PyPI](https://img.shields.io/pypi/v/langcrew-tools.svg)](https://pypi.org/project/langcrew-tools/)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)

## ✨ What is this?

`langcrew-tools` is the official toolbox in the LangCrew ecosystem, providing production‑ready tools specifically designed for agent workflows:
- Compatible with LangChain `BaseTool` interface
- Built‑in streaming events (astream) with timeout/interrupt handling
- Sandbox execution (e2b), browser and mobile automation
- Human‑in‑the‑loop (HITL) hooks and observability‑friendly events

## ⚡ Installation

```bash
# Option 1: Use private index
pip install --extra-index-url="https://nexus.lingyiwanwu.net/repository/pypi-hosted/simple" langcrew-tools

# Local editable install (from this monorepo)
cd libs/langcrew-tools
pip install -e .
```

## 🔧 Tool Catalog

- Browser Automation (streaming events, HITL)
  - [Browser Tools](./langcrew_tools/browser/README.md)
- Cloud Phone Automation (control Android devices in the cloud)
  - [Cloud Phone Tools](./langcrew_tools/cloud_phone/README.md)
- Code Interpreter (safe Python execution with isolation)
  - [Code Interpreter](./langcrew_tools/code_interpreter/README.md)
- Data Fetching / External Data Integration
  - [Fetch Tools](./langcrew_tools/fetch/README.md)

Additional modules (import APIs directly as needed):
- `commands/` (terminal command execution and session formatting)
- `filesystem/` (filesystem operations)
- `file_parser/` (file parsing)
- `image_gen/`, `image_parser/` (image generation and parsing)
- `knowledge/`, `search/` (knowledge and search related)
- `hitl/` (common human‑in‑the‑loop support)
- `utils/` (infrastructure and sandbox helpers)

> Note: Some modules don’t yet have a standalone README. Refer to source code or the main project documentation for usage details.

## 🔌 Quick Usage Examples

Integrate tools as LangChain Tools inside LangCrew agents.

### Browser Automation (streaming)
```python
from langcrew_tools.browser import BrowserStreamingTool, BrowserUseInput

# Create tool instance (see tool README for model/runtime requirements)
browser_tool = BrowserStreamingTool(
    vl_llm=...,  # Your multimodal/text model for the browser agent
)

# Consume streaming events in LangChain/LangGraph
async for event in browser_tool.astream_events(BrowserUseInput(instruction="Open and search for langcrew")):
    print(event)
```

### Cloud Phone Tools (example: open an app)
```python
from langcrew_tools.cloud_phone import get_cloudphone_tools

tools = get_cloudphone_tools(session_id="thread-001")
# Add these tools to your Agent's tool list to control the cloud phone via tool calls
```

### Code Interpreter (sandboxed Python)
```python
from langcrew_tools.code_interpreter import CodeInterpreterTool

tool = CodeInterpreterTool()
print(tool._run("print('hello')"))
```

### Terminal Commands (e2b sandbox)
```python
from langcrew_tools.commands import RunCommandTool

run_cmd = RunCommandTool()
# Async usage: await run_cmd._arun("ls -la", user="user", background=False)
```

## 🔐 Environment & Optional Setup

Some tools rely on sandbox/browser environments. Configure according to each tool’s README. If e2b sandbox is enabled, set:

```bash
# Required when sandbox (e2b) features are used
export E2B_API_KEY=...
export E2B_TEMPLATE=...
export E2B_DOMAIN=...
export E2B_TIMEOUT=...
```

Refer to respective tool READMEs for Browser/Playwright, Cloud Phone, and object storage (S3) requirements.

## 🧩 Integration with LangCrew

- Fully compatible with `langcrew`, inject tools into Agent via `tools=[...]`
- Supports LangGraph astream event flow for UI visualization and HITL approvals
- Combine with the main project example `examples/components/web/web_chat` to visualize tool activity in a web UI

## 🧭 Design Principles

- Consistent Tool interfaces and input validation (Pydantic)
- Clear timeout, interrupt, and error‑handling policies
- Production‑grade HITL extension points
- Observability‑friendly (standardized streaming events)

## 🤝 Contributing

We welcome issues and PRs to improve or add tools:
- Issues: use each tool’s README guidance or open one in the main repo
- Code style: ruff; Type checking: mypy
- Tests: pytest (asyncio/xdist supported)

## 📄 License

Released under the MIT License. See [LICENSE](./LICENSE).

---

More examples and best practices in each tool’s README:
- [Browser Automation](./langcrew_tools/browser/README.md)
- [Cloud Phone Automation](./langcrew_tools/cloud_phone/README.md)
- [Code Interpreter](./langcrew_tools/code_interpreter/README.md)
- [Data Fetching](./langcrew_tools/fetch/README.md)