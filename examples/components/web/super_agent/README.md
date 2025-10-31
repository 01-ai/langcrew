# Super Agent - Intelligent Browser Automation Assistant

A powerful intelligent agent system built on the LangCrew framework, integrating browser automation, web search, code execution, file operations, and other tools, providing complete Web API services and streaming response support.

## Core Features

- **🌐 Browser Automation**: Intelligent web operations and data extraction based on browser-use
- **🔍 Smart Search**: Web search and content retrieval tool integration
- **💻 Code Execution**: Python code interpreter in sandboxed environment
- **📁 File Operations**: Complete file read/write, edit, and delete functionality
- **🎨 Image Generation**: AI-powered image generation tool support
- **⚡ Real-time Streaming**: FastAPI + SSE real-time response streaming
- **🔄 Session Management**: Session-based state persistence
- **🛠️ Tool Integration**: Rich LangCrew-Tools ecosystem

## Quick Start

### Docker Quick Start (Recommended)

#### Method 1: Docker Compose (Full Stack)
```bash
# From super_agent directory
cd examples/components/web/super_agent
docker-compose -f compose-super-agent.yaml up --build -d
```

This will start:
- **Super Agent API**: http://localhost:8000
- **Frontend Web UI**: http://localhost:3600

#### Method 2: Standalone Docker Container
1. **Build Image**:
```bash
# From project root directory
docker build -f examples/components/web/super_agent/Dockerfile -t super-agent-backend:latest .
```

2. **Configure Environment Variables**:
Create `.env` file in the super_agent directory:
```bash
# LLM Provider API Keys (at least one required)
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration
PORT=8000
MODE=full
LOG_LEVEL=info
HOST=0.0.0.0

# Additional tool configurations
E2B_API_KEY=your-e2b-key
S3_ENDPOINT=your-s3-endpoint
# ... other configurations
```

3. **Start Container**:
```bash
# Using convenience script (recommended)
cd examples/components/web/super_agent
./run_docker.sh start

# Or manual Docker command
docker run --rm -d \
    --name super-agent-backend \
    --env-file .env \
    -p 8000:8000 \
    super-agent-backend:latest
```

#### 3. Access Services
- **Health Check**: http://localhost:8000/api/v1/health
- **API Documentation**: http://localhost:8000/docs
- **Chat API**: POST http://localhost:8000/api/v1/chat
- **Frontend UI**: http://localhost:3600 (when using Docker Compose)

### Docker Management Commands

#### Using Convenience Script
```bash
cd examples/components/web/super_agent

# Build Docker image
./run_docker.sh build

# Start container
./run_docker.sh start

# Stop container
./run_docker.sh stop

# Restart container
./run_docker.sh restart

# Check status
./run_docker.sh status

# View logs
./run_docker.sh logs

# Test API
./run_docker.sh test

# Show help
./run_docker.sh
```

#### Using Docker Compose
```bash
# From super_agent directory
cd examples/components/web/super_agent

# Start full stack (Super Agent + Frontend)
docker-compose -f compose-super-agent.yaml up --build -d

# Stop all services
docker-compose -f compose-super-agent.yaml down

# View logs
docker-compose -f compose-super-agent.yaml logs super-agent
docker-compose -f compose-super-agent.yaml logs frontend

# Check status
docker-compose -f compose-super-agent.yaml ps
```

### Environment Variable Configuration

The system supports multiple ways to configure environment variables:

1. **For Docker Compose**: Create `.env` file in project root
2. **For Standalone Docker**: Create `.env` file in super_agent directory
3. **For Local Development**: Export environment variables or use `.env` file

Required environment variables:
- At least one LLM API key: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `DASHSCOPE_API_KEY`

Optional environment variables:
- `LOG_LEVEL`: debug | info | warning | error (default: info)
- `MODE`: simple | full (default: full)
- `PORT`: Server port (default: 8000)

### Local Development Mode

#### Requirements

- Python 3.11-3.12
- uv package manager
- At least one LLM API Key (OpenAI, Anthropic, or DashScope)

#### Installation Steps

1. **Install Dependencies**:
```bash
cd examples/components/web/super_agent
uv sync
```

2. **Configure Environment Variables**:
```bash
# Set API keys (choose at least one)
export OPENAI_API_KEY=your-openai-key
export ANTHROPIC_API_KEY=your-anthropic-key
export DASHSCOPE_API_KEY=your-dashscope-key

# Optional server configuration
export LOG_LEVEL=info
export MODE=full
export PORT=8000
```

3. **Start Application**:

**Option 1: Run Web Server (Recommended)**
```bash
# Start FastAPI server
uv run python src/super_agent/server.py

# Or specify host and port
uv run python src/super_agent/server.py --host 0.0.0.0 --port 8000
```

**Option 2: Direct Agent Execution**
```bash
# Run async agent directly
uv run python src/super_agent/main.py
```

## API Endpoints

After starting the server, you can access the following endpoints:

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health
- **Chat Interface**: `POST /api/v1/chat`
- **Stop Execution**: `POST /api/v1/chat/stop`
- **Update Task**: `POST /api/v1/update_task`

### Chat Interface Usage Example

```bash
# Send chat request
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search for today'\''s weather in Beijing",
    "session_id": "test_session_123"
  }'
```

### Frontend Integration

The server supports Server-Sent Events (SSE) streaming responses and can seamlessly integrate with the LangCrew Web frontend:

