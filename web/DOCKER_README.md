# Web Frontend Docker Deployment Guide

This directory contains Docker configuration files for deploying the React frontend application.

## File Description

- `Dockerfile` - Multi-stage Docker file for production build
- `nginx.conf` - Nginx configuration file for production environment
- `docker-compose.yaml` - Docker Compose configuration file
- `.dockerignore` - Files to ignore during Docker build

## Usage

### Production Environment

#### Using Docker Compose

```bash
# Build and start production environment
docker-compose up --build

# Run in background
docker-compose up -d --build
```

Production environment will run on `http://localhost:80`.

#### Using Docker Commands

```bash
# Build production image
docker build -t langcrew-web .

# Run production container
docker run -p 80:80 langcrew-web
```

### Custom Configuration

#### Environment Variables

- `NODE_ENV` - Runtime environment (production)
- `AGENT_API_HOST` - Backend API address

#### Port Configuration

- Production environment: 80

## Build Stages

1. **build** - Build stage, installs dependencies and builds the application
2. **production** - Production stage, serves static files using Nginx

## Features

- **Multi-stage build** - Optimized image size and build efficiency
- **Production optimized** - Nginx serving, compression, caching
- **Security** - Security headers and optimized configuration
- **Performance** - Static asset optimization and gzip compression

## Notes

- Make sure Docker and Docker Compose are installed before running
- Production environment uses Nginx to serve static files
- All static assets are compressed and cache-optimized
- The application supports client-side routing
