#!/bin/bash

# Super Agent Docker startup script
# Usage: ./run_docker.sh [start|stop|restart|logs|status]

CONTAINER_NAME="super-agent-backend"
IMAGE_NAME="super-agent-backend:latest"
ENV_FILE=".env"
PORT="8000"

case "${1:-start}" in
    "build")
        echo "Building Super Agent Docker image..."
        cd ../../../../
        docker build -f examples/components/web/super_agent/Dockerfile -t $IMAGE_NAME .
        ;;
    "start")
        echo "Starting Super Agent container..."
        # Stop existing container
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME 2>/dev/null || true
        # Start new container
        cd ../../../../
        docker run --rm -d \
            --name $CONTAINER_NAME \
            --env-file examples/components/web/super_agent/$ENV_FILE \
            -p $PORT:8000 \
            $IMAGE_NAME
        echo "Container started, access URLs:"
        echo "- Health check: http://localhost:$PORT/api/v1/health"
        echo "- API docs: http://localhost:$PORT/docs"
        echo "- Chat API: POST http://localhost:$PORT/api/v1/chat"
        ;;
    "stop")
        echo "Stopping Super Agent container..."
        docker stop $CONTAINER_NAME
        ;;
    "restart")
        echo "Restarting Super Agent container..."
        $0 stop
        sleep 2
        $0 start
        ;;
    "logs")
        echo "Viewing container logs..."
        docker logs -f $CONTAINER_NAME
        ;;
    "status")
        echo "Checking container status..."
        docker ps | grep $CONTAINER_NAME || echo "Container not running"
        ;;
    "test")
        echo "Testing API functionality..."
        echo "1. Health check:"
        curl -s http://localhost:$PORT/api/v1/health | jq . 2>/dev/null || curl -s http://localhost:$PORT/api/v1/health
        echo -e "\n\n2. Chat test:"
        curl -X POST "http://localhost:$PORT/api/v1/chat" \
            -H "Content-Type: application/json" \
            -d '{"message": "Hello, what can you do?", "session_id": "test_session"}' \
            --max-time 30
        ;;
    *)
        echo "Usage: $0 [build|start|stop|restart|logs|status|test]"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker image"
        echo "  start   - Start container (default)"
        echo "  stop    - Stop container"
        echo "  restart - Restart container"
        echo "  logs    - View real-time logs"
        echo "  status  - Check running status"
        echo "  test    - Test API functionality"
        ;;
esac
