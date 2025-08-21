# AI Crew for Deep Research
## Introduction
This project demonstrates the use of the LangCrew framework to automate a deep research workflow. LangCrew orchestrates autonomous AI agents to search the web, fetch long-form content, analyze evidence, fact-check, and synthesize a comprehensive report.

Based on [@joaomdmoura](https://x.com/joaomdmoura)'s CrewAI example, enhanced with LangCrew.

- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)
- [License](#license)

## Running the Script
It uses gpt-4o-mini by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-4o-mini unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Copy `.env.example` to `.env` and set up environment variables:
  - `OPENAI_API_KEY`: Your [OpenAI API key](https://platform.openai.com/api-keys)
  - Web Search and Web Fetch tool configuration (see `.env.example` for details)
- **Install Dependencies**: Run `uv sync --prerelease=allow` to install all dependencies.
- **Customize**: Modify `src/deep_research/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/deep_research/config/agents.yaml` to update your agents and `src/deep_research/config/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run --prerelease=allow deep_research` or `source .venv/bin/activate && deep_research` and input your project details.

## Details & Explanation
- **Running the Script**: Execute `uv run --prerelease=allow deep_research`. The script will leverage the LangCrew framework to generate a detailed research report for your topic.
- **Key Components**:
  - `src/deep_research/main.py`: Entry point with example inputs and workflow kickoff.
  - `src/deep_research/crew.py`: Crew definition where agents, tasks, and tools are assembled.
  - `src/deep_research/config/agents.yaml`: Definitions for the Planner, Researcher, Fact Checker, and Writer agents.
  - `src/deep_research/config/tasks.yaml`: Task descriptions for planning, evidence gathering, analysis, fact-checking, and report writing.
  - Tools used: `langcrew_tools.search.langchain_tools.WebSearchTool` and `langcrew_tools.fetch.langchain_tools.WebFetchTool`.
- **Input Parameters** (see `src/deep_research/main.py`):
  - `topic`: Research topic
  - `focus_areas`: List of key questions
  - `time_horizon`: e.g., "last 12 months"
  - `language`: e.g., "en" or "zh"

## License
This project is released under the MIT License.

