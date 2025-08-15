"""
Web Chat Crew Definition

This module defines the chat agent and tasks for the web chat API.
"""

import os
from langcrew import Agent, Crew, Task
from langcrew.llm_factory import LLMFactory
from langcrew.web import ToolDisplayManager
from .tools import get_chat_tools


class WebChatCrew:
    """Web Chat Crew for interactive conversations with tool support"""

    def __init__(self):
        self.tools = get_chat_tools()
        self.llm = self._create_llm()
        self._setup_tool_display()

    def _create_llm(self):
        """Create LLM instance based on available API keys"""
        # Check available API keys and create appropriate LLM
        if os.getenv("OPENAI_API_KEY"):
            config = {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "max_tokens": 4096,
            }
        elif os.getenv("ANTHROPIC_API_KEY"):
            config = {
                "provider": "anthropic",
                "model": "claude-3-haiku-20240307",
                "max_tokens": 4096,
            }
        elif os.getenv("DASHSCOPE_API_KEY"):
            config = {
                "provider": "dashscope",
                "model": "qwen-plus",
                "max_tokens": 4096,
            }
        else:
            raise ValueError(
                "No API keys found in environment. Please set one of: "
                "OPENAI_API_KEY, ANTHROPIC_API_KEY, or DASHSCOPE_API_KEY"
            )

        return LLMFactory.create_llm(config)

    def chat_agent(self) -> Agent:
        """Create chat agent with comprehensive tool support"""
        return Agent(
            role="Helpful AI Assistant",
            goal="Provide helpful, accurate, and engaging responses to user queries while utilizing available tools when appropriate",
            backstory="""You are a knowledgeable and friendly AI assistant with access to various tools.
            
            Your capabilities include:
            • Answering questions on a wide range of topics
            • Performing mathematical calculations using the calculator tool
            • Searching for current information using web search
            • Providing weather information for any city
            • Getting time and timezone information for different locations
            • Requesting additional information from users when needed (user_input tool)
            • Having natural, engaging conversations
            
            Tool Usage Guidelines:
            • calculator: For mathematical expressions and calculations
            • web_search: For current events, news, or information you might not have
            • weather_info: For weather queries (ask for city if not provided)
            • current_time: For time and timezone information
            • user_input: When you genuinely need clarification or additional information from the user
            
            When to use user_input tool:
            - When a request is genuinely ambiguous and you cannot provide a helpful response
            - When you need specific details that are critical for accurate results
            - When confirming potentially sensitive or important actions
            
            Guidelines:
            - Always be helpful, clear, and concise in your responses
            - Use tools when they can provide more accurate or current information
            - For simple clarifications, you can ask directly in your response
            - Use the user_input tool only when interactive input is truly necessary
            - Explain what you're doing when using tools to keep users informed
            - Maintain context across the conversation
            - Be conversational and friendly while remaining professional
            """,
            tools=self.tools,
            llm=self.llm,  # Add LLM configuration
            verbose=True,
            # allow_delegation=False,  # Not supported in langcrew
            # max_iter=5,  # Will be handled by executor configuration
            # max_execution_time=30,  # Will be handled by executor configuration
        )

    def chat_task(self) -> Task:
        """Create chat task for processing user messages"""
        return Task(
            description="""Process and respond to the user's message in a helpful and engaging way.

            User message: {user_input}

            Instructions:
            1. **Understand the request**: Carefully analyze what the user is asking or saying
            2. **Determine if tools are needed**: 
               - Use calculator for mathematical expressions
               - Use web_search for current events, news, or information you might not have
               - Use weather tool for weather-related queries
               - Use timezone tool for time-related queries about specific locations
               - Use user_input tool when you need clarification, additional information, or confirmation from the user
            3. **Provide clear responses**: Give helpful, accurate, and well-structured answers
            4. **Be conversational**: Maintain a friendly and engaging tone
            5. **Explain tool usage**: When using tools, briefly explain what you're doing
            6. **Handle errors gracefully**: If a tool fails, acknowledge it and provide alternative help
            7. **Ask for clarification when needed**: If the user's request is ambiguous or you need more information, use the user_input tool to ask for clarification

            Context: This is part of an ongoing conversation, so maintain continuity and reference previous messages when relevant.
            """,
            expected_output="A helpful, engaging, and contextually appropriate response to the user's message, utilizing tools when beneficial, including asking for user input when clarification is needed",
            agent=self.chat_agent(),
        )

    def crew(self) -> Crew:
        """Create and configure the crew"""
        return Crew(
            agents=[self.chat_agent()],
            tasks=[self.chat_task()],
            # process=Process.sequential,  # Default in langcrew
            verbose=True,
            memory=True,  # Enable conversation memory for context
            # max_rpm=10,  # Rate limiting will be handled differently in langcrew
        )

    def _setup_tool_display(self):
        """Configure tool display settings for web frontend"""

        # Common tools configuration with parameter extraction
        common_tools = [
            # Browser tools
            {
                "name": "browser-use",
                "display_names": {"zh": "使用浏览器", "en": "Using browser"},
            },
            # Search tools
            {
                "name": "web_search",
                "display_names": {"zh": "正在搜索", "en": "Searching"},
                "display_content_param": "query",
            },
            {
                "name": "web_fetch",
                "display_names": {"zh": "正在抓取", "en": "Fetching"},
                "display_content_param": "url",
            },
            {
                "name": "knowledge_search",
                "display_names": {"zh": "搜索知识库", "en": "Searching knowledge base"},
                "display_content_param": "query",
            },
            # File tools - 包含所有 filesystem 工具
            {
                "name": "write_file",
                "display_names": {"zh": "写入文件", "en": "Writing file"},
                "display_content_param": "path",
            },
            {
                "name": "write_multiple_files",
                "display_names": {"zh": "批量写入文件", "en": "Writing multiple files"},
            },
            {
                "name": "read_file",
                "display_names": {"zh": "读取文件", "en": "Reading file"},
                "display_content_param": "path",
            },
            {
                "name": "file_read_text",
                "display_names": {"zh": "读取文本文件", "en": "Reading text file"},
                "display_content_param": "path",
            },
            {
                "name": "list_files",
                "display_names": {"zh": "列出文件", "en": "Listing files"},
                "display_content_param": "path",
            },
            {
                "name": "delete_file",
                "display_names": {"zh": "删除文件", "en": "Deleting file"},
                "display_content_param": "path",
            },
            {
                "name": "file_replace_text",
                "display_names": {"zh": "替换文本", "en": "Replacing text"},
                "display_content_param": "path",
            },
            {
                "name": "file_append_text",
                "display_names": {"zh": "追加文本", "en": "Appending text"},
                "display_content_param": "path",
            },
            {
                "name": "create_directory",
                "display_names": {"zh": "创建目录", "en": "Creating directory"},
                "display_content_param": "path",
            },
            {
                "name": "file_exists",
                "display_names": {
                    "zh": "检查文件存在",
                    "en": "Checking file existence",
                },
                "display_content_param": "path",
            },
            {
                "name": "rename_file",
                "display_names": {"zh": "重命名文件", "en": "Renaming file"},
                "display_content_param": "path",
            },
            {
                "name": "file_parser",
                "display_names": {"zh": "解析文件", "en": "Parsing file"},
                "display_content_param": "path",
            },
            {
                "name": "chunk_retrieval",
                "display_names": {"zh": "检索文档", "en": "Retrieving documents"},
                "display_content_param": "query",
            },
            # Code tools
            {
                "name": "python_executor",
                "display_names": {"zh": "执行代码", "en": "Executing code"},
                "display_content_param": "command",
            },
            {
                "name": "code_interpreter",
                "display_names": {"zh": "执行代码", "en": "Executing code"},
            },
            {
                "name": "run_command",
                "display_names": {"zh": "执行命令", "en": "Running command"},
                "display_content_param": "command",
            },
            # Cloud phone tools
            {
                "name": "phone_tap",
                "display_names": {"zh": "点击屏幕", "en": "Tapping screen"},
            },
            {
                "name": "phone_tap_coordinates",
                "display_names": {"zh": "点击坐标", "en": "Tapping coordinates"},
            },
            {
                "name": "phone_swipe",
                "display_names": {"zh": "滑动屏幕", "en": "Swiping screen"},
            },
            {
                "name": "phone_input_text",
                "display_names": {"zh": "输入文本", "en": "Inputting text"},
                "display_content_param": "text",
            },
            {
                "name": "phone_press_key",
                "display_names": {"zh": "按下按键", "en": "Pressing key"},
            },
            {
                "name": "phone_clear_text",
                "display_names": {"zh": "清除文本", "en": "Clearing text"},
            },
            {
                "name": "phone_start_app",
                "display_names": {"zh": "启动应用", "en": "Starting app"},
                "display_content_param": "package",
            },
            {
                "name": "phone_list_packages",
                "display_names": {"zh": "列出应用", "en": "Listing apps"},
            },
            {
                "name": "phone_enter",
                "display_names": {"zh": "按下回车键", "en": "Pressing enter"},
            },
            {
                "name": "phone_switch_app",
                "display_names": {"zh": "切换应用", "en": "Switching app"},
            },
            {
                "name": "phone_back",
                "display_names": {"zh": "返回上一级", "en": "Going back"},
            },
            {
                "name": "phone_home",
                "display_names": {"zh": "回到主页", "en": "Going home"},
            },
            {"name": "phone_wait", "display_names": {"zh": "等待", "en": "Waiting"}},
            {
                "name": "phone_tap_input_and_enter",
                "display_names": {
                    "zh": "输入文本并按回车",
                    "en": "Tapping input and enter",
                },
                "display_content_param": "text",
            },
            {
                "name": "phone_task_screenshot",
                "display_names": {"zh": "截图", "en": "Taking screenshot"},
            },
            {
                "name": "phone_get_clickables",
                "display_names": {
                    "zh": "获取可点击元素",
                    "en": "Getting clickable elements",
                },
            },
            # HITL tools
            {
                "name": "user_input",
                "display_names": {"zh": "等待用户输入", "en": "Waiting for user input"},
            },
            {
                "name": "request_approval",
                "display_names": {
                    "zh": "等待用户同意",
                    "en": "Waiting for user approval",
                },
            },
            # Image tools
            {
                "name": "image_generation",
                "display_names": {"zh": "生成图片", "en": "Generating image"},
            },
            {
                "name": "image_parser",
                "display_names": {"zh": "解析图片", "en": "Parsing image"},
            },
            # Communication tools
            {
                "name": "send_sms",
                "display_names": {"zh": "发送短信", "en": "Sending SMS"},
            },
            # Business tools
            {
                "name": "company_search",
                "display_names": {"zh": "企业模糊查询", "en": "Searching companies"},
            },
            {
                "name": "get_company_info",
                "display_names": {
                    "zh": "企业详细信息查询",
                    "en": "Querying company information",
                },
            },
            {
                "name": "company_risk_scan",
                "display_names": {"zh": "企业风险查询", "en": "Scanning company risks"},
            },
            {
                "name": "company_park_lease_query",
                "display_names": {"zh": "查询CRM", "en": "Querying CRM"},
            },
            {
                "name": "companies_by_lease_status_query",
                "display_names": {
                    "zh": "按租赁状态查询企业",
                    "en": "Querying companies by lease status",
                },
            },
        ]

        # Web chat specific tools
        web_chat_tools = [
            {
                "name": "calculator",
                "display_names": {"zh": "正在计算", "en": "Calculating"},
                "display_content_param": "expression",
            },
            {
                "name": "current_time",
                "display_names": {"zh": "获取时间", "en": "Getting time"},
            },
            {
                "name": "random_number",
                "display_names": {"zh": "生成随机数", "en": "Generating random number"},
            },
            {
                "name": "weather_info",
                "display_names": {"zh": "查询天气", "en": "Checking weather"},
                "display_content_param": "city",
            },
            {
                "name": "joke_generator",
                "display_names": {"zh": "生成笑话", "en": "Generating joke"},
            },
            {
                "name": "text_analyzer",
                "display_names": {"zh": "分析文本", "en": "Analyzing text"},
                "display_content_param": "text",
            },
            {
                "name": "unit_converter",
                "display_names": {"zh": "单位转换", "en": "Converting units"},
            },
        ]

        # Register all tools using the new batch method
        ToolDisplayManager.register_batch(common_tools + web_chat_tools)

        print("✅ Tool display configuration completed for web chat example")
