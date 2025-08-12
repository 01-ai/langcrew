FROM python:3.11-slim-bullseye

# Environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/root/.local/bin:${PATH}" \
    PORT=8000 \
    MODE=full \
    UV_HTTP_TIMEOUT=120 \
    UV_INDEX_TIMEOUT=120 \
    UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple/

# System deps with security updates
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get install -y --no-install-recommends \
    curl ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install uv (fast Python package manager)
RUN pip install uv

# Create app dir and copy the entire repository
WORKDIR /app
COPY . .

# Set working dir to the web_chat example
WORKDIR /app/examples/components/web/web_chat

# Install Python deps using uv (resolves local editable packages in libs/*)
RUN uv sync --prerelease=allow

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
 && chown -R app:app /app
USER app

# Expose API port
EXPOSE 8000

# Start server
# Note: pass API keys via env (OPENAI_API_KEY / ANTHROPIC_API_KEY / DASHSCOPE_API_KEY)
CMD ["sh", "-lc", "uv run run_server.py --host 0.0.0.0 --port ${PORT:-8000} --mode ${MODE:-full}"] 