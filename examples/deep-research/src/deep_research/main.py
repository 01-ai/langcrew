#!/usr/bin/env python
from dotenv import load_dotenv
from langchain_core.runnables import RunnableConfig
from deep_research.crew import DeepResearchCrew

load_dotenv()


def run():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    inputs = {
        "topic": "AI agents for enterprise automation",
        "focus_areas": [
            "recent breakthroughs",
            "leading open-source projects and vendors",
            "security and governance considerations",
            "production case studies",
        ],
        "time_horizon": "last 12 months",
        "language": "en",
    }

    # Create config with recursion_limit
    config = RunnableConfig(
        recursion_limit=100,  # Set recursion limit for complex workflows
    )

    # Pass config to kickoff method
    result = DeepResearchCrew().crew().kickoff(inputs=inputs, config=config)
    print(f"deep_research result: {result}")


if __name__ == "__main__":
    run()
