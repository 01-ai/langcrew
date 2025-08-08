from langcrew import Agent, Crew
from langcrew.project import CrewBase, agent, crew


@CrewBase
class AgentsCrew:
    """GameBuilder crew"""

    agents_config = "config/agent/agents.yaml"

    @agent
    def chief_qa_engineer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["chief_qa_engineer_agent"],
            verbose=True,
        )

    @agent
    def senior_engineer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["senior_engineer_agent"],
            verbose=True,
        )

    @agent
    def qa_engineer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["qa_engineer_agent"],
            verbose=True,
        )

    @crew
    def crew(self) -> Crew:
        """Creates the GameBuilderCrew with handoff support"""
        return Crew(
            agents=self.agents,
            verbose=True,
        )
