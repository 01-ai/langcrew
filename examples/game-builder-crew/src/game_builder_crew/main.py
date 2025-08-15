from pathlib import Path
import yaml
from dotenv import load_dotenv
from langchain_core.messages import (
    HumanMessage,
)

from game_builder_crew.agents_crew import (
    AgentsCrew,
)
from game_builder_crew.tasks_crew import (
    TasksCrew,
)

load_dotenv()


def run_agents_crew():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    print("## Welcome to the Game Crew")
    print("-------------------------------")
    BASE_DIR = Path(__file__).resolve().parent
    with open(str(BASE_DIR / "config/gamedesign.yaml"), encoding="utf-8") as file:
        examples = yaml.safe_load(file)

    # Create a user prompt with the game instructions
    user_prompt = f"""
    You will create a game using python, these are the instructions:

    Instructions
    ------------
    {examples["example3_snake"]}
    """
    input = {"messages": HumanMessage(content=user_prompt)}
    game = AgentsCrew().crew().invoke(input=input)

    print("\n\n########################")
    print("## Here is the result")
    print("########################\n")
    print("final code for the game:")
    print(game)


def run_tasks_crew():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    print("## Welcome to the Game Crew")
    print("-------------------------------")
    BASE_DIR = Path(__file__).resolve().parent
    with open(str(BASE_DIR / "config/gamedesign.yaml"), encoding="utf-8") as file:
        examples = yaml.safe_load(file)

    inputs = {"game": examples["example3_snake"]}
    game = TasksCrew().crew().kickoff(inputs=inputs)

    print("\n\n########################")
    print("## Here is the result")
    print("########################\n")
    print("final code for the game:")
    print(game)


if __name__ == "__main__":
    # run_tasks_crew()
    run_agents_crew()
