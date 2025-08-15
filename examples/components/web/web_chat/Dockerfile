FROM python:3.12-slim-bookworm

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MODE=full \
    UV_HTTP_TIMEOUT=120 \
    UV_INDEX_TIMEOUT=120 \
    UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple/

# System dependencies with security updates
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get install -y --no-install-recommends \
    curl ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install uv using official installer
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Create app directory
WORKDIR /app

# Stage 1: Copy local libraries first (for dependency resolution)
COPY libs/langcrew/ ./libs/langcrew/
COPY libs/langcrew-tools/ ./libs/langcrew-tools/

# Stage 2: Copy project configuration files for dependency installation
COPY examples/components/web/web_chat/pyproject.toml ./examples/components/web/web_chat/
COPY examples/components/web/web_chat/uv.lock ./examples/components/web/web_chat/

# Set working directory to web_chat example
WORKDIR /app/examples/components/web/web_chat

# Set UV project environment variable to point to the virtual environment
ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# Create virtual environment and install dependencies using uv sync
# Note: --prerelease allow is needed for some dependencies (e.g., OpenTelemetry)
RUN uv venv /opt/venv && \
    uv sync --frozen --no-dev --prerelease allow

# Set virtual environment as default
ENV PATH="/opt/venv/bin:${PATH}" \
    VIRTUAL_ENV="/opt/venv" \
    PYTHONPATH="/app/libs/langcrew:/app/libs/langcrew-tools:/app/examples/components/web/web_chat/src:${PYTHONPATH}"

# Stage 3: Copy application source code (after dependencies are installed)
COPY examples/components/web/web_chat/src/ ./src/
COPY examples/components/web/web_chat/run_server.py ./

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
 && chown -R app:app /app
USER app

# Expose API port
EXPOSE 8000

# Start server
# Note: pass API keys via env (OPENAI_API_KEY / ANTHROPIC_API_KEY / DASHSCOPE_API_KEY)
CMD ["python", "run_server.py", "--host", "0.0.0.0", "--port", "8000"]