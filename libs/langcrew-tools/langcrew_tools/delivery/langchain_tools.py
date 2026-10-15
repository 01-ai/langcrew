# Agent Result Delivery Tool
# Specialized tool for delivering final agent results with attachments

import logging
import os
from typing import Any, ClassVar

from pydantic import BaseModel, Field, field_validator

from langcrew_tools.base import SandboxS3ToolMixin
from langcrew_tools.utils.sandbox.s3_integration import SandboxS3Toolkit

logger = logging.getLogger(__name__)


class AgentResultInput(BaseModel):
    """Input for AgentResultDeliveryTool."""

    attachments: list[str] = Field(
        ...,
        description="List of absolute file paths within sandbox to send as attachments, ordered by importance (highest first).",
    )

    @field_validator("attachments", mode="before")
    @classmethod
    def convert_str_to_list(cls, v):
        """Convert string to list if provided as string."""
        if isinstance(v, str):
            return [v]
        return v


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
    description: str = """Use this tool to deliver final results to the user when the task is complete and produces deliverables.

Users can only see attachments after delivery.

When to Use:
- Call this tool only when deliverables (e.g., files, images, reports) are ready.
- It should be the last action after all processing is complete.
- If no deliverables are produced, this tool should not be called.
- For documents requiring accessible links: deliver the file first, then links will be auto-generated, Links are only valid AFTER delivery through this tool

How to Use:
- Always attach all relevant files (users cannot access the sandbox directly).
- Order attachments by importance (highest first).

Notes:
- Attachments must use absolute sandbox paths and can be provided as a list or JSON array.
- Empty attachments are not allowed.
"""

    def __init__(self, **kwargs):
        """Initialize AgentResultDeliveryTool."""
        super().__init__(**kwargs)

    async def _arun(
        self,
        attachments: list[str],
    ) -> dict[str, Any]:
        """Deliver agent results to user."""
        logger.info("Delivering agent results with attachments")

        try:
            # Validate inputs
            if not attachments:
                logger.warning("No attachments provided")
                return {"status": "error", "message": "Attachments cannot be empty"}

            if attachments:
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

                # Get sandbox and S3 client
                async_sandbox = await self.get_sandbox()
                async_s3_client = await self.get_s3_client()
                sandbox_id = async_sandbox.sandbox_id

                # Upload only the specified attachment files (not the entire directory)
                logger.info(
                    f"Uploading {len(original_attachments)} specified attachment files"
                )

                for attachment_path in original_attachments:
                    try:
                        # Generate S3 key for this file
                        relative_path = attachment_path.removeprefix("/workspace/")
                        s3_key = (
                            f"sandbox/{sandbox_id}/user_attachments/{relative_path}"
                        )

                        # Upload single file to S3
                        file_info = await SandboxS3Toolkit._internal_upload_file_to_s3(
                            sandbox=async_sandbox,
                            file_path=attachment_path,
                            s3_path=s3_key,
                            async_s3_client=async_s3_client,
                        )

                        if file_info:
                            filename = os.path.basename(attachment_path)
                            processed_attachments.append({
                                "filename": filename,
                                "path": attachment_path,
                                "url": file_info["url"],
                                "size": file_info["size"],
                                "content_type": file_info["content_type"],
                                "show_user": 1,  # All specified attachments should be shown to user
                            })
                            logger.info(
                                f"Successfully uploaded attachment: {attachment_path}"
                            )
                        else:
                            logger.error(
                                f"Failed to upload attachment: {attachment_path}"
                            )

                    except Exception as e:
                        logger.error(
                            f"Error uploading attachment {attachment_path}: {e}"
                        )
                        # Continue with other files even if one fails

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
        attachments: list[str],
    ) -> dict[str, Any]:
        """Perform document parsing synchronously."""
        raise NotImplementedError(
            "agent_result_delivery only supports async execution."
        )
