# Agent Result Delivery Tool
# Specialized tool for delivering final agent results with attachments

import json
import logging
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from langcrew_tools.base import SandboxS3ToolMixin
from langcrew_tools.utils.sandbox.s3_integration import SandboxS3Toolkit

logger = logging.getLogger(__name__)


class AgentResultInput(BaseModel):
    """Input for AgentResultDeliveryTool."""

    attachments: list[str] | str = Field(
        ...,
        description="List of file paths or URLs to send as attachments (must be absolute paths within sandbox, ordered by importance). Can also be a JSON string containing an array of paths.",
    )


class AgentResultDeliveryTool(SandboxS3ToolMixin):
    """Tool specifically designed for delivering final agent results with attachments.

    This tool is used exclusively for:
    - Delivering attachments that represent the completed work
    - Packaging all result artifacts for user review
    - Ensuring all critical deliverables are included

    Best practices:
    - Only use when agent task is fully complete
    - When calling this tool, first provide a summary of the completed work
    - Organize attachments in order of importance
    - Use absolute paths for attachments within sandbox
    - Ensure all deliverables are properly formatted and accessible
    """

    name: ClassVar[str] = "agent_result_delivery"
    args_schema: type[BaseModel] = AgentResultInput
    description: ClassVar[str] = (
        "FINAL DELIVERY TOOL: Must be called when all user tasks are complete. "
        "This is the MANDATORY final step in the task execution flow. "
        "Include a concise summary of completed work and all relevant attachments. "
        "Task execution is considered INCOMPLETE and FAILED if this tool is not called."
    )

    def __init__(self, **kwargs):
        """Initialize AgentResultDeliveryTool."""
        super().__init__(**kwargs)

    async def _arun(
        self,
        attachments: list[str] | str,
    ) -> dict[str, Any]:
        """Deliver agent results to user."""
        logger.info("Delivering agent results with attachments")

        # Validate inputs
        if not attachments:
            logger.warning("No attachments provided")
            return {"status": "error", "message": "Attachments cannot be empty"}

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

            # Always upload to S3 to get full file list
            s3_path_auto = await SandboxS3Toolkit.upload_directory_to_s3(
                async_sandbox=await self.get_sandbox(),
                dir_path="/workspace",
                s3_prefix="user_attachments",
                async_s3_client=await self.get_s3_client(),
            )

            # Get filenames from original attachments for comparison
            original_filenames = []
            if original_attachments:
                import os

                original_filenames = [
                    os.path.basename(path) for path in original_attachments
                ]

            # Generate structured attachment format for all s3_path_auto results
            for file_info in s3_path_auto:
                import os

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

            attachments = processed_attachments
            logger.info("Results delivered to user")
            if attachments:
                logger.info(f"Attachments included: {attachments}")

        return {"attachments": attachments}

    def _run(
        self,
        attachments: list[str] | str,
    ) -> dict[str, Any]:
        """Perform document parsing synchronously."""
        raise NotImplementedError(
            "agent_result_delivery only supports async execution."
        )
