[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![LangGraph](https://img.shields.io/badge/powered%20by-LangGraph-green.svg)](https://langchain-ai.github.io/langgraph/)

# LangCrew

LangCrew is a high-level multi-agent development framework built on LangGraph, offering out-of-the-box core capabilities to help construct complex agent collaboration systems:

1. **Beyond Traditional Flexible Paradigms**: Provides a simple, highly configurable development experience, featuring powerful built-in mechanisms such as HITL (Human-in-the-Loop), dynamic workflow orchestration, and event-driven processes—empowering stronger agent collaboration.

2. **Full-Stack Support for Productization**: Comes with an accompanying Agent-UI protocol and React component library, enabling the frontend to clearly visualize agent planning, scheduling, execution processes, and tool invocation details. This significantly accelerates the journey from agent development to productization, allowing for rapid delivery to users.

3. **Application Templates for Fast Launch**: Offers a rich variety of ready-to-use templates, enabling rapid prototyping and deployment of multi-agent solutions across a wide range of industries and scenarios.

4. **Integrated Development and Operations Support**: Integrates free SaaS services, seamlessly covering system construction, deep observability, sandbox environments, and deployment resources—simplifying the entire lifecycle from development to operations.

## Features

**Multi-Agent Orchestration Architecture**
- **Intelligent Agent System** - LangGraph-based ReAct executor supporting reasoning-action loops
- **Dynamic Task Orchestration** - Topological sorting execution with task dependencies and context passing
- **Flexible Handoff Mechanisms** - Both Agent-to-Agent and Task-to-Task handoff modes

**Enterprise-Grade Memory Management**
- **Layered Memory Architecture** - Short-term (session-level), long-term (persistent), entity memory (knowledge graph)
- **Intelligent Context Injection** - Session state management based on LangGraph Checkpointer
- **Multi-Storage Backends** - Support for in-memory, SQLite, PostgreSQL, Redis storage solutions

**Comprehensive Tool Ecosystem**
- **Unified Tool Registry** - Auto-discovery and management of LangChain, CrewAI, and custom tools
- **MCP Protocol Support** - Secure Model Context Protocol integration with session management and access control
- **Tool Security Safeguards** - Built-in Guardrail mechanisms and user consent confirmation

**Human-in-the-Loop (HITL) Integration**
- **Smart Interrupt Control** - User approval and intervention before/after tool execution
- **Multi-language Interaction** - Chinese/English approval command recognition
- **Fine-grained Control** - Precise control based on LangGraph native interrupt mechanisms

**Production-Ready Web Services**
- **Streaming Responses** - FastAPI-based SSE real-time streaming output
- **Session Management** - Automatic session creation and resume mechanisms
- **Protocol Adaptation** - Seamless LangGraph to HTTP API conversion

**Developer Experience Optimization**
- **CrewAI Compatibility** - Smooth migration path and decorator syntax support
- **Flexible Configuration** - Support for both code definition and YAML configuration approaches
- **Debug-Friendly** - Built-in debug mode and detailed execution logging

**Enterprise Security Features**
- **Multi-layer Security Protection** - Input/output Guardrails, tool execution approval, session security
- **Access Control** - Fine-grained permission management based on sessions and fingerprints
- **Audit Trail** - Complete execution chain and decision recording

## How to Use

### Local Development

**Backend Server:**
```bash
# 1. Clone repository
git clone git@code.lingyiwanwu.net:oma/boway/langcrew.git
git checkout github-main

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

Open your browser to **http://localhost:3000/chat**

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
- **Health Check**: http://localhost:8000/api/v1/health

#### Common Commands

```bash
# Run in background
docker compose up -d --build

# Monitor logs
docker compose logs -f

# Stop services
docker compose down
```

**Notes:**
- Frontend automatically proxies API requests to backend
- Ensure sufficient Docker resources (recommended: 4GB RAM, 2 CPU cores)
- Both services will start automatically - no additional configuration needed

## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
