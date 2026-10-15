import json
from unittest.mock import AsyncMock

import pytest
from langchain.agents.middleware.types import ModelRequest
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.types import Command

from langcrew.citation import (
    CitationConfig,
    CitationMiddleware,
    CitationResultItem,
    CitationSource,
    attach_citation_sources,
    citation_result,
    citation_source_id,
    public_artifact,
)
from langcrew.citation.artifact import CITATION_SOURCES_KEY
from langcrew.middleware.large_tool_result import LargeToolResultMiddleware


def _request(name: str = "search") -> ToolCallRequest:
    return ToolCallRequest(
        tool_call={"id": "call-1", "name": name, "args": {}},
        tool=None,
        state={},
        runtime=None,
    )


def test_formal_result_injects_id_and_attaches_private_source():
    source = CitationSource(
        type="web",
        source_key="https://example.com/",
        data={"title": "Example", "url": "https://example.com/"},
    )
    _, artifact = citation_result(value={"title": "Example"}, source=source)
    middleware = CitationMiddleware(CitationConfig(enabled=True))

    result = middleware.wrap_tool_call(
        _request(),
        lambda _: ToolMessage(
            content='{"title":"Example"}',
            artifact=artifact,
            tool_call_id="call-1",
        ),
    )

    source_id = citation_source_id(source.type, source.source_key)
    assert json.loads(result.content) == {
        "citation_id": source_id,
        "title": "Example",
    }
    assert result.artifact[CITATION_SOURCES_KEY] == [
        source.with_id(source_id).to_artifact_dict()
    ]


def test_external_adapter_uses_same_materialization_path():
    def adapter(_, __):
        return [
            CitationResultItem(
                value={"content": "external"},
                source=CitationSource(type="external", source_key="one"),
            )
        ]

    middleware = CitationMiddleware(
        CitationConfig(enabled=True, tool_adapters=[adapter])
    )
    result = middleware.wrap_tool_call(
        _request("mcp_search"),
        lambda _: ToolMessage(content="raw", tool_call_id="call-1"),
    )

    assert json.loads(result.content)["citation_id"] == citation_source_id(
        "external", "one"
    )


def test_disabled_middleware_keeps_tool_message_unchanged():
    middleware = CitationMiddleware(CitationConfig(enabled=False))
    original = ToolMessage(content="raw", tool_call_id="call-1")

    assert middleware.wrap_tool_call(_request(), lambda _: original) is original


def test_original_non_dict_artifact_is_preserved_for_public_output():
    original_artifact = [{"key": "memory-one", "value": "Preference"}]
    _, artifact = citation_result(
        value={"content": "Preference"},
        source=CitationSource(type="memory", source_key="memory-one"),
        artifact=original_artifact,
    )
    result = CitationMiddleware().wrap_tool_call(
        _request(),
        lambda _: ToolMessage(
            content="raw",
            artifact=artifact,
            tool_call_id="call-1",
        ),
    )

    assert public_artifact(result.artifact) == original_artifact


def test_prompt_is_added_without_changing_system_message_sources():
    source = CitationSource(type="memory", source_key="preference")
    system_message = attach_citation_sources(
        SystemMessage(content="Original"), [source]
    )
    request = ModelRequest(
        model=FakeListChatModel(responses=["ok"]),
        messages=[],
        system_message=system_message,
    )

    prepared = CitationMiddleware()._with_citation_prompt(request)

    assert "<citation_rules>" in prepared.system_message.text
    assert prepared.system_message.additional_kwargs == system_message.additional_kwargs


def test_command_fields_are_preserved_when_tool_messages_are_processed():
    _, artifact = citation_result(
        value={"content": "result"},
        source=CitationSource(type="web", source_key="one"),
    )
    command = Command(
        goto="next",
        update={
            "messages": [
                ToolMessage(
                    content="raw",
                    artifact=artifact,
                    tool_call_id="call-1",
                )
            ],
            "other": "value",
        },
    )

    result = CitationMiddleware().wrap_tool_call(_request(), lambda _: command)

    assert result.goto == "next"
    assert result.update["other"] == "value"
    assert CITATION_SOURCES_KEY in result.update["messages"][0].artifact


