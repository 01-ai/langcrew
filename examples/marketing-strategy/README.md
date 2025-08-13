
# AI Crew for Marketing Strategy - LangCrew Edition
## Introduction
This project demonstrates the use of the LangCrew framework to automate the creation of a marketing strategy. LangCrew provides CrewAI-compatible decorators and APIs, making migration from CrewAI seamless while offering enhanced performance through LangGraph.

Originally by [@joaomdmoura](https://x.com/joaomdmoura), now powered by LangCrew.

- [Running the script](#running-the-script)
- [Details & Explanation](#details--explanation)

## Running the Script
It uses gpt-4o-mini by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-4o-mini unless you change it to use a different model, and by doing so it may incur in different costs.*

- **Configure Environment**: Copy `.env.example` to `.env` and set up the environment variables for [OpenAI](https://platform.openai.com/api-keys), [Serper](https://serper.dev) and other tools as needed. 
- **Install Dependencies**: Run `uv sync --prerelease=allow` to install all dependencies.
- **Customize**: Modify `src/marketing_posts/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/marketing_posts/config/agents.yaml` to update your agents and `src/marketing_posts/config/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run --prerelease=allow marketing_posts` or `source .venv/bin/activate && marketing_posts` and see the results.

## Details & Explanation
- **Running the Script**: Execute `uv run --prerelease=allow marketing_posts`. The script will leverage the LangCrew framework to generate a detailed marketing strategy.
- **Key Components**:
  - `src/marketing_posts/main.py`: Main script file.
  - `src/marketing_posts/crew.py`: Main crew file where agents and tasks come together using CrewAI-style decorators.
  - `src/marketing_posts/config/agents.yaml`: Configuration file for defining agents.
  - `src/marketing_posts/config/tasks.yaml`: Configuration file for defining tasks.
