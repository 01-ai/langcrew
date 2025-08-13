"""
Message Tool Configuration Management

This module provides configuration management for message notification tools
with support for environment variables and default values.
"""

import os
from dataclasses import dataclass


@dataclass
class MessageConfig:
    """Message tool configuration with environment variable support"""

    # Sandbox configuration
    sandbox_workspace_path: str = "/workspace"
    
    # S3 upload configuration
    s3_prefix_template: str = "user_attachments/{sandbox_id}"
    s3_upload_enabled: bool = True
    

    def __post_init__(self):
        """Load configuration from environment variables if available"""
        
        # Sandbox configuration
        self.sandbox_workspace_path = os.getenv(
            "MESSAGE_SANDBOX_WORKSPACE_PATH", 
            self.sandbox_workspace_path
        )
        
        # S3 configuration
        self.s3_prefix_template = os.getenv(
            "MESSAGE_S3_PREFIX_TEMPLATE", 
            self.s3_prefix_template
        )
        
 
    def get_s3_prefix(self, sandbox_id: str) -> str:
        """Generate S3 prefix for a specific sandbox"""
        return self.s3_prefix_template.format(sandbox_id=sandbox_id)


# Default configuration instance
default_config = MessageConfig()