def test_langmem_adapter_uses_formal_protocol_and_preserves_original_artifact():
    visible = json.dumps([
        {
            "key": "memory-1",
            "value": {
                "content": "The user prefers concise answers.",
                "source_name": "Preferences",
            },
            "score": 0.91,
        }
    ])
    original_artifact = [
        {
            "key": "memory-1",
            "value": {
                "content": "The user prefers concise answers.",
                "source_name": "Preferences",
            },
        }
    ]

    result = CitationMiddleware().wrap_tool_call(
        _request("search_user_memory"),
        lambda _: ToolMessage(
            content=visible,
            artifact=original_artifact,
            tool_call_id="call-1",
        ),
    )

    value = json.loads(result.content)[0]
    assert value["score"] == 0.91
    source_id = citation_source_id("memory", "memory-1")
    assert value["citation_id"] == source_id
    assert result.artifact[CITATION_SOURCES_KEY][0] == {
        "id": source_id,
        "type": "memory",
        "source_key": "memory-1",
        "memory_id": "memory-1",
        "content": "The user prefers concise answers.",
        "source_name": "Preferences",
    }
    assert public_artifact(result.artifact) == original_artifact


def test_langmem_adapter_without_stable_identity_is_left_unchanged():
    content = json.dumps([{"value": {"content": "No stable key"}}])
    artifact = [{"value": {"content": "No stable key"}}]

    original = ToolMessage(
        content=content,
        artifact=artifact,
        tool_call_id="call-1",
    )
    result = CitationMiddleware().wrap_tool_call(
        _request("search_app_memory"), lambda _: original
    )

    assert result is original


def test_langmem_app_search_uses_a_separate_source_identity():
    content = json.dumps([{"key": "memory-1", "value": "Shared setting"}])
    result = CitationMiddleware().wrap_tool_call(
        _request("search_app_memory"),
        lambda _: ToolMessage(
            content=content,
            artifact=[{"key": "memory-1", "value": "Shared setting"}],
            tool_call_id="call-1",
        ),
    )

    source = result.artifact[CITATION_SOURCES_KEY][0]
    assert source["source_key"] == "app:memory-1"
    assert source["id"] == citation_source_id("memory", "app:memory-1")


def test_langmem_extraction_failure_is_logged_and_keeps_tool_result(caplog):
    original = ToolMessage(
        content="unexpected memory output",
        artifact=None,
        tool_call_id="call-1",
    )

    result = CitationMiddleware().wrap_tool_call(
        _request("search_user_memory"), lambda _: original
    )

    assert result is original
    assert "Citation tool adapter failed for search_user_memory" in caplog.text


def test_original_none_artifact_is_restored_for_public_output():
    _, artifact = citation_result(
        value={"content": "result"},
        source=CitationSource(type="web", source_key="one"),
    )
    result = CitationMiddleware().wrap_tool_call(
        _request(),
        lambda _: ToolMessage(
            content="raw",
            artifact=artifact,
            tool_call_id="call-1",
        ),
    )

    assert public_artifact(result.artifact) is None


@pytest.mark.asyncio
async def test_citation_materializes_before_large_result_middleware():
    source = CitationSource(type="web", source_key="large-result")
    _, artifact = citation_result(
        value={"content": "x" * 100},
        source=source,
    )
    raw_message = ToolMessage(
        content="raw",
        artifact=artifact,
        tool_call_id="call-1",
    )
    citation = CitationMiddleware()
    backend = AsyncMock()
    large_result = LargeToolResultMiddleware(backend=backend, token_limit=1)

    async def execute_tool(_):
        return raw_message

    async def run_citation(inner_request):
        return await citation.awrap_tool_call(inner_request, execute_tool)

    result = await large_result.awrap_tool_call(_request(), run_citation)

    assert "too large" in result.content.lower()
    assert result.artifact[CITATION_SOURCES_KEY][0]["id"] == citation_source_id(
        "web", "large-result"
    )
    backend.write.assert_awaited_once()
    assert citation_source_id("web", "large-result") in backend.write.await_args.args[1]
