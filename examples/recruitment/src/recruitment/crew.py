from langchain_community.document_loaders import WebBaseLoader
from langchain_community.tools import Tool
from langchain_community.utilities import GoogleSerperAPIWrapper
from langcrew import Agent, Crew, Task
from langcrew.llm_factory import LLMFactory
from langcrew.project import CrewBase, agent, crew, task
from langcrew.tools.converter import convert_tools
from langcrew_tools.fetch.langchain_tools import WebFetchTool

from recruitment.tools.linkedin import LinkedInTool


# Simple tool conversion function
def get_research_tools():
    """Get converted research tools"""
    return convert_tools([LinkedInTool()]) + [
        WebFetchTool(),
        _create_serper_search_tool(),
    ]


def get_matching_tools():
    """Get converted matching tools"""
    return [_create_web_fetch_tool(), _create_serper_search_tool()]


def _create_serper_search_tool() -> Tool:
    search = GoogleSerperAPIWrapper()

    return Tool(
        name="web_search",
        description=(
            "Perform web search to obtain the latest information related to the query. "
            "Returns search results containing titles, URLs and snippets. "
            "Input should be a search query string."
        ),
        func=search.run,
    )


def _create_web_fetch_tool() -> Tool:
    def fetch_url(url: str) -> str:
        try:
            loader = WebBaseLoader(web_paths=[url])
            docs = loader.load()
            if docs:
                content = docs[0].page_content
                if len(content) > 50000:
                    content = content[:50000] + "\n\n[Content truncated...]"
                return content
            return "No content extracted from the webpage."
        except Exception as e:
            return f"Error fetching webpage: {str(e)}"

    return Tool(
        name="web_fetch",
        description=(
            "Crawl a web page and extract its content in text format. "
            "Automatically filters out navigation, ads, and other irrelevant content. "
            "Input should be a valid URL string."
        ),
        func=fetch_url,
    )


@CrewBase
class RecruitmentCrew:
    """Recruitment crew"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm({
            "provider": "openai",
            "model": "gpt-5-mini",
        })

    @agent
    def researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["researcher"],
            tools=get_research_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def matcher(self) -> Agent:
        return Agent(
            config=self.agents_config["matcher"],
            tools=get_matching_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def communicator(self) -> Agent:
        return Agent(
            config=self.agents_config["communicator"],
            tools=get_matching_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def reporter(self) -> Agent:
        return Agent(
            config=self.agents_config["reporter"],
            llm=self._get_default_llm(),
            verbose=True,
            # allow_delegation=False,
        )

    @task
    def research_candidates_task(self) -> Task:
        return Task(
            config=self.tasks_config["research_candidates_task"],
            agent=self.researcher(),
        )

    @task
    def match_and_score_candidates_task(self) -> Task:
        return Task(
            config=self.tasks_config["match_and_score_candidates_task"],
            agent=self.matcher(),
        )

    @task
    def outreach_strategy_task(self) -> Task:
        return Task(
            config=self.tasks_config["outreach_strategy_task"],
            agent=self.communicator(),
        )

    @task
    def report_candidates_task(self) -> Task:
        return Task(
            config=self.tasks_config["report_candidates_task"],
            agent=self.reporter(),
            context=[
                self.research_candidates_task(),
                self.match_and_score_candidates_task(),
                self.outreach_strategy_task(),
            ],
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Recruitment crew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
