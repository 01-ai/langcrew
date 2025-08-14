#!/bin/bash

# Super Agent Docker 启动脚本
# 使用方法: ./run_docker.sh [start|stop|restart|logs|status]

CONTAINER_NAME="super-agent-backend"
IMAGE_NAME="super-agent-backend:latest"
ENV_FILE=".env"
PORT="8000"

case "${1:-start}" in
    "build")
        echo "构建 Super Agent Docker 镜像..."
        cd ../../../../
        docker build -f examples/components/web/super_agent/Dockerfile -t $IMAGE_NAME .
        ;;
    "start")
        echo "启动 Super Agent 容器..."
        # 停止已存在的容器
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME 2>/dev/null || true
        # 启动新容器
        cd ../../../../
        docker run --rm -d \
            --name $CONTAINER_NAME \
            --env-file examples/components/web/super_agent/$ENV_FILE \
            -p $PORT:8000 \
            $IMAGE_NAME
        echo "容器已启动，访问地址："
        echo "- 健康检查: http://localhost:$PORT/api/v1/health"
        echo "- API文档: http://localhost:$PORT/docs"
        echo "- 聊天API: POST http://localhost:$PORT/api/v1/chat"
        ;;
    "stop")
        echo "停止 Super Agent 容器..."
        docker stop $CONTAINER_NAME
        ;;
    "restart")
        echo "重启 Super Agent 容器..."
        $0 stop
        sleep 2
        $0 start
        ;;
    "logs")
        echo "查看容器日志..."
        docker logs -f $CONTAINER_NAME
        ;;
    "status")
        echo "检查容器状态..."
        docker ps | grep $CONTAINER_NAME || echo "容器未运行"
        ;;
    "test")
        echo "测试 API 功能..."
        echo "1. 健康检查:"
        curl -s http://localhost:$PORT/api/v1/health | jq . 2>/dev/null || curl -s http://localhost:$PORT/api/v1/health
        echo -e "\n\n2. 聊天测试:"
        curl -X POST "http://localhost:$PORT/api/v1/chat" \
            -H "Content-Type: application/json" \
            -d '{"message": "Hello, what can you do?", "session_id": "test_session"}' \
            --max-time 30
        ;;
    *)
        echo "使用方法: $0 [build|start|stop|restart|logs|status|test]"
        echo ""
        echo "命令说明："
        echo "  build   - 构建Docker镜像"
        echo "  start   - 启动容器 (默认)"
        echo "  stop    - 停止容器"
        echo "  restart - 重启容器"
        echo "  logs    - 查看实时日志"
        echo "  status  - 检查运行状态"
        echo "  test    - 测试API功能"
        ;;
esac
