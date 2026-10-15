"""
Workflow module for LangCrew.

Provides workflow-based agent orchestration compatible with visual builders.
"""

from .config import WorkflowConfig, WorkflowEdgeConfig, WorkflowNodeConfig

__all__ = ["WorkflowConfig", "WorkflowNodeConfig", "WorkflowEdgeConfig"]
