# Agent Result Delivery Tool
# Specialized tool for delivering final agent results with attachments

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
    description: ClassVar[
        str
    ] = """Use this tool to deliver final results to the user when the task is complete and produces deliverables.

Users can only see attachments after delivery.

When to Use:
- Call this tool only when deliverables (e.g., files, images, reports) are ready.
- It should be the last action after all processing is complete.
- If no deliverables are produced, this tool should not be called.
- For documents requiring accessible links: deliver the file first, then links will be auto-generated, Links are only valid AFTER delivery through this tool

How to Use:
- Always attach all relevant files (users cannot access the sandbox directly).
- Order attachments by importance (highest first).
- If delivering images, use the image_url from the generation tool.

Notes:
- Attachments must use absolute sandbox paths and can be provided as a list or JSON array.
- Empty attachments are not allowed.
"""

    def __init__(self, **kwargs):
        """Initialize AgentResultDeliveryTool."""
        super().__init__(**kwargs)

    async def _arun(
        self,
        attachments: list[str] | str,
    ) -> dict[str, Any]:
        """Deliver agent results to user."""
        logger.info("Delivering agent results with attachments")

        try:
            # Validate inputs
            if not attachments:
                logger.warning("No attachments provided")
                return {"status": "error", "message": "Attachments cannot be empty"}

            if attachments:
                # Convert string to list if necessary
                if isinstance(attachments, str):
                    attachments = [attachments]

                logger.info(f"Including {len(attachments)} attachments: {attachments}")
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

                logger.info("Results delivered to user")
                if processed_attachments:
                    logger.info(f"Attachments included: {processed_attachments}")

                return {"attachments": processed_attachments}

            return {"attachments": []}

        except Exception as e:
            logger.error(f"Failed to deliver agent results: {str(e)}", exc_info=True)
            return {
                "message": f"Failed to deliver results: {str(e)}",
            }

    def _run(
        self,
        attachments: list[str] | str,
    ) -> dict[str, Any]:
        """Perform document parsing synchronously."""
        raise NotImplementedError(
            "agent_result_delivery only supports async execution."
        )