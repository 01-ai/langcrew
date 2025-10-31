"""
Simple server runner for Web Chat API

This script provides a quick way to start the server with common configurations.
"""

from dotenv import load_dotenv

from web_chat.server import main

load_dotenv()

if __name__ == "__main__":
    main()
