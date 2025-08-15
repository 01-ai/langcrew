#!/usr/bin/env python3
"""
Simple server runner for Web Chat API

This script provides a quick way to start the server with common configurations.
"""

import sys
import os

# Automatically load .env file
# Supports any one of OPENAI_API_KEY, ANTHROPIC_API_KEY, DASHSCOPE_API_KEY configuration
try:
    from dotenv import load_dotenv
    import os

    # Check if .env file exists
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        load_dotenv()
        print("✅ Environment variables loaded from .env")
    else:
        print("ℹ️  No .env file found, using system environment variables")
        load_dotenv()  # Still call in case there's .env file in other locations

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
