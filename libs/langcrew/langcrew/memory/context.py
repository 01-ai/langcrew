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
        user_checkpointer=None,
        user_store=None,
        user_async_checkpointer=None,
        user_async_store=None,
    ):
        self.memory_config = memory_config

        # Lazy initialization cache for memory instances
        self._memory_checkpointer = None
        self._memory_store = None
        self._memory_instances_initialized = False

        # User-provided instances (user manages lifecycle)
        self._user_checkpointer = user_checkpointer
        self._user_store = user_store
        self._user_async_checkpointer = user_async_checkpointer
        self._user_async_store = user_async_store

        # Don't initialize memory instances at init time, defer until needed

    def _initialize_memory_instances(self):
        """Initialize memory provider instances only when needed"""
        if not self.memory_config:
            return

        # Create checkpointer instance (if memory provider AND user didn't provide equivalent)
        if self.memory_config.short_term.enabled and not self._has_user_checkpointer():
            short_term_provider = self.memory_config.get_short_term_provider()
            if short_term_provider == "memory":
                checkpointer_config = self.memory_config.to_checkpointer_config()
                self._memory_checkpointer = get_checkpointer(
                    short_term_provider, checkpointer_config, is_async=False
                )

        # Create store instance (if memory provider AND user didn't provide equivalent)
        if self.memory_config.long_term.enabled and not self._has_user_store():
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

    def _has_user_checkpointer(self) -> bool:
        """Check if user provided any checkpointer"""
        return (
            self._user_checkpointer is not None
            or self._user_async_checkpointer is not None
        )

    def _has_user_store(self) -> bool:
        """Check if user provided any store"""
        return self._user_store is not None or self._user_async_store is not None

    def _get_user_instances(self, is_async: bool = False):
        """Get user-provided instances based on execution mode"""
        if is_async:
            return self._user_async_checkpointer, self._user_async_store
        else:
            return self._user_checkpointer, self._user_store

    def _get_database_context_managers(self, is_async: bool = False):
        """Get database provider context managers, skip if user provided equivalent"""
        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            # Only create database checkpointer if user didn't provide one
            if (
                self.memory_config.short_term.enabled
                and not self._has_user_checkpointer()
            ):
                short_term_provider = self.memory_config.get_short_term_provider()
                if short_term_provider != "memory":  # Non-memory provider
                    checkpointer_config = self.memory_config.to_checkpointer_config()
                    checkpointer_cm = get_checkpointer(
                        short_term_provider,
                        checkpointer_config,
                        is_async=is_async,
                    )

            # Only create database store if user didn't provide one
            if self.memory_config.long_term.enabled and not self._has_user_store():
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
        """Check if any provider is memory type (considering user overrides)"""
        if not self.memory_config:
            return False

        # If user provided checkpointer, we don't need memory checkpointer
        has_memory_checkpointer = (
            self.memory_config.short_term.enabled
            and self.memory_config.get_short_term_provider() == "memory"
            and not self._has_user_checkpointer()
        )

        # If user provided store, we don't need memory store
        has_memory_store = (
            self.memory_config.long_term.enabled
            and self.memory_config.get_long_term_provider() == "memory"
            and not self._has_user_store()
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
        user_checkpointer=None,
        user_store=None,
    ):
        """
        Resolve final checkpointer and store instances with clear priority.

        Priority: user-provided > database provider > memory provider > None
        """
        final_checkpointer = user_checkpointer or db_checkpointer or memory_checkpointer
        final_store = user_store or db_store or memory_store
        return final_checkpointer, final_store

    # ========== UNIFIED CONTEXT MANAGERS ==========

    @asynccontextmanager
    async def _get_async_context(self):
        """Unified async context manager with user instance support"""
        user_checkpointer, user_store = self._get_user_instances(is_async=True)

        # Check if we need to manage any resources (memory or database)
        needs_managed_resources = self._has_memory_providers()
        has_user_resources = user_checkpointer is not None or user_store is not None

        if needs_managed_resources or has_user_resources:
            # Mixed mode: managed resources + user-provided instances
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
                        user_checkpointer,
                        user_store,
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
                        user_checkpointer,
                        user_store,
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
                        user_checkpointer,
                        user_store,
                    )
                    yield final_checkpointer, final_store
            else:
                # Pure memory provider or user-provided instances
                final_checkpointer, final_store = self._resolve_final_providers(
                    memory_checkpointer,
                    memory_store,
                    None,
                    None,
                    user_checkpointer,
                    user_store,
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
        """Unified sync context manager with user instance support"""
        user_checkpointer, user_store = self._get_user_instances(is_async=False)

        # Check if we need to manage any resources (memory or database)
        needs_managed_resources = self._has_memory_providers()
        has_user_resources = user_checkpointer is not None or user_store is not None

        if needs_managed_resources or has_user_resources:
            # Mixed mode: managed resources + user-provided instances
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
                        user_checkpointer,
                        user_store,
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
                        user_checkpointer,
                        user_store,
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
                        user_checkpointer,
                        user_store,
                    )
                    yield final_checkpointer, final_store
            else:
                # Pure memory provider or user-provided instances
                final_checkpointer, final_store = self._resolve_final_providers(
                    memory_checkpointer,
                    memory_store,
                    None,
                    None,
                    user_checkpointer,
                    user_store,
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
