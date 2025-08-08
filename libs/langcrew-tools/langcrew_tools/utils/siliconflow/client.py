"""
SiliconFlow API Client

This module provides a unified client for SiliconFlow API operations including
embedding generation and document reranking with proper error handling and logging.
"""

import logging
import time
from collections.abc import Iterable
from typing import Any

import httpx

from .config import SiliconFlowConfig
from .exceptions import SiliconFlowError

logger = logging.getLogger(__name__)


class SiliconFlowClient:
    """
    SiliconFlow API client for embedding and reranking operations

    This client provides a unified interface for SiliconFlow API operations
    with proper error handling, logging, and configuration management.

    Attributes:
        config: SiliconFlow configuration instance

    Example:
        >>> # Using default configuration
        >>> client = SiliconFlowClient()

        >>> # Using custom configuration
        >>> config = SiliconFlowConfig(url="custom-url", token="custom-token")
        >>> client = SiliconFlowClient(config=config)

        >>> # Embedding documents
        >>> embeddings = await client.embed_documents("file_md5", ["text1", "text2"])

        >>> # Embedding query
        >>> query_embedding = await client.embed_query("query text")

        >>> # Reranking documents
        >>> rerank_result = await client.rerank_documents("query", ["doc1", "doc2"], top_n=5)
    """

    def __init__(self, config: SiliconFlowConfig | None = None):
        """Initialize SiliconFlow client

        Args:
            config: SiliconFlow configuration instance (optional, uses default if None)
        """
        self.config = config or SiliconFlowConfig()
        self.config.validate()

        logger.debug(f"Initialized SiliconFlowClient with URL: {self.config.url}")

    async def embed_documents(
        self,
        file_md5: str,
        chunk_texts: Iterable[str],
        model: str = "BAAI/bge-m3",
        encoding_format: str = "float",
        timeout: int | None = None,
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple documents

        Args:
            file_md5: MD5 hash of the source file (for logging)
            chunk_texts: Iterable of text chunks to embed
            model: Model name for embedding generation
            encoding_format: Encoding format for embeddings
            timeout: Request timeout in milliseconds (optional, uses config default)

        Returns:
            List[List[float]]: List of embedding vectors for each text chunk

        Raises:
            SiliconFlowError: API operation failed

        Example:
            >>> embeddings = await client.embed_documents(
            ...     "abc123",
            ...     ["text1", "text2", "text3"],
            ...     model="BAAI/bge-m3"
            ... )
        """
        start_time = time.time()
        timeout = timeout or self.config.timeout
        chunk_texts = list(chunk_texts)

        if not chunk_texts:
            raise SiliconFlowError("chunk_texts cannot be empty")

        all_embeddings = []
        url = f"{self.config.url}/embeddings"

        base_payload = {"model": model, "encoding_format": encoding_format}

        # Process in batches
        for i in range(0, len(chunk_texts), self.config.chunk_size):
            batch = chunk_texts[i : i + self.config.chunk_size]
            payload = {**base_payload, "input": batch}

            try:
                logger.debug(
                    f"Embedding batch {i // self.config.chunk_size + 1}, size: {len(batch)}"
                )

                async with httpx.AsyncClient(verify=False) as client:
                    response = await client.post(
                        url=url,
                        headers=self.config.headers,
                        json=payload,
                        timeout=timeout / 1000,  # Convert to seconds
                    )

                logger.debug(f"Response status: {response.status_code}")

                if response.is_success:
                    data = response.json()
                    batch_embeddings = [item["embedding"] for item in data["data"]]
                    all_embeddings.extend(batch_embeddings)
                else:
                    await self._handle_error_response(response)

            except httpx.HTTPError as e:
                raise SiliconFlowError(f"HTTP request failed: {e}")

        elapsed_time = time.time() - start_time
        logger.info(
            f"Embedded {len(chunk_texts)} documents for file {file_md5} in {elapsed_time:.2f}s"
        )

        return all_embeddings

    async def embed_query(
        self,
        text: str,
        model: str = "BAAI/bge-m3",
        encoding_format: str = "float",
        timeout: int | None = None,
    ) -> list[float]:
        """
        Generate embedding for a single query text

        Args:
            text: Query text to embed
            model: Model name for embedding generation
            encoding_format: Encoding format for embeddings
            timeout: Request timeout in milliseconds (optional, uses config default)

        Returns:
            List[float]: Embedding vector for the query text

        Raises:
            SiliconFlowError: API operation failed

        Example:
            >>> embedding = await client.embed_query("What is machine learning?")
        """
        if not text or not text.strip():
            raise SiliconFlowError("Query text cannot be empty")

        timeout = timeout or self.config.timeout
        url = f"{self.config.url}/embeddings"

        payload = {"model": model, "encoding_format": encoding_format, "input": text}

        try:
            logger.debug(f"Embedding query: {text[:100]}...")

            async with httpx.AsyncClient(verify=False) as client:
                response = await client.post(
                    url=url,
                    headers=self.config.headers,
                    json=payload,
                    timeout=timeout / 1000,  # Convert to seconds
                )

            logger.debug(f"Response status: {response.status_code}")

            if response.is_success:
                data = response.json()
                return data["data"][0]["embedding"]
            else:
                await self._handle_error_response(response)

        except httpx.HTTPError as e:
            raise SiliconFlowError(f"HTTP request failed: {e}")

    async def rerank_documents(
        self,
        query: str,
        documents: list[str],
        top_n: int,
        model: str = "BAAI/bge-reranker-v2-m3",
        return_documents: bool = False,
        max_chunks_per_doc: int = 1024,
        overlap_tokens: int = 80,
        timeout: int | None = None,
    ) -> dict[str, Any]:
        """
        Rerank documents based on relevance to query

        Args:
            query: Query text for reranking
            documents: List of documents to rerank
            top_n: Number of top documents to return
            model: Model name for reranking
            return_documents: Whether to return document content
            max_chunks_per_doc: Maximum chunks per document
            overlap_tokens: Number of overlapping tokens
            timeout: Request timeout in milliseconds (optional, uses config default)

        Returns:
            Dict[str, Any]: Reranking results from the API

        Raises:
            SiliconFlowError: API operation failed

        Example:
            >>> result = await client.rerank_documents(
            ...     "machine learning",
            ...     ["doc about ML", "doc about cooking", "doc about AI"],
            ...     top_n=2
            ... )
        """
        if not query or not query.strip():
            raise SiliconFlowError("Query cannot be empty")
        if not documents:
            raise SiliconFlowError("Documents list cannot be empty")
        if top_n <= 0:
            raise SiliconFlowError("top_n must be positive")
        if top_n > len(documents):
            top_n = len(documents)

        timeout = timeout or self.config.timeout
        url = f"{self.config.url}/rerank"

        payload = {
            "model": model,
            "query": query,
            "documents": documents,
            "top_n": top_n,
            "return_documents": return_documents,
            "max_chunks_per_doc": max_chunks_per_doc,
            "overlap_tokens": overlap_tokens,
        }

        try:
            logger.debug(
                f"Reranking {len(documents)} documents for query: {query[:100]}..."
            )

            async with httpx.AsyncClient(verify=False) as client:
                response = await client.post(
                    url=url,
                    headers=self.config.headers,
                    json=payload,
                    timeout=timeout / 1000,  # Convert to seconds
                )

            logger.debug(f"Response status: {response.status_code}")

            if response.is_success:
                result = response.json()
                logger.debug(
                    f"Reranked documents, returned top {len(result.get('results', []))} results"
                )
                return result
            else:
                await self._handle_error_response(response)

        except httpx.HTTPError as e:
            raise SiliconFlowError(f"HTTP request failed: {e}")

    async def _handle_error_response(self, response: httpx.Response) -> None:
        """Handle error responses from the API

        Args:
            response: HTTP response object

        Raises:
            SiliconFlowError: For API-specific errors
        """
        error_message = f"HTTP {response.status_code}: {response.text}"
        raise SiliconFlowError(error_message)

    def __repr__(self) -> str:
        """String representation of the client"""
        return f"SiliconFlowClient(url={self.config.url}, chunk_size={self.config.chunk_size})"
