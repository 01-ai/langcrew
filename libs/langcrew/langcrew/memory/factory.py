"""Storage factory for LangCrew Memory System"""

import asyncio
from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore


class StoreWrapper:
    """Wrapper that manages store connection lifecycle"""

    def __init__(self, store_cm):
        self.store_cm = store_cm
        self.store = None
        self._context_entered = False

    def _ensure_connection(self):
        """Ensure connection is established"""
        if not self._context_entered:
            self.store = self.store_cm.__enter__()
            self._context_entered = True
            # Setup if needed
            if hasattr(self.store, "setup"):
                self.store.setup()
        return self.store

    def __getattr__(self, name):
        """Delegate all method calls to the actual store"""
        store = self._ensure_connection()
        return getattr(store, name)

    def __enter__(self):
        return self._ensure_connection()

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._context_entered:
            result = self.store_cm.__exit__(exc_type, exc_val, exc_tb)
            self._context_entered = False
            return result


class CheckpointerWrapper:
    """Wrapper that manages checkpointer connection lifecycle"""

    def __init__(self, checkpointer_cm):
        self.checkpointer_cm = checkpointer_cm
        self.checkpointer = None
        self._context_entered = False

    def _ensure_connection(self):
        """Ensure connection is established"""
        if not self._context_entered:
            self.checkpointer = self.checkpointer_cm.__enter__()
            self._context_entered = True
            # Setup if needed
            if hasattr(self.checkpointer, "setup"):
                self.checkpointer.setup()
        return self.checkpointer

    def __getattr__(self, name):
        """Delegate all method calls to the actual checkpointer"""
        checkpointer = self._ensure_connection()
        return getattr(checkpointer, name)

    def __enter__(self):
        return self._ensure_connection()

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._context_entered:
            result = self.checkpointer_cm.__exit__(exc_type, exc_val, exc_tb)
            self._context_entered = False
            return result


class AsyncStoreWrapper:
    """Async wrapper that manages store connection lifecycle with smart delegation"""

    def __init__(self, store_cm):
        self.store_cm = store_cm
        self.store = None
        self._context_entered = False
        self._connection_lock = None

    async def _ensure_connection(self):
        """Ensure connection is established"""
        if not self._context_entered:
            if self._connection_lock is None:
                self._connection_lock = asyncio.Lock()

            async with self._connection_lock:
                if not self._context_entered:  # Double-check locking
                    if hasattr(self.store_cm, "__aenter__"):
                        self.store = await self.store_cm.__aenter__()
                    else:
                        # For non-async stores wrapped in async context
                        self.store = self.store_cm
                    self._context_entered = True
                    # Setup if needed
                    if hasattr(self.store, "setup"):
                        if asyncio.iscoroutinefunction(self.store.setup):
                            await self.store.setup()
                        else:
                            self.store.setup()
        return self.store

    def __getattr__(self, name):
        """Delegate all method calls to the actual store"""
        if not self._context_entered:
            # For methods that need async context, return async wrapper
            original_attr = getattr(self.store_cm, name, None)
            if original_attr is None:
                raise AttributeError(
                    f"'{type(self.store_cm).__name__}' object has no attribute '{name}'"
                )

            # Return async wrapper for method calls
            if callable(original_attr):

                async def async_method_wrapper(*args, **kwargs):
                    store = await self._ensure_connection()
                    method = getattr(store, name)
                    if asyncio.iscoroutinefunction(method):
                        return await method(*args, **kwargs)
                    else:
                        return method(*args, **kwargs)

                return async_method_wrapper
            else:
                # For properties, try to return directly
                return original_attr

        return getattr(self.store, name)

    async def __aenter__(self):
        return await self._ensure_connection()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._context_entered and hasattr(self.store_cm, "__aexit__"):
            result = await self.store_cm.__aexit__(exc_type, exc_val, exc_tb)
            self._context_entered = False
            return result


