"""
CDP-based Browser Tools and Agent for LangChain

This package provides browser automation tools and an LLM-driven agent
using Playwright to connect to Chrome via CDP.

Quick Start:
    1. Use tools: from insight_crew.browser import get_browser_tools
    2. Use agent: from insight_crew.browser import BrowserStreamingTool

Features:
    - LLM-driven browser automation agent
    - Playwright-powered browser automation via CDP
    - CSS selector-based element interaction (industry standard)
    - Multi-tab support
    - Async-native with LangChain compatibility
    - Automatic local browser management or remote browser connection

Browser Modes:
    Local Browser (cdp_url=None):
        - Automatically launches a local Chrome instance
        - Automatically cleans up browser when done
        - No manual setup required
    
    Remote Browser (cdp_url provided):
        - Connects to an existing Chrome instance
        - Browser remains running after task completion
        - Start Chrome with: chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
"""

from langchain.chat_models import BaseChatModel
from langchain.tools import BaseTool

from langcrew_tools.browser.tools.interaction import UserTakeOverTool

from .agent_as_tool import BrowserStreamingTool
from .cdp.browser_manager import CDPBrowserManager
from .tools import (
    BrowserClickTool,
    BrowserCloseTabTool,
    BrowserExecuteJSTool,
    BrowserGetElementsTool,
    BrowserGoBackTool,
    BrowserInputTextTool,
    BrowserListTabsTool,
    BrowserNavigateTool,
    BrowserPressKeysTool,
    BrowserScreenshotTool,
    BrowserSwitchTabTool,
    BrowserVisualAnalysisTool,
    BrowserWaitTool,
    ExtractHyperlinksTool,
    ExtractTextTool,
    ScrollTool,
)

__all__ = [
    "BrowserStreamingTool",  # Full browser agent
    "get_browser_tools",  # Factory function
    "CDPBrowserManager",  # Manager
]


def get_browser_tools(
    cdp_url: str | None = None,
    vision_llm: BaseChatModel | None = None,
    session_id: str = "default",
    sandbox_id: str | None = None,
    use_local_browser: bool = False,
) -> list[BaseTool]:
    """
    Get all browser tools using CDP

    This factory function creates a complete set of browser tools that use
    Playwright to connect to Chrome via CDP.

    Args:
        cdp_url: Chrome DevTools Protocol URL (optional)
            - If None: Tools will work with automatically launched local browser
            - If provided (e.g., "http://localhost:9222"): Tools connect to remote browser
        vision_llm: Vision-capable LLM for visual analysis (optional)
        session_id: Session ID for element index mapping (default: "default")
        sandbox_id: Sandbox ID for screenshot upload (optional)
        use_local_browser: If True, no screenshot will be returned (default: False)

    Returns:
        List of LangChain BaseTool instances ready for use with agents

    Example (Local Browser - Auto Launch):
        from langchain.agents import initialize_agent
        from langchain_openai import ChatOpenAI
        from insight_crew.browser import get_browser_tools

        # Tools will use automatically launched local browser
        tools = get_browser_tools()  # or get_browser_tools(cdp_url=None)

        llm = ChatOpenAI(model="gpt-4")
        agent = initialize_agent(tools, llm, agent="zero-shot-react-description")

        result = agent.run("Go to google.com and search for 'AI news'")

    Example (Remote Browser):
        # Start Chrome manually first:
        # chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

        # Connect to remote browser
        tools = get_browser_tools(cdp_url="http://localhost:9222")

        llm = ChatOpenAI(model="gpt-4")
        agent = initialize_agent(tools, llm, agent="zero-shot-react-description")

        result = agent.run("Go to github.com")
    """
    return [
        # Navigation tools (3个)
        BrowserNavigateTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        BrowserGoBackTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        BrowserWaitTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        # Inspection tools (1个)
        BrowserGetElementsTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        # Interaction tools (4个)
        BrowserClickTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),  # 🆕 传入 session_id
        BrowserInputTextTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        BrowserPressKeysTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        UserTakeOverTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),

        # Scroll (1个)
        ScrollTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        # Tab management tools (3个)
        BrowserSwitchTabTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        BrowserCloseTabTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        BrowserListTabsTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),

        # Content extraction tools (2个)
        ExtractTextTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
        ExtractHyperlinksTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),

        # Screenshot (1个) - 保留备用
        BrowserScreenshotTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),

        # Vision Analysis (1)
        BrowserVisualAnalysisTool(cdp_url=cdp_url, vision_llm=vision_llm, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),

        # Advanced tools (1个) - 可实现其他功能
        BrowserExecuteJSTool(cdp_url=cdp_url, session_id=session_id, sandbox_id=sandbox_id, use_local_browser=use_local_browser),
    ]
