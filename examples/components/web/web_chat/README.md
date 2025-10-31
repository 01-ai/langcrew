# Web Chat Example

This example demonstrates how to create a web-based chat interface using LangCrew with tool support.

## Features

- Interactive web chat interface
- Tool integration (calculator, web search, weather, timezone)
- Conversation memory
- Real-time streaming responses
- Multi-provider LLM support (OpenAI, Anthropic, DashScope)

## Quick Start

### Docker Quick Start

You can build and run the web chat server with Docker for one‑click deployment.

#### 1) Build image
```bash
cd examples/components/web/web_chat
docker build -f Dockerfile -t langcrew-web-chat:latest .
```

#### 2) Run container
Provide at least one API key via env (OpenAI, Anthropic, or DashScope):
```bash
# Example using OpenAI API key and default port 8000
docker run --rm -it \
  -e OPENAI_API_KEY=your-openai-key \
  -p 8000:8000 \
  langcrew-web-chat:latest
```

Optional runtime env:
- PORT: HTTP port (default 8000)
- MODE: simple | full (default full)
- LOG_LEVEL: debug | info | warning | error (default info)
- ANTHROPIC_API_KEY: use Anthropic instead of OpenAI
- DASHSCOPE_API_KEY: use DashScope instead of OpenAI

Examples:
```bash
# Use Anthropic and custom port
docker run --rm -it \
  -e ANTHROPIC_API_KEY=your-key \
  -e PORT=9000 \
  -p 9000:9000 \
  langcrew-web-chat:latest

# Run in simple mode
docker run --rm -it \
  -e OPENAI_API_KEY=your-openai-key \
  -e MODE=simple \
  -p 8000:8000 \
  langcrew-web-chat:latest
```

#### 3) Access
- API Docs: http://localhost:8000/docs
- Chat Endpoint: POST http://localhost:8000/api/v1/chat
- Health: http://localhost:8000/api/v1/health

Notes:
- The Dockerfile uses `uv` to install dependencies and supports editable local libs in this monorepo.
- Provide only one of OPENAI_API_KEY / ANTHROPIC_API_KEY / DASHSCOPE_API_KEY / DEEPSEEK_API_KEY. If multiple are set, the app chooses in the order OpenAI → Anthropic → DashScope → DeepSeek. 

### Code Quick Start

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
# DEEPSEEK_API_KEY=your-deepseek-api-key
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

### Usage

Send a POST request to `/api/v1/chat`:

```json
{
  "message": "What's the weather like in New York?",
  "session_id": "optional-session-id"
}
```

### Available Tools

- **Calculator**: Mathematical calculations
- **Web Search**: Current information search
- **Weather**: Weather information for any city
- **Timezone**: Time and timezone information


### Model Selection

The system automatically selects the best available model:
1. **OpenAI** - `gpt-5-mini` (recommended)
2. **Anthropic** - `claude-3-haiku-20240307`
3. **DashScope** - `qwen-plus` 