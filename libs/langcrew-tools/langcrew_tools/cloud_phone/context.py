import logging
from collections.abc import Callable
from typing import Any

from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate
from langmem.short_term.summarization import asummarize_messages


class LangGraphSummaryHook:
    """LangGraph 专用的轻量级摘要 Hook"""
    
    def __init__(
        self,
        llm,
        max_messages: int = 15,  # 触发摘要的消息数量
        max_tokens: int = 50000,  # 最大 token 限制
        summary_key: str = "running_summary",  # 状态中存储摘要的键
        messages_key: str = "messages",  # 状态中消息的键
        language: str = "chinese",
        max_history: int = 5  # 最多保存的摘要历史数量
    ):
        self.llm = llm
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.summary_key = summary_key
        self.messages_key = messages_key
        self.language = language
        self.max_history = max_history
        
        # 摘要历史追踪
        self.summary_history = []
        
        # 初始化提示词
        self._init_prompts()
        self.logger = logging.getLogger(__name__)
    
    def _init_prompts(self):
        """初始化简化的提示词"""
        if self.language == "chinese":
            self.initial_prompt = ChatPromptTemplate.from_messages([
                ("placeholder", "{messages}"),
                ("user", """请按照以下8个结构化段落压缩对话历史：
1. 背景上下文 (Background Context)
- 项目类型和技术栈
- 当前工作目录和环境
- 用户的总体目标
2. 关键决策 (Key Decisions)
- 重要的技术选择和原因
- 架构决策和设计考虑
- 问题解决方案的选择
3. 工具使用记录 (Tool Usage Log)
- 主要使用的工具类型
- 文件操作历史
- 命令执行结果
4. 用户意图演进 (User Intent Evolution)
- 需求的变化过程
- 优先级调整
- 新增功能需求
5. 执行结果汇总 (Execution Results)
- 成功完成的任务
- 生成的代码和文件
- 验证和测试结果
6. 错误与解决 (Errors and Solutions)
- 遇到的问题类型
- 错误处理方法
- 经验教训
7. 未解决问题 (Open Issues)
- 当前待解决的问题
- 已知的限制和约束
- 需要后续处理的事项
8. 后续计划 (Future Plans)
- 下一步行动计划
- 长期目标规划
- 用户期望的功能""")
            ])
            
            self.update_prompt = ChatPromptTemplate.from_messages([
                ("placeholder", "{messages}"),
                ("user", """现有摘要：{existing_summary}

新对话内容如上，请更新摘要，保留重要信息，整合新内容：
请按照以下8个结构化段落压缩对话历史
1. 背景上下文 (Background Context)
- 项目类型和技术栈
- 当前工作目录和环境
- 用户的总体目标
2. 关键决策 (Key Decisions)
- 重要的技术选择和原因
- 架构决策和设计考虑
- 问题解决方案的选择
3. 工具使用记录 (Tool Usage Log)
- 主要使用的工具类型
- 文件操作历史
- 命令执行结果
4. 用户意图演进 (User Intent Evolution)
- 需求的变化过程
- 优先级调整
- 新增功能需求
5. 执行结果汇总 (Execution Results)
- 成功完成的任务
- 生成的代码和文件
- 验证和测试结果
6. 错误与解决 (Errors and Solutions)
- 遇到的问题类型
- 错误处理方法
- 经验教训
7. 未解决问题 (Open Issues)
- 当前待解决的问题
- 已知的限制和约束
- 需要后续处理的事项
8. 后续计划 (Future Plans)
- 下一步行动计划
- 长期目标规划
- 用户期望的功能
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
    
    
    async def __call_async__(self, state: dict[str, Any]) -> dict[str, Any]:
        """异步版本的调用方法"""
        try:
            messages = state.get(self.messages_key, [])
            running_summary = state.get(self.summary_key)
            
            if not self._should_summarize(messages, running_summary):
                return state
            
            # 异步执行摘要
            new_summary, trimmed_messages = await self._create_summary_async(messages, running_summary)
            
            if new_summary:
                new_state = state.copy()
                new_state[self.summary_key] = new_summary
                new_state[self.messages_key] = trimmed_messages
                
                self.logger.info(f"异步摘要更新完成，消息从 {len(messages)} 条减少到 {len(trimmed_messages)} 条")
                return new_state
                
        except Exception as e:
            self.logger.error(f"异步摘要处理失败: {e}")
        
        return state
    
    def _should_summarize(self, messages: list[BaseMessage], running_summary: str | None) -> bool:
        """判断是否需要摘要"""
        if len(messages) < self.max_messages:
            return False
        
        # 使用优化的token估算
        total_tokens = self._estimate_tokens(messages, running_summary)
        return total_tokens > self.max_tokens
    
    async def _create_summary_async(self, messages: list[BaseMessage], running_summary: str | None) -> tuple:
        """异步创建摘要"""
        try:
            keep_count = max(3, len(messages) // 3)
            messages_to_summarize = messages[:-keep_count]
            messages_to_keep = messages[-keep_count:]
            
            result = await asummarize_messages(
                messages_to_summarize,
                max_tokens=self.max_tokens,
                max_summary_tokens=8192,
                running_summary=running_summary,
                model=self.llm,
                initial_summary_prompt=self.initial_prompt,
                existing_summary_prompt=self.update_prompt,
            )
            
            if hasattr(result, 'summary'):
                new_summary = result.summary
                return new_summary, messages_to_keep
            else:
                return running_summary, messages
                
        except Exception as e:
            self.logger.error(f"异步摘要创建失败: {e}")
            return running_summary, messages

def create_summary_pre_hook(
    llm,
    max_messages: int = 15,
    language: str = "chinese",
    **kwargs
) -> Callable:
    """
    创建用于 LangGraph 的摘要 pre-hook 函数
    
    Args:
        llm: 语言模型
        max_messages: 触发摘要的消息数量
        language: 语言设置
        **kwargs: 其他配置参数
        
    Returns:
        pre-hook 函数
    """
    hook = LangGraphSummaryHook(llm, max_messages, language=language, **kwargs)
    return hook


def create_async_summary_pre_hook(
    llm,
    max_messages: int = 10,
    language: str = "chinese",
    **kwargs
) -> Callable:
    """
    创建用于 LangGraph 的异步摘要 pre-hook 函数
    """
    hook = LangGraphSummaryHook(llm, max_messages, language=language, **kwargs)
    return hook.__call_async__


# 使用示例
def example_usage():
    """使用示例"""
    from langchain_openai import ChatOpenAI
    
    llm = ChatOpenAI(model="gpt-4o-mini")
    summary_hook = create_summary_pre_hook(llm)
    
    def my_node_with_summary(state):
        state = summary_hook(state)  # 在节点开始前调用
        # ... 节点逻辑
        return state  # 返回更新后的状态
    
    # 异步使用示例
    async def my_async_node_with_summary(state):
        async_hook = create_async_summary_pre_hook(llm)
        state = await async_hook(state)
        # ... 异步节点逻辑
        return state  # 返回更新后的状态
    
    print("LangGraph 摘要 Hook 集成示例完成")


# 配置建议
RECOMMENDED_CONFIGS = {
    "light": {
        "max_messages": 20,
        "max_tokens": 3000,
        "language": "chinese"
    },
    "balanced": {
        "max_messages": 15,
        "max_tokens": 4000,
        "language": "chinese"
    },
    "aggressive": {
        "max_messages": 10,
        "max_tokens": 2500,
        "language": "chinese"
    }
}

def get_recommended_config(mode: str = "balanced") -> dict:
    """获取推荐配置"""
    return RECOMMENDED_CONFIGS.get(mode, RECOMMENDED_CONFIGS["balanced"])


if __name__ == "__main__":
    example_usage()




# import logging
# from collections.abc import Callable
# from typing import Any

# from langchain_core.messages import BaseMessage, SystemMessage
# from langchain_core.prompts import ChatPromptTemplate
# from langgraph.graph import StateGraph
# from langmem.short_term import summarize_messages


# class LangGraphSummaryHook:
#     """LangGraph 专用的轻量级摘要 Hook"""
    
#     def __init__(
#         self,
#         llm,
#         max_messages: int = 15,  # 触发摘要的消息数量
#         max_tokens: int = 4000,  # 最大 token 限制
#         summary_key: str = "running_summary",  # 状态中存储摘要的键
#         messages_key: str = "messages",  # 状态中消息的键
#         language: str = "chinese"
#     ):
#         self.llm = llm
#         self.max_messages = max_messages
#         self.max_tokens = max_tokens
#         self.summary_key = summary_key
#         self.messages_key = messages_key
#         self.language = language
        
#         # 初始化提示词
#         self._init_prompts()
#         self.logger = logging.getLogger(__name__)
    
#     def _init_prompts(self):
#         """初始化简化的提示词"""
#         if self.language == "chinese":
#             self.initial_prompt = ChatPromptTemplate.from_messages([
#                 ("placeholder", "{messages}"),
#                 ("user", "请简洁总结上述对话的要点、结论和待解决问题：")
#             ])
            
#             self.update_prompt = ChatPromptTemplate.from_messages([
#                 ("placeholder", "{messages}"),
#                 ("user", """现有摘要：{existing_summary}

# 新对话内容如上，请更新摘要，保留重要信息，整合新内容：""")
#             ])
#         else:
#             self.initial_prompt = ChatPromptTemplate.from_messages([
#                 ("placeholder", "{messages}"),
#                 ("user", "Please summarize the key points, conclusions, and pending issues from the above conversation:")
#             ])
            
#             self.update_prompt = ChatPromptTemplate.from_messages([
#                 ("placeholder", "{messages}"),
#                 ("user", """Existing summary: {existing_summary}

# New conversation content above, please update the summary, retain important info, integrate new content:""")
#             ])
    
#     def __call__(self, state: dict[str, Any]) -> dict[str, Any]:
#         """
#         作为 pre-hook 被调用的主方法
        
#         Args:
#             state: LangGraph 的状态字典
            
#         Returns:
#             更新后的状态字典
#         """
#         try:
#             messages = state.get(self.messages_key, [])
#             running_summary = state.get(self.summary_key)
            
#             # 检查是否需要摘要
#             if not self._should_summarize(messages, running_summary):
#                 return state
            
#             # 执行摘要
#             new_summary, trimmed_messages = self._create_summary(messages, running_summary)
            
#             if new_summary:
#                 # 更新状态
#                 new_state = state.copy()
#                 new_state[self.summary_key] = new_summary
#                 new_state[self.messages_key] = trimmed_messages
                
#                 self.logger.info(f"摘要更新完成，消息从 {len(messages)} 条减少到 {len(trimmed_messages)} 条")
#                 return new_state
            
#         except Exception as e:
#             self.logger.error(f"摘要处理失败: {e}")
        
#         return state
    
#     def _should_summarize(self, messages: list[BaseMessage], running_summary: str | None) -> bool:
#         """判断是否需要摘要"""
#         if len(messages) < self.max_messages:
#             return False
        
#         # 简化的 token 估算
#         total_tokens = sum(len(msg.content.split()) for msg in messages if hasattr(msg, 'content'))
#         if running_summary:
#             total_tokens += len(running_summary.split())
        
#         return total_tokens > self.max_tokens
    
#     def _create_summary(self, messages: list[BaseMessage], running_summary: str | None) -> tuple:
#         """创建摘要并返回精简的消息列表"""
#         try:
#             # 确定要摘要的消息数量（保留最近的1/3消息）
#             keep_count = max(3, len(messages) // 3)
#             messages_to_summarize = messages[:-keep_count]
#             messages_to_keep = messages[-keep_count:]
            
#             # 调用摘要函数
#             result = summarize_messages(
#                 messages_to_summarize,
#                 max_tokens=self.max_tokens,
#                 max_summary_tokens=1000,
#                 running_summary=running_summary,
#                 model=self.llm,
#                 initial_summary_prompt=self.initial_prompt,
#                 existing_summary_prompt=self.update_prompt,
#             )
            
#             # 提取摘要
#             if hasattr(result, 'summary'):
#                 return result.summary, messages_to_keep
#             else:
#                 return running_summary, messages
                
#         except Exception as e:
#             self.logger.error(f"摘要创建失败: {e}")
#             return running_summary, messages


# def create_summary_pre_hook(
#     llm,
#     max_messages: int = 15,
#     language: str = "chinese",
#     **kwargs
# ) -> Callable:
#     """
#     创建用于 LangGraph 的摘要 pre-hook 函数
    
#     Args:
#         llm: 语言模型
#         max_messages: 触发摘要的消息数量
#         language: 语言设置
#         **kwargs: 其他配置参数
        
#     Returns:
#         pre-hook 函数
#     """
#     hook = LangGraphSummaryHook(llm, max_messages, language=language, **kwargs)
#     return hook


# # 使用示例
# def example_usage():
#     """使用示例"""
    
#     llm = YourLLM()
#     summary_hook = create_summary_pre_hook(llm)
    
#     def my_node_with_summary(state):
#         state = summary_hook(state)  # 在节点开始前调用
#         # ... 节点逻辑
#         return updated_state
    
#     print("LangGraph 摘要 Hook 集成示例完成")


# # 配置建议
# RECOMMENDED_CONFIGS = {
#     "light": {
#         "max_messages": 20,
#         "max_tokens": 3000,
#         "language": "chinese"
#     },
#     "balanced": {
#         "max_messages": 15,
#         "max_tokens": 4000,
#         "language": "chinese"
#     },
#     "aggressive": {
#         "max_messages": 10,
#         "max_tokens": 2500,
#         "language": "chinese"
#     }
# }

# def get_recommended_config(mode: str = "balanced") -> dict:
#     """获取推荐配置"""
#     return RECOMMENDED_CONFIGS.get(mode, RECOMMENDED_CONFIGS["balanced"])


# if __name__ == "__main__":
#     example_usage()



# # from langchain_core.prompts import ChatPromptTemplate
# # from langmem.short_term import summarize_messages

# # CUSTOM_INITIAL_SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
# #     ("placeholder", "{messages}"),
# #     ("user", """
# # 请为上述对话创建一个结构化摘要，包含以下内容：
# # 1. 主要讨论话题
# # 2. 关键决策或结论
# # 3. 待解决的问题
# # 4. 重要的技术细节

# # 请用简洁的中文总结：
# #     """),
# # ])

# # CUSTOM_EXISTING_SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
# #     ("placeholder", "{messages}"),
# #     ("user", """
# # 现有摘要：
# # {existing_summary}

# # 新的对话内容如上所示。请按以下要求更新摘要：
# # - 保留重要的历史信息
# # - 整合新的讨论内容
# # - 如果有冲突信息，请标明最新观点
# # - 保持摘要简洁但完整

# # 更新后的摘要：
# #     """),
# # ])


# # # FINAL_SUMMARY_PROMPT - 用于最终格式化摘要
# # FINAL_SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
# #     ("user", """
# # 请将以下摘要内容重新组织成标准化格式：

# # {summary}

# # 请按照以下结构输出：

# # ## 📋 对话摘要

# # ### 🎯 核心话题
# # [主要讨论的话题和背景]

# # ### ✅ 关键结论
# # [重要的决策、结论或达成的共识]

# # ### ❓ 待解决问题
# # [仍需进一步讨论或解决的问题]

# # ### 🔧 技术要点
# # [重要的技术细节、配置信息或实现方案]

# # ### 📝 后续行动
# # [建议的下一步行动或需要关注的事项]

# # ---
# # *摘要生成时间: {timestamp}*

# # 请确保输出格式规范、内容简洁且易于阅读。
# #     """),
# # ])



# # res = summarize_messages(
# #     messages,
# #     max_tokens=5000,
# #     max_summary_tokens=2000,
# #     running_summary=self.running_summary,
# #     model=llm,
# #     # 使用自定义提示词
# #     initial_summary_prompt=CUSTOM_INITIAL_SUMMARY_PROMPT,
# #     existing_summary_prompt=CUSTOM_EXISTING_SUMMARY_PROMPT,
# #     final_prompt=FINAL_SUMMARY_PROMPT,
# # )
