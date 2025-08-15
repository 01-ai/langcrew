#!/usr/bin/env python
from dotenv import load_dotenv
from marketing_posts.crew import MarketingPostsCrew

load_dotenv()


def run():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    inputs = {
        "customer_domain": "langcrew.com",
        "project_description": """
LangCrew, a leading provider of multi-agent systems built on LangGraph, aims to revolutionize marketing automation for its enterprise clients. This project involves developing an innovative marketing strategy to showcase LangCrew's advanced AI-driven solutions, emphasizing ease of use, scalability, and integration capabilities. The campaign will target tech-savvy decision-makers in medium to large enterprises, highlighting success stories and the transformative potential of LangCrew's platform.

Customer Domain: AI and Automation Solutions
Project Overview: Creating a comprehensive marketing campaign to boost awareness and adoption of LangCrew's services among enterprise clients.
""",
    }

    # Create crew instance and run
    crew = MarketingPostsCrew().crew()
    result = crew.kickoff(inputs=inputs)

    print("\n=== Marketing Strategy Execution Complete ===")
    print(f"Result: {result}")


if __name__ == "__main__":
    run()
