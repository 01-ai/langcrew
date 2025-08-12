"""
Knowledge Base LangChain Tools

This package provides LangChain compatible tools for knowledge base operations:
- PgVectorSearchTool: LangChain tool for knowledge search using PgVector database
- KnowledgeSearchInput: Input model for knowledge search operations

Usage:
    from langcrew.knowledge import PgVectorSearchTool
    from ..utils.vector import VectorConfig

    # Using default configuration (from environment variables)
    tool = PgVectorSearchTool()
    result = await tool._arun(
        query="user query",
        knowledge_ids=["kb1", "kb2"],
        top_k=5
    )

    # Using custom configuration
    config = VectorConfig(
        database_url="postgresql://user:pass@localhost/db",
        index_name="custom_vectors"
    )
    tool = PgVectorSearchTool(vector_config=config)
    result = await tool._arun(query="query", knowledge_ids=["kb1"], top_k=10)

Configuration:
    Uses ..utils.vector.config.VectorConfig for database configuration.
    See the VectorConfig documentation for environment variables.
"""

from .langchain_tools import KnowledgeSearchInput, PgVectorSearchTool

__all__ = [
    "PgVectorSearchTool",
    "KnowledgeSearchInput",
]
