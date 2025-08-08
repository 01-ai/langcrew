import asyncio
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiobotocore.session
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)


@dataclass
class S3ObjectInfo:
    """S3 object information"""

    key: str
    size: int
    last_modified: str
    etag: str
    storage_class: str


@dataclass
class S3Config:
    """S3 client configuration"""

    endpoint: str
    bucket: str
    access_key: str
    secret_key: str
    gateway: str
    region: str | None = None
    use_ssl: bool = True
    timeout: int = 30
    max_retries: int = 1
    retry_delay: float = 1.0


class S3ClientError(Exception):
    """Custom S3 client error"""

    def __init__(self, message: str, original_error: Exception | None = None):
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


class AsyncS3Client:
    """
    Advanced async S3 client using aiobotocore

    Features:
    - Automatic connection management
    - Built-in retry mechanism
    - Comprehensive error handling
    - Type-safe operations
    - Proper resource cleanup
    - Auto bucket creation
    """

    def __init__(self, config: S3Config | dict[str, Any]):
        """
        Initialize S3 client

        Args:
            config: S3 configuration object or dictionary
        """
        if isinstance(config, dict):
            self.config = S3Config(**config)
        else:
            self.config = config

        self.session = aiobotocore.session.get_session()
        self._client_context = None
        self._client = None
        self._is_closed = False

        logger.info(f"Initialized S3 client for endpoint: {self.config.endpoint}")

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()

    async def _ensure_client(self):
        """
        Ensure S3 client is initialized and ready

        Returns:
            Initialized S3 client

        Raises:
            S3ClientError: If client initialization fails
        """
        if self._is_closed:
            raise S3ClientError("Client has been closed")

        if self._client_context is None:
            try:
                self._client_context = self.session.create_client(
                    "s3",
                    region_name=self.config.region,
                    aws_access_key_id=self.config.access_key,
                    aws_secret_access_key=self.config.secret_key,
                    endpoint_url=self.config.endpoint,
                    use_ssl=self.config.use_ssl,
                    config=Config(
                        retries={"max_attempts": 0},  # We handle retries ourselves
                        read_timeout=self.config.timeout,
                        connect_timeout=self.config.timeout,
                    ),
                )
                self._client = await self._client_context.__aenter__()
                logger.debug("S3 client connection established")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                raise S3ClientError(f"Failed to initialize S3 client: {e}", e)

        return self._client

    async def _retry_operation(self, operation, *args, **kwargs):
        """
        Execute operation with retry mechanism

        Args:
            operation: Function to execute
            *args: Arguments for the operation
            **kwargs: Keyword arguments for the operation

        Returns:
            Operation result

        Raises:
            S3ClientError: If all retries fail
        """
        last_error = None

        for attempt in range(self.config.max_retries + 1):
            try:
                return await operation(*args, **kwargs)
            except (ClientError, BotoCoreError) as e:
                last_error = e
                if attempt < self.config.max_retries:
                    delay = self.config.retry_delay * (
                        2**attempt
                    )  # Exponential backoff
                    logger.warning(
                        f"Operation failed (attempt {attempt + 1}), retrying in {delay}s: {e}"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Operation failed after {self.config.max_retries + 1} attempts: {e}"
                    )

        raise S3ClientError(
            f"Operation failed after {self.config.max_retries + 1} attempts", last_error
        )

    async def _handle_bucket_not_found(self, operation, *args, **kwargs):
        """
        Handle bucket not found error by creating bucket and retrying

        Args:
            operation: Function to execute
            *args: Arguments for the operation
            **kwargs: Keyword arguments for the operation

        Returns:
            Operation result
        """
        try:
            return await operation(*args, **kwargs)
        except ClientError as e:
            if "NoSuchBucket" in str(e):
                logger.warning(
                    f"Bucket '{self.config.bucket}' does not exist, creating..."
                )
                await self.create_bucket(self.config.bucket)
                return await operation(*args, **kwargs)
            else:
                raise

    # ========== Bucket Operations ==========

    async def list_buckets(self) -> list[dict[str, Any]]:
        """
        List all available buckets

        Returns:
            List of bucket information

        Raises:
            S3ClientError: If operation fails
        """

        async def _list_buckets():
            client = await self._ensure_client()
            response = await client.list_buckets()
            return response.get("Buckets", [])

        return await self._retry_operation(_list_buckets)

    async def create_bucket(self, bucket_name: str | None = None) -> bool:
        """
        Create a new bucket with CORS configuration

        Args:
            bucket_name: Name of bucket to create, defaults to configured bucket

        Returns:
            True if bucket was created successfully

        Raises:
            S3ClientError: If bucket creation fails
        """
        bucket_name = bucket_name or self.config.bucket

        async def _create_bucket():
            client = await self._ensure_client()
            logger.info(f"Creating bucket: {bucket_name}")

            # Create bucket
            await client.create_bucket(Bucket=bucket_name)

            # Set CORS configuration
            await self._set_cors_configuration(bucket_name)

            logger.info(f"Successfully created bucket: {bucket_name}")
            return True

        return await self._retry_operation(_create_bucket)

    async def bucket_exists(self, bucket_name: str | None = None) -> bool:
        """
        Check if bucket exists

        Args:
            bucket_name: Name of bucket to check, defaults to configured bucket

        Returns:
            True if bucket exists, False otherwise
        """
        bucket_name = bucket_name or self.config.bucket

        try:
            client = await self._ensure_client()
            await client.head_bucket(Bucket=bucket_name)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            else:
                raise S3ClientError(f"Error checking bucket existence: {e}", e)

    async def _set_cors_configuration(self, bucket_name: str) -> None:
        """Set CORS configuration for bucket"""
        cors_configuration = {
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": ["*"],
                    "ExposeHeaders": ["*"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        }

        client = await self._ensure_client()
        await client.put_bucket_cors(
            Bucket=bucket_name, CORSConfiguration=cors_configuration
        )
        logger.debug(f"CORS configuration set for bucket: {bucket_name}")

    async def put_object(
        self,
        object_key: str,
        content: str | bytes,
        content_type: str = "text/plain",
        metadata: dict[str, str] | None = None,
        bucket_name: str | None = None,
        expires_in: int | None = 7200,
    ) -> str:
        """
        Put object content directly to S3

        Args:
            object_key: S3 object key
            content: Object content (string or bytes)
            content_type: MIME content type
            metadata: Optional metadata dictionary
            bucket_name: Bucket name, defaults to configured bucket
            expires_in: Presigned URL expiration time in seconds (default: 2 hours, None for permanent URL)

        Returns:
            URL for accessing the uploaded object (presigned if expires_in provided, permanent if None)

        Raises:
            S3ClientError: If upload fails
        """
        bucket_name = bucket_name or self.config.bucket

        if isinstance(content, str):
            content = content.encode("utf-8")

        async def _put_object():
            client = await self._ensure_client()
            put_args = {
                "Bucket": bucket_name,
                "Key": object_key,
                "Body": content,
                "ContentType": content_type,
                "ContentDisposition": "inline",
            }

            if metadata:
                put_args["Metadata"] = metadata

            # Set ACL for public read access when expires_in is None
            if expires_in is None:
                put_args["ACL"] = "public-read"

            await client.put_object(**put_args)
            logger.info(f"Put object to {bucket_name}:{object_key}")

            # Generate URL for the uploaded object
            url = await self.generate_object_url(
                object_key=object_key, expires_in=expires_in, bucket_name=bucket_name
            )

            return url

        return await self._retry_operation(self._handle_bucket_not_found, _put_object)

    async def put_json_object(
        self,
        object_key: str,
        data: dict[str, Any],
        bucket_name: str | None = None,
        expires_in: int | None = 7200,
    ) -> str:
        """
        Put JSON data as S3 object

        Args:
            object_key: S3 object key
            data: JSON serializable data
            bucket_name: Bucket name, defaults to configured bucket
            expires_in: Presigned URL expiration time in seconds (default: 2 hours, None for permanent URL)

        Returns:
            URL for accessing the uploaded JSON object (presigned if expires_in provided, permanent if None)
        """
        json_content = json.dumps(data, indent=2, ensure_ascii=False)
        return await self.put_object(
            object_key=object_key,
            content=json_content,
            content_type="application/json",
            bucket_name=bucket_name,
            expires_in=expires_in,
        )

    # ========== Object Download Operations ==========

    async def read_object(
        self, object_key: str, encoding: str = "utf-8", bucket_name: str | None = None
    ) -> str | None:
        """
        Read object content as string

        Args:
            object_key: S3 object key
            encoding: Text encoding
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            Object content as string, None if not found

        Raises:
            S3ClientError: If read fails (other than not found)
        """
        bucket_name = bucket_name or self.config.bucket

        async def _read_object():
            client = await self._ensure_client()
            response = await client.get_object(Bucket=bucket_name, Key=object_key)
            content = await response["Body"].read()
            return content.decode(encoding)

        try:
            return await self._retry_operation(_read_object)
        except S3ClientError as e:
            if "NoSuchKey" in str(e.original_error) or "404" in str(e.original_error):
                logger.debug(f"Object not found: {bucket_name}:{object_key}")
                return None
            raise

    async def read_object_bytes(
        self, object_key: str, bucket_name: str | None = None
    ) -> bytes | None:
        """
        Read object content as bytes

        Args:
            object_key: S3 object key
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            Object content as bytes, None if not found
        """
        bucket_name = bucket_name or self.config.bucket

        async def _read_object_bytes():
            client = await self._ensure_client()
            response = await client.get_object(Bucket=bucket_name, Key=object_key)
            return await response["Body"].read()

        try:
            return await self._retry_operation(_read_object_bytes)
        except S3ClientError as e:
            if "NoSuchKey" in str(e.original_error) or "404" in str(e.original_error):
                return None
            raise

    async def read_json_object(
        self, object_key: str, bucket_name: str | None = None
    ) -> dict[str, Any] | None:
        """
        Read and parse JSON object

        Args:
            object_key: S3 object key
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            Parsed JSON data, None if not found

        Raises:
            S3ClientError: If JSON parsing fails
        """
        content = await self.read_object(object_key, bucket_name=bucket_name)
        if content is None:
            return None

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise S3ClientError(f"Invalid JSON in object {object_key}: {e}", e)

    async def download_file(
        self, object_key: str, local_path: str | Path, bucket_name: str | None = None
    ) -> bool:
        """
        Download S3 object to local file

        Args:
            object_key: S3 object key
            local_path: Local file path
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            True if download successful
        """
        bucket_name = bucket_name or self.config.bucket
        local_path = Path(local_path)

        # Create parent directories if needed
        local_path.parent.mkdir(parents=True, exist_ok=True)

        async def _download_file():
            # Use read_object_bytes and write to file since aiobotocore doesn't have download_file
            content = await self.read_object_bytes(object_key, bucket_name)
            if content is None:
                raise S3ClientError(f"Object not found: {object_key}")

            local_path.write_bytes(content)
            logger.info(f"Downloaded {bucket_name}:{object_key} to {local_path}")
            return True

        return await self._retry_operation(_download_file)

    # ========== Object Management Operations ==========

    async def object_exists(
        self, object_key: str, bucket_name: str | None = None
    ) -> bool:
        """
        Check if object exists

        Args:
            object_key: S3 object key
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            True if object exists, False otherwise
        """
        bucket_name = bucket_name or self.config.bucket

        try:
            client = await self._ensure_client()
            await client.head_object(Bucket=bucket_name, Key=object_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            else:
                raise S3ClientError(f"Error checking object existence: {e}", e)

    async def get_object_info(
        self, object_key: str, bucket_name: str | None = None
    ) -> S3ObjectInfo | None:
        """
        Get object metadata information

        Args:
            object_key: S3 object key
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            Object information, None if not found
        """
        bucket_name = bucket_name or self.config.bucket

        try:
            client = await self._ensure_client()
            response = await client.head_object(Bucket=bucket_name, Key=object_key)

            return S3ObjectInfo(
                key=object_key,
                size=response.get("ContentLength", 0),
                last_modified=response.get("LastModified", "").isoformat()
                if response.get("LastModified")
                else "",
                etag=response.get("ETag", "").strip('"'),
                storage_class=response.get("StorageClass", "STANDARD"),
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return None
            else:
                raise S3ClientError(f"Error getting object info: {e}", e)

    async def delete_object(
        self, object_key: str, bucket_name: str | None = None
    ) -> bool:
        """
        Delete object from S3

        Args:
            object_key: S3 object key
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            True if deletion successful
        """
        bucket_name = bucket_name or self.config.bucket

        async def _delete_object():
            client = await self._ensure_client()
            await client.delete_object(Bucket=bucket_name, Key=object_key)
            logger.info(f"Deleted object: {bucket_name}:{object_key}")
            return True

        return await self._retry_operation(_delete_object)

    async def delete_objects(
        self, object_keys: list[str], bucket_name: str | None = None
    ) -> dict[str, bool]:
        """
        Delete multiple objects from S3

        Args:
            object_keys: List of S3 object keys
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            Dictionary mapping object keys to deletion success status
        """
        bucket_name = bucket_name or self.config.bucket
        results = {}

        # AWS S3 delete_objects supports up to 1000 objects per request
        batch_size = 1000

        for i in range(0, len(object_keys), batch_size):
            batch = object_keys[i : i + batch_size]

            async def _delete_batch():
                client = await self._ensure_client()
                delete_request = {"Objects": [{"Key": key} for key in batch]}

                response = await client.delete_objects(
                    Bucket=bucket_name, Delete=delete_request
                )

                # Mark successful deletions
                for deleted in response.get("Deleted", []):
                    results[deleted["Key"]] = True

                # Mark failed deletions
                for error in response.get("Errors", []):
                    results[error["Key"]] = False
                    logger.error(f"Failed to delete {error['Key']}: {error['Message']}")

            await self._retry_operation(_delete_batch)

        logger.info(f"Batch deleted {sum(results.values())} objects from {bucket_name}")
        return results

    async def list_objects(
        self, prefix: str = "", max_keys: int = 1000, bucket_name: str | None = None
    ) -> list[S3ObjectInfo]:
        """
        List objects in bucket with optional prefix filtering

        Args:
            prefix: Object key prefix filter
            max_keys: Maximum number of objects to return
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            List of object information
        """
        bucket_name = bucket_name or self.config.bucket

        async def _list_objects():
            client = await self._ensure_client()
            response = await client.list_objects_v2(
                Bucket=bucket_name, Prefix=prefix, MaxKeys=max_keys
            )

            objects = []
            for obj in response.get("Contents", []):
                objects.append(
                    S3ObjectInfo(
                        key=obj["Key"],
                        size=obj["Size"],
                        last_modified=obj["LastModified"].isoformat(),
                        etag=obj["ETag"].strip('"'),
                        storage_class=obj.get("StorageClass", "STANDARD"),
                    )
                )

            return objects

        return await self._retry_operation(_list_objects)

    # ========== URL Operations ==========

    async def generate_object_url(
        self,
        object_key: str,
        expires_in: int | None = None,
        bucket_name: str | None = None,
    ) -> str:
        """
        Generate URL for object access, either permanent public URL or presigned URL

        Args:
            object_key: S3 object key
            expires_in: URL expiration time in seconds. If None, generate permanent public URL
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            URL for accessing the object (permanent if expires_in is None, presigned otherwise)
        """
        bucket_name = bucket_name or self.config.bucket

        if expires_in is None:
            # Generate permanent direct URL (object has public-read ACL)
            # Prioritize gateway over endpoint
            base_url = (
                self.config.gateway if self.config.gateway else self.config.endpoint
            )
            url = f"{base_url.rstrip('/')}/{bucket_name}/{object_key}"
            logger.info(
                f"Generated permanent public URL for {bucket_name}:{object_key}"
            )
            return url
        else:
            # Generate presigned URL with expiration
            url = await self.generate_presigned_url(
                object_key=object_key,
                expires_in=expires_in,
                method="get_object",
                bucket_name=bucket_name,
            )
            logger.info(
                f"Generated presigned URL (expires in {expires_in}s) for {bucket_name}:{object_key}"
            )
            return url

    async def generate_presigned_url(
        self,
        object_key: str,
        expires_in: int = 7200,
        method: str = "get_object",
        bucket_name: str | None = None,
    ) -> str:
        """
        Generate presigned URL for object access

        Args:
            object_key: S3 object key
            expires_in: URL expiration time in seconds
            method: S3 method ('get_object', 'put_object', etc.)
            bucket_name: Bucket name, defaults to configured bucket

        Returns:
            Presigned URL
        """
        bucket_name = bucket_name or self.config.bucket

        async def _generate_url():
            client = await self._ensure_client()
            url = await client.generate_presigned_url(
                ClientMethod=method,
                Params={"Bucket": bucket_name, "Key": object_key},
                ExpiresIn=expires_in,
            )
            return url

        return await self._retry_operation(_generate_url)

    # ========== Resource Management ==========

    async def close(self) -> None:
        """
        Close the S3 client and clean up resources
        """
        if not self._is_closed and self._client_context:
            try:
                await self._client_context.__aexit__(None, None, None)
                logger.debug("S3 client connection closed")
            except Exception as e:
                logger.warning(f"Error closing S3 client: {e}")
            finally:
                self._client_context = None
                self._client = None
                self._is_closed = True

    def __del__(self):
        """Destructor to ensure cleanup"""
        if not self._is_closed and self._client_context:
            logger.warning("S3Client was not properly closed, resources may leak")