class AsyncCheckpointerWrapper:
    """Async wrapper that manages checkpointer connection lifecycle with smart delegation"""

    def __init__(self, checkpointer_cm):
        self.checkpointer_cm = checkpointer_cm
        self.checkpointer = None
        self._context_entered = False
        self._connection_lock = None

    async def _ensure_connection(self):
        """Ensure connection is established"""
        if not self._context_entered:
            if self._connection_lock is None:
                self._connection_lock = asyncio.Lock()

            async with self._connection_lock:
                if not self._context_entered:  # Double-check locking
                    if hasattr(self.checkpointer_cm, "__aenter__"):
                        self.checkpointer = await self.checkpointer_cm.__aenter__()
                    else:
                        # For non-async checkpointers wrapped in async context
                        self.checkpointer = self.checkpointer_cm
                    self._context_entered = True
                    # Setup if needed
                    if hasattr(self.checkpointer, "setup"):
                        if asyncio.iscoroutinefunction(self.checkpointer.setup):
                            await self.checkpointer.setup()
                        else:
                            self.checkpointer.setup()
        return self.checkpointer

    def __getattr__(self, name):
        """Delegate all method calls to the actual checkpointer"""
        if not self._context_entered:
            # For methods that need async context, return async wrapper
            original_attr = getattr(self.checkpointer_cm, name, None)
            if original_attr is None:
                raise AttributeError(
                    f"'{type(self.checkpointer_cm).__name__}' object has no attribute '{name}'"
                )

            # Return async wrapper for method calls
            if callable(original_attr):

                async def async_method_wrapper(*args, **kwargs):
                    checkpointer = await self._ensure_connection()
                    method = getattr(checkpointer, name)
                    if asyncio.iscoroutinefunction(method):
                        return await method(*args, **kwargs)
                    else:
                        return method(*args, **kwargs)

                return async_method_wrapper
            else:
                # For properties, try to return directly
                return original_attr

        return getattr(self.checkpointer, name)

    async def __aenter__(self):
        return await self._ensure_connection()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._context_entered and hasattr(self.checkpointer_cm, "__aexit__"):
            result = await self.checkpointer_cm.__aexit__(exc_type, exc_val, exc_tb)
            self._context_entered = False
            return result


