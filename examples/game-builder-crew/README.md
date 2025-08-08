# AI Crew for Game Builder
## Introduction
This project demonstrates the use of the LangCrew framework to automate the creation of video games. LangCrew orchestrates autonomous AI agents, enabling them to collaborate and execute complex game development tasks efficiently.

Based on [@joaomdmoura](https://x.com/joaomdmoura)'s CrewAI example, enhanced with LangCrew.

- [LangCrew Framework](#langcrew-framework)
- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)
- [Contributing](#contributing)
- [License](#license)

## LangCrew Framework
LangCrew is an enhanced framework built on top of CrewAI, designed to facilitate the collaboration of role-playing AI agents. In this example, these agents work together to analyze game requirements, implement game logic, and ensure code quality to create fully functional video games.

## Running the Script
It uses GPT-4o by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-4o unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Copy `.env.example` to `.env` and set up the environment variables for [OpenAI](https://platform.openai.com/api-keys) and other tools as needed.
- **Install Dependencies**: Run `uv sync --prerelease=allow` to install all dependencies.
- **Customize**: Modify `src/game_builder_crew/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/game_builder_crew/config/agent/agents.yaml` to update your agents and `src/game_builder_crew/config/task/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run --prerelease=allow game_builder_crew` or `source .venv/bin/activate && game_builder_crew` and input your game design details.

## Details & Explanation
- **Running the Script**: Execute `uv run --prerelease=allow game_builder_crew`. The script will leverage the LangCrew framework to generate a complete video game based on your game design specifications.
- **Key Components**:
  - `src/game_builder_crew/main.py`: Main script file containing the game development workflow execution logic.
  - `src/game_builder_crew/agents_crew.py`: Main crew file where agents come together for collaborative game development.
  - `src/game_builder_crew/tasks_crew.py`: Main crew file where tasks are orchestrated for systematic game development.
  - `src/game_builder_crew/config/agent/agents.yaml`: Configuration file for defining AI agents specialized in game development.
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

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is released under the MIT License.
