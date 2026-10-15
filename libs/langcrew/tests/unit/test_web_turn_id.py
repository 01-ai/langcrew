import uuid

import pytest
from langchain_core.messages import AIMessageChunk

from langcrew.citation import CitationConfig
from langcrew.web.adapter import LangGraphAdapter
from langcrew.web.protocol import MessageType


class _FakeCrew:
    _stop_reason = None
    citation_config = CitationConfig(enabled=False)

    async def astream_events(self, input, config):
        yield {
            "event": "on_chat_model_stream",
            "name": "model",
            "run_id": "model-run",
            "parent_ids": ["root-run"],
            "data": {"chunk": AIMessageChunk(content="Hello")},
        }
        yield {
            "event": "on_chain_end",
            "name": "root",
            "run_id": "root-run",
            "parent_ids": [],
            "data": {"output": {}},
        }


@pytest.mark.asyncio
async def test_one_execution_uses_one_uuid4_response_id():
    adapter = LangGraphAdapter(_FakeCrew())

    messages = [
        message
        async for message in adapter.stream(
            content="Hi",
            session_id="session-1",
        )
    ]

    assert [message.type for message in messages] == [
        MessageType.TEXT,
        MessageType.FINISH_REASON,
    ]
    assert len({message.response_id for message in messages}) == 1
    assert uuid.UUID(messages[0].response_id).version == 4


@pytest.mark.asyncio
async def test_separate_executions_use_different_response_ids():
    adapter = LangGraphAdapter(_FakeCrew())

    first = [
        message
        async for message in adapter.stream(content="First", session_id="session-1")
    ]
    second = [
        message
        async for message in adapter.stream(content="Second", session_id="session-1")
    ]

    assert first[0].response_id != second[0].response_id
