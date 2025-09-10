"""Memory context management for LangCrew"""

from typing import Any, Callable, AsyncGenerator, Generator
from contextlib import asynccontextmanager, contextmanager

from .factory import get_store, get_checkpointer


class MemoryContextManager:
    """Unified memory context management for checkpointer and store"""
    
    def __init__(self, memory_config=None):
        self.memory_config = memory_config
        
    def _get_context_managers(self, is_async: bool = False):
        """Get checkpointer and store context managers"""
        checkpointer_cm = None
        store_cm = None
        
        if self.memory_config:
            if self.memory_config.short_term.enabled:
                checkpointer_config = self.memory_config.to_checkpointer_config()
                checkpointer_cm = get_checkpointer(
                    self.memory_config.get_short_term_provider(),
                    checkpointer_config,
                    is_async=is_async,
                )
            
            if self.memory_config.long_term.enabled:
                store_config = self.memory_config.to_store_config()
                store_cm = get_store(
                    self.memory_config.get_long_term_provider(),
                    store_config,
                    is_async=is_async,
                )
        
        return checkpointer_cm, store_cm
    
    async def _setup_async(self, checkpointer, store):
        """Setup database structures if needed (async version)"""
        if checkpointer and hasattr(checkpointer, 'setup'):
            await checkpointer.setup()
        if store and hasattr(store, 'setup'):
            await store.setup()
    
    def _setup_sync(self, checkpointer, store):
        """Setup database structures if needed (sync version)"""
        if checkpointer and hasattr(checkpointer, 'setup'):
            checkpointer.setup()
        if store and hasattr(store, 'setup'):
            store.setup()
    
    @asynccontextmanager
    async def async_context(self):
        """Async context manager for memory components"""
        checkpointer_cm, store_cm = self._get_context_managers(is_async=True)
        
        if checkpointer_cm and store_cm:
            async with checkpointer_cm as checkpointer, store_cm as store:
                await self._setup_async(checkpointer, store)
                yield checkpointer, store
        elif checkpointer_cm:
            async with checkpointer_cm as checkpointer:
                await self._setup_async(checkpointer, None)
                yield checkpointer, None
        elif store_cm:
            async with store_cm as store:
                await self._setup_async(None, store)
                yield None, store
        else:
            yield None, None
    
    @contextmanager
    def sync_context(self):
        """Sync context manager for memory components"""
        checkpointer_cm, store_cm = self._get_context_managers(is_async=False)
        
        if checkpointer_cm and store_cm:
            with checkpointer_cm as checkpointer, store_cm as store:
                self._setup_sync(checkpointer, store)
                yield checkpointer, store
        elif checkpointer_cm:
            with checkpointer_cm as checkpointer:
                self._setup_sync(checkpointer, None)
                yield checkpointer, None
        elif store_cm:
            with store_cm as store:
                self._setup_sync(None, store)
                yield None, store
        else:
            yield None, None
    
    async def execute_async(self, execution_func: Callable) -> Any:
        """Execute async function with memory context"""
        async with self.async_context() as (checkpointer, store):
            return await execution_func(checkpointer, store)
    
    async def execute_async_generator(self, execution_func: Callable) -> AsyncGenerator:
        """Execute async generator function with memory context"""
        async with self.async_context() as (checkpointer, store):
            async for item in execution_func(checkpointer, store):
                yield item
    
    def execute_sync(self, execution_func: Callable) -> Any:
        """Execute sync function with memory context"""
        with self.sync_context() as (checkpointer, store):
            return execution_func(checkpointer, store)
    
    def execute_sync_generator(self, execution_func: Callable) -> Generator:
        """Execute sync generator function with memory context"""
        with self.sync_context() as (checkpointer, store):
            yield from execution_func(checkpointer, store)