```bash
# Start frontend (in langcrew/web directory)
cd ../../../../web
pnpm install
pnpm dev
```

Visit http://localhost:3600/chat for graphical interaction.

## Agent Capabilities

Super Agent is a single but powerful intelligent agent that integrates the following core capabilities:

### 🌐 Browser Automation
- Intelligent web operations based on browser-use
- Automatic handling of complex multi-step web tasks
- Support for login, form filling, data extraction, and more
- Smart error recovery and retry mechanisms

### 🔍 Information Retrieval & Processing
- Web search and content scraping
- Multi-source information integration and verification
- Structured data extraction and analysis
- Intelligent content summarization and report generation

### 💻 Code Execution & File Operations
- Python code execution in sandboxed environment
- Mathematical calculations, data analysis, chart generation
- Complete file system operation support
- Support for reading and writing multiple file formats

### 🎨 Multimedia Generation
- AI-driven image generation
- Support for various artistic styles and descriptions
- Automatic image file saving and management

### 🔧 System Integration
- Linux command execution support
- Environment variable and configuration management
- Multi-tool coordination and workflow orchestration

## Tool Integration

### BrowserStreamingTool Features
- Real-time browser automation operations
- Screenshot capture and analysis
- Intelligent interactive element detection
- Streaming execution feedback
- Multi-language support
- Sandbox environment integration

### LangCrew-Tools Ecosystem
- **Search Tools**: WebSearchTool, WebFetchTool
- **File Tools**: WriteFileTool, ReadFileTool, DeleteFileTool, etc.
- **Interactive Tools**: UserInputTool (human-in-the-loop)
- **Generation Tools**: ImageGenerationTool (AI image generation)
- **Execution Tools**: CodeInterpreterTool, RunCommandTool

## Configuration

### Model Configuration (`config/config.py`)
```python
class SuperAgentConfig:
    # LLM Configuration
    model_name: str = "gpt-4.1"
    temperature: float = 0.0
    max_tokens: int = 10000
    
    # Browser LLM Configuration
    browser_model: str = "gpt-4.1"
    browser_temperature: float = 0.0
    
    # System Configuration
    verbose: bool = True
```

### System Prompts (`config/prompt.py`)
- Contains detailed task execution guidelines
- Browser operation best practices
- Tool usage protocols and error handling strategies

## Usage Examples

### Web Search and Information Extraction
```bash
# Start server
uv run python src/super_agent/server.py

# Send request (using curl or frontend)
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search for artificial intelligence development trends in 2024 and summarize key insights",
    "session_id": "research_session"
  }'
```

### Browser Automation Tasks
```bash
# Complex web operation example
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Log into GitHub, find the tensorflow/tensorflow repository and report the number of open issues labeled as '\''good first issue'\''",
    "session_id": "automation_session"
  }'
```

### Data Analysis and Visualization
```bash
# Code execution and chart generation
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze Beijing weather data from the past week and generate a temperature trend chart",
    "session_id": "analysis_session"
  }'
```

### File Processing and Content Generation
```bash
# Document creation and editing
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a research report on AI technology development and save it as a markdown file",
    "session_id": "document_session"
  }'
```

## Best Practices

1. **Clear Task Description**: Provide specific, actionable task descriptions
2. **Session Management**: Use session_id properly for session state management
3. **Error Handling**: Built-in intelligent error recovery and retry mechanisms
4. **Rate Control**: Automatic compliance with website terms of service and intelligent delays
5. **Data Quality**: Automatic validation and cleaning of extracted data

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure correct setup of OPENAI_API_KEY and other environment variables
2. **Port Conflicts**: Check if port 8000 is occupied by other services
3. **Dependency Issues**: Use `uv sync` to reinstall dependencies
4. **Network Issues**: Ensure network connectivity and external API access

### Debug Mode

Enable verbose logging for detailed execution information:
```python
# Enable verbose mode in configuration
config = SuperAgentConfig(verbose=True, log_level="DEBUG")
crew = SuperAgentCrew(session_id="debug_session", config=config)
```

View real-time logs:
```bash
# Specify log level when starting
uv run python src/super_agent/server.py --log-level debug
```

## Advanced Usage

### Custom Tool Integration
Extend agent tool capabilities:
```python
from langcrew_tools import CustomTool

class SuperAgentCrew:
    def get_tools(self) -> list[BaseTool]:
        tools = [
            # Default tools
            BrowserStreamingTool(...),
            WebSearchTool(),
            # Add custom tools
            CustomTool(),
        ]
        return tools
```

### Async Execution Mode
Support for asynchronous concurrent operations:
```python
import asyncio
from super_agent.agent.crew import SuperAgentCrew

async def main():
    crew = SuperAgentCrew(session_id="async_session")
    async for event in crew.crew().astream_events("Your task"):
        print(event)

asyncio.run(main())
```

### Session State Management
Leverage session state for complex interactions:
```python
# Stop current execution
await crew.stop_agent()

# Send new message to running agent
await crew.send_new_message("Update task requirements")
```

## Project Architecture

```
src/super_agent/
├── agent/
│   ├── crew.py              # Main SuperAgentCrew class
├── config/
│   ├── config.py           # Configuration class definitions
│   └── prompt.py           # System prompts
├── main.py                 # Direct execution entry point
└── server.py              # FastAPI server
```