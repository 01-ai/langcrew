"""
PGVector Configuration Module

Provides unified configuration management for pgvector operations.
Includes all configuration classes and data structures with environment variable support.
"""

import os
from dataclasses import dataclass

# Optional dependencies - will be imported dynamically
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


@dataclass
class VectorConfig:
    """Unified configuration for pgvector operations with database connectivity."""

    # Database settings
    database_url: str | None = None
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30

    # Table/Index settings
    index_name: str = "vector_store"
    kb_index_name: str = "embeddings"

    # Embedding settings
    embedding_model: str = "BAAI/bge-m3"
    embedding_chunk_size: int = 100
    request_timeout: int = 180

    # Batch processing settings
    batch_size: int = 100

    def __post_init__(self):
        """Load configuration from environment variables if available"""
        # Override with environment variables if they exist
        self.database_url = os.getenv("PGVECTOR_DATABASE_URL", self.database_url)
        self.index_name = os.getenv("PGVECTOR_INDEX_NAME", self.index_name)
        self.kb_index_name = os.getenv("PGVECTOR_KB_INDEX_NAME", self.kb_index_name)
        self.embedding_model = os.getenv(
            "PGVECTOR_EMBEDDING_MODEL", self.embedding_model
        )

        # Handle optional environment variables with type conversion
        if pool_size_env := os.getenv("PGVECTOR_POOL_SIZE"):
            try:
                self.pool_size = int(pool_size_env)
            except ValueError:
                pass

        if max_overflow_env := os.getenv("PGVECTOR_MAX_OVERFLOW"):
            try:
                self.max_overflow = int(max_overflow_env)
            except ValueError:
                pass

        if pool_timeout_env := os.getenv("PGVECTOR_POOL_TIMEOUT"):
            try:
                self.pool_timeout = int(pool_timeout_env)
            except ValueError:
                pass

        if embedding_chunk_size_env := os.getenv("PGVECTOR_EMBEDDING_CHUNK_SIZE"):
            try:
                self.embedding_chunk_size = int(embedding_chunk_size_env)
            except ValueError:
                pass

        if request_timeout_env := os.getenv("PGVECTOR_REQUEST_TIMEOUT"):
            try:
                self.request_timeout = int(request_timeout_env)
            except ValueError:
                pass

        if batch_size_env := os.getenv("PGVECTOR_BATCH_SIZE"):
            try:
                self.batch_size = int(batch_size_env)
            except ValueError:
                pass

    def validate(self) -> None:
        """Validate configuration settings."""
        if not self.database_url:
            raise ValueError(
                "database_url is required. Set PGVECTOR_DATABASE_URL environment variable."
            )

        if self.pool_size <= 0:
            raise ValueError("pool_size must be positive")

        if self.max_overflow < 0:
            raise ValueError("max_overflow must be non-negative")

        if self.pool_timeout <= 0:
            raise ValueError("pool_timeout must be positive")

        if self.batch_size <= 0:
            raise ValueError("batch_size must be positive")

        if self.embedding_chunk_size <= 0:
            raise ValueError("embedding_chunk_size must be positive")

        if self.request_timeout <= 0:
            raise ValueError("request_timeout must be positive")

    def get_database_url(self) -> str:
        """Get database URL with fallback to default."""
        return (
            self.database_url
            or "postgresql+asyncpg://YOUR_USERNAME:YOUR_PASSWORD@YOUR_HOST/YOUR_DATABASE"
        )

    def create_engine(self, echo: bool = False):
        """Create async database engine.

        Args:
            echo: Whether to enable SQLAlchemy query logging (default: False)
        """
        return create_async_engine(
            self.get_database_url(),
            pool_size=self.pool_size,
            max_overflow=self.max_overflow,
            pool_timeout=self.pool_timeout,
            echo=echo,
        )

    def create_session_factory(self, echo: bool = False):
        """Create async session factory.

        Args:
            echo: Whether to enable SQLAlchemy query logging (default: False)
        """
        engine = self.create_engine(echo=echo)
        return async_sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )


@dataclass
class VectorFileMeta:
    """File metadata for vector operations."""

    file_md5: str


@dataclass
class EmbeddingResult:
    """Result from embedding similarity search."""

    id: str
    text: str
    score: float
    metadata: str | None = None
    knowledge_id: str | None = None
    file_md5: str | None = None

    def __post_init__(self):
        """Validate embedding result after initialization."""
        if not self.id:
            raise ValueError("Embedding ID is required")
        if not self.text:
            raise ValueError("Embedding text is required")
