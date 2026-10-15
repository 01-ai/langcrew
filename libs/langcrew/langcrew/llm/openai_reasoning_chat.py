"""OpenAI 兼容的思考模式（thinking mode）模型适配。

背景
----
部分 OpenAI 兼容网关（如 Flux Gate）在后端接入思考模式模型（例如
``qwen3.5-*``）时，会在响应中返回 ``reasoning_content`` 字段；并且在下一次
请求中**强制要求把历史 assistant 消息的 ``reasoning_content`` 原样回传**，
否则直接返回 400：

    The `reasoning_content` in the thinking mode must be passed back to the API.

而 ``langchain_openai`` 默认行为恰好与之冲突：

1. 入站：响应里的 ``reasoning_content`` / ``reasoning_details`` 不会被提取到
   ``AIMessage``，推理内容直接丢失；
2. 出站：``_convert_message_to_dict`` 只序列化 ``content`` 与 ``tool_calls``，
   不会带上 ``reasoning_content``。

本模块提供 ``ChatOpenAIReasoning``，在保持 ``ChatOpenAI`` 全部行为的前提下补齐
上述两点：

* 入站：把响应中的 ``reasoning_content`` 写入
  ``AIMessage.additional_kwargs["reasoning_content"]``，并提供
  ``content_blocks`` 形式的 ``reasoning`` 块（供前端展示）。
* 出站：在 ``_get_request_payload`` 中把历史 ``AIMessage`` 的
  ``reasoning_content`` 原样写回请求体对应位置。

参照实现：``langcrew.llm.deepseek_chat.ChatDeepSeek``。
"""

import logging
from typing import Any

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI as _ChatOpenAI
from langchain_openai.chat_models.base import (
    _convert_message_to_dict,
    _create_usage_metadata,
)

logger = logging.getLogger(__name__)

# 响应中携带推理内容时可能出现的字段名（不同网关命名不一致，做兼容）
_REASONING_KEYS = ("reasoning_content", "reasoning")


def _extract_reasoning_content(raw_message: dict[str, Any]) -> str:
    """从原始响应 message 中提取推理内容，取不到返回空串。"""
    for key in _REASONING_KEYS:
        value = raw_message.get(key)
        if isinstance(value, str) and value:
            return value
        # 少数网关会返回 [{type: text, text: ...}] 形式
        if isinstance(value, list):
            parts = [
                blk.get("text", "")
                for blk in value
                if isinstance(blk, dict) and blk.get("text")
            ]
            if parts:
                return "".join(parts)
    return ""


def _patch_content_blocks(ai_message: AIMessage, reasoning_content: str) -> AIMessage:
    """把推理内容补进 content_blocks，便于前端以 reasoning 块展示。"""
    if not reasoning_content:
        return ai_message
    try:
        blocks = list(ai_message.content_blocks or [])
    except Exception:  # pragma: no cover - 极端兼容场景
        return ai_message
    already = any(
        isinstance(blk, dict) and blk.get("type") == "reasoning" for blk in blocks
    )
    if not already:
        blocks = [{"type": "reasoning", "reasoning": reasoning_content}] + blocks
    try:
        ai_message.content_blocks = blocks
    except Exception:  # pragma: no cover
        pass
    return ai_message


class ChatOpenAIReasoning(_ChatOpenAI):
    """OpenAI 兼容思考模式模型：保留并回传 ``reasoning_content``。

    用法与 ``ChatOpenAI`` 完全一致，直接替换类名即可：

        llm = ChatOpenAIReasoning(model=..., base_url=..., api_key=...)
    """

    # ------------------------------------------------------------------ 出站
    def _get_request_payload(
        self,
        input_: LanguageModelInput,
        *,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> dict:
        """在标准 payload 基础上，补回历史 assistant 消息的 reasoning_content。"""
        source_messages = self._convert_input(input_).to_messages()
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)
        serialized_messages = payload.get("messages")

        reasoning_by_index = {
            index: reasoning_content
            for index, message in enumerate(source_messages)
            if isinstance(message, AIMessage)
            and (
                reasoning_content := message.additional_kwargs.get("reasoning_content")
            )
        }
        if not reasoning_by_index:
            return payload

        if not isinstance(serialized_messages, list) or len(serialized_messages) != len(
            source_messages
        ):
            # 序列化结果与源消息数量不一致时无法安全对齐，放弃补写（宁可退化也不发错报文）
            logger.warning(
                "[ChatOpenAIReasoning] 消息序列长度不一致（%s vs %s），"
                "跳过 reasoning_content 回填以避免错位。",
                len(serialized_messages) if isinstance(serialized_messages, list) else "N/A",
                len(source_messages),
            )
            return payload

        for index, reasoning_content in reasoning_by_index.items():
            target = serialized_messages[index]
            if isinstance(target, dict) and target.get("role") == "assistant":
                target["reasoning_content"] = reasoning_content

        return payload

    # ------------------------------------------------------------------ 入站
    def _create_chat_result(
        self,
        response: Any,
        generation_info: dict | None = None,
    ):
        """在标准解析结果上，补回 ``reasoning_content``。"""
        result = super()._create_chat_result(response, generation_info)

        response_dict = (
            response
            if isinstance(response, dict)
            else getattr(response, "model_dump", lambda: {})()
        )
        choices = response_dict.get("choices") or []
        for index, generation in enumerate(result.generations):
            if index >= len(choices):
                break
            raw_message = (choices[index].get("message") or {}) if isinstance(
                choices[index], dict
            ) else {}
            reasoning_content = _extract_reasoning_content(raw_message)
            if not reasoning_content:
                continue
            message = generation.message
            if not isinstance(message, AIMessage):
                continue
            message.additional_kwargs["reasoning_content"] = reasoning_content
            _patch_content_blocks(message, reasoning_content)

        return result


__all__ = ["ChatOpenAIReasoning"]
