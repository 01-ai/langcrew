# Multi-stage build for unified frontend + backend application
FROM node:22-alpine3.22 AS frontend-build

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY web/package.json web/pnpm-lock.yaml ./

# Install frontend dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY web/ ./

# Build the frontend application
ENV NODE_ENV=production
RUN pnpm build

# Backend build stage
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MODE=full \
    UV_HTTP_TIMEOUT=120 \
    UV_INDEX_TIMEOUT=120 

# System dependencies with security updates
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    curl ca-certificates nginx\
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create app directory
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PYTHONPATH="/app/src:$PYTHONPATH"
# 安装项目依赖
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=/app/uv.lock \
    --mount=type=bind,source=pyproject.toml,target=/app/pyproject.toml \
    uv sync --locked --no-install-project --no-dev

# Stage 3: Copy application source code (after dependencies are installed)
COPY src/ ./src/
COPY run_server.py ./
COPY .env ./
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start-services.sh /start-services.sh
RUN chmod +x /start-services.sh

# Expose ports
EXPOSE 80

# Start both services (nginx as root, backend as app user)
CMD ["/start-services.sh"]
