# LangCrew Tools

> Official toolset for LangCrew: plug-and-play capabilities for multi‑agent applications (browser automation, cloud phone, code interpreter, command execution, data fetching, and more) with streaming events and human‑in‑the‑loop support.

## What is this?

`langcrew-tools` is the official toolbox in the LangCrew ecosystem, providing production‑ready tools specifically designed for agent workflows with streaming events, sandbox execution, and human‑in‑the‑loop support.

## Core Benefits

- **LangChain Integration**: All tools inherit from `langchain_core.tools.BaseTool` with consistent interfaces and Pydantic validation
- **Streaming Events**: Built-in support for intermediate event dispatching during tool execution
- **Timeout & Interruption**: Clear policies for handling timeouts and user interruptions
- **HITL Support**: Production-grade human-in-the-loop extension points

## Quick Install

```bash
pip install langcrew-tools
```

> Most tools require additional setup (API keys, services). See individual tool documentation for specific requirements.

## Tool Catalog

### E2B Sandbox Tools
- **[Browser Automation](./langcrew_tools/browser/README.md)** - Streaming events, HITL support
- **[Code Interpreter](./langcrew_tools/code_interpreter/README.md)** - Safe Python execution with isolation
- **[Terminal Commands](./langcrew_tools/commands/README.md)** - Command execution and session management
- **[Filesystem Operations](./langcrew_tools/filesystem/README.md)** - Comprehensive file and directory management

### Information & Data Collection
- **[Cloud Phone Automation](./langcrew_tools/cloud_phone/README.md)** - Control Android devices in the cloud
- **[Data Fetching](./langcrew_tools/fetch/README.md)** - External data integration
- **[File Parsing](./langcrew_tools/file_parser/README.md)** - Content extraction and processing
- **[Knowledge Management](./langcrew_tools/knowledge/README.md)** - Information storage and retrieval
- **[Search Operations](./langcrew_tools/search/README.md)** - Advanced search capabilities

### Infrastructure & Utilities
- **[Image Generation](./langcrew_tools/image_gen/README.md)** - AI-powered image creation
- **[Image Processing](./langcrew_tools/image_parser/README.md)** - Image analysis and manipulation
- **[HITL Support](./langcrew_tools/hitl/README.md)** - Human-in-the-loop interactions
- **[Utils & Helpers](./langcrew_tools/utils/README.md)** - Core infrastructure and sandbox management

## Integration with LangCrew

- Fully compatible with `langcrew`, inject tools into Agent via `tools=[...]`
- Supports LangGraph astream event flow for UI visualization and HITL approvals
- Combine with the main project example `examples/components/web/web_chat` to visualize tool activity in a web UI

## Contributing

We welcome contributions to make LangCrew Tools even better! You can:

- **Report Issues**: Open issues for bugs or feature requests
- **Submit PRs**: Contribute code improvements and new tools
- **Documentation**: Help improve our documentation

For detailed development guidelines, see individual tool READMEs or open an issue to discuss.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

