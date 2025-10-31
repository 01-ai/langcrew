# AI Crew for CV-Job Matching

## Introduction
This project leverages the LangCrew framework to automate intelligent matching between CVs (resumes) and job positions. By orchestrating multiple AI agents, it deeply analyzes candidate resumes and matches them with a job database, outputting structured recommendation reports.

Based on CV analysis and job matching best practices, enhanced with LangCrew.

- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)

## Running the Script
It uses gpt-5-mini by default so you should have access to that to run it.

***Disclaimer:** This will use gpt-5-mini unless you change it to use a different model, and by doing so it may incur different costs.*

- **Configure Environment**: Create a `.env` file with the following required environment variables:
  - `OPENAI_API_KEY`: Your [OpenAI API key](https://platform.openai.com/api-keys) for LLM access
- **Install Dependencies**: Run `uv sync` to install all dependencies.
- **Prepare Data Files**: 
  - Edit `src/match_to_proposal/data/cv.md` with the candidate's resume (Markdown format)
  - Edit `src/match_to_proposal/data/jobs.csv` with available job positions (CSV format)
- **Customize Configuration**: 
  - Check `src/match_to_proposal/config/agents.yaml` to update your agents
  - Check `src/match_to_proposal/config/tasks.yaml` to update your tasks
- **Execute the Script**: Run `uv run match_to_proposal` or `source .venv/bin/activate && match_to_proposal` to see the results.

## Details & Explanation
- **Running the Script**: Execute `uv run match_to_proposal`. The script will leverage the LangCrew framework to analyze the CV and generate position recommendations.
- **Key Components**:
  - `src/match_to_proposal/main.py`: Main script file containing the workflow execution logic.
  - `src/match_to_proposal/crew.py`: Main crew file where agents and tasks come together. Uses custom tools:
    - **FileReadTool**: Read and parse resume files in Markdown format
    - **CSVAnalyzerTool**: Parse and analyze job database in CSV format
  - `src/match_to_proposal/config/agents.yaml`: Configuration file for defining AI agents specialized in CV analysis and job matching.
  - `src/match_to_proposal/config/tasks.yaml`: Configuration file for defining analysis and matching tasks.
  - `src/match_to_proposal/tools/custom_tools.py`: Custom tools for file reading and CSV parsing.
- **Data Files**:
  - `data/cv.md`: Candidate resume in Markdown format
  - `data/jobs.csv`: Job database in CSV format with columns: Position, Skills, Responsibilities, Company, Location, Salary, Experience Required, Education Required
- **Output**:
  - Structured CV analysis report with skills matrix and experience summary
  - Ranked job recommendations (Top 5) with match scores, highlights, and application advice