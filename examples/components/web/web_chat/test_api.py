#!/usr/bin/env python3
"""
Test script for Web Chat API

This script demonstrates how to interact with the Web Chat API programmatically.
"""

import asyncio
import aiohttp
import json
import sys
from typing import Optional


class WebChatAPIClient:
    """Simple client for testing the Web Chat API"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def health_check(self) -> dict:
        """Check if the API server is healthy"""
        async with self.session.get(f"{self.base_url}/api/v1/health") as response:
            return await response.json()

    async def get_api_info(self) -> dict:
        """Get API information"""
        async with self.session.get(f"{self.base_url}/api/v1/info") as response:
            return await response.json()

    async def send_message(self, message: str, session_id: Optional[str] = None) -> str:
        """Send a message and get streaming response"""
        payload = {"message": message}
        if session_id:
            payload["session_id"] = session_id

        print(f"\n🤖 Sending: {message}")
        if session_id:
            print(f"📱 Session: {session_id}")

        async with self.session.post(
            f"{self.base_url}/api/v1/chat",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
        ) as response:
            if response.status != 200:
                print(f"❌ Error: HTTP {response.status}")
                return None

            current_session_id = session_id
            assistant_response = ""

            async for line in response.content:
                line = line.decode("utf-8").strip()
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        await self._handle_message(data)

                        if data.get("type") == "session_id":
                            current_session_id = data.get("value")
                        elif data.get("type") == "text":
                            assistant_response += data.get("content", "")
                        elif data.get("type") == "done":
                            break

                    except json.JSONDecodeError:
                        continue

            return current_session_id

    async def _handle_message(self, data: dict):
        """Handle different types of messages from the API"""
        msg_type = data.get("type")
        content = data.get("content", "")

        if msg_type == "session_id":
            print(f"🆔 Session ID: {data.get('value')}")
        elif msg_type == "text":
            print(f"💬 Assistant: {content}", end="", flush=True)
        elif msg_type == "tool_call":
            detail = data.get("detail", {})
            tool_name = detail.get("tool", "unknown")
            action = detail.get("action", "Processing")
            print(f"\n🔧 Tool Call: {tool_name} - {action}")
        elif msg_type == "tool_result":
            print(f"✅ Tool Result: {content}")
        elif msg_type == "error":
            print(f"❌ Error: {content}")
        elif msg_type == "done":
            print("\n✨ Response complete")

    async def stop_conversation(self, session_id: str) -> bool:
        """Stop an active conversation"""
        payload = {"session_id": session_id}

        async with self.session.post(
            f"{self.base_url}/api/v1/chat/stop",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
        ) as response:
            return response.status == 200


async def test_basic_conversation():
    """Test basic conversation flow"""
    print("🧪 Testing Basic Conversation")
    print("=" * 50)

    async with WebChatAPIClient() as client:
        # Health check
        try:
            health = await client.health_check()
            print(f"🏥 Health Check: {health}")
        except Exception as e:
            print(f"❌ Server not available: {e}")
            return

        # Get API info
        try:
            info = await client.get_api_info()
            print(f"ℹ️  API Info: {info['api_version']}")
            print(f"🔧 Available Tools: {len(info['supported_tools'])}")
        except Exception as e:
            print(f"⚠️  Could not get API info: {e}")

        # Start conversation
        session_id = await client.send_message("Hello! How are you?")

        # Continue conversation with math
        if session_id:
            await client.send_message("What's 25 * 4 + 100?", session_id)

            # Weather query
            await client.send_message("What's the weather like in Tokyo?", session_id)

            # Search query
            await client.send_message("Search for latest AI developments", session_id)

            # Time query
            await client.send_message("What time is it in New York?", session_id)


async def test_tool_usage():
    """Test specific tool usage"""
    print("\n🧪 Testing Tool Usage")
    print("=" * 50)

    async with WebChatAPIClient() as client:
        # Test calculator
        session_id = await client.send_message("Calculate 15 * 23 + 45 - 12")

        if session_id:
            # Test percentage calculation
            await client.send_message("What's 25% of 200?", session_id)

            # Test weather with different city
            await client.send_message("How's the weather in London?", session_id)


async def test_error_handling():
    """Test error handling"""
    print("\n🧪 Testing Error Handling")
    print("=" * 50)

    async with WebChatAPIClient() as client:
        # Test invalid calculation
        session_id = await client.send_message("Calculate abc + xyz")

        if session_id:
            # Test division by zero
            await client.send_message("What's 10 divided by 0?", session_id)


def main():
    """Main test runner"""
    print("🚀 Web Chat API Test Suite")
    print("Make sure the server is running on http://localhost:8000")
    print()

    try:
        # Run all tests
        asyncio.run(test_basic_conversation())
        asyncio.run(test_tool_usage())
        asyncio.run(test_error_handling())

        print("\n✅ All tests completed!")

    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
