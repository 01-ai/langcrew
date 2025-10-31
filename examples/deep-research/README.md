# AI Crew for Deep Research
## Introduction
This project demonstrates the use of the LangCrew framework to automate a deep research workflow. LangCrew orchestrates autonomous AI agents to search the web, fetch long-form content, analyze evidence, fact-check, and synthesize a comprehensive report.

- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)

## Running the Script
It uses gpt-5-mini by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-5-mini unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Create a `.env` file with the following required environment variables:
  - `OPENAI_API_KEY`: Your [OpenAI API key](https://platform.openai.com/api-keys) for LLM access
  - `SERPER_API_KEY`: Your [Serper.dev](https://serper.dev) API key for web search (free tier: 2,500 searches/month)
- **Install Dependencies**: Run `uv sync` to install all dependencies.
- **Customize**: Modify `src/deep_research/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/deep_research/config/agents.yaml` to update your agents and `src/deep_research/config/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run deep_research` or `source .venv/bin/activate && deep_research` and input your project details.

## Details & Explanation
- **Running the Script**: Execute `uv run deep_research`. The script will leverage the LangCrew framework to generate a detailed research report for your topic.
- **Key Components**:
  - `src/deep_research/main.py`: Entry point with example inputs and workflow kickoff.
  - `src/deep_research/crew.py`: Crew definition where agents, tasks, and tools are assembled. Uses LangChain ecosystem tools:
    - **Google Serper Search**: Web search tool powered by Serper.dev for real-time information gathering
    - **WebBaseLoader**: Web page content extraction using beautifulsoup4 for detailed research
  - `src/deep_research/config/agents.yaml`: Definitions for the Planner, Researcher, Fact Checker, and Writer agents.
  - `src/deep_research/config/tasks.yaml`: Task descriptions for planning, evidence gathering, analysis, fact-checking, and report writing.
- **Input Parameters**:
  - **Topic**: Research topic to investigate
  - **Focus Areas**: List of key questions or areas to explore
  - **Time Horizon**: Time range for the research (e.g., "last 12 months")
  - **Language**: Language for the research output (e.g., "en" or "zh")
