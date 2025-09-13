import logging
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.prompts import ChatPromptTemplate
from langmem.short_term.summarization import asummarize_messages

# Prompt templates configuration
SUMMARY_PROMPTS = {
    "chinese": {
        "initial": [
            ("placeholder", "{messages}"),
            (
                "user",
                """请按照以下8个结构化段落压缩对话历史：
1. 用户指令 (User Instruction)
- 用户的指令和当前状态
2. 关键决策 (Key Decisions)
- 重要的技术选择和原因
- 问题解决方案的选择
3. 工具使用记录 (Tool Usage Log)
- 主要使用的工具类型
- 文件操作历史
- 命令执行结果
4. 用户意图演进 (User Intent Evolution)
- 需求的变化过程
- 新增功能需求
5. 执行结果汇总 (Execution Results)
- 成功完成的任务
- 生成的重要的中间结果信息
6. 错误与解决 (Errors and Solutions)
- 遇到的问题类型
- 错误处理方法
- 经验教训
7. todo 列表 (TODO)
-  已经制定的工作计划以及计划的进度和状态
   eg: 
   1. 任务A [done]
   2. 任务B [running]
   3. 任务C [pending]
8. 后续计划 (Future Plans)
- 下一步行动计划""",
            ),
        ],
        "update": [
            ("placeholder", "{messages}"),
            (
                "user",
                """现有摘要：{existing_summary}

新对话内容如上，请更新摘要，保留重要信息，整合新内容：
请按照以下8个结构化段落压缩对话历史
1. 用户指令 (User Instruction)
- 用户的指令和当前状态
2. 关键决策 (Key Decisions)
- 重要的技术选择和原因
- 问题解决方案的选择
3. 工具使用记录 (Tool Usage Log)
- 主要使用的工具类型
- 文件操作历史
- 命令执行结果
4. 用户意图演进 (User Intent Evolution)
- 需求的变化过程
- 新增功能需求
5. 执行结果汇总 (Execution Results)
- 成功完成的任务
- 生成的重要的中间结果信息
6. 错误与解决 (Errors and Solutions)
- 遇到的问题类型
- 错误处理方法
- 经验教训
7. todo 列表 (TODO)
-  已经制定的工作计划以及计划的进度和状态
   eg: 
   1. 任务A [done]
   2. 任务B [running]
   3. 任务C [pending]
8. 后续计划 (Future Plans)
- 下一步行动计划
""",
            ),
        ],
    },
    "english": {
        "initial": [
            ("placeholder", "{messages}"),
            (
                "user",
                """Please summarize the conversation history according to the following 8 structured sections:
1. User Instructions
- User's commands and current status
- Primary objectives and requirements
2. Key Decisions
- Important technical choices and rationales
- Problem-solving approach selections
- Architecture and design decisions
3. Tool Usage Log
- Main tool types utilized
- File operation history
- Command execution results
- API calls and responses
4. User Intent Evolution
- Requirement change process
- New feature requests
- Scope modifications
5. Execution Results Summary
- Successfully completed tasks
- Generated important intermediate results
- Deliverables and outcomes
6. Errors and Solutions
- Types of issues encountered
- Error handling methods
- Lessons learned and workarounds
7. TODO List
- Established work plans with progress and status
   Format example:
   1. Task A [completed]
   2. Task B [in_progress]
   3. Task C [pending]
8. Future Plans
- Next action items
- Upcoming milestones
- Strategic directions""",
            ),
        ],
        "update": [
            ("placeholder", "{messages}"),
            (
                "user",
                """Existing summary: {existing_summary}

New conversation content above. Please update the summary, retain important information, and integrate new content:
Please follow the 8 structured sections to compress conversation history:
1. User Instructions
- User's commands and current status
- Primary objectives and requirements
2. Key Decisions
- Important technical choices and rationales
- Problem-solving approach selections
- Architecture and design decisions
3. Tool Usage Log
- Main tool types utilized
- File operation history
- Command execution results
- API calls and responses
4. User Intent Evolution
- Requirement change process
- New feature requests
- Scope modifications
5. Execution Results Summary
- Successfully completed tasks
- Generated important intermediate results
- Deliverables and outcomes
6. Errors and Solutions
- Types of issues encountered
- Error handling methods
- Lessons learned and workarounds
7. TODO List
- Established work plans with progress and status
   Format example:
   1. Task A [completed]
   2. Task B [in_progress]
   3. Task C [pending]
8. Future Plans
- Next action items
- Upcoming milestones
- Strategic directions
""",
            ),
        ],
    },
}


