"""Memory context management for LangCrew"""

from collections.abc import AsyncGenerator, Callable, Generator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

from .factory import get_checkpointer, get_store


class MemoryContextManager:
    """Unified memory context management with smart lifecycle handling"""

    def __init__(
        self,
        memory_config=None,
    ):
        self.memory_config = memory_config

        # Lazy initialization cache for memory instances
        self._memory_checkpointer = None
        self._memory_store = None
        self._memory_instances_initialized = False

        # Don't initialize memory instances at init time, defer until needed

    def _initialize_memory_instances(self):
        """Initialize memory provider instances only when needed"""
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
        """Get memory provider instances with lazy initialization"""
        if not self._memory_instances_initialized:
            self._initialize_memory_instances()
            self._memory_instances_initialized = True
        return self._memory_checkpointer, self._memory_store

    def _get_database_context_managers(self, is_async: bool = False):
        """Get database provider context managers"""
        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            # Create database checkpointer
            if self.memory_config.short_term.enabled:
                short_term_provider = self.memory_config.get_short_term_provider()
                if short_term_provider != "memory":  # Non-memory provider
                    checkpointer_config = self.memory_config.to_checkpointer_config()
                    checkpointer_cm = get_checkpointer(
                        short_term_provider,
                        checkpointer_config,
                        is_async=is_async,
                    )

            # Create database store
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

        # Check memory checkpointer
        has_memory_checkpointer = (
            self.memory_config.short_term.enabled
            and self.memory_config.get_short_term_provider() == "memory"
        )

        # Check memory store
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
        self,
        memory_checkpointer,
        memory_store,
        db_checkpointer=None,
        db_store=None,
    ):
        """
        Resolve final checkpointer and store instances with clear priority.

        Priority: database provider > memory provider > None
        """
        final_checkpointer = db_checkpointer or memory_checkpointer
        final_store = db_store or memory_store
        return final_checkpointer, final_store

    # ========== UNIFIED CONTEXT MANAGERS ==========

    @asynccontextmanager
    async def _get_async_context(self):
        """Unified async context manager"""
        # Check if we need to manage any resources (memory or database)
        needs_managed_resources = self._has_memory_providers()

        if needs_managed_resources:
            # Mixed mode: managed resources
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
                        memory_checkpointer,
                        memory_store,
                        db_checkpointer,
                        db_store,
                    )
                    yield final_checkpointer, final_store
            elif db_checkpointer_cm:
                async with db_checkpointer_cm as db_checkpointer:
                    await self._setup_async(db_checkpointer, None)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer,
                        memory_store,
                        db_checkpointer,
                        None,
                    )
                    yield final_checkpointer, final_store
            elif db_store_cm:
                async with db_store_cm as db_store:
                    await self._setup_async(None, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer,
                        memory_store,
                        None,
                        db_store,
                    )
                    yield final_checkpointer, final_store
            else:
                # Pure memory provider
                final_checkpointer, final_store = self._resolve_final_providers(
                    memory_checkpointer,
                    memory_store,
                    None,
                    None,
                )
                yield final_checkpointer, final_store
        else:
            # Pure database provider mode
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
        """Unified sync context manager"""
        # Check if we need to manage any resources (memory or database)
        needs_managed_resources = self._has_memory_providers()

        if needs_managed_resources:
            # Mixed mode: managed resources
            memory_checkpointer, memory_store = self._get_memory_instances()
            db_checkpointer_cm, db_store_cm = self._get_database_context_managers(
                is_async=False
            )

            if db_checkpointer_cm and db_store_cm:
                with db_checkpointer_cm as db_checkpointer, db_store_cm as db_store:
                    self._setup_sync(db_checkpointer, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer,
                        memory_store,
                        db_checkpointer,
                        db_store,
                    )
                    yield final_checkpointer, final_store
            elif db_checkpointer_cm:
                with db_checkpointer_cm as db_checkpointer:
                    self._setup_sync(db_checkpointer, None)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer,
                        memory_store,
                        db_checkpointer,
                        None,
                    )
                    yield final_checkpointer, final_store
            elif db_store_cm:
                with db_store_cm as db_store:
                    self._setup_sync(None, db_store)
                    final_checkpointer, final_store = self._resolve_final_providers(
                        memory_checkpointer,
                        memory_store,
                        None,
                        db_store,
                    )
                    yield final_checkpointer, final_store
            else:
                # Pure memory provider
                final_checkpointer, final_store = self._resolve_final_providers(
                    memory_checkpointer,
                    memory_store,
                    None,
                    None,
                )
                yield final_checkpointer, final_store
        else:
            # Pure database provider mode
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
