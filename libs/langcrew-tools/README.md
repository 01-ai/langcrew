# LangCrew Tools

> Official toolset for LangCrew: plug-and-play capabilities for multi‑agent applications (browser automation, cloud phone, code interpreter, command execution, data fetching, and more) with streaming events and human‑in‑the‑loop support.

## What is this?

`langcrew-tools` is the official toolbox in the LangCrew ecosystem, providing production‑ready tools specifically designed for agent workflows:
- Compatible with LangChain `BaseTool` interface
- Built‑in streaming events (astream) with timeout/interrupt handling
- Sandbox execution (e2b), browser and mobile automation
- Human‑in‑the‑loop (HITL) hooks and observability‑friendly events

## System Requirements

### External Dependencies

#### Core Services (Optional but Recommended)
- **E2B Sandbox**: Required for browser automation, code interpreter, command execution, and filesystem operations
- **PostgreSQL 15+**: Required for vector storage operations (with pgvector extension)
- **S3-Compatible Storage**: For file persistence and data exchange

#### Browser Automation Requirements
- **Chrome/Chromium**: Installed and accessible in PATH
- **Playwright**: Automatically managed by the package

## Quick Install

```bash
pip install langcrew-tools
```

## Tool Catalog

### E2B Sandbox Tools
- **Browser Automation** - Streaming events, HITL support
  - [Browser Tools](./langcrew_tools/browser/README.md)
- **Code Interpreter** - Safe Python execution with isolation
  - [Code Interpreter](./langcrew_tools/code_interpreter/README.md)
- **Terminal Commands** - Command execution and session management
  - [Command Tools](./langcrew_tools/commands/README.md)
- **Filesystem Operations** - Comprehensive file and directory management
  - [Filesystem Tools](./langcrew_tools/filesystem/README.md)

### Information & Data Collection
- **Cloud Phone Automation** - Control Android devices in the cloud
  - [Cloud Phone Tools](./langcrew_tools/cloud_phone/README.md)
- **Data Fetching** - External data integration
  - [Fetch Tools](./langcrew_tools/fetch/README.md)
- **File Parsing** - Content extraction and processing
- **Knowledge Management** - Information storage and retrieval
- **Search Operations** - Advanced search capabilities

### Infrastructure & Utilities
- **Image Generation** - AI-powered image creation
- **Image Processing** - Image analysis and manipulation
- **HITL Support** - Human-in-the-loop interactions
- **Utils & Helpers** - Core infrastructure and sandbox management
  - [Utils Module](./langcrew_tools/utils/README.md)

## Environment Setup

Most tools require some environment configuration. Core dependencies include:

- **E2B Sandbox**: Required for sandbox-based tools (browser, code interpreter, commands, filesystem)
- **External Services**: Individual tools may require API keys or service endpoints

For detailed configuration instructions, see the specific tool documentation in the [Tool Catalog](#tool-catalog).

## Integration with LangCrew

- Fully compatible with `langcrew`, inject tools into Agent via `tools=[...]`
- Supports LangGraph astream event flow for UI visualization and HITL approvals
- Combine with the main project example `examples/components/web/web_chat` to visualize tool activity in a web UI

## Design Principles

- Consistent Tool interfaces and input validation (Pydantic)
- Clear timeout, interrupt, and error‑handling policies
- Production‑grade HITL extension points
- Observability‑friendly (standardized streaming events)

## Contributing

We welcome contributions to make LangCrew Tools even better! You can:

- **Report Issues**: Open issues for bugs or feature requests
- **Submit PRs**: Contribute code improvements and new tools
- **Documentation**: Help improve our documentation

For detailed development guidelines, see individual tool READMEs or open an issue to discuss.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

