#!/usr/bin/env python
from deep_research.crew import DeepResearchCrew


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
    result = DeepResearchCrew().crew().kickoff(inputs=inputs)
    print("deep_research result:", result)


if __name__ == "__main__":
    run()
