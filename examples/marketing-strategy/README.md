# AI Crew for Marketing Strategy - LangCrew Edition
## Introduction
This project demonstrates the use of the LangCrew framework to automate the creation of a marketing strategy. LangCrew provides CrewAI-compatible decorators and APIs, making migration from CrewAI seamless while offering enhanced performance through LangGraph.

Originally by [@joaomdmoura](https://x.com/joaomdmoura), now powered by LangCrew.

- [Running the script](#running-the-script)
- [Details & Explanation](#details--explanation)

## Running the Script
It uses gpt-5-mini by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-5-mini unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Create a `.env` file with the following required environment variables:
  - `OPENAI_API_KEY`: Your [OpenAI API key](https://platform.openai.com/api-keys) for LLM access
  - `SERPER_API_KEY`: Your [Serper.dev](https://serper.dev) API key for web search (free tier: 2,500 searches/month)
- **Install Dependencies**: Run `uv sync` to install all dependencies.
- **Customize**: Modify `src/marketing_posts/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/marketing_posts/config/agents.yaml` to update your agents and `src/marketing_posts/config/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run marketing_posts` or `source .venv/bin/activate && marketing_posts` and see the results.

## Details & Explanation
- **Running the Script**: Execute `uv run marketing_posts`. The script will leverage the LangCrew framework to generate a detailed marketing strategy.
- **Key Components**:
  - `src/marketing_posts/main.py`: Main script file containing the marketing strategy workflow execution logic.
  - `src/marketing_posts/crew.py`: Main crew file where agents and tasks come together. Uses LangChain ecosystem tools:
    - **Google Serper Search**: Web search tool powered by Serper.dev for real-time information gathering
    - **WebBaseLoader**: Web page content extraction using beautifulsoup4 for detailed research
  - `src/marketing_posts/config/agents.yaml`: Configuration file for defining AI agents specialized in marketing strategy.
  - `src/marketing_posts/config/tasks.yaml`: Configuration file for defining marketing tasks and workflows.
- **Input Parameters**:
  - **Customer Domain**: Company website URL for research and context gathering
  - **Project Description**: Detailed description of the marketing project and objectives