def get_storage(
    provider: str | None = None,
    config: dict[str, Any] | None = None,
    is_async: bool = False,
) -> BaseStore:
    """Get storage instance for data persistence
    
    Args:
        provider: Storage provider type
        config: Configuration dict that can contain:
            - connection_string: Database connection string
            - index: Index configuration dict with dims, embed, fields, etc.
        is_async: Whether to return async-compatible wrapper
    """
    config = config or {}
    conn_str = config.get("connection_string", "")
    index = config.get("index")  # Extract index from config

    if not provider or provider == "memory":
        # InMemoryStore doesn't need connection management and works for both sync/async
        from langgraph.store.memory import InMemoryStore

        return InMemoryStore(index=index) if index else InMemoryStore()

    # PostgreSQL storage - needs connection management
    elif provider == "postgres":
        if not conn_str:
            raise ValueError("PostgreSQL storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.postgres.aio import AsyncPostgresStore
                store_cm = AsyncPostgresStore.from_conn_string(conn_str, index=index)
                return AsyncStoreWrapper(store_cm)
            else:
                from langgraph.store.postgres import PostgresStore
                store_cm = PostgresStore.from_conn_string(conn_str, index=index)
                return StoreWrapper(store_cm)
        except ImportError:
            raise ImportError("PostgreSQL support requires additional package")

    # Redis storage - needs connection management
    elif provider == "redis":
        if not conn_str:
            raise ValueError("Redis storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.redis.aio import AsyncRedisStore
                store_cm = AsyncRedisStore.from_conn_string(conn_str, index=index)
                return AsyncStoreWrapper(store_cm)
            else:
                from langgraph.store.redis import RedisStore
                store_cm = RedisStore.from_conn_string(conn_str, index=index)
                return StoreWrapper(store_cm)
        except ImportError:
            raise ImportError("Redis support requires additional package")

    # SQLite storage - needs connection management
    elif provider == "sqlite":
        if not conn_str:
            raise ValueError("SQLite storage requires connection_string in config")
        try:
            if is_async:
                from langgraph.store.sqlite.aio import AsyncSqliteStore
                store_cm = AsyncSqliteStore.from_conn_string(conn_str, index=index)
                return AsyncStoreWrapper(store_cm)
            else:
                from langgraph.store.sqlite import SqliteStore
                store_cm = SqliteStore.from_conn_string(conn_str, index=index)
                return StoreWrapper(store_cm)
        except ImportError:
            raise ImportError("SQLite support requires additional package")

    # MongoDB storage - needs connection management
    elif provider == "mongodb":
        if not conn_str:
            raise ValueError("MongoDB storage requires connection_string in config")
        try:
            from langgraph.store.mongodb import MongoDBStore
            
            store_cm = MongoDBStore.from_conn_string(conn_str, index=index)
            if is_async:
                return AsyncStoreWrapper(store_cm)
            else:
                return StoreWrapper(store_cm)
        except ImportError:
            raise ImportError("MongoDB support requires additional package")

    else:
        raise ValueError(f"Unsupported storage provider: {provider}")


def get_checkpointer(
    provider: str | None = None,
    config: dict[str, Any] | None = None,
    is_async: bool = False,
) -> BaseCheckpointSaver:
    """Get checkpointer instance for session management"""
    config = config or {}
    conn_str = config.get("connection_string", "")

    if not provider or provider == "memory":
        # InMemorySaver doesn't need connection management and works for both sync/async
        from langgraph.checkpoint.memory import InMemorySaver

        return InMemorySaver()  # ✅ Returns the same instance for both sync and async

    # PostgreSQL checkpointer - needs connection management
    elif provider == "postgres":
        if not conn_str:
            raise ValueError(
                "PostgreSQL checkpointer requires connection_string in config"
            )
        try:
            if is_async:
                from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

                saver_cm = AsyncPostgresSaver.from_conn_string(conn_str)
                return AsyncCheckpointerWrapper(saver_cm)
            else:
                from langgraph.checkpoint.postgres import PostgresSaver

                saver_cm = PostgresSaver.from_conn_string(conn_str)
                return CheckpointerWrapper(saver_cm)
        except ImportError:
            raise ImportError("PostgreSQL support requires additional package")

    # Redis checkpointer - needs connection management
    elif provider == "redis":
        if not conn_str:
            raise ValueError("Redis checkpointer requires connection_string in config")
        try:
            if is_async:
                from langgraph.checkpoint.redis.aio import AsyncRedisSaver

                saver_cm = AsyncRedisSaver.from_conn_string(conn_str)
                return AsyncCheckpointerWrapper(saver_cm)
            else:
                from langgraph.checkpoint.redis import RedisSaver

                saver_cm = RedisSaver.from_conn_string(conn_str)
                return CheckpointerWrapper(saver_cm)
        except ImportError:
            raise ImportError("Redis support requires additional package")

    # MongoDB checkpointer - needs connection management
    elif provider == "mongodb":
        if not conn_str:
            raise ValueError(
                "MongoDB checkpointer requires connection_string in config"
            )
        try:
            if is_async:
                from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver

                saver_cm = AsyncMongoDBSaver.from_conn_string(conn_str)
                return AsyncCheckpointerWrapper(saver_cm)
            else:
                from langgraph.checkpoint.mongodb import MongoDBSaver

                saver_cm = MongoDBSaver.from_conn_string(conn_str)
                return CheckpointerWrapper(saver_cm)
        except ImportError:
            raise ImportError("MongoDB support requires additional package")

    # MySQL checkpointer - needs connection management
    elif provider == "mysql":
        if not conn_str:
            raise ValueError("MySQL checkpointer requires connection_string in config")
        try:
            from langgraph.checkpoint.mysql.pymysql import PyMySQLSaver

            if is_async:
                import logging

                logging.warning(
                    "MySQL checkpointer does not have async version, using sync version wrapped in async context manager"
                )
                saver_cm = PyMySQLSaver.from_conn_string(conn_str)
                return AsyncCheckpointerWrapper(saver_cm)  # ✅ Changed to use wrapper
            else:
                saver_cm = PyMySQLSaver.from_conn_string(conn_str)
                return CheckpointerWrapper(saver_cm)  # ✅ Changed to use wrapper
        except ImportError:
            raise ImportError("MySQL support requires additional package")

    else:
        raise ValueError(f"Unsupported checkpointer provider: {provider}")
