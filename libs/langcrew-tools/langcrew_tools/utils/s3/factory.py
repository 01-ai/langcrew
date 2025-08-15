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
            gateway = os.getenv("S3_GATEWAY", "")
            region = os.getenv("S3_REGION", "us-east-1")

            # Validate required configuration
            required_configs = {
                "S3_ENDPOINT": endpoint,
                "S3_BUCKET": bucket,
                "S3_AK": access_key,
                "S3_SK": secret_key,
            }

            missing_configs = [
                key for key, value in required_configs.items() if not value
            ]

            if missing_configs:
                raise ValueError(
                    f"Missing required S3 environment variables: {missing_configs}"
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

            logger.info(f"Creating S3 client for endpoint: {client_config['endpoint']}")
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
