"""
Sandbox S3 Toolkit - S3 related operations

This module provides unified S3 operation functions for file upload and management in sandbox environments.
"""

import base64
import hashlib
import logging
import mimetypes
import os
from typing import Any, Final

from e2b import AsyncSandbox

from ..s3 import AsyncS3Client

# S3 Default Address
SANDBOX_S3_ADDRESS: Final[str] = "sandbox/{sandbox_id}/"

logger: logging.Logger = logging.getLogger(__name__)


class SandboxS3Toolkit:
    """Sandbox S3 operation toolkit class"""

    @staticmethod
    def _get_s3_path(sandbox: AsyncSandbox, s3_path: str | None = None) -> str:
        """Generate S3 path"""
        if not s3_path:
            raise ValueError("s3_path is required")
        return SANDBOX_S3_ADDRESS.format(
            sandbox_id=sandbox.sandbox_id
        ) + s3_path.lstrip("/")

    @staticmethod
    async def upload_base64_image(
        async_s3_client: AsyncS3Client, base64_data: str, sandbox_id: str = "empty"
    ) -> str:
        """Upload base64 image to S3"""
        s3_path = SANDBOX_S3_ADDRESS.format(sandbox_id=sandbox_id) + "images"
        data: bytes = base64.b64decode(base64_data)
        md5 = hashlib.md5(base64_data.encode()).hexdigest()
        if await async_s3_client.object_exists(object_key=f"{s3_path}/{md5}.png"):
            return await async_s3_client.generate_object_url(
                object_key=f"{s3_path}/{md5}.png", expires_in=None
            )

        return await async_s3_client.put_object(
            object_key=f"{s3_path}/{md5}.png",
            content=data,
            content_type="image/png",
            expires_in=None,
        )

    @staticmethod
    async def upload_file_to_s3(
        async_sandbox: AsyncSandbox,
        async_s3_client: AsyncS3Client,
        file_path: str | None = None,
        s3_path: str | None = None,
        expires_in: int | None = None,
    ) -> str | None:
        """
        Upload file from sandbox to S3

        Args:
            sandbox: Sandbox instance (AsyncSandbox or SyncSandbox)
            async_s3_client: S3 client instance, use default if None
            file_path: File path in sandbox
            s3_path: Target path in S3
            expires_in: Presigned URL expiration time (seconds), default 2 hours, None means permanent URL

        Returns:
            Optional[str]: S3 file URL if upload succeeds, otherwise None

        Raises:
            ValueError: Raised if required parameters are missing
        """
        if not file_path:
            raise ValueError("file_path is required")
        if not s3_path:
            raise ValueError("s3_path is required")
        result = await SandboxS3Toolkit._internal_upload_file_to_s3(
            async_s3_client,
            file_path,
            SandboxS3Toolkit._get_s3_path(async_s3_client, s3_path),
            async_s3_client,
            expires_in,
        )
        return result["url"] if result else None

    @staticmethod
    async def _internal_upload_file_to_s3(
        async_sandbox: AsyncSandbox,
        file_path: str,
        s3_path: str,
        async_s3_client: AsyncS3Client,
        expires_in: int | None = None,
    ) -> dict[str, Any] | None:
        """Internal method to upload file to S3"""
        try:
            logger.info(f"Uploading file from sandbox: {file_path} -> S3: {s3_path}")

            # Check if file exists in sandbox
            file_exists = await async_sandbox.files.exists(file_path)
            if not file_exists:
                logger.error(f"File not found in sandbox: {file_path}")
                return None

            # Get file size
            result = await async_sandbox.commands.run(f"stat -c %s {file_path}")
            file_size = int(result.stdout.strip()) if result.exit_code == 0 else 0

            # Read file content from sandbox as bytes
            file_content = await async_sandbox.files.read(file_path, format="bytes")

            # Guess MIME type by file extension
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                logger.warning(f"{file_path} content type guess wrong -> {s3_path}")
                content_type = "application/octet-stream"  # Default binary type

            # Upload to S3 and get URL
            url = await async_s3_client.put_object(
                object_key=s3_path,
                content=bytes(file_content),
                content_type=content_type,
                expires_in=expires_in,
            )

            logger.info(
                f"Successfully uploaded {file_path} to S3 as {s3_path}, URL: {url}"
            )
            return {"url": url, "size": file_size, "content_type": content_type}

        except Exception as e:
            logger.error(f"Error uploading file to S3: {e}")
            return None

    @staticmethod
    async def _get_file_list(
        async_sandbox: AsyncSandbox | None, dir_path: str
    ) -> list[str]:
        """Get file list from sandbox or local directory"""
        if async_sandbox is not None:
            # Sandbox file operations
            # Check if directory exists
            result = await async_sandbox.commands.run(f"test -d {dir_path}")
            if result.exit_code != 0:
                raise ValueError(f"Directory not found in sandbox: {dir_path}")

            # Get file list
            result = await async_sandbox.commands.run(f"find {dir_path} -type f")
            if result.exit_code != 0:
                raise ValueError(f"Failed to list files in directory: {dir_path}")

            return result.stdout.strip().split("\n") if result.stdout.strip() else []
        else:
            # Local file operations
            if not os.path.exists(dir_path):
                raise ValueError(f"Directory not found on local server: {dir_path}")

            if not os.path.isdir(dir_path):
                raise ValueError(f"Path is not a directory: {dir_path}")

            # Use os.walk to get file list
            file_list = []
            for root, dirs, files in os.walk(dir_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_list.append(file_path)
            return file_list

    @staticmethod
    async def _upload_files_to_s3(
        sandbox: AsyncSandbox | None,
        file_list: list[str],
        dir_path: str,
        final_s3_path: str,
        async_s3_client: AsyncS3Client,
    ) -> int:
        """Upload all files to S3 and return the count of successful uploads"""
        uploaded_count = 0

        for file_path in file_list:
            # Calculate relative path and S3 key
            relative_path = file_path.replace(dir_path, "").lstrip("/")
            s3_key = f"{final_s3_path.rstrip('/')}/{relative_path}"

            # Upload from sandbox
            try:
                if sandbox is not None:
                    success = await SandboxS3Toolkit._internal_upload_file_to_s3(
                        sandbox, file_path, s3_key, async_s3_client
                    )
                else:
                    # Upload from local server
                    success = await SandboxS3Toolkit._upload_local_file_to_s3(
                        file_path, s3_key, async_s3_client
                    )

                if success:
                    uploaded_count += 1
                    logger.debug(f"Successfully uploaded file: {file_path} -> {s3_key}")
                else:
                    logger.error(f"Failed to upload file: {file_path}")

            except Exception as e:
                logger.error(f"Error uploading file {file_path}: {e}")

        return uploaded_count

    @staticmethod
    async def _upload_local_file_to_s3(
        file_path: str, s3_key: str, async_s3_client: AsyncS3Client
    ) -> bool:
        """
        Upload local file to S3

        Args:
            file_path: Local file path
            s3_key: S3 object key
            async_s3_client: S3 client instance

        Returns:
            bool: True if upload succeeds, otherwise False
        """
        try:
            logger.info(f"Uploading local file: {file_path} -> S3: {s3_key}")

            # Check if local file exists
            if not os.path.exists(file_path):
                logger.error(f"File not found locally: {file_path}")
                return False

            # Read file content
            with open(file_path, "rb") as f:
                file_content = f.read()

            # Guess MIME type by file extension
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = "application/octet-stream"  # Default binary type

            # Upload to S3
            await async_s3_client.put_object(
                object_key=s3_key,
                content=file_content,
                content_type=content_type,
                expires_in=None,
            )

            logger.info(
                f"Successfully uploaded local file {file_path} to S3 as {s3_key}"
            )
            return True

        except Exception as e:
            logger.error(f"Error uploading local file to S3: {e}")
            return False

    @staticmethod
    async def _check_s3_path_exists(
        async_s3_client: AsyncS3Client, s3_path: str
    ) -> bool:
        """
        Check if S3 path exists by listing objects with the path as prefix

        Args:
            async_s3_client: S3 client instance
            s3_path: S3 path to check

        Returns:
            bool: True if path exists (has objects), otherwise False
        """
        try:
            objects = await async_s3_client.list_objects(prefix=s3_path, max_keys=1)
            return len(objects) > 0
        except Exception as e:
            logger.debug(f"Error checking S3 path existence: {e}")
            return False

    @staticmethod
    async def upload_directory_to_s3(
        async_sandbox: AsyncSandbox,
        dir_path: str,
        s3_prefix: str,
        async_s3_client: AsyncS3Client,
        expires_in: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Upload directory from sandbox to S3

        Args:
            sandbox: Sandbox instance (AsyncSandbox or SyncSandbox)
            dir_path: Directory path in sandbox
            s3_prefix: S3 prefix for uploaded files
            async_s3_client: S3 client instance, use default if None
            expires_in: Presigned URL expiration time (seconds), default 2 hours, None means permanent URL

        Returns:
            List[Dict[str, Any]]: List of dictionaries containing file URLs and sizes
        """
        if not dir_path:
            raise ValueError("dir_path is required")
        if not s3_prefix:
            raise ValueError("s3_prefix is required")
    
        s3_prefix = SandboxS3Toolkit._get_s3_path(async_sandbox, s3_prefix)

        try:
            logger.info(
                f"Uploading directory from sandbox: {dir_path} -> S3 prefix: {s3_prefix}"
            )

            # For AsyncSandbox, use async command
            result = await async_sandbox.commands.run(f"find {dir_path} -type f")
            if result.exit_code != 0:
                logger.error(f"Failed to list files in directory: {dir_path}")
                return []
            file_list = (
                result.stdout.strip().split("\n") if result.stdout.strip() else []
            )

            if not file_list:
                logger.warning(f"No files found in directory: {dir_path}")
                return []

            uploaded_files = []
            for file_path in file_list:
                if file_path.startswith("/workspace/upload/"):
                    continue
                # Calculate relative path and S3 key
                relative_path = file_path.replace(dir_path, "").lstrip("/")
                s3_key = f"{s3_prefix.rstrip('/')}/{relative_path}"

                # Upload file
                result = await SandboxS3Toolkit._internal_upload_file_to_s3(
                    async_sandbox, file_path, s3_key, async_s3_client, expires_in
                )
                if result:
                    uploaded_files.append(result)
                    logger.info(
                        f"Successfully uploaded file: {file_path} -> {result['url']}"
                    )
                else:
                    logger.error(f"Failed to upload file: {file_path}")

            logger.info(
                f"Directory upload completed. {len(uploaded_files)} files uploaded successfully."
            )
            return uploaded_files

        except Exception as e:
            logger.error(f"Error uploading directory to S3: {e}")
            return []

    @staticmethod
    async def upload_s3_files_to_sandbox(
        async_sandbox: AsyncSandbox,
        files: list[dict[str, str]],
        client: AsyncS3Client,
        dir_path: str = "/workspace/upload",
    ) -> None:
        """
        Download files from S3 to sandbox using MD5 hashes

        Args:
            sandbox: Sandbox instance (AsyncSandbox or SyncSandbox)
            files: List of MD5 hashes of files uploaded to S3
            dir_path: Directory path in sandbox to save files, defaults to "/workspace/upload"
            async_s3_client: S3 client instance, use default if None

        Returns:
            List[Dict[str, Any]]: List of dictionaries containing file paths and download status

        """
        async with client:
            for f in files:
                key, filename = f["file_md5"], f["filename"]
                try:
                    # Check if object exists in S3
                    if not await client.object_exists(object_key=key):
                        logger.warning(f"S3 object not found for MD5 hash: {key}")
                        continue

                    # Get file content from S3
                    content = await client.read_object_bytes(key)

                    if content is None:
                        logger.warning(f"Failed to read file content: {key}")
                        continue

                    # Write file to sandbox using sync sandbox write method
                    path = f"{dir_path.rstrip('/')}/{filename}"
                    await async_sandbox.files.write(path, content)

                    # Verify file was written successfully
                    if await async_sandbox.files.exists(path):
                        logger.info(f"Successfully sync file: {key} -> {path}")
                    else:
                        logger.error(f"File not found in sandbox: {key}")

                except Exception as e:
                    logger.error(f"Error sync file to sandbox {key}: {e}")

        logger.info(f"sync completed. {len(files)} files sync successfully.")


# Alias for import convenience
sandbox_s3_toolkit = SandboxS3Toolkit
