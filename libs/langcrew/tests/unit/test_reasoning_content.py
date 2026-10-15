"""Unit tests for reasoning_content preservation.

覆盖思考模式（thinking mode）模型的 ``reasoning_content`` 保留与回传能力：

* ``langcrew.llm.openai_reasoning_chat.ChatOpenAIReasoning``
  - 出站：历史 assistant 的 ``reasoning_content`` 必须回写到请求体；
  - 出站：无推理内容时不得凭空注入字段；
  - 入站：响应中的 ``reasoning_content`` 必须写入 ``additional_kwargs``。
* ``LLMFactory`` 的 provider 分支与开关装配（含向后兼容）。
"""

import importlib.util
import os
import sys
import types
from typing import Any

import pytest
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

_MODULE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "langcrew",
    "llm",
    "openai_reasoning_chat.py",
)


def _load_reasoning_module():
    """按文件路径加载被测模块，避免 llm 包的重量级依赖干扰。"""
    spec = importlib.util.spec_from_file_location(
        "openai_reasoning_chat_under_test", _MODULE_PATH
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


reasoning_mod = _load_reasoning_module()
ChatOpenAIReasoning = reasoning_mod.ChatOpenAIReasoning


def _build_llm():
    return ChatOpenAIReasoning(
        model="test-model",
        api_key="test-key",
        base_url="http://127.0.0.1:1/v1",
        max_retries=0,
    )


# ---------------------------------------------------------------- 出站行为


def test_outbound_preserves_reasoning_content():
    """历史 assistant 的 reasoning_content 必须出现在请求体中。"""
    llm = _build_llm()
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="1+1=?"),
        AIMessage(content="2", additional_kwargs={"reasoning_content": "推理 1"}),
        HumanMessage(content="那 2+2 呢"),
    ]

    payload = llm._get_request_payload(messages)
    assistant = [m for m in payload["messages"] if m.get("role") == "assistant"]

    assert len(assistant) == 1
    assert assistant[0]["reasoning_content"] == "推理 1"


def test_outbound_omits_field_when_absent():
    """历史 assistant 没有 reasoning_content 时，不得注入该字段。"""
    llm = _build_llm()
    messages = [
        HumanMessage(content="hi"),
        AIMessage(content="hello"),
        HumanMessage(content="again"),
    ]

    payload = llm._get_request_payload(messages)
    assistant = [m for m in payload["messages"] if m.get("role") == "assistant"]

    assert "reasoning_content" not in assistant[0]


def test_outbound_preserves_reasoning_for_tool_call_message():
    """带 tool_calls 的 assistant 同样要回传 reasoning_content，且保留 tool_calls。"""
    llm = _build_llm()
    messages = [
        HumanMessage(content="北京天气"),
        AIMessage(
            content="",
            additional_kwargs={"reasoning_content": "需要调用工具"},
            tool_calls=[
                {"name": "get_weather", "args": {"city": "北京"}, "id": "call_1"}
            ],
        ),
        ToolMessage(content="晴 25 度", tool_call_id="call_1"),
    ]

    payload = llm._get_request_payload(messages)
    assistant = [m for m in payload["messages"] if m.get("role") == "assistant"][0]

    assert assistant["reasoning_content"] == "需要调用工具"
    assert assistant.get("tool_calls"), "tool_calls 不应丢失"


# ---------------------------------------------------------------- 入站行为


def test_inbound_extracts_reasoning_content_from_dict():
    """dict 形式的响应：reasoning_content 应写入 additional_kwargs。"""
    llm = _build_llm()
    raw: Any = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "2",
                    "reasoning_content": "逐步推理",
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
    }

    result = llm._create_chat_result(raw)
    message = result.generations[0].message

    assert message.additional_kwargs.get("reasoning_content") == "逐步推理"
    blocks = message.content_blocks or []
    assert any(
        isinstance(block, dict) and block.get("type") == "reasoning" for block in blocks
    ), "推理内容应以 reasoning 块形式暴露给前端"


def test_inbound_extracts_reasoning_content_from_openai_object():
    """对象形式的响应同样可提取。"""
    from openai.types.chat import ChatCompletion

    llm = _build_llm()
    raw = ChatCompletion.model_validate(
        {
            "id": "x",
            "object": "chat.completion",
            "created": 0,
            "model": "test-model",
            "choices": [
                {
                    "index": 0,
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": "ok",
                        "reasoning_content": "对象式推理",
                    },
                }
            ],
        }
    )

    result = llm._create_chat_result(raw)
    message = result.generations[0].message

    assert message.additional_kwargs.get("reasoning_content") == "对象式推理"


# ---------------------------------------------------------- LLMFactory 装配


class _FakeLLM:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.disable_streaming = False


def _load_factory_with_stubs():
    """加载 llm_factory，并用桩替换其 provider 分支依赖的类。"""
    class ChatOpenAIReasoningStub(_FakeLLM):
        is_reasoning_cls = True

    class PlainChatOpenAIStub(_FakeLLM):
        is_reasoning_cls = False

    pkg = types.ModuleType("langcrew")
    pkg.__path__ = []
    llm_pkg = types.ModuleType("langcrew.llm")
    llm_pkg.__path__ = []
    llm_pkg.ChatOpenAIReasoning = ChatOpenAIReasoningStub
    pkg.llm = llm_pkg
    sys.modules["langcrew"] = pkg
    sys.modules["langcrew.llm"] = llm_pkg

    openai_mod = types.ModuleType("langchain_openai")
    openai_mod.ChatOpenAI = PlainChatOpenAIStub
    sys.modules["langchain_openai"] = openai_mod

    factory_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "langcrew",
        "llm_factory.py",
    )
    spec = importlib.util.spec_from_file_location("langcrew.llm_factory", factory_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["langcrew.llm_factory"] = module
    spec.loader.exec_module(module)
    return module.LLMFactory


@pytest.fixture()
def factory(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test_key")
    return _load_factory_with_stubs()


@pytest.mark.parametrize(
    "config, expect_reasoning",
    [
        (
            {"provider": "openai", "model": "m", "base_url": "http://x"},
            False,
        ),
        (
            {
                "provider": "openai",
                "model": "m",
                "base_url": "http://x",
                "preserve_reasoning_content": True,
            },
            True,
        ),
        (
            {"provider": "openai_reasoning", "model": "m", "base_url": "http://x"},
            True,
        ),
        (
            {
                "provider": "openai_compatible",
                "model": "m",
                "base_url": "http://x",
                "preserve_reasoning_content": True,
            },
            True,
        ),
        (
            {"provider": "openai_compatible", "model": "m", "base_url": "http://x"},
            False,
        ),
    ],
)
def test_factory_selects_reasoning_client(factory, config, expect_reasoning):
    """开关应正确选择客户端实现，且不得把开关透传为构造参数。"""
    llm = factory.create_llm(dict(config))

    assert getattr(llm, "is_reasoning_cls") is expect_reasoning
    assert "preserve_reasoning_content" not in llm.kwargs
