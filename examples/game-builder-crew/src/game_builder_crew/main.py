#!/usr/bin/env python
"""
Game Builder Crew - Main Entry Point

This module demonstrates two different approaches to building AI crews in LangCrew:
1. Agent-based workflow with handoff support (run_agents_crew)
2. Task-based sequential workflow (run_tasks_crew)
"""

from pathlib import Path

import yaml
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

from .agents_crew import AgentsCrew
from .tasks_crew import TasksCrew

# Load environment variables from .env file
load_dotenv()


def load_game_examples() -> dict:
    """
    Load game design examples from configuration file.

    Returns:
        dict: Dictionary containing game design examples
    """
    BASE_DIR = Path(__file__).resolve().parent
    config_path = BASE_DIR / "config/gamedesign.yaml"

    with open(str(config_path), encoding="utf-8") as file:
        return yaml.safe_load(file)


def run_agents_crew():
    """
    Run the game builder crew using agent-based workflow with handoff support.

    This approach uses LangGraph's agent handoff mechanism where agents can
    transfer control to each other dynamically based on the task requirements.
    """
    print("## Welcome to the Game Builder Crew (Agent-based Workflow)")
    print("----------------------------------------------------------")

    examples = load_game_examples()

    # Create a user prompt with the game instructions
    user_prompt = f"""
You will create a game using python, these are the instructions:

Instructions
------------
{examples["example3_snake"]}
"""

    input_data = {"messages": HumanMessage(content=user_prompt)}
    result = AgentsCrew().crew().invoke(input=input_data)

    print("\n\n########################")
    print("## Here is the result")
    print("########################\n")
    print("Final code for the game:")
    print(result)


def run_tasks_crew():
    """
    Run the game builder crew using task-based sequential workflow.

    This approach uses a traditional task-based workflow where tasks are
    executed sequentially with predefined dependencies.
    """
    print("## Welcome to the Game Builder Crew (Task-based Workflow)")
    print("---------------------------------------------------------")

    examples = load_game_examples()

    inputs = {"game": examples["example3_snake"]}
    result = TasksCrew().crew().kickoff(inputs=inputs)

    print("\n\n########################")
    print("## Here is the result")
    print("########################\n")
    print("Final code for the game:")
    print(result)


if __name__ == "__main__":
    # Run the agent-based workflow by default
    # Comment/uncomment to switch between workflows
    run_agents_crew()
    # run_tasks_crew()
