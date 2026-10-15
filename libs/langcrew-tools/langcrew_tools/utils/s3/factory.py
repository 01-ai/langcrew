"""
S3 Client Factory

Factory utilities for creating pre-configured S3 client instances
"""

import logging
import os

from .client import AsyncS3Client
from .client import S3Config as S3ClientConfig

logger = logging.getLogger(__name__)


class ClientFactory:
    """
    Factory class for creating S3 client instances
    """

    @classmethod
    def create_s3_client(cls, config_override: dict | None = None) -> AsyncS3Client:
        """
        Create new S3 client instance with configuration

        Args:
            config_override: Optional configuration overrides

        Returns:
            New AsyncS3Client instance

        Raises:
            ValueError: If required configuration is missing
        """
        try:
            # Read S3 configuration from environment variables
            endpoint = os.getenv("S3_ENDPOINT")
            bucket = os.getenv("S3_BUCKET")
            access_key = os.getenv("S3_AK")
            secret_key = os.getenv("S3_SK")
            gateway = os.getenv("S3_GATEWAY")
            region = os.getenv("S3_REGION")

            # Log credential usage before creating client
            if not access_key or not secret_key:
                logger.warning(
                    "S3_AK or S3_SK not provided. "
                    "Will use default AWS credential chain (environment variables, IAM roles, etc.)"
                )

            # Prepare client configuration
            client_config = {
                "endpoint": endpoint,
                "bucket": bucket,
                "access_key": access_key,
                "secret_key": secret_key,
                "gateway": gateway,
                "region": region,
            }

            # Apply overrides if provided
            if config_override:
                client_config.update(config_override)

            logger.info(f"Creating S3 client for endpoint: {endpoint}")
            return AsyncS3Client(S3ClientConfig(**client_config))

        except Exception as e:
            logger.error(f"Failed to create S3 client: {e}")
            raise ValueError(f"Failed to create S3 client: {e}")


# Convenience function for direct access
def create_s3_client(config_override: dict | None = None) -> AsyncS3Client:
    """
    Create new S3 client instance
    """
    return ClientFactory.create_s3_client(config_override)
