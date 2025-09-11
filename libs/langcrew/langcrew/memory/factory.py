"""Storage factory for LangCrew Memory System"""

from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore


def get_checkpointer(
    provider: str | None = None,
    config: dict[str, Any] | None = None,
    is_async: bool = False,
) -> BaseCheckpointSaver:
    """Get checkpointer instance for session management"""
    config = config or {}
    conn_str = config.get("connection_string", "")

    if not provider or provider == "memory":
        # InMemorySaver works for both sync/async, wrap it for consistent interface
        from langgraph.checkpoint.memory import InMemorySaver
        from contextlib import nullcontext

        checkpointer = InMemorySaver()
        return nullcontext(checkpointer)

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
            from langgraph.checkpoint.mysql.pymysql import PyMySQLSaver

            if is_async:
                import logging

                logging.warning(
                    "MySQL checkpointer does not have async version, using sync version"
                )
            return PyMySQLSaver.from_conn_string(conn_str)
        except ImportError:
            raise ImportError("MySQL support requires additional package")

    else:
        raise ValueError(f"Unsupported checkpointer provider: {provider}")


def get_store(
    provider: str | None = None,
    config: dict[str, Any] | None = None,
    is_async: bool = False,
) -> BaseStore:
    """Get store instance for data persistence"""
    config = config or {}
    conn_str = config.get("connection_string", "")
    index = config.get("index")

    if not provider or provider == "memory":
        from langgraph.store.memory import InMemoryStore
        from contextlib import nullcontext

        store = InMemoryStore(index=index)
        return nullcontext(store)

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

    else:
        raise ValueError(f"Unsupported storage provider: {provider}")
