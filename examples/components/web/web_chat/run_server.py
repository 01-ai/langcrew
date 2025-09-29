#!/usr/bin/env python3
"""
Simple server runner for Web Chat API

This script provides a quick way to start the server with common configurations.
"""

import os

import agentops
from dotenv import load_dotenv
from web_chat.server import main

load_dotenv()


# Only initialize agentops when AGENTOPS_API_KEY is configured
if os.getenv("AGENTOPS_API_KEY"):
    agentops.init(
        auto_start_session=False,
        api_key=os.getenv("AGENTOPS_API_KEY"),
        endpoint=os.getenv("AGENTOPS_ENDPOINT"),
        app_url=os.getenv("AGENTOPS_APP_URL"),
        exporter_endpoint=os.getenv("AGENTOPS_EXPORTER_ENDPOINT"),
    )

if __name__ == "__main__":
    main()
