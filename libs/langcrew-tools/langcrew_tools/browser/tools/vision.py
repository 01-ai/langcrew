"""
Vision analysis tool for browser automation

This tool allows AI to capture and analyze page screenshots when visual information is needed.
It's designed to be called on-demand rather than automatically injected.

The tool internally calls a vision-capable LLM to analyze the screenshot and returns the analysis result.
"""

import base64
import logging

from langchain_core.callbacks import AsyncCallbackManagerForToolRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field, SkipValidation

from .base import CDPBrowserTool

logger = logging.getLogger(__name__)


class BrowserVisualAnalysisInput(BaseModel):
    """Input schema for visual analysis"""

    question: str = Field(
        description="What do you want to know about the page visually? "
        "Examples: 'What does the page look like?', 'Is there a CAPTCHA?', "
        "'Where is the login button visually?', 'Describe the layout'"
    )
    full_page: bool = Field(
        default=False,
        description="Whether to capture full page screenshot (default: viewport only)",
    )


class BrowserVisualAnalysisTool(CDPBrowserTool):
    """
    Tool for visual analysis of current page using AI vision

    This tool captures a screenshot, sends it to a vision-capable LLM, and returns the analysis result.

    Use this when:
    - You need to understand visual layout or design
    - You need to identify CAPTCHA or images
    - Element selectors are ambiguous and you need visual confirmation
    - You want to verify page state visually
    - You need to analyze charts, graphs, or images

    Examples:
    - "Is there a CAPTCHA on this page?"
    - "Describe the visual layout of the navigation bar"
    - "What color is the 'Submit' button?"
    - "Are there any modal dialogs visible?"
    """

    name: str = "browser_vision"
    description: str = (
        "Capture and analyze a screenshot of the current page using AI vision. "
        "Use this tool when you need to understand visual aspects that aren't clear from the DOM structure. "
        "For example: CAPTCHA detection, visual layout, element positions, colors, or images. "
        "Returns the AI's analysis of what it sees in the screenshot. "
        "This tool uses tokens for vision analysis (~1500 tokens per call), so use it only when visual information is truly needed."
    )
    args_schema: type[BaseModel] = BrowserVisualAnalysisInput

    vision_llm: SkipValidation[BaseChatModel] = Field(
        ...,
        description="Vision-capable LLM for analyzing screenshots (e.g., GPT-4V, Claude 3.5, Gemini Pro Vision)",
    )

    async def _arun(
        self,
        question: str,
        full_page: bool = False,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """
        Capture screenshot and analyze it using vision LLM

        Args:
            question: What you want to know about the page visually
            full_page: Whether to capture full page (default: viewport only)
            run_manager: Optional callback manager

        Returns:
            JSON with the AI's analysis of the screenshot
        """
        try:
            page = await self._get_page()

            # Get page info
            url = page.url
            title = await page.title()

            logger.info(f"📸 Capturing screenshot for visual analysis: {question}")

            # Capture screenshot and upload to S3
            screenshot_bytes = await page.screenshot(type="png", full_page=full_page)
            screenshot = base64.b64encode(screenshot_bytes).decode("utf-8")
            screenshot_url = await self._upload_screenshot_to_s3(screenshot)
            if not screenshot_url:
                logger.error("Failed to capture and upload screenshot")
                # return self._error_response("Failed to capture screenshot for analysis")
            analysis_prompt = (
                f"You are analyzing a screenshot of a web page to answer a specific question.\n\n"
                f"**Question**: {question}\n\n"
                f"**Context**:\n"
                f"- URL: {url}\n"
                f"- Page Title: {title}\n"
                f"- Screenshot Type: {'Full page (scrolled)' if full_page else 'Current viewport only'}\n\n"
                f"**Instructions**:\n"
                f"1. Carefully examine the screenshot\n"
                f"2. Answer the question based on what you see\n"
                f"3. Be specific and provide details\n"
                f"4. If you can't find what's asked, clearly say so\n\n"
                f"**Your analysis**:"
            )
            model = None
            if hasattr(self.vision_llm, "model"):
                model = self.vision_llm.model

            # Create multimodal message with text + image
            # Use base64 format for Claude/Bedrock models, URL format for others
            if model and any(
                keyword in model
                for keyword in ["anthropic_bedrock", "bedrock", "claude"]
            ):
                vision_message = HumanMessage(
                    content=[
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": screenshot,
                            },
                        },
                        {"type": "text", "text": analysis_prompt},
                    ]
                )
            else:
                vision_message = HumanMessage(
                    content=[
                        {"type": "text", "text": analysis_prompt},
                        {
                            "type": "image",
                            "url": screenshot_url,
                        },
                    ]
                )
            # Call vision LLM
            llm_response = await self.vision_llm.ainvoke([vision_message])
            analysis_result = llm_response.content

            logger.info(f"Vision analysis completed: {len(analysis_result)} chars")

            # Return analysis result
            result = {
                "url": url,
                "title": title,
                "question": question,
                "analysis": analysis_result,
            }

            # Return result and artifact (artifact contains image_url)
            artifact = {"image_url": screenshot_url}
            return result, artifact

        except Exception as e:
            logger.error(f"Visual analysis error: {e}", exc_info=True)
            return self._error_response(f"Failed to perform visual analysis: {str(e)}")


# =============================================================================
# Screenshot Tool (moved from extract_content.py)
# =============================================================================


class BrowserScreenshotInput(BaseModel):
    """Input schema for screenshot tool"""

    full_page: bool = Field(
        default=False,
        description="If True, capture the full page (scrolling screenshot). If False, capture only the visible viewport.",
    )


class BrowserScreenshotTool(CDPBrowserTool):
    """
    Tool for taking screenshots of the current page

    Screenshots are useful for debugging, visual verification, and providing context to the LLM.
    """

    name: str = "browser_screenshot"
    description: str = (
        "Take a screenshot of the current page. "
        "Returns a screenshot URL (uploaded to S3). "
        "If full_page=True, captures the entire page (scrolling). "
        "If full_page=False (default), captures only the visible viewport. "
        "Use this for debugging, visual verification, or providing visual context."
    )
    args_schema: type[BaseModel] = BrowserScreenshotInput

    async def _arun(
        self,
        full_page: bool = False,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Take a screenshot"""
        try:
            page = await self._get_page()
            logger.info(f"Taking {'full page' if full_page else 'viewport'} screenshot")

            # Get browser state
            state = await self._get_browser_state(page)

            result = {
                "url": state.get("url", ""),
                "title": state.get("title", ""),
                "full_page": full_page,
            }

            screenshot_url = await self._capture_screenshot(
                page, include_screenshot=True, full_page=full_page
            )

            result["screenshot_url"] = screenshot_url
            logger.info("Screenshot captured successfully")
            return result, {"image_url": screenshot_url}

        except Exception as e:
            logger.error(f"Screenshot error: {e}")
            return self._error_response(f"Failed to take screenshot: {str(e)}")
