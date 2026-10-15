"""Search and fetch with LangCrew's MCP adapter, without API keys or an LLM."""

import argparse
import asyncio
import json
import uuid

from langcrew.tools.mcp import MCPToolAdapter

PARALLEL_SERVERS = {
    "parallel-search": {
        "url": "https://search.parallel.ai/mcp",
        "transport": "streamable_http",
        "headers": {
            "User-Agent": "langcrew-parallel-search-example/0.1.0 (https://github.com/01-ai/langcrew)"
        },
    }
}


async def search_and_fetch(query: str, fetch_url: str | None = None) -> dict:
    """Load native LangChain tools and reuse one session ID for related calls."""
    adapter = MCPToolAdapter()
    tools = await adapter.from_servers(
        PARALLEL_SERVERS, tool_filter=["web_search", "web_fetch"]
    )
    by_name = {tool.name: tool for tool in tools}
    session_id = str(uuid.uuid4())
    results = {
        "search": await by_name["web_search"].ainvoke(
            {
                "objective": query,
                "search_queries": [query],
                "session_id": session_id,
            }
        )
    }
    if fetch_url:
        results["fetch"] = await by_name["web_fetch"].ainvoke(
            {
                "urls": [fetch_url],
                "search_queries": [query],
                "session_id": session_id,
            }
        )
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "query", help="A concise search query, e.g. 'LangCrew MCP tools'"
    )
    parser.add_argument("--fetch-url", help="Also extract excerpts from an HTTP(S) URL")
    args = parser.parse_args()
    results = asyncio.run(search_and_fetch(args.query, args.fetch_url))
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
