"""
ChatAnthropicBedrock: Anthropic Claude models via AWS Bedrock
Extends langchain_anthropic.ChatAnthropic to support AWS Bedrock authentication
"""

import os
from functools import cached_property
from typing import Any

import httpx
from anthropic import AnthropicBedrock, AsyncAnthropicBedrock
from anthropic.lib.bedrock import _auth as bedrock_auth
from langchain_anthropic import ChatAnthropic
from langchain_anthropic._client_utils import (
    _get_default_async_httpx_client,
    _get_default_httpx_client,
)
from langchain_core.utils import secret_from_env
from pydantic import Field, SecretStr

# Save original auth function
origin_bedrock_auth_get_auth_headers = bedrock_auth.get_auth_headers


def get_auth_headers(
    *,
    method: str,
    url: str,
    headers: httpx.Headers,
    aws_access_key: str | None,
    aws_secret_key: str | None,
    aws_session_token: str | None,
    region: str | None,
    profile: str | None,
    data: str | None,
) -> dict[str, str]:
    """
    Custom auth header function that supports AWS Bearer Token authentication.
    Falls back to standard AWS signature auth if Bearer token is not available.
    """
    api_key = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")

    if not api_key:
        return origin_bedrock_auth_get_auth_headers(
            method=method,
            url=url,
            headers=headers,
            aws_access_key=aws_access_key,
            aws_secret_key=aws_secret_key,
            aws_session_token=aws_session_token,
            region=region,
            profile=profile,
            data=data,
        )

    # The connection header may be stripped by a proxy somewhere, so the receiver
    # of this message may not see this header, so we remove it from the set of headers
    # that are signed.
    headers_dict = dict(headers)
    if "connection" in headers_dict:
        del headers_dict["connection"]
    headers_dict["Authorization"] = f"Bearer {api_key}"
    return headers_dict


# Apply the monkey patch
bedrock_auth.get_auth_headers = get_auth_headers


class ChatAnthropicBedrock(ChatAnthropic):
    """
    ChatAnthropic implementation for AWS Bedrock.

    Supports both standard AWS credentials and Bearer token authentication.
    Environment variable AWS_BEARER_TOKEN_BEDROCK can be set to use Bearer token auth.
    """

    region_name: str | None = None
    """The AWS region, e.g., `us-west-2`. 
    
    Falls back to AWS_REGION or AWS_DEFAULT_REGION env variable or region specified in 
    ~/.aws/config in case it is not provided here.
    """

    credentials_profile_name: str | None = Field(default=None, exclude=True)
    """The name of the profile in the ~/.aws/credentials or ~/.aws/config files.
    
    Profile should either have access keys or role information specified.
    If not specified, the default credential profile or, if on an EC2 instance,
    credentials from IMDS will be used. 
    See: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    """

    aws_access_key_id: SecretStr | None = Field(
        default_factory=secret_from_env("AWS_ACCESS_KEY_ID", default=None)
    )
    """AWS access key id. 
    
    If provided, aws_secret_access_key must also be provided.
    If not specified, the default credential profile or, if on an EC2 instance,
    credentials from IMDS will be used.
    See: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    
    If not provided, will be read from 'AWS_ACCESS_KEY_ID' environment variable.
    """

    aws_secret_access_key: SecretStr | None = Field(
        default_factory=secret_from_env("AWS_SECRET_ACCESS_KEY", default=None)
    )
    """AWS secret_access_key. 
    
    If provided, aws_access_key_id must also be provided.
    If not specified, the default credential profile or, if on an EC2 instance,
    credentials from IMDS will be used.
    See: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    
    If not provided, will be read from 'AWS_SECRET_ACCESS_KEY' environment variable.
    """

    aws_session_token: SecretStr | None = Field(
        default_factory=secret_from_env("AWS_SESSION_TOKEN", default=None)
    )
    """AWS session token. 
    
    If provided, aws_access_key_id and aws_secret_access_key must 
    also be provided. Not required unless using temporary credentials.
    See: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    
    If not provided, will be read from 'AWS_SESSION_TOKEN' environment variable.
    """

    base_url: str | None = Field(default=None)
    """Needed if you don't want to default to us-east-1 endpoint"""

    @cached_property
    def _client_params(self) -> dict[str, Any]:
        """Build client parameters for AnthropicBedrock client"""
        base_url = self.base_url
        if base_url is None:
            base_url = os.environ.get("ANTHROPIC_BEDROCK_BASE_URL")
        if base_url is None:
            base_url = f"https://bedrock-runtime.{self.region_name}.amazonaws.com"

        client_params: dict[str, Any] = {
            "aws_secret_key": (
                self.aws_secret_access_key.get_secret_value()
                if self.aws_secret_access_key
                else None
            ),
            "aws_access_key": (
                self.aws_access_key_id.get_secret_value()
                if self.aws_access_key_id
                else None
            ),
            "aws_region": self.region_name,
            "aws_profile": self.credentials_profile_name,
            "aws_session_token": (
                self.aws_session_token.get_secret_value()
                if self.aws_session_token
                else None
            ),
            "base_url": base_url,
            "max_retries": self.max_retries,
            "default_headers": (self.default_headers or None),
        }

        # value <= 0 indicates the param should be ignored. None is a meaningful value
        # for Anthropic client and treated differently than not specifying the param at
        # all.
        if self.default_request_timeout is None or self.default_request_timeout > 0:
            client_params["timeout"] = self.default_request_timeout

        return client_params

    @cached_property
    def _client(self) -> AnthropicBedrock:  # type: ignore[override]
        """Create synchronous AnthropicBedrock client"""
        client_params = self._client_params
        http_client_params = {"base_url": client_params["base_url"]}
        if "timeout" in client_params:
            http_client_params["timeout"] = client_params["timeout"]
        if self.anthropic_proxy:
            http_client_params["anthropic_proxy"] = self.anthropic_proxy
        http_client = _get_default_httpx_client(**http_client_params)
        params = {
            **client_params,
            "http_client": http_client,
        }
        return AnthropicBedrock(**params)

    @cached_property
    def _async_client(self) -> AsyncAnthropicBedrock:  # type: ignore[override]
        """Create asynchronous AnthropicBedrock client"""
        client_params = self._client_params
        http_client_params = {"base_url": client_params["base_url"]}
        if "timeout" in client_params:
            http_client_params["timeout"] = client_params["timeout"]
        if self.anthropic_proxy:
            http_client_params["anthropic_proxy"] = self.anthropic_proxy
        http_client = _get_default_async_httpx_client(**http_client_params)
        params = {
            **client_params,
            "http_client": http_client,
        }
        return AsyncAnthropicBedrock(**params)
