[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![LangGraph](https://img.shields.io/badge/powered%20by-LangGraph-green.svg)](https://langchain-ai.github.io/langgraph/)
[![Documentation](https://img.shields.io/badge/docs-latest-brightgreen.svg)](./docs/)

# LangCrew

LangCrew is a high-level multi-agent development framework built on LangGraph, combining CrewAI's intuitive concepts with enterprise-grade capabilities and out-of-the-box core features for complex agent collaboration systems.

## Why LangCrew?

### Core Benefits

- **Beyond Traditional Flexible Paradigms**: Provides a simple, highly configurable development experience, featuring powerful built-in mechanisms such as HITL (Human-in-the-Loop), dynamic workflow orchestration, and event-driven processes—empowering stronger agent collaboration.

- **Full-Stack Support for Productization**: Comes with an accompanying Agent-UI protocol and React component library, enabling the frontend to clearly visualize agent planning, scheduling, execution processes, and tool invocation details. This significantly accelerates the journey from agent development to productization, allowing for rapid delivery to users.

- **Application Templates for Fast Launch**: Offers a rich variety of ready-to-use templates, enabling rapid prototyping and deployment of multi-agent solutions across a wide range of industries and scenarios.

- **Integrated Development and Operations Support**: Integrates free SaaS services, seamlessly covering system construction, deep observability, sandbox environments, and deployment resources—simplifying the entire lifecycle from development to operations.

### Comparison with Other Frameworks

| Aspect | LangGraph | CrewAI | LangCrew |
|--------|-----------|---------|----------|
| **Abstraction** | Low-level primitives | High-level patterns | **High-level on LangGraph** |
| **Development** | Build from scratch | Simple but limited | **Best practices pre-built** |
| **HITL** | Basic interrupt/resume | Limited support | **Advanced approval system + bilingual UI** |
| **Memory** | Complete primitives/docs | Simple context | **LangGraph native + langmem integration** |
| **Tools** | LangChain only | Custom only | **Unified registry + LangCrew-Tools** |
| **UI** | None | Basic examples | **Full React components** |
| **Observability** | LangSmith integration | Enterprise edition | **LangSmith + LangTrace integration** |
| **Deployment** | Platform available | Enterprise edition | **Platform (Coming Soon)** |

### Key Differentiators

- **Lower LangGraph's Barrier**: LangCrew eliminates the complexity of LangGraph by providing pre-built, production-tested implementations of agent orchestration, memory management, and tool integration - no need to make architectural decisions or build foundational components from scratch.

- **Enterprise-Grade Open Source**: While CrewAI offers simplicity, LangCrew brings enterprise features to the open-source community - including sophisticated HITL capabilities, multi-layer memory, security guardrails, and comprehensive observability that have been carefully crafted and battle-tested.

- **Best of Both Worlds**: Combines LangGraph's power and flexibility with CrewAI's intuitive concepts (crew, agent, task), while adding production-ready components that neither framework provides out of the box.

## Project Components

### Core Framework (`libs/langcrew/`)
The heart of LangCrew - a high-level abstraction over LangGraph that provides multi-agent orchestration, memory management, and production-ready features.
- [Full documentation →](./libs/langcrew/README.md)

### Tool Library (`libs/langcrew-tools/`)
Production-ready tools for agent workflows including browser automation, cloud phone control, sandboxed code interpreter, and more.
- [Explore tools →](./libs/langcrew-tools/README.md)

### Web Platform (`web/`)
Full-stack UI for agent visualization with React components, real-time streaming, and human-in-the-loop interfaces.
- [UI documentation →](./web/README.md)

### Examples & Templates (`examples/`)
Industry-specific solutions ready for deployment:
- [Recruitment System](./examples/recruitment/) - Multi-agent candidate screening
- [Marketing Strategy](./examples/marketing-strategy/) - Campaign planning automation
- [Game Development](./examples/game-builder-crew/) - AI content generation
- [Travel Planning](./examples/surprise-trip/) - Intelligent itinerary creation
- [Job Posting](./examples/job-posting/) - Automated job description generation

### Documentation (`docs/`)
Comprehensive guides and API references built with Astro Starlight.
- [Getting Started](./docs/src/content/docs/guides/quickstart.mdx) - Build your first agent
- [Core Concepts](./docs/src/content/docs/concepts/) - Understanding agents, tasks, and crews

## Quick Start

### Local Development

**Backend Server:**
```bash
# 1. Clone repository
git clone https://github.com/01-ai/langcrew.git

# 2. Install uv (choose one method)
# Option A: Official installer (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Option B: Using pip
pip install uv

# 3. Configure API Key
export OPENAI_API_KEY=your-openai-key   # or ANTHROPIC_API_KEY / DASHSCOPE_API_KEY

# 4. Run the Server
cd langcrew/examples/components/web/web_chat
uv run run_server.py
```

The server will start at **http://localhost:8000**

**Frontend Interface:**
```bash
# 1. Navigate to web directory
cd langcrew/web

# 2. Install dependencies and start development server
pnpm install
pnpm dev
```

Open your browser to **http://localhost:3600/chat**

### Docker Compose

**Prerequisites:** Ensure Docker Compose is installed. If you get "command not found" errors:
```bash
# Install Docker Compose (choose one method)
# Option 1: Using Docker Desktop (recommended) - includes Compose
# Download from: https://www.docker.com/products/docker-desktop

# Option 2: Using Homebrew (macOS)
brew install docker-compose

# Option 3: Manual installation (Linux/macOS)
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Quick Start with Docker Compose

Launch the complete LangCrew chat application with frontend and backend services:

```bash
# From the repository root
export OPENAI_API_KEY=your-openai-key   # or ANTHROPIC_API_KEY / DASHSCOPE_API_KEY

# Optional configuration
export LOG_LEVEL=info # debug|info|warning|error

# Start services
docker compose up --build
```

**Available endpoints:**
- **Web Chat Interface**: http://localhost:3600
- **Backend API Documentation**: http://localhost:8000/docs



## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
