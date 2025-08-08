# AI Crew for Job Posting
## Introduction
This project demonstrates the use of the LangCrew framework to automate the creation of job postings. LangCrew orchestrates autonomous AI agents, enabling them to collaborate and execute complex tasks efficiently.

Based on [@joaomdmoura](https://x.com/joaomdmoura)'s CrewAI example, enhanced with LangCrew.

- [LangCrew Framework](#langcrew-framework)
- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)
- [Contributing](#contributing)
- [License](#license)

## LangCrew Framework
LangCrew is an enhanced framework built on top of CrewAI, designed to facilitate the collaboration of role-playing AI agents. In this example, these agents work together to analyze company culture and identify role requirements to create comprehensive job postings and industry analysis.

## Running the Script
It uses GPT-4o by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-4o unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Copy `.env.example` to `.env` and set up the environment variables for [OpenAI](https://platform.openai.com/api-keys) and other tools as needed, like [Serper](https://serper.dev).
- **Install Dependencies**: Run `  uv sync --prerelease=allow` to install all dependencies.
- **Customize**: Modify `src/job_posting/main.py` to add custom inputs for your agents and tasks.
- **Customize Further**: Check `src/job_posting/config/agents.yaml` to update your agents and `src/job_posting/config/tasks.yaml` to update your tasks.
- **Execute the Script**: Run `uv run --prerelease=allow job_posting` or `source .venv/bin/activate && job_posting` and input your project details.

## Details & Explanation
- **Running the Script**: Execute `uv run --prerelease=allow job_posting`. The script will leverage the LangCrew framework to generate a detailed job posting based on company information and hiring needs.
- **Key Components**:
  - `src/job_posting/main.py`: Main script file containing the job posting workflow execution logic.
  - `src/job_posting/crew.py`: Main crew file where agents and tasks come together, and the main logic is executed.
  - `src/job_posting/config/agents.yaml`: Configuration file for defining AI agents specialized in job posting creation.
  - `src/job_posting/config/tasks.yaml`: Configuration file for defining job posting tasks and workflows.
  - `src/job_posting/job_description_example.md`: Example job description template and reference material.
- **Input Parameters**:
  - **Company Domain**: Company website URL for research and context gathering
  - **Company Description**: Brief overview of the company and its mission
  - **Hiring Needs**: Specific role requirements and position details
  - **Specific Benefits**: Unique benefits and perks offered by the company

## License
This project is released under the MIT License.
