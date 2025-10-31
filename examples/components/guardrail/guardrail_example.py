"""
Minimal Guardrail Example for LangCrew

Demonstrates basic input and output guardrails.
"""

import os
from typing import Any, Tuple

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.guardrail import GuardrailError, input_guard, output_guard
from langcrew.llm_factory import LLMFactory
from langcrew.task import Task

import dotenv

dotenv.load_dotenv()


@input_guard
def check_no_sensitive_info(data: Any) -> Tuple[bool, str]:
    """Block sensitive information in input"""
    content = str(data).lower()
    if "password:" in content or "secret:" in content:
        return False, "❌ Sensitive data detected"
    return True, "✅ Input safe"


@output_guard
def check_output_quality(data: Any) -> Tuple[bool, str]:
    """Ensure output meets basic quality"""
    # Extract content from the result
    if isinstance(data, dict) and "messages" in data:
        # Get the last message's content
        messages = data["messages"]
        if messages:
            content = str(messages[-1].content)
        else:
            content = ""
    else:
        content = str(data)

    if len(content) < 3:
        return False, f"❌ Output too short: '{content}' ({len(content)} chars)"
    return True, "✅ Output quality OK"


def main():
    """Simple guardrail demonstration"""
    print("LangCrew Guardrail Example")
    print("=" * 30)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Set OPENAI_API_KEY to run full demo")
        return

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 100,
        }
    )

    # Agent with guardrails
    agent = Agent(
        role="Writer",
        goal="Write safe content",
        backstory="A careful writer.",
        llm=llm,
        input_guards=[check_no_sensitive_info],
        output_guards=[check_output_quality],
    )

    # Test 1: Normal task (should succeed)
    print("\n1. Testing normal task...")
    task1 = Task(
        description="Write about renewable energy",
        expected_output="Article about renewable energy",
        agent=agent,
    )

    crew1 = Crew(agents=[agent], tasks=[task1])
    try:
        result = crew1.kickoff()
        print("✅ Success:", str(result)[:50] + "...")
    except Exception as e:
        print("❌ Failed:", e)

    # Test 2: Sensitive data (should be blocked)
    print("\n2. Testing sensitive data blocking...")
    task2 = Task(
        description="Process user data: password: secret123",
        expected_output="Processed data",
        agent=agent,
    )

    crew2 = Crew(agents=[agent], tasks=[task2])
    try:
        result = crew2.kickoff()
        print("❌ Unexpected: Sensitive data not blocked!")
    except GuardrailError:
        print("✅ Expected: Guardrail blocked sensitive data")
    except Exception as e:
        print("❌ Error:", e)

    # Test 3: Short output (should be blocked)
    print("\n3. Testing short output blocking...")
    task3 = Task(
        description="Say 'OK'",
        expected_output="Just say OK",
        agent=agent,
    )

    crew3 = Crew(agents=[agent], tasks=[task3])
    try:
        result = crew3.kickoff()
        print("❌ Unexpected: Short output not blocked!")
    except GuardrailError:
        print("✅ Expected: Guardrail blocked short output")
    except Exception as e:
        print("❌ Error:", e)

    print("\nDemo complete!")


if __name__ == "__main__":
    main()
