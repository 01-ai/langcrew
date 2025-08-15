"""
S3 Client Package

This package provides S3 client functionality including:
- AsyncS3Client: Advanced async S3 client with retry and error handling
- S3Config: Configuration class for S3 connections
- Factory functions for creating S3 clients
"""

from .client import AsyncS3Client, S3Config
from .factory import ClientFactory, create_s3_client

__all__ = [
    "ClientFactory",
    "create_s3_client",
    "AsyncS3Client",
    "S3Config",
]
