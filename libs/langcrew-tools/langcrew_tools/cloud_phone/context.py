import logging
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    RemoveMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.messages.utils import count_tokens_approximately
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langgraph.graph.state import CompiledStateGraph
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
        "final": [
            ("placeholder", "{system_message}"),
            ("user", "Summary of the conversation so far: {summary}"),
            ("placeholder", "{messages}"),
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
        "final": [
            ("placeholder", "{system_message}"),
            ("user", "Summary of the conversation so far: {summary}"),
            ("placeholder", "{messages}"),
        ],
    },
}


class LangGraphSummaryHook:
    """Lightweight summary hook specifically designed for LangGraph"""

    def __init__(
        self,
        base_model: BaseChatModel,
        max_messages_count_before_summary: int = 50, # Fixed trigger at 50 messages
        keep_messages_count: int = 10, # Keep 10, summary（40）+ 10 messages, max_messages_count_before_summary and keep_messages_count  Used to calculate the value of x_tokens_fronte_summary
        max_tokens_before_summary: int = 64000, # max_tokens_before_summary(messages) +  messages + remaining messages <  max_tokens
        max_tokens: int = 180000,  #summary(8192)+ remaining messages < max_tokens
        language: str = "chinese",
    ):
        self.base_model = base_model
        self.max_tokens = max_tokens
        self.max_tokens_before_summary = max_tokens_before_summary
        self.language = language
        self.max_messages_count_before_summary = max_messages_count_before_summary
        self.keep_messages_count = keep_messages_count
        self._init_prompts()
        self.logger = logging.getLogger(__name__)

    def _init_prompts(self):
        """Initialize simplified prompt templates"""
        prompts = SUMMARY_PROMPTS.get(self.language, SUMMARY_PROMPTS["english"])

        self.initial_prompt = ChatPromptTemplate.from_messages(prompts["initial"])
        self.update_prompt = ChatPromptTemplate.from_messages(prompts["update"])
        self.final_prompt = ChatPromptTemplate.from_messages(prompts["final"])

    async def summary(self, state: dict[str, Any]) -> dict[str, Any]:
        """Asynchronous version of the summary method"""
        try:
            messages = state.get("messages", [])
            running_summary = state.get("running_summary")
            if not self._should_summarize(messages):
                return state
            summarization_result = await asummarize_messages(
                messages,
                max_tokens=self.max_tokens,
                max_tokens_before_summary=self.max_tokens_before_summary,  # Force trigger! Set to 1 to ensure summary always happens
                max_summary_tokens=8192,
                running_summary=running_summary,
                model=self.base_model,
                token_counter=count_tokens_approximately,
                initial_summary_prompt=self.initial_prompt,
                existing_summary_prompt=self.update_prompt,
                final_prompt=self.final_prompt,
            )
            if summarization_result.running_summary:
                state["running_summary"] = summarization_result.running_summary
                state["messages"] = [
                    RemoveMessage(REMOVE_ALL_MESSAGES)
                ] + summarization_result.messages
            else:
                return state
        except Exception as e:
            self.logger.error(f"Async summary processing failed: {e}")

        return state

    def _should_summarize(self, messages: list[BaseMessage]) -> bool:
        """Determine whether summarization is needed - supports fixed message count mode"""
        total_tokens = count_tokens_approximately(messages)
        if self.max_messages_count_before_summary > 0:
            if len(messages) >= self.max_messages_count_before_summary and total_tokens < self.max_tokens:
                self.max_tokens_before_summary = count_tokens_approximately(
                    messages[: (self.max_messages_count_before_summary - self.keep_messages_count)]
                ) - 5 
                return True
        print(f"total_tokens: {total_tokens}, max_tokens: {self.max_tokens}")
        return total_tokens > self.max_tokens

# direct summary
async def summarize_history_messages_direct(
    base_model: BaseChatModel, messages: list[BaseMessage], strategy: str = "last"
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
    result = await base_model.ainvoke(messages)
    return result.content
    # agent = create_react_agent(llm, tools=[])

    # silent_config = RunnableConfig(callbacks=[NonStreamingCallbackHandler()])
    # result = await agent.ainvoke({"messages": real_messages}, config=silent_config)
    # return result["messages"][-1].content