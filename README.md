# LangCrew

LangCrew is a high-level multi-agent development framework built on LangGraph, offering out-of-the-box core capabilities to help construct complex agent collaboration systems:

1. **Beyond Traditional Flexible Paradigms**: Provides a simple, highly configurable development experience, featuring powerful built-in mechanisms such as HITL (Human-in-the-Loop), dynamic workflow orchestration, and event-driven processes—empowering stronger agent collaboration.

2. **Full-Stack Support for Productization**: Comes with an accompanying Agent-UI protocol and React component library, enabling the frontend to clearly visualize agent planning, scheduling, execution processes, and tool invocation details. This significantly accelerates the journey from agent development to productization, allowing for rapid delivery to users.

3. **Application Templates for Fast Launch**: Offers a rich variety of ready-to-use templates, enabling rapid prototyping and deployment of multi-agent solutions across a wide range of industries and scenarios.

4. **Integrated Development and Operations Support**: Integrates free SaaS services, seamlessly covering system construction, deep observability, sandbox environments, and deployment resources—simplifying the entire lifecycle from development to operations.

A powerful multi-agent framework built on LangGraph with CrewAI-compatible features.

## Features

- **Agent-based Architecture**: Define agents with specific roles, goals, and backstories
- **Task Management**: Create and execute tasks with clear descriptions and expected outputs
- **Crew Coordination**: Organize agents and tasks into crews for collaborative work
- **LangGraph Integration**: Built on LangGraph for robust workflow management
- **CrewAI Context Mechanism**: Full support for task context passing and dependencies
- **Tool Integration**: Support for various tools and integrations
- **Web Interface**: Optional web-based interface for crew management
- **MCP Support**: Model Context Protocol integration for enhanced capabilities

## Local Development with Docker Compose

To get started with LangCrew for local development, you can use the provided `docker-compose.yml` file to set up the development environment quickly.

### Prerequisites

- Docker and Docker Compose installed on your system
- Git for cloning the repository

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd langcrew
   ```

2. **Start the development environment**:
   ```bash
   docker-compose up -d
   ```

3. **Access the web interface**:
   - Open your browser and navigate to `http://localhost:3600`
   - The web interface will be available for managing agents and crews

4. **Stop the development environment**:
   ```bash
   docker-compose down
   ```

### Development Workflow

- **Hot Reload**: The web application supports hot reloading for development
- **Service Management**: Use `docker-compose logs -f` to monitor service logs
- **Environment Variables**: Modify the `.env` file or docker-compose.yml for configuration changes
- **Database**: The setup includes necessary database services for development

### Troubleshooting

- If you encounter port conflicts, check the `docker-compose.yml` file and modify ports as needed
- Ensure Docker has sufficient resources allocated (recommended: 4GB RAM, 2 CPU cores)
- For persistent data, the setup includes volume mounts for databases and application data


## Getting Started

### Getting Started With Docker Compose (One‑Command)

Use `compose.yaml` for a more portable, one‑command startup across platforms.

```bash
# From the repository root
export OPENAI_API_KEY=your-openai-key   # or ANTHROPIC_API_KEY / DASHSCOPE_API_KEY
# Optional overrides
export PORT=8000
export MODE=full      # or simple
export LOG_LEVEL=info # debug|info|warning|error

docker compose up --build
```

Then open:

- API Docs: http://localhost:${PORT:-8000}/docs
- Chat Endpoint: POST http://localhost:${PORT:-8000}/api/v1/chat
- Health: http://localhost:${PORT:-8000}/api/v1/health

Notes:
- On Apple Silicon (arm64), if you need to force amd64 images for compatibility, uncomment the `platform: linux/amd64` line in `compose.yaml`. This may reduce performance.
- To run detached: `docker compose up -d --build`
- To stop: `docker compose down`

### Getting Started With Code

#### 1. Install uv (if not installed)
```bash
# Option 1: Official installer (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Option 2: Using pip
pip install uv
```

#### 2. Configure API Key
```bash
cd examples/components/web/web_chat
cp .env.example .env
# Edit .env file and add your API key (choose one):
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key  
# DASHSCOPE_API_KEY=your-dashscope-api-key
```

#### 3. Run the Server
```bash
uv run run_server.py
```

The server will start on `http://localhost:8000`

#### API Endpoints

- **API Documentation**: `http://localhost:8000/docs`
- **Chat Endpoint**: `POST http://localhost:8000/api/v1/chat`
- **Health Check**: `GET http://localhost:8000/api/v1/health`

#### Options

```bash
# Simple mode (basic features only)
uv run run_server.py --mode simple

# Custom port
uv run run_server.py --port 9000

# Debug mode
uv run run_server.py --log-level debug
```

#### Troubleshooting

**"No API keys found"** - Make sure you've configured at least one API key in the `.env` file.

**"uv: command not found"** - Install uv using one of the commands in step 1.

### Usage

Send a POST request to `/api/v1/chat`:

```json
{
  "message": "What's the weather like in New York?",
  "thread_id": "optional-thread-id"
}
```

### Available Tools

- **Calculator**: Mathematical calculations
- **Web Search**: Current information search
- **Weather**: Weather information for any city
- **Timezone**: Time and timezone information

### Model Selection

The system automatically selects the best available model:
1. **OpenAI** - `gpt-4o-mini` (recommended)
2. **Anthropic** - `claude-3-haiku-20240307`
3. **DashScope** - `qwen-plus` 
