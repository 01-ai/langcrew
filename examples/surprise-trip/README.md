
# AI Crew for Surprise Travel Planning
## Introduction
This project demonstrates the use of the LangCrew framework to automate the creation of surprise travel plans. LangCrew orchestrates autonomous AI agents, enabling them to collaborate and execute complex tasks efficiently.

Based on [@joaomdmoura](https://x.com/joaomdmoura)'s CrewAI example, enhanced with LangCrew.

- [AI Crew for Surprise Travel Planning](#ai-crew-for-surprise-travel-planning)
  - [Introduction](#introduction)
  - [Running the Script](#running-the-script)
  - [Details \& Explanation](#details--explanation)
  - [License](#license)

## Running the Script
It uses GPT-4o-mini by default.

***Disclaimer:** This will use gpt-4o-mini unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Copy `.env.example` to `.env` and set up the environment variables:
  - `OPENAI_API_KEY`: Your [OpenAI API key](https://platform.openai.com/api-keys) 
  - Web Search and Web Fetch tools configuration (optional, see `.env.example` for details)
- **Install Dependencies**: Run `uv sync` to install all dependencies.
- **Customize**: Modify `src/surprise_travel/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/surprise_travel/config/agents.yaml` to update your agents and `src/surprise_travel/config/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run surprise_travel` or `source .venv/bin/activate && surprise_travel` and input your project details.

## Details & Explanation
- **Running the Script**: Execute `uv run surprise_travel`. The script will leverage the LangCrew framework to generate a detailed surprise travel plan.
- **Key Components**:
  - `src/surprise_travel/main.py`: Main script file containing the execution logic.
  - `src/surprise_travel/crew.py`: Main crew file where agents and tasks come together, and the main logic is executed.
  - `src/surprise_travel/config/agents.yaml`: Configuration file for defining agents (Activity Planner, Restaurant Scout, Itinerary Compiler).
  - `src/surprise_travel/config/tasks.yaml`: Configuration file for defining tasks.
  - `src/surprise_travel/tools/custom_tool.py`: Contains custom tool classes used by the agents.

## License
This project is released under the MIT License.
