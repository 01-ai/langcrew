# AI Crew for Game Builder
## Introduction
This project demonstrates the use of the LangCrew framework to automate the creation of video games. LangCrew orchestrates autonomous AI agents, enabling them to collaborate and execute complex game development tasks efficiently.

Based on [@joaomdmoura](https://x.com/joaomdmoura)'s CrewAI example, enhanced with LangCrew.

- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)

## Running the Script
This example uses GPT-5-mini by default, but can be configured to use other models.

***Disclaimer:** This will use GPT-5-mini unless you change it to use a different model, which may incur different costs.*

- **Configure Environment**: Copy `.env.example` to `.env` and add your [OpenAI API key](https://platform.openai.com/api-keys)
  ```bash
  cp .env.example .env
  # Edit .env and add your OPENAI_API_KEY
  ```
- **Install Dependencies**: Run `uv sync` to install all dependencies.
- **Customize**: Modify `src/game_builder_crew/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/game_builder_crew/config/agent/agents.yaml` to update your agents and `src/game_builder_crew/config/task/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run game_builder_crew` and input your game design details.

## Details & Explanation
- **Running the Script**: Execute `uv run game_builder_crew`. The script will leverage the LangCrew framework to generate a complete video game based on your game design specifications.
- **Key Components**:
  - `src/game_builder_crew/main.py`: Main script file containing the game development workflow execution logic.
  - `src/game_builder_crew/agents_crew.py`: Crew file for agent-based workflow with handoff support.
  - `src/game_builder_crew/tasks_crew.py`: Crew file for task-based sequential workflow.
  - `src/game_builder_crew/config/agent/agents.yaml`: Configuration file for defining AI agents specialized in game development (agent-based workflow).
  - `src/game_builder_crew/config/task/agents.yaml`: Configuration file for defining AI agents (task-based workflow).
  - `src/game_builder_crew/config/task/tasks.yaml`: Configuration file for defining game development tasks and workflows.
  - `src/game_builder_crew/config/gamedesign.yaml`: Game design templates and examples for different game types.
- **Agent Roles**:
  - **Chief QA Engineer**: Coordinates the development process and manages the team workflow
  - **Senior Software Engineer**: Implements the complete game code based on specifications
  - **QA Engineer**: Reviews code for errors, bugs, and quality improvements
- **Task Workflow**:
  - **Evaluate Task**: Analyzes game requirements and coordinates development
  - **Code Task**: Implements the complete game functionality
  - **Review Task**: Performs code review and quality assurance
  - **End Task**: Provides comprehensive project summary
- **Game Examples**:
  - **Pac-Man**: Classic arcade game with maze navigation, ghost AI, and scoring system
  - **Snake**: Simple but engaging game with growing snake mechanics
  - **Custom Games**: Framework supports any game design specification