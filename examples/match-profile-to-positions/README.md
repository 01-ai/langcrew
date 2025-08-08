# AI Crew for CV-Job Matching

## Introduction
This project leverages the LangCrew framework to automate intelligent matching between CVs (resumes) and job positions. By orchestrating multiple AI agents, it deeply analyzes candidate resumes and matches them with a job database, outputting structured recommendation reports.

- [LangCrew Framework](#langcrew-framework)
- [Running the Script](#running-the-script)
- [Details & Explanation](#details--explanation)
- [Input & Output Examples](#input--output-examples)
- [Contributing](#contributing)
- [License](#license)

## LangCrew Framework
LangCrew is an agent orchestration framework built on top of CrewAI, supporting automatic agent and task creation via configuration files. In this project, agents collaborate to analyze CVs and job information, enabling precise job recommendations.

## Running the Script
- **Environment Setup**: Python 3.11-3.12 is recommended. Activate your virtual environment before installing dependencies.
- **Configure Environment Variables**: Copy `.env.example` to `.env` and set up your OpenAI API key and other required variables.
- **Install Dependencies**: Run `uv sync --prerelease=allow` to install all dependencies.
- **Customize Configuration**: 
  - Check `src/match_to_proposal/config/agents.yaml` to update your agents and `src/match_to_proposal/config/tasks.yaml` to update your tasks.
  - Replace or edit `data/cv.md` (resume) and `data/jobs.csv` (job database)
- **Run the Script**: Run `uv run --prerelease=allow match_to_proposal` or `source .venv/bin/activate && match_to_proposal` and see the results.


## Details & Explanation
- **Main Entry**: `src/match_to_proposal/main.py` loads configuration and executes the matching workflow.
- **Core Logic**: `src/match_to_proposal/crew.py` auto-loads agent/task configs, builds the Crew, and runs the process.
- **Configuration Files**:
  - `config/agents.yaml`: Defines agents such as CV analysis expert, job matching expert, etc.
  - `config/tasks.yaml`: Defines tasks and workflow for CV analysis and job matching
- **Data Files**:
  - `data/cv.md`: Candidate resume (Markdown format)
  - `data/jobs.csv`: Job information (CSV format)

## Input & Output Examples
### CV Input (`cv.md` sample excerpt)
```markdown
# Zhang Wei - Senior Software Engineer

## Personal Information
- **Name**: Zhang Wei
- **Age**: 29
- **Experience**: 6 years
...
## Skills
- **Python**: ★★★★★ (5 years, proficient in Django/Flask/FastAPI)
- **JavaScript**: ★★★★☆ (4 years, skilled in React/Vue.js/Node.js)
...
```

### Job Database Input (`jobs.csv` sample excerpt)
```csv
Position,Skills,Responsibilities,Company,Location,Salary,Experience Required,Education Required
Senior Python Developer,"Python,Django,Flask,MySQL,Redis","Backend system development, API design, DB optimization, code review",Alibaba,Hangzhou,28-45K,3-5 years,Bachelor or above
Frontend Architect,"JavaScript,React,Vue.js,TypeScript,Node.js","Frontend architecture, tech selection, team management, performance optimization",Tencent,Shenzhen,35-55K,5-8 years,Bachelor or above
...
```

### Output
- Structured CV analysis report
- Ranked job recommendations (with match scores, highlights, and application advice)

## Configuration
- **agents.yaml**: Customize agent roles, goals, LLM parameters, and available tools
- **tasks.yaml**: Customize task descriptions, agent assignment, and output requirements
- **cv.md / jobs.csv**: Replace with any candidate resume and job database as needed

## Contributing
Contributions are welcome! Please submit issues or pull requests to help improve the project.

## License
This project is released under the MIT License. 