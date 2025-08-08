"""
Test cases for SandboxMixin class
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any

from e2b import AsyncSandbox
from langcrew_tools.utils.sandbox.base_sandbox import SandboxMixin
from langcrew_tools.utils.sandbox.toolkit import SandboxToolkit


class SandboxManagerForTesting(SandboxMixin):
    """Test implementation of SandboxMixin for testing purposes"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class TestSandboxMixin:
    """Test suite for SandboxMixin class"""

    @pytest.fixture
    def mock_async_sandbox(self):
        """Create a mock AsyncSandbox instance"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.id = "test-sandbox-id"
        return mock_sandbox

    @pytest.fixture
    def sandbox_manager(self):
        """Create a test sandbox manager instance"""
        return SandboxManagerForTesting()

    @pytest.mark.asyncio
    async def test_get_sandbox_with_callable_provider(self, mock_async_sandbox):
        """Test get_sandbox method with callable async_sandbox_provider"""
        # Create a callable that returns the mock sandbox
        async def provider():
            return mock_async_sandbox
        
        # Create manager with callable provider
        manager = SandboxManagerForTesting(async_sandbox_provider=provider)
        
        # Test get_sandbox
        result = await manager.get_sandbox()
        
        # Assertions
        assert result is mock_async_sandbox
        assert manager._sandbox is mock_async_sandbox

    @pytest.mark.asyncio
    async def test_get_sandbox_with_sandbox_instance(self, mock_async_sandbox):
        """Test get_sandbox method with AsyncSandbox instance as provider"""
        # Create manager with AsyncSandbox instance
        manager = SandboxManagerForTesting(async_sandbox_provider=mock_async_sandbox)
        
        # Test get_sandbox
        result = await manager.get_sandbox()
        
        # Assertions
        assert result is mock_async_sandbox
        assert manager._sandbox is mock_async_sandbox

    @pytest.mark.asyncio
    async def test_get_sandbox_with_config_dict_create(self, mock_async_sandbox):
        """Test get_sandbox method with config dict (create new sandbox)"""
        config = {"template": "base", "timeout": 60}
        
        with patch.object(SandboxToolkit, 'create_async_sandbox', return_value=mock_async_sandbox) as mock_create:
            # Create manager with config dict
            manager = SandboxManagerForTesting(async_sandbox_provider=config)
            
            # Test get_sandbox
            result = await manager.get_sandbox()
            
            # Assertions
            assert result is mock_async_sandbox
            assert manager._sandbox is mock_async_sandbox
            mock_create.assert_called_once_with(config)

    @pytest.mark.asyncio
    async def test_get_sandbox_with_config_dict_connect_resume(self, mock_async_sandbox):
        """Test get_sandbox method with config dict containing sandbox_id (connect/resume)"""
        config = {"sandbox_id": "existing-sandbox-123", "timeout": 60}
        
        with patch.object(SandboxToolkit, 'connect_or_resume_async_sandbox', return_value=mock_async_sandbox) as mock_connect:
            # Create manager with config dict containing sandbox_id
            manager = SandboxManagerForTesting(async_sandbox_provider=config)
            
            # Test get_sandbox
            result = await manager.get_sandbox()
            
            # Assertions
            assert result is mock_async_sandbox
            assert manager._sandbox is mock_async_sandbox
            mock_connect.assert_called_once_with(config)

    @pytest.mark.asyncio
    async def test_get_sandbox_with_none_provider(self, mock_async_sandbox):
        """Test get_sandbox method with None provider (default empty config)"""
        with patch.object(SandboxToolkit, 'create_async_sandbox', return_value=mock_async_sandbox) as mock_create:
            # Create manager with None provider
            manager = SandboxManagerForTesting(async_sandbox_provider=None)
            
            # Test get_sandbox
            result = await manager.get_sandbox()
            
            # Assertions
            assert result is mock_async_sandbox
            assert manager._sandbox is mock_async_sandbox
            mock_create.assert_called_once_with({})

    @pytest.mark.asyncio
    async def test_get_sandbox_caching_behavior(self, mock_async_sandbox):
        """Test that get_sandbox caches the sandbox instance"""
        # Create a callable that returns the mock sandbox
        async def provider():
            return mock_async_sandbox
        
        # Create manager with callable provider
        manager = SandboxManagerForTesting(async_sandbox_provider=provider)
        
        # Call get_sandbox multiple times
        result1 = await manager.get_sandbox()
        result2 = await manager.get_sandbox()
        result3 = await manager.get_sandbox()
        
        # All results should be the same instance
        assert result1 is mock_async_sandbox
        assert result2 is mock_async_sandbox
        assert result3 is mock_async_sandbox
        assert result1 is result2 is result3
        
        # The provider should only be called once due to caching
        assert manager._sandbox is mock_async_sandbox

    @pytest.mark.asyncio
    async def test_get_sandbox_with_invalid_callable(self):
        """Test get_sandbox method with callable that raises exception"""
        async def failing_provider():
            raise ValueError("Provider failed")
        
        # Create manager with failing callable provider
        manager = SandboxManagerForTesting(async_sandbox_provider=failing_provider)
        
        # Test that exception is propagated
        with pytest.raises(ValueError, match="Provider failed"):
            await manager.get_sandbox()

    @pytest.mark.asyncio
    async def test_get_sandbox_toolkit_create_failure(self):
        """Test get_sandbox method when SandboxToolkit.create_async_sandbox fails"""
        config = {"template": "base"}
        
        with patch.object(SandboxToolkit, 'create_async_sandbox', side_effect=Exception("Creation failed")):
            # Create manager with config dict
            manager = SandboxManagerForTesting(async_sandbox_provider=config)
            
            # Test that exception is propagated
            with pytest.raises(Exception, match="Creation failed"):
                await manager.get_sandbox()

    @pytest.mark.asyncio
    async def test_get_sandbox_toolkit_connect_resume_failure(self):
        """Test get_sandbox method when SandboxToolkit.connect_or_resume_async_sandbox fails"""
        config = {"sandbox_id": "existing-sandbox-123"}
        
        with patch.object(SandboxToolkit, 'connect_or_resume_async_sandbox', side_effect=Exception("Connection failed")):
            # Create manager with config dict containing sandbox_id
            manager = SandboxManagerForTesting(async_sandbox_provider=config)
            
            # Test that exception is propagated
            with pytest.raises(Exception, match="Connection failed"):
                await manager.get_sandbox()

    def test_base_sandbox_manager_initialization(self):
        """Test SandboxMixin initialization with different parameters"""
        # Test with no parameters (default None)
        manager1 = SandboxManagerForTesting()
        assert manager1.async_sandbox_provider is None
        assert manager1._sandbox is None
        
        # Test with callable provider
        async def provider():
            return AsyncMock()
        
        manager2 = SandboxManagerForTesting(async_sandbox_provider=provider)
        assert manager2.async_sandbox_provider is provider
        assert manager2._sandbox is None
        
        # Test with config dict
        config = {"template": "base"}
        manager3 = SandboxManagerForTesting(async_sandbox_provider=config)
        assert manager3.async_sandbox_provider == config
        assert manager3._sandbox is None

    @pytest.mark.asyncio
    async def test_multiple_managers_independent_caching(self, mock_async_sandbox):
        """Test that different manager instances have independent sandbox caching"""
        mock_sandbox2 = AsyncMock(spec=AsyncSandbox)
        mock_sandbox2.id = "test-sandbox-id-2"
        
        # Create two managers with different providers
        async def provider1():
            return mock_async_sandbox
            
        async def provider2():
            return mock_sandbox2
        
        manager1 = SandboxManagerForTesting(async_sandbox_provider=provider1)
        manager2 = SandboxManagerForTesting(async_sandbox_provider=provider2)
        
        # Get sandboxes from both managers
        result1 = await manager1.get_sandbox()
        result2 = await manager2.get_sandbox()
        
        # Each manager should have its own cached sandbox
        assert result1 is mock_async_sandbox
        assert result2 is mock_sandbox2
        assert result1 is not result2
        assert manager1._sandbox is mock_async_sandbox
        assert manager2._sandbox is mock_sandbox2