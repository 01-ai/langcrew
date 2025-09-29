"""Storage factory for LangCrew Memory System"""

from contextlib import asynccontextmanager, contextmanager
from typing import Any, Union

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore


def get_checkpointer(
    provider: str | None = None,
    config: dict[str, Any] | None = None,
    is_async: bool = False,
) -> Union[BaseCheckpointSaver, contextmanager, asynccontextmanager]:
    """Get checkpointer instance or context manager for session management

    Returns different types based on provider:
    - memory: Direct InMemorySaver instance (ready to use)
    - database: Context manager (use with 'with' or 'async with' statement)

    Args:
        provider: Storage provider ('memory', 'postgres', 'redis', 'mongodb', 'mysql')
        config: Provider configuration (connection_string, etc.)
        is_async: Whether to return async-compatible version

    Returns:
        BaseCheckpointSaver: For memory provider (direct instance)
        contextmanager: For sync database providers (use with 'with')
        asynccontextmanager: For async database providers (use with 'async with')

    Note:
        This function follows LangGraph's design where memory providers return
        instances directly, while database providers return context managers
        for proper resource lifecycle management.

    Example:
        # Memory provider - direct use
        checkpointer = get_checkpointer("memory")

        # Database provider - context manager
        checkpointer_cm = get_checkpointer("postgres", config)
        with checkpointer_cm as checkpointer:
            # Use checkpointer here
            pass
    """
    config = config or {}
    conn_str = config.get("connection_string", "")

    if not provider or provider == "memory":
        # Memory provider: return instance directly for reuse
        from langgraph.checkpoint.memory import InMemorySaver

        return InMemorySaver()

    # PostgreSQL checkpointer
    elif provider == "postgres":
        if not conn_str:
            raise ValueError(
                "PostgreSQL checkpointer requires connection_string in config"
            )
        try:
            if is_async:
                from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

                return AsyncPostgresSaver.from_conn_string(conn_str)
            else:
                from langgraph.checkpoint.postgres import PostgresSaver

                return PostgresSaver.from_conn_string(conn_str)
        except ImportError:
            raise ImportError("PostgreSQL support requires additional package")

    # Redis checkpointer
    elif provider == "redis":
        if not conn_str:
            raise ValueError("Redis checkpointer requires connection_string in config")
        try:
            if is_async:
                from langgraph.checkpoint.redis.aio import AsyncRedisSaver

                return AsyncRedisSaver.from_conn_string(conn_str)
            else:
                from langgraph.checkpoint.redis import RedisSaver

                return RedisSaver.from_conn_string(conn_str)
        except ImportError:
            raise ImportError("Redis support requires additional package")

    # MongoDB checkpointer
    elif provider == "mongodb":
        if not conn_str:
            raise ValueError(
                "MongoDB checkpointer requires connection_string in config"
            )
        try:
            if is_async:
                from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver

                return AsyncMongoDBSaver.from_conn_string(conn_str)
            else:
                from langgraph.checkpoint.mongodb import MongoDBSaver

                return MongoDBSaver.from_conn_string(conn_str)
        except ImportError:
            raise ImportError("MongoDB support requires additional package")

    # MySQL checkpointer
    elif provider == "mysql":
        if not conn_str:
            raise ValueError("MySQL checkpointer requires connection_string in config")
        try:
            if is_async:
                from langgraph.checkpoint.mysql.aio import AIOMySQLSaver

                return AIOMySQLSaver.from_conn_string(conn_str)
            else:
                from langgraph.checkpoint.mysql.pymysql import PyMySQLSaver

                return PyMySQLSaver.from_conn_string(conn_str)
        except ImportError:
            raise ImportError("MySQL support requires additional package")

    else:
        raise ValueError(f"Unsupported checkpointer provider: {provider}")


def get_store(
    provider: str | None = None,
    config: dict[str, Any] | None = None,
    is_async: bool = False,
) -> Union[BaseStore, contextmanager, asynccontextmanager]:
    """Get store instance or context manager for data persistence

    Returns different types based on provider:
    - memory: Direct InMemoryStore instance (ready to use)
    - database: Context manager (use with 'with' or 'async with' statement)

    Args:
        provider: Storage provider ('memory', 'postgres', 'redis', 'sqlite', 'mongodb', 'mysql')
        config: Provider configuration (connection_string, index, etc.)
        is_async: Whether to return async-compatible version

    Returns:
        BaseStore: For memory provider (direct instance)
        contextmanager: For sync database providers (use with 'with')
        asynccontextmanager: For async database providers (use with 'async with')

    Note:
        This function follows LangGraph's design where memory providers return
        instances directly, while database providers return context managers
        for proper resource lifecycle management.

    Example:
        # Memory provider - direct use
        store = get_store("memory")

        # Database provider - context manager
        store_cm = get_store("postgres", config)
        with store_cm as store:
            # Use store here
            pass
    """
    config = config or {}
    conn_str = config.get("connection_string", "")
    index = config.get("index")

    if not provider or provider == "memory":
        # Memory provider: return instance directly for reuse
        from langgraph.store.memory import InMemoryStore

        return InMemoryStore(index=index)

    # PostgreSQL storage
    elif provider == "postgres":
        if not conn_str:
            raise ValueError("PostgreSQL storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.postgres.aio import AsyncPostgresStore

                return AsyncPostgresStore.from_conn_string(conn_str, index=index)
            else:
                from langgraph.store.postgres import PostgresStore

                return PostgresStore.from_conn_string(conn_str, index=index)
        except ImportError:
            raise ImportError("PostgreSQL support requires additional package")

    # Redis storage
    elif provider == "redis":
        if not conn_str:
            raise ValueError("Redis storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.redis.aio import AsyncRedisStore

                return AsyncRedisStore.from_conn_string(conn_str, index=index)
            else:
                from langgraph.store.redis import RedisStore

                return RedisStore.from_conn_string(conn_str, index=index)
        except ImportError:
            raise ImportError("Redis support requires additional package")

    # SQLite storage
    elif provider == "sqlite":
        if not conn_str:
            raise ValueError("SQLite storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.sqlite.aio import AsyncSqliteStore

                return AsyncSqliteStore.from_conn_string(conn_str, index=index)
            else:
                from langgraph.store.sqlite import SqliteStore

                return SqliteStore.from_conn_string(conn_str, index=index)
        except ImportError:
            raise ImportError("SQLite support requires additional package")

    # MongoDB storage
    elif provider == "mongodb":
        if not conn_str:
            raise ValueError("MongoDB storage requires connection_string in config")
        try:
            from langgraph.store.mongodb import MongoDBStore

            return MongoDBStore.from_conn_string(conn_str, index=index)
        except ImportError:
            raise ImportError("MongoDB support requires additional package")

    # MySQL storage
    elif provider == "mysql":
        if not conn_str:
            raise ValueError("MySQL storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.mysql.aio import AIOMySQLStore

                return AIOMySQLStore.from_conn_string(conn_str)
            else:
                from langgraph.store.mysql.pymysql import PyMySQLStore

                return PyMySQLStore.from_conn_string(conn_str)
        except ImportError:
            raise ImportError("MySQL support requires additional package")

    else:
        raise ValueError(f"Unsupported storage provider: {provider}")
