# Knowledge Base LangChain Tools
# Provides knowledge base retrieval functionality using unified pgvector toolkit

import asyncio
import logging
import traceback
from typing import ClassVar

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from langcrew_tools.utils.siliconflow import SiliconFlowClient
from langcrew_tools.utils.vector import (
    VectorConfig,
    create_vector_manager,
    vector_available,
)

logger = logging.getLogger(__name__)


class KnowledgeSearchInput(BaseModel):
    """Input for KnowledgeSearchTool."""

    query: str = Field(..., description="Search query text")
    knowledge_ids: list[str] = Field(
        ..., description="List of knowledge base IDs to search"
    )
    top_k: int = Field(default=20, description="Number of top results to return")


class PgVectorSearchTool(BaseTool):
    """Tool for performing knowledge base search using PgVector with embedding and reranking."""

    name: ClassVar[str] = "pgvector_search"
    args_schema: type[BaseModel] = KnowledgeSearchInput
    description: ClassVar[str] = (
        "Search knowledge base using PgVector backend with automatic embedding and reranking. "
        "Returns relevant documents with scores and markdown formatting."
    )

    def __init__(
        self,
        vector_config: VectorConfig | None = None,
        siliconflow_client: SiliconFlowClient | None = None,
        **kwargs
    ):
        """Initialize PgVectorSearchTool.
        
        Args:
            vector_config: Optional VectorConfig for database configuration.
                          If not provided, uses default config from environment variables.
            siliconflow_client: Optional SiliconFlowClient for embedding generation.
                               If not provided, uses default client.
            **kwargs: Additional arguments passed to BaseTool.
        """
        super().__init__(**kwargs)
        self.vector_config = vector_config
        self.siliconflow_client = siliconflow_client

    def _run(
        self,
        query: str,
        knowledge_ids: list[str],
        top_k: int = 5,
    ) -> str:
        """Perform knowledge search synchronously."""

        return asyncio.run(self._arun(query, knowledge_ids, top_k))

    async def _arun(
        self,
        query: str,
        knowledge_ids: list[str],
        top_k: int = 5,
    ) -> str:
        """Perform knowledge search asynchronously."""
        logger.info(f"Starting knowledge search. Query: {query[:50]}...")

        if not query or not query.strip():
            logger.warning("Empty query provided")
            return "No query provided"

        # 优先级：传入的knowledge_ids > 从上下文提取的IDs > 默认kb_ids
        if not knowledge_ids:
            logger.warning(
                "No knowledge IDs provided, extracted from context, or configured as default"
            )
            return "No knowledge bases specified"

        try:
            # Check if vector functionality is available
            if not vector_available:
                return (
                    "Error: Vector functionality not available - missing dependencies"
                )

            # Use the unified search method from VectorManager with custom config
            vector_manager = await create_vector_manager(
                config=self.vector_config,
                siliconflow_client=self.siliconflow_client
            )
            if not vector_manager:
                return "Error: Failed to create vector manager - dependencies not available"

            logger.debug(f"Using unified search with query: {query[:100]}...")
            rag_responses = await vector_manager.search_knowledge_bases_with_rerank(
                query=query,
                knowledge_ids=knowledge_ids,
                top_k=top_k,
                rerank_multiplier=2,
            )

            logger.info(f"Unified search returned {len(rag_responses)} results")

            if not rag_responses:
                logger.info(f"No results found for query: {query[:100]}... in knowledge bases: {knowledge_ids}")
                return "No relevant documents found"

            # Convert to knowledge-specific markdown format
            formatted_results = []
            for result in rag_responses:
                page_content = result.text.strip() if result.text else ""
                formatted_results.append(page_content)

            return "\n".join(formatted_results)

        except Exception as e:
            logger.error(f"Knowledge search failed: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return f"Search failed: {str(e)}"