class LangGraphSummaryHook:
    """Lightweight summary hook specifically designed for LangGraph"""

    def __init__(
        self,
        llm,
        max_messages: int = 30,  # Fixed trigger at 30 messages
        max_tokens: int = 64000,  # Maximum token limit (optional check)
        language: str = "chinese",
    ):
        self.llm = llm
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.language = language
        self._init_prompts()
        self.logger = logging.getLogger(__name__)

    def _init_prompts(self):
        """Initialize simplified prompt templates"""
        prompts = SUMMARY_PROMPTS.get(self.language, SUMMARY_PROMPTS["english"])

        self.initial_prompt = ChatPromptTemplate.from_messages(prompts["initial"])
        self.update_prompt = ChatPromptTemplate.from_messages(prompts["update"])

    def _estimate_tokens(
        self, messages: list[BaseMessage], running_summary: str = None
    ) -> int:
        """More accurate token estimation"""
        try:
            import tiktoken

            # Use tiktoken for more accurate calculation
            encoding = tiktoken.get_encoding("cl100k_base")
            total_tokens = 0

            for msg in messages:
                if hasattr(msg, "content") and msg.content:
                    total_tokens += len(encoding.encode(str(msg.content)))

            if running_summary:
                total_tokens += len(encoding.encode(running_summary))

            return total_tokens
        except Exception:
            # Fallback to simple estimation (multiply by 1.3 coefficient to get closer to actual token count)
            total_tokens = sum(
                len(msg.content.split()) * 1.3
                for msg in messages
                if hasattr(msg, "content")
            )
            if running_summary:
                total_tokens += len(running_summary.split()) * 1.3
            return int(total_tokens)

    async def summary(self, state: dict[str, Any]) -> dict[str, Any]:
        """Asynchronous version of the summary method"""
        try:
            messages = state.get("messages", [])
            running_summary = state.get("running_summary")

            if not self._should_summarize(messages, running_summary):
                return state

            # Execute summary asynchronously
            new_summary, trimmed_messages = await self._create_summary_async(
                messages, running_summary
            )

            if new_summary:
                state["messages"] = new_summary

                # Create summary system message
                summary_prefix = (
                    "[历史对话摘要]"
                    if self.language == "chinese"
                    else "[Historical Conversation Summary]"
                )
                summary_message = HumanMessage(
                    content=f"{summary_prefix}\n{new_summary.summary}"
                )

                # Add summary message to the beginning of message list, followed by retained recent messages
                new_messages = [summary_message] + trimmed_messages
                messages = state["messages"]
                messages.clear()
                messages.extend(new_messages)
                self.logger.info(
                    f"Async summary update completed, reduced to {len(new_messages)} messages (including 1 summary message)"
                )
                return state

        except Exception as e:
            self.logger.error(f"Async summary processing failed: {e}")

        return state

    def _should_summarize(
        self, messages: list[BaseMessage], running_summary: str | None
    ) -> bool:
        """Determine whether summarization is needed - supports fixed message count mode"""
        # Trigger when reaching a certain number of messages
        if self.max_messages > 0:
            return len(messages) >= self.max_messages
        # If message count not reached, trigger when token count reaches threshold
        total_tokens = self._estimate_tokens(messages, running_summary)
        print(f"total_tokens: {total_tokens}, max_tokens: {self.max_tokens}")
        return total_tokens > self.max_tokens

    async def _create_summary_async(
        self, messages: list[BaseMessage], running_summary: str | None
    ) -> tuple:
        """Create summary asynchronously - forced trigger version"""
        try:
            # Check and skip existing summary messages
            real_messages = messages
            if (
                messages
                and isinstance(messages[0], HumanMessage)
                and (
                    messages[0].content.startswith("[Historical Conversation Summary]")
                    or messages[0].content.startswith("[历史对话摘要]")
                )
            ):
                # Skip the first summary message, only process real conversation messages
                real_messages = messages[1:]

            if not real_messages:
                return None, messages

            keep_count = max(4, len(real_messages) // 4)

            # 确保起始消息是AI message，如果倒数第keep_count个不是，就往前找
            start_index = len(real_messages) - keep_count
            while start_index > 0 and not isinstance(
                real_messages[start_index], AIMessage
            ):
                start_index -= 1

            messages_to_summarize = real_messages[:start_index]
            messages_to_keep = real_messages[start_index:]

            # Force trigger summary: set a very small max_tokens_before_summary
            # This ensures summary will be triggered regardless of actual token count
            result = await asummarize_messages(
                messages_to_summarize,
                max_tokens=self.max_tokens,
                max_tokens_before_summary=1,  # Force trigger! Set to 1 to ensure summary always happens
                max_summary_tokens=8192,
                running_summary=running_summary,
                model=self.llm,
                initial_summary_prompt=self.initial_prompt,
                existing_summary_prompt=self.update_prompt,
            )

            if hasattr(result, "running_summary"):
                new_summary = result.running_summary
                return new_summary, messages_to_keep
            else:
                return None, messages

        except Exception as e:
            self.logger.error(f"Async summary creation failed: {e}")
            return None, messages


def create_async_summary_pre_hook(
    llm,
    max_messages: int = 30,  # Fixed trigger at 30 messages
    language: str = "chinese",
    **kwargs,
) -> LangGraphSummaryHook:
    """
    Create a summary hook with fixed message count trigger

    Args:
        llm: Language model
        max_messages: Fixed message count to trigger summary (default 30 messages)
        language: Language setting
        **kwargs: Other configuration parameters

    Returns:
        pre-hook instance
    """
    hook = LangGraphSummaryHook(
        llm, max_messages=max_messages, language=language, **kwargs
    )
    return hook

async def summarize_history_messages(
    llm: BaseChatModel, messages: list[BaseMessage], strategy: str = "last"
) -> str:
    if strategy == "last":
        recent_count = 20
        if len(messages) > recent_count:
            messages = messages[-recent_count:]
        result_parts = []
        for i, msg in enumerate(messages):
            if isinstance(msg, HumanMessage):
                result_parts.append(f"User: {msg.content}")
            elif isinstance(msg, AIMessage):
                result_parts.append(f"AI Assistant: {msg.content}")
            elif isinstance(msg, ToolMessage):
                result_parts.append(f"Tool Result: {msg.content}")
        return "\n\n".join(result_parts)
    
    # strategy summary
    if isinstance(messages[-1], AIMessage) and len(messages[-1].tool_calls) > 0:
        messages.append(
            ToolMessage(
                content="Please summarize the task history",
                tool_call_id=messages[-1].tool_calls[0]["id"],
            )
        )
    
    real_messages = [
        SystemMessage(
            content="""## Role 角色
A super-intelligent agent that responds based only on provided information.
Generate structured execution reports based on task history for the main Agent's subsequent decision-making.

## Task Description 任务说明
Combine user tasks and execution history to extract final answers.

## Core Requirements 核心要求
- No hallucinations - must be based on context only
- Must be factual and evidence-based
    """
        ),
    ]
    real_messages.extend(messages)
    real_messages.append(
        HumanMessage(
            content="""
## Report Structure 报告结构
Please provide a summary based on the historical records, including:

1. Execution Log 执行日志
   - Main tool types used 主要使用的工具类型
   - File operation history 文件操作历史  
   - Command execution results 命令执行结果

2. Current Cloud Phone and Task Status 当前云手机和任务执行情况
   - Current cloud phone status 当前云手机的状态
   - Current task execution status 当前任务的执行状态
   - Encountered exceptions or errors 遇到的异常或错误

3. User Intent Evolution 用户意图演进
   - Process of requirement changes 需求的变化过程
   - New feature requirements 新增功能需求

4. Execution Results 输出结果数据
   - Current task execution result information 当前任务的执行结果信息"""
        )
    )
    result = await llm.ainvoke(messages)
    return result.content
    # agent = create_react_agent(llm, tools=[])

    # silent_config = RunnableConfig(callbacks=[NonStreamingCallbackHandler()])
    # result = await agent.ainvoke({"messages": real_messages}, config=silent_config)
    # return result["messages"][-1].content
