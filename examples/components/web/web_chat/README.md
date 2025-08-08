# Web Chat Example

This example demonstrates how to create a web-based chat interface using LangCrew with tool support.

## Features

- Interactive web chat interface
- Tool integration (calculator, web search, weather, timezone)
- Conversation memory
- Real-time streaming responses
- Multi-provider LLM support (OpenAI, Anthropic, DashScope)

## Quick Start

### 1. Install uv (if not installed)
```bash
# Option 1: Official installer (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Option 2: Using pip
pip install uv
```

### 2. Configure API Key
```bash
cd examples/components/web/web_chat
cp .env.example .env
# Edit .env file and add your API key (choose one):
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key  
# DASHSCOPE_API_KEY=your-dashscope-api-key
```

### 3. Run the Server
```bash
uv run run_server.py
```

The server will start on `http://localhost:8000`

## API Endpoints

- **API Documentation**: `http://localhost:8000/docs`
- **Chat Endpoint**: `POST http://localhost:8000/api/v1/chat`
- **Health Check**: `GET http://localhost:8000/api/v1/health`

## Usage

Send a POST request to `/api/v1/chat`:

```json
{
  "message": "What's the weather like in New York?",
  "thread_id": "optional-thread-id"
}
```

## Available Tools

- **Calculator**: Mathematical calculations
- **Web Search**: Current information search
- **Weather**: Weather information for any city
- **Timezone**: Time and timezone information

## Options

```bash
# Simple mode (basic features only)
uv run run_server.py --mode simple

# Custom port
uv run run_server.py --port 9000

# Debug mode
uv run run_server.py --log-level debug
```

## Troubleshooting

**"No API keys found"** - Make sure you've configured at least one API key in the `.env` file.

**"uv: command not found"** - Install uv using one of the commands in step 1.

## Model Selection

The system automatically selects the best available model:
1. **OpenAI** - `gpt-4o-mini` (recommended)
2. **Anthropic** - `claude-3-haiku-20240307`
3. **DashScope** - `qwen-plus` 