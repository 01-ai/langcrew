# Message Notify User LangChain Tool
# Provides user notification functionality for sending messages and deliverables

import json
import logging
import os
from typing import Any, ClassVar, Literal

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from langcrew_tools.utils.s3.factory import create_s3_client
from langcrew_tools.utils.sandbox.base_sandbox import SandboxMixin
from langcrew_tools.utils.sandbox.s3_integration import SandboxS3Toolkit

from ..base import BaseToolInput
from .config import MessageConfig, default_config

logger = logging.getLogger(__name__)


class MessageToUserInput(BaseToolInput):
    """Input for MessageToUserTool."""

    text: str = Field(..., description="The message text to send to the user")
    attachments: list[str] | str | None = Field(
        default=None,
        description="List of file paths or URLs to send as attachments (must be absolute paths within sandbox, ordered by importance). Can also be a JSON string containing an array of paths.",
    )
    intent_type: (
        Literal["task_completed", "asking_user", "progress_update", "general"] | None
    ) = Field(
        default="general",
        description="The intent of this message. Use 'task_completed' when task is finished, 'asking_user' when expecting user response, 'progress_update' for status updates, 'general' for other messages",
    )


class MessageToUserTool(BaseTool, SandboxMixin):
    """Tool for sending notifications and messages to users without expecting immediate responses.

    This tool is used for:
    - Acknowledging receipt of user messages
    - Providing task progress updates and milestone reports
    - Delivering attachments (reports, images, code files, charts)
    - Sending task completion reports with final results
    - Responding to follow-up questions after task completion
    - General notifications that don't require immediate user response

    Best practices:
    - Use as primary communication method instead of direct text output
    - Reply immediately to user messages before taking other actions
    - Keep messages informative, avoid asking questions (use message_ask_user for questions)
    - Order attachments by importance/relevance (descending)
    - Use absolute paths for attachments within sandbox
    - Deliver all results before task completion
    """

    name: ClassVar[str] = "message_to_user"
    args_schema: type[BaseModel] = MessageToUserInput
    description: ClassVar[str] = (
        "Send a notification message to the user with optional file attachments. "
        "Used for progress updates, task completion reports, and general notifications. "
        "Does not expect immediate user response unlike user_input."
    )
    config: MessageConfig | None = None

    def __init__(self, config: MessageConfig | None = None, **kwargs):
        """Initialize MessageToUserTool.

        Args:
            config: MessageConfig instance. If None, uses default_config.
            **kwargs: Additional arguments passed to parent class.
        """
        super().__init__(**kwargs)
        self.config = config or default_config

    async def _arun(
        self,
        text: str,
        attachments: list[str] | str | None = None,
        intent_type: str | None = "general",
        **kwargs,
    ) -> dict[str, Any]:
        """Send notification to user synchronously."""
        logger.info(f"Notifying user: {text[:50]}... (intent: {intent_type})")

        # Validate message text using configuration
        if not text or not text.strip():
            logger.warning("Empty message text provided")
            return {"status": "error", "message": "Message text cannot be empty"}

        if attachments:
            # Convert string to list if necessary
            if isinstance(attachments, str):
                try:
                    attachments = json.loads(attachments)
                    if not isinstance(attachments, list):
                        logger.warning("Parsed JSON is not a list")
                        return {
                            "status": "error",
                            "message": "Attachments JSON must contain an array",
                        }
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse attachments JSON: {e}")
                    return {
                        "status": "error",
                        "message": f"Invalid JSON in attachments: {str(e)}",
                    }

            logger.debug(f"Including {len(attachments)} attachments: {attachments}")
            # Validate attachment paths are absolute
            for attachment in attachments:
                if not attachment.startswith("/"):
                    logger.warning(f"Attachment path is not absolute: {attachment}")
                    return {
                        "status": "error",
                        "message": f"Attachment path must be absolute: {attachment}",
                    }
            processed_attachments = []
            original_attachments = attachments or []

            # Upload to S3 if enabled
            if self.config.s3_upload_enabled:
                async_sandbox = await self.get_sandbox()
                s3_prefix = self.config.get_s3_prefix(async_sandbox.sandbox_id)
                async with create_s3_client() as async_s3_client:
                    s3_path_auto = await SandboxS3Toolkit.upload_directory_to_s3(
                        async_sandbox=async_sandbox,
                        dir_path=self.config.sandbox_workspace_path,
                        s3_prefix=s3_prefix,
                        async_s3_client=async_s3_client,
                    )

                # Get filenames from original attachments for comparison
                original_filenames = []
                if original_attachments:
                    original_filenames = [
                        os.path.basename(path) for path in original_attachments
                    ]

                # Generate structured attachment format for all s3_path_auto results
                for file_info in s3_path_auto:
                    # Extract filename from S3 URL or path
                    filename = (
                        os.path.basename(file_info["url"].split("?")[0])
                        if "?" in file_info["url"]
                        else os.path.basename(file_info["url"])
                    )

                    # Determine show_user by comparing filename
                    show_user = 1 if filename in original_filenames else 0

                    # Find original path if exists
                    original_path = ""
                    if show_user == 1 and original_attachments:
                        for orig_path in original_attachments:
                            if os.path.basename(orig_path) == filename:
                                original_path = orig_path
                                break

                    processed_attachments.append({
                        "filename": filename,
                        "path": original_path,
                        "url": file_info["url"],
                        "size": file_info["size"],
                        "content_type": file_info["content_type"],
                        "show_user": show_user,
                    })
            else:
                # S3 upload disabled - return original attachment info without upload
                for attachment_path in original_attachments:
                    filename = os.path.basename(attachment_path)
                    processed_attachments.append({
                        "filename": filename,
                        "path": attachment_path,
                        "url": "",  # No URL since not uploaded
                        "size": 0,  # Unknown size
                        "content_type": "application/octet-stream",  # Generic type
                        "show_user": 1,  # User-specified attachments
                    })

            attachments = processed_attachments
            logger.info(f"Message sent to user: {text}")
            if attachments:
                logger.info(f"Attachments included: {attachments}")

        return {
            "status": "success",
            "text": text,
            "attachments": attachments or [],
            "intent_type": intent_type,  # Include intent type in return value
        }

    def _run(
        self,
        text: str,
        attachments: list[str] | str | None = None,
        intent_type: str | None = "general",
        **kwargs,
    ) -> dict[str, Any]:
        """Send notification to user synchronously."""
        raise NotImplementedError("message_to_user only supports async execution.")
