"""
Vector Toolkit Module

Provides unified vector functionality for storage and retrieval operations.
This module centralizes all vector dependencies to avoid duplication across tools.
"""

# Conditionally import vector modules
try:
    from .config import EmbeddingResult, VectorConfig
    from .exceptions import VectorError
    from .manager import VectorManager, create_vector_manager
    
    vector_available = True
    
    __all__ = [
        # Primary interface
        'VectorManager',
        'create_vector_manager',
        
        # Configuration and data types
        'VectorConfig',
        'EmbeddingResult',
        
        # Exceptions
        'VectorError',
        
        # Availability flag
        'vector_available',
    ]
    
except ImportError as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Vector dependencies not available: {e}")
    
    vector_available = False
    
    # Provide stub implementations to avoid import errors
    VectorManager = None
    create_vector_manager = None
    VectorConfig = None
    EmbeddingResult = None
    VectorError = Exception
    
    __all__ = [
        'vector_available',
        'VectorManager',
        'create_vector_manager',
        'VectorConfig',
        'EmbeddingResult',
        'VectorError',
    ]