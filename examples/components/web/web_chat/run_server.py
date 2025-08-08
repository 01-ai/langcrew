#!/usr/bin/env python3
"""
Simple server runner for Web Chat API

This script provides a quick way to start the server with common configurations.
"""

import sys
import os

# 自动加载 .env 文件
# 支持 OPENAI_API_KEY、ANTHROPIC_API_KEY、DASHSCOPE_API_KEY 任意配置一个即可
try:
    from dotenv import load_dotenv
    import os

    # 检查 .env 文件是否存在
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        load_dotenv()
        print("✅ Environment variables loaded from .env")
    else:
        print("ℹ️  No .env file found, using system environment variables")
        load_dotenv()  # 仍然调用以防其他位置有 .env 文件

except ImportError:
    print("⚠️  python-dotenv not installed, skipping .env file loading")
except Exception as e:
    print(f"⚠️  Failed to load .env file: {e}")

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# Add the langcrew libs directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../libs"))

from web_chat.server import main

if __name__ == "__main__":
    main()
