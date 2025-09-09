import logging
from collections.abc import Callable
from typing import Any

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langmem.short_term.summarization import asummarize_messages


class LangGraphSummaryHook:
    """LangGraph 专用的轻量级摘要 Hook"""
    
    def __init__(
        self,
        llm,
        max_messages: int = 30,  # 修改为30条固定触发
        max_tokens: int = 64000,  # 最大 token 限制（可选检查）
        language: str = "chinese",
    ):
        self.llm = llm
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.language = language

        
        # 初始化提示词
        self._init_prompts()
        self.logger = logging.getLogger(__name__)
    
    def _init_prompts(self):
        """初始化简化的提示词"""
        if self.language == "chinese":
            self.initial_prompt = ChatPromptTemplate.from_messages([
                ("placeholder", "{messages}"),
                ("user", """请按照以下8个结构化段落压缩对话历史：
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
- 下一步行动计划""")
            ])
            
            self.update_prompt = ChatPromptTemplate.from_messages([
                ("placeholder", "{messages}"),
                ("user", """现有摘要：{existing_summary}

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
""")
            ])
        else:
            self.initial_prompt = ChatPromptTemplate.from_messages([
                ("placeholder", "{messages}"),
                ("user", "Please summarize the key points, conclusions, and pending issues from the above conversation:")
            ])
            
            self.update_prompt = ChatPromptTemplate.from_messages([
                ("placeholder", "{messages}"),
                ("user", """Existing summary: {existing_summary}

New conversation content above, please update the summary, retain important info, integrate new content:""")
            ])
    
    def _estimate_tokens(self, messages: list[BaseMessage], running_summary: str = None) -> int:
        """更准确的token估算"""
        try:
            import tiktoken
            # 使用tiktoken进行更准确的计算
            encoding = tiktoken.get_encoding("cl100k_base")
            total_tokens = 0
            
            for msg in messages:
                if hasattr(msg, 'content') and msg.content:
                    total_tokens += len(encoding.encode(str(msg.content)))
            
            if running_summary:
                total_tokens += len(encoding.encode(running_summary))
                
            return total_tokens
        except Exception:
            # 降级到简单估算（乘以1.3系数更接近实际token数）
            total_tokens = sum(len(msg.content.split()) * 1.3 for msg in messages if hasattr(msg, 'content'))
            if running_summary:
                total_tokens += len(running_summary.split()) * 1.3
            return int(total_tokens)
    
    async def summary(self, state: dict[str, Any]) -> dict[str, Any]:
        """异步版本的调用方法"""
        try:
            messages = state.get("messages", [])
            running_summary =   state.get("running_summary")
            
            if not self._should_summarize(messages, running_summary):
                return state
            
            # 异步执行摘要
            new_summary, trimmed_messages = await self._create_summary_async(messages, running_summary)
            
            if new_summary:
                state["messages"] = new_summary
                
                # 创建摘要系统消息
                summary_message = SystemMessage(
                    content=f"[历史对话摘要]\n{new_summary.summary}"
                )
                
                # 将摘要消息添加到消息列表开头，后跟保留的最近消息
                new_messages = [summary_message] + trimmed_messages
                messages = state["messages"]
                messages.clear()
                messages.extend(new_messages)
                self.logger.info(f"异步摘要更新完成，减少到 {len(new_messages)} 条（包含1条摘要消息）")
                return state
                
        except Exception as e:
            self.logger.error(f"异步摘要处理失败: {e}")
        
        return state
    
    def _should_summarize(self, messages: list[BaseMessage], running_summary: str | None) -> bool:
        """判断是否需要摘要 - 支持固定条数模式"""
        # 达到一定的条数固定触发
        if self.max_messages > 0:
            return len(messages) >= self.max_messages
        # 条数没达到、token达到一定数量触发
        total_tokens = self._estimate_tokens(messages, running_summary)
        print(f"total_tokens: {total_tokens}, max_tokens: {self.max_tokens}")
        return total_tokens > self.max_tokens
    
    
    async def _create_summary_async(self, messages: list[BaseMessage], running_summary: str | None) -> tuple:
        """异步创建摘要 - 强制触发版本"""
        try:
            # 检查并跳过现有的摘要消息
            real_messages = messages
            if (messages and 
                isinstance(messages[0], SystemMessage) and 
                messages[0].content.startswith("[历史对话摘要]")):
                # 跳过第一条摘要消息，只处理真实的对话消息
                real_messages = messages[1:]
            
            if not real_messages:
                return None, messages
            
            keep_count = max(4, len(real_messages) // 4)
            messages_to_summarize = real_messages[:-keep_count]
            messages_to_keep = real_messages[-keep_count:]
            
            # 强制触发摘要：设置一个很小的max_tokens_before_summary
            # 这样无论实际token数多少，都会触发摘要
            result = await asummarize_messages(
                messages_to_summarize,
                max_tokens=self.max_tokens,
                max_tokens_before_summary=1,  # 强制触发！设置为1确保一定会摘要
                max_summary_tokens=8192,
                running_summary=running_summary,
                model=self.llm,
                initial_summary_prompt=self.initial_prompt,
                existing_summary_prompt=self.update_prompt,
            )
            
            if hasattr(result, 'running_summary'):
                new_summary = result.running_summary
                return new_summary, messages_to_keep
            else:
                return None, messages
                
        except Exception as e:
            self.logger.error(f"异步摘要创建失败: {e}")
            return None, messages


def create_async_summary_pre_hook(
    llm,
    max_messages: int = 30,  # 固定30条触发
    language: str = "chinese",
    **kwargs
) -> LangGraphSummaryHook:
    """
    创建固定条数触发的摘要 hook
    
    Args:
        llm: 语言模型
        max_messages: 触发摘要的固定消息数量（默认30条）
        language: 语言设置
        **kwargs: 其他配置参数
        
    Returns:
        pre-hook 函数
    """
    hook = LangGraphSummaryHook(
        llm, 
        max_messages=max_messages, 
        language=language, 
        **kwargs
    )
    return hook