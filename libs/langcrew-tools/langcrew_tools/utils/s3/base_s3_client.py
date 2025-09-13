import logging
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Any, TypeVar, Union

from langcrew.utils.async_utils import run_async_func_no_wait
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from .client import AsyncS3Client
from .factory import ClientFactory

if TYPE_CHECKING:
    pass


T = TypeVar("T")

logger = logging.getLogger(__name__)


class S3ClientMixin(BaseModel):
    # Support config object and async config method parameters
    s3_client_source: Union[
        Callable[[], Awaitable["AsyncS3Client"]], "AsyncS3Client", dict[str, Any], None
    ] = Field(default=None, description="AsyncSandbox instance")

    _s3_client: AsyncS3Client | None = PrivateAttr(default=None)
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, **kwargs):
        """Initialize the E2B tool with proper multiple inheritance support."""
        super().__init__(**kwargs)

    async def get_s3_client(self) -> AsyncS3Client:
        if not self._s3_client:
            # Handle different types of async_sandbox_provider
            # async_sandbox_provider handles concurrent loading issues
            if isinstance(self.s3_client_source, AsyncS3Client):
                # If it's an AsyncSandbox object, use it directly
                self._s3_client = self.s3_client_source
            elif callable(self.s3_client_source):
                # If it's a callable object, call it to get the configuration
                self._s3_client = await self.s3_client_source()
            else:
                config = self.s3_client_source or {}
            self._s3_client = ClientFactory.create_s3_client(config)
        return self._s3_client

    def __del__(self):
        if self._s3_client:
            run_async_func_no_wait(self._s3_client.close)


async def none_s3_client():
    pass
