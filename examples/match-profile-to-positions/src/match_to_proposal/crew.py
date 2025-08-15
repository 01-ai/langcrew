"""Match Profile to Positions Crew - Simplified with auto-config"""

from langcrew import Crew
from langcrew.project import CrewBase, crew


@CrewBase
class MatchProfileCrew:
    """Crew for matching CV profiles to job positions

    All agents, tasks, and tools are automatically created from configuration files.
    No need for manual @agent, @task decorators or tool registration!
    """

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @crew
    def crew(self) -> Crew:
        """Create and return the crew instance."""
        return Crew(agents=self.agents, tasks=self.tasks, verbose=True)
