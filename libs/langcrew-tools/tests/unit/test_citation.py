import json
from unittest.mock import AsyncMock, patch

import pytest
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.messages import ToolMessage
from langcrew.citation import CitationConfig, CitationMiddleware
from langcrew.citation.artifact import sources_from_artifact

from langcrew_tools.fetch import WebFetchTool
from langcrew_tools.search import SearchSource, WebSearchTool


def _materialize(tool, name: str, args: dict, message: ToolMessage) -> ToolMessage:
    request = ToolCallRequest(
        tool_call={"id": "call-1", "name": name, "args": args},
        tool=tool,
        state={},
        runtime=None,
    )
    return CitationMiddleware(CitationConfig(enabled=True)).wrap_tool_call(
        request,
        lambda _: message,
    )


@pytest.mark.asyncio
async def test_web_search_declares_sources_without_changing_raw_content():
    value = {
        "title": "Example",
        "text": "Full result",
        "metadata": {
            "url": "HTTPS://WWW.Example.com/news/?q=1#section",
            "snippet": "Short snippet",
            "site_name": "Example News",
            "favicon": "https://example.com/favicon.ico",
            "date_published": "2026-08-01",
        },
    }
    raw_content = json.dumps([value])
    tool = WebSearchTool(source=SearchSource.TAVILY, api_key="test")
    tool._provider.search = AsyncMock(return_value=raw_content)

    raw_message = await tool.ainvoke({
        "name": "web_search",
        "args": {"query": "example", "query_num": 1},
        "id": "call-1",
        "type": "tool_call",
    })

    assert raw_message.content == raw_content
    assert raw_message.artifact is None

    message = _materialize(
        tool,
        "web_search",
        {"query": "example", "query_num": 1},
        raw_message,
    )
    source = sources_from_artifact(message.artifact)[0]
    assert source.source_key == "https://www.example.com/news?q=1"
    assert source.data == {
        "title": "Example",
        "url": "HTTPS://WWW.Example.com/news/?q=1#section",
        "site_name": "Example News",
        "favicon_url": "https://example.com/favicon.ico",
        "published_at": "2026-08-01",
        "snippet": "Short snippet",
    }
    assert json.loads(message.content)[0] == {"citation_id": source.id, **value}


@pytest.mark.asyncio
async def test_web_fetch_declares_one_source_and_preserves_content_shape():
    url = "https://example.com/news/"
    content = "# Content from example.com\n---\n\nFetched article"
    tool = WebFetchTool()

    with patch.object(tool, "_arun_internal", AsyncMock(return_value=content)):
        raw_message = await tool.ainvoke({
            "name": "web_fetch",
            "args": {"url": url},
            "id": "call-1",
            "type": "tool_call",
        })

    assert raw_message.content == content
    assert raw_message.artifact is None

    message = _materialize(tool, "web_fetch", {"url": url}, raw_message)
    source = sources_from_artifact(message.artifact)[0]
    assert source.source_key == "https://example.com/news"
    assert json.loads(message.content) == {
        "citation_id": source.id,
        "content": content,
    }


@pytest.mark.asyncio
async def test_failed_web_fetch_does_not_declare_a_source():
    content = "Failed to fetch https://example.com"
    tool = WebFetchTool()

    with patch.object(tool, "_arun_internal", AsyncMock(return_value=content)):
        message = await tool.ainvoke({
            "name": "web_fetch",
            "args": {"url": "https://example.com"},
            "id": "call-1",
            "type": "tool_call",
        })

    assert message.content == content
    assert message.artifact is None


@pytest.mark.asyncio
async def test_web_search_keeps_uncitable_entries_in_the_same_result():
    citable = {
        "title": "Example",
        "metadata": {"url": "https://example.com", "snippet": "Evidence"},
    }
    uncitable = {"title": "Missing URL", "text": "Still visible"}
    tool = WebSearchTool(source=SearchSource.TAVILY, api_key="test")
    raw_content = json.dumps([citable, uncitable], separators=(",", ":"))
    tool._provider.search = AsyncMock(return_value=raw_content)

    raw_message = await tool.ainvoke({
        "name": "web_search",
        "args": {"query": "example", "query_num": 2},
        "id": "call-1",
        "type": "tool_call",
    })
    assert raw_message.content == raw_content
    assert raw_message.artifact is None

    message = _materialize(
        tool,
        "web_search",
        {"query": "example", "query_num": 2},
        raw_message,
    )
    values = json.loads(message.content)
    assert values[0]["citation_id"]
    assert values[0]["title"] == "Example"
    assert values[1] == uncitable


@pytest.mark.asyncio
async def test_web_search_extraction_failure_is_logged_and_keeps_tool_result(
    caplog,
):
    raw_content = "provider changed its output format"
    tool = WebSearchTool(source=SearchSource.TAVILY, api_key="test")
    tool._provider.search = AsyncMock(return_value=raw_content)
    raw_message = await tool.ainvoke({
        "name": "web_search",
        "args": {"query": "example", "query_num": 1},
        "id": "call-1",
        "type": "tool_call",
    })

    result = _materialize(
        tool,
        "web_search",
        {"query": "example", "query_num": 1},
        raw_message,
    )

    assert result is raw_message
    assert result.content == raw_content
    assert result.artifact is None
    assert "Citation result provider failed for web_search" in caplog.text


@pytest.mark.asyncio
async def test_disabled_citation_keeps_web_search_message_identical():
    raw_content = '[{"title":"Example"}]'
    tool = WebSearchTool(source=SearchSource.TAVILY, api_key="test")
    tool._provider.search = AsyncMock(return_value=raw_content)
    raw_message = await tool.ainvoke({
        "name": "web_search",
        "args": {"query": "example", "query_num": 1},
        "id": "call-1",
        "type": "tool_call",
    })
    request = ToolCallRequest(
        tool_call={
            "id": "call-1",
            "name": "web_search",
            "args": {"query": "example", "query_num": 1},
        },
        tool=tool,
        state={},
        runtime=None,
    )

    result = CitationMiddleware(CitationConfig(enabled=False)).wrap_tool_call(
        request,
        lambda _: raw_message,
    )

    assert result is raw_message
    assert result.content == raw_content
    assert result.artifact is None
