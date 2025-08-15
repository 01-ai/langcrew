# Import core modules only when needed, avoiding forced dependencies that could prevent package usage
__all__ = [
    "Agent",
    "Task",
    "Crew",
    "LLMFactory",
    "PromptBuilder",
    # CrewAI-style decorators
    "CrewBase",
    "agent",
    "task",
    "crew",
]

try:
    from .agent import Agent
    from .crew import Crew
    from .llm_factory import LLMFactory
    from .project import CrewBase, agent, crew, task
    from .prompt_builder import PromptBuilder
    from .task import Task
except ImportError as e:
    # If core module dependencies are unavailable, at least allow the web submodule to work independently
    import warnings

    warnings.warn(f"Core modules unavailable: {e}. Web module can still be used.")
    __all__ = []
