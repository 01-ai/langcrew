"""Memory context management for LangCrew"""

from contextlib import asynccontextmanager, contextmanager
from typing import Any
from collections.abc import Callable, AsyncGenerator, Generator

from .factory import get_store, get_checkpointer


class MemoryContextManager:
    """Unified memory context management with smart lifecycle handling"""

    def __init__(self, memory_config=None):
        self.memory_config = memory_config
        self._memory_checkpointer = None
        self._memory_store = None

        # Initialize memory provider instances for reuse
        self._initialize_memory_instances()

    def _initialize_memory_instances(self):
        """Initialize memory provider instances for reuse"""
        if not self.memory_config:
            return

        # Create checkpointer instance (if memory provider)
        if self.memory_config.short_term.enabled:
            short_term_provider = self.memory_config.get_short_term_provider()
            if short_term_provider == "memory":
                checkpointer_config = self.memory_config.to_checkpointer_config()
                self._memory_checkpointer = get_checkpointer(
                    short_term_provider, checkpointer_config, is_async=False
                )

        # Create store instance (if memory provider)
        if self.memory_config.long_term.enabled:
            long_term_provider = self.memory_config.get_long_term_provider()
            if long_term_provider == "memory":
                store_config = self.memory_config.to_store_config()
                self._memory_store = get_store(
                    long_term_provider, store_config, is_async=False
                )

    def _get_memory_instances(self):
        """Get memory provider instances directly"""
        return self._memory_checkpointer, self._memory_store

    def _get_database_context_managers(self, is_async: bool = False):
        """Get database provider context managers"""
        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            if self.memory_config.short_term.enabled:
                short_term_provider = self.memory_config.get_short_term_provider()
                if short_term_provider != "memory":  # Non-memory provider
                    checkpointer_config = self.memory_config.to_checkpointer_config()
                    checkpointer_cm = get_checkpointer(
                        short_term_provider,
                        checkpointer_config,
                        is_async=is_async,
                    )

            if self.memory_config.long_term.enabled:
                long_term_provider = self.memory_config.get_long_term_provider()
                if long_term_provider != "memory":  # Non-memory provider
                    store_config = self.memory_config.to_store_config()
                    store_cm = get_store(
                        long_term_provider,
                        store_config,
                        is_async=is_async,
                    )

        return checkpointer_cm, store_cm

    def _has_memory_providers(self) -> bool:
        """Check if any provider is memory type"""
        if not self.memory_config:
            return False

        has_memory_checkpointer = (
            self.memory_config.short_term.enabled
            and self.memory_config.get_short_term_provider() == "memory"
        )
        has_memory_store = (
            self.memory_config.long_term.enabled
            and self.memory_config.get_long_term_provider() == "memory"
        )

        return has_memory_checkpointer or has_memory_store

    async def _setup_async(self, checkpointer, store):
        """Setup database structures if needed (async version)"""
        if checkpointer and hasattr(checkpointer, "setup"):
            await checkpointer.setup()
        if store and hasattr(store, "setup"):
            await store.setup()

    def _setup_sync(self, checkpointer, store):
        """Setup database structures if needed (sync version)"""
        if checkpointer and hasattr(checkpointer, "setup"):
            checkpointer.setup()
        if store and hasattr(store, "setup"):
            store.setup()

    def _resolve_final_providers(
        self, memory_checkpointer, memory_store, db_checkpointer=None, db_store=None
    ):
        """
        Resolve final checkpointer and store instances.

        Priority: database provider > memory provider > None
        This ensures database providers take precedence when both are configured.
        """
        final_checkpointer = db_checkpointer or memory_checkpointer
        final_store = db_store or memory_store
        return final_checkpointer, final_store

    # ========== UNIFIED CONTEXT MANAGERS ==========

    @asynccontextmanager
    async def _get_async_context(self):
        """
        Unified async context manager for resource management.

        This context manager handles both mixed mode (memory + database) and
        pure database mode configurations, ensuring proper resource lifecycle.
        """
        if self._has_memory_providers():
            # Mixed mode: memory singletons + database resources
            memory_checkpointer, memory_store = self._get_memory_instances()
            db_checkpointer_cm, db_store_cm = self._get_database_context_managers(
                is_async=True
            )

            if db_checkpointer_cm and db_store_cm:
                async with (
                    db_checkpointer_cm as db_checkpointer,
                    db_store_cm as db_store,
                ):
                    await self._setup_async(db_checkpointer, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer, memory_store, db_checkpointer, db_store
                    )
                    yield final_checkpointer, final_store
            elif db_checkpointer_cm:
                async with db_checkpointer_cm as db_checkpointer:
                    await self._setup_async(db_checkpointer, None)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer, memory_store, db_checkpointer, None
                    )
                    yield final_checkpointer, final_store
            elif db_store_cm:
                async with db_store_cm as db_store:
                    await self._setup_async(None, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer, memory_store, None, db_store
                    )
                    yield final_checkpointer, final_store
            else:
                # Pure memory provider - use singletons directly
                yield memory_checkpointer, memory_store
        else:
            # Pure database provider mode - create new resources each time
            db_checkpointer_cm, db_store_cm = self._get_database_context_managers(
                is_async=True
            )

            if db_checkpointer_cm and db_store_cm:
                async with db_checkpointer_cm as checkpointer, db_store_cm as store:
                    await self._setup_async(checkpointer, store)
                    yield checkpointer, store
            elif db_checkpointer_cm:
                async with db_checkpointer_cm as checkpointer:
                    await self._setup_async(checkpointer, None)
                    yield checkpointer, None
            elif db_store_cm:
                async with db_store_cm as store:
                    await self._setup_async(None, store)
                    yield None, store
            else:
                yield None, None

    @contextmanager
    def _get_sync_context(self):
        """
        Unified sync context manager for resource management.

        Mirror of the async version but for synchronous operations.
        Handles the same mixed/pure database configurations.
        """
        if self._has_memory_providers():
            # Mixed mode: memory singletons + database resources
            memory_checkpointer, memory_store = self._get_memory_instances()
            db_checkpointer_cm, db_store_cm = self._get_database_context_managers(
                is_async=False
            )

            if db_checkpointer_cm and db_store_cm:
                with db_checkpointer_cm as db_checkpointer, db_store_cm as db_store:
                    self._setup_sync(db_checkpointer, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer, memory_store, db_checkpointer, db_store
                    )
                    yield final_checkpointer, final_store
            elif db_checkpointer_cm:
                with db_checkpointer_cm as db_checkpointer:
                    self._setup_sync(db_checkpointer, None)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer, memory_store, db_checkpointer, None
                    )
                    yield final_checkpointer, final_store
            elif db_store_cm:
                with db_store_cm as db_store:
                    self._setup_sync(None, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer, memory_store, None, db_store
                    )
                    yield final_checkpointer, final_store
            else:
                # Pure memory provider - use singletons directly
                yield memory_checkpointer, memory_store
        else:
            # Pure database provider mode - create new resources each time
            db_checkpointer_cm, db_store_cm = self._get_database_context_managers(
                is_async=False
            )

            if db_checkpointer_cm and db_store_cm:
                with db_checkpointer_cm as checkpointer, db_store_cm as store:
                    self._setup_sync(checkpointer, store)
                    yield checkpointer, store
            elif db_checkpointer_cm:
                with db_checkpointer_cm as checkpointer:
                    self._setup_sync(checkpointer, None)
                    yield checkpointer, None
            elif db_store_cm:
                with db_store_cm as store:
                    self._setup_sync(None, store)
                    yield None, store
            else:
                yield None, None

    # ========== SIMPLIFIED PUBLIC EXECUTION METHODS ==========

    async def execute_async(self, execution_func: Callable) -> Any:
        """
        Execute async function with smart memory context handling.

        Uses unified async context manager for proper resource management.
        """
        async with self._get_async_context() as (checkpointer, store):
            return await execution_func(checkpointer, store)

    def execute_sync(self, execution_func: Callable) -> Any:
        """
        Execute sync function with smart memory context handling.

        Uses unified sync context manager for proper resource management.
        """
        with self._get_sync_context() as (checkpointer, store):
            return execution_func(checkpointer, store)

    async def execute_async_generator(self, execution_func: Callable) -> AsyncGenerator:
        """
        Execute async generator function with memory context.

        Uses unified async context manager to ensure resources remain
        available throughout the generator's lifetime.
        """
        async with self._get_async_context() as (checkpointer, store):
            async for item in execution_func(checkpointer, store):
                yield item

    def execute_sync_generator(self, execution_func: Callable) -> Generator:
        """
        Execute sync generator function with memory context.

        Uses unified sync context manager to ensure resources remain
        available throughout the generator's lifetime.
        """
        with self._get_sync_context() as (checkpointer, store):
            yield from execution_func(checkpointer, store)
