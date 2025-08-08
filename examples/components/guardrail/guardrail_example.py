"""
Simple Guardrail Examples for LangCrew

Demonstrates basic guardrail usage:
1. Agent-level guardrails
2. Task-level guardrails
3. Combined guardrails
4. Guardrail blocking behavior
"""

import os
from typing import Any, Tuple

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.guardrail import GuardrailError, input_guard, output_guard
from langcrew.llm_factory import LLMFactory
from langcrew.task import Task
from langchain_core.tools import tool
from langchain_core.messages import AIMessage, HumanMessage

# ==================== Helper Functions ====================


def _extract_human_message_content(data: Any) -> str:
    """Extract content from the last HumanMessage in LangGraph input format.
    
    Args:
        data: Input data which can be:
              - LangGraph format: {"messages": [HumanMessage, AIMessage, ...]}
              - Simple dict format: {"key": "value", ...}
              - Other formats
    
    Returns:
        Extracted string content from the last HumanMessage, or string representation of data
    """
    # Handle LangGraph message format
    if isinstance(data, dict) and "messages" in data:
        messages = data.get("messages", [])
        if isinstance(messages, list):
            # Find the last HumanMessage
            for msg in reversed(messages):
                if isinstance(msg, HumanMessage):
                    if isinstance(msg.content, str):
                        return msg.content
                    elif isinstance(msg.content, list):
                        # Handle structured content like [{"text": "..."}]
                        content_parts = []
                        for part in msg.content:
                            if isinstance(part, dict) and "text" in part:
                                content_parts.append(part["text"])
                            elif isinstance(part, str):
                                content_parts.append(part)
                        return " ".join(content_parts)
                    else:
                        return str(msg.content)
    
    # Fallback to original behavior for non-LangGraph formats
    return str(data)


def _extract_ai_message_content(data: Any) -> str:
    """Extract content from the last AIMessage in LangGraph output format.
    
    Args:
        data: Output data which can be:
              - LangGraph format: {"messages": [HumanMessage, AIMessage, ...]}
              - Simple format: direct string or dict
              - Other formats
    
    Returns:
        Extracted string content from the last AIMessage, or string representation of data
    """
    # Handle LangGraph message format
    if isinstance(data, dict) and "messages" in data:
        messages = data.get("messages", [])
        if isinstance(messages, list):
            # Find the last AIMessage
            for msg in reversed(messages):
                if isinstance(msg, AIMessage):
                    if isinstance(msg.content, str):
                        return msg.content
                    elif isinstance(msg.content, list):
                        # Handle structured content like [{"text": "..."}]
                        content_parts = []
                        for part in msg.content:
                            if isinstance(part, dict) and "text" in part:
                                content_parts.append(part["text"])
                            elif isinstance(part, str):
                                content_parts.append(part)
                        return " ".join(content_parts)
                    else:
                        return str(msg.content)
    
    # Fallback to original behavior for non-LangGraph formats
    return str(data)


# ==================== Guardrail Functions ====================


@input_guard
def check_no_sensitive_info(data: Any) -> Tuple[bool, str]:
    """Prevent processing of sensitive information"""
    # Extract content from LangGraph input format or fallback to original behavior
    content = _extract_human_message_content(data)

    # Check for patterns that look like sensitive data
    sensitive_patterns = [
        "ssn:",
        "social security",
        "credit card",
        "card number",
        "password:",
        "pwd:",
        "api_key:",
        "secret_key:",
        "private_key:",
    ]

    for pattern in sensitive_patterns:
        if pattern.lower() in content.lower():
            return False, f"❌ Input contains sensitive information: {pattern}"

    return True, "✅ No sensitive information detected"


@input_guard
def check_input_length(data: Any) -> Tuple[bool, str]:
    """Limit input length to prevent abuse"""
    # Extract content from LangGraph input format or fallback to original behavior
    content = _extract_human_message_content(data)
    max_length = 1000

    if len(content) > max_length:
        return False, f"❌ Input too long: {len(content)} > {max_length} characters"

    return True, f"✅ Input length OK: {len(content)} characters"


@output_guard
def check_output_quality(data: Any) -> Tuple[bool, str]:
    """Ensure output meets quality standards"""
    # Extract content from LangGraph output format or fallback to original behavior
    output_str = _extract_ai_message_content(data)
    
    if not output_str:
        return False, "❌ Empty output not allowed"

    # Check minimum length
    if len(output_str) < 10:
        return False, "❌ Output too short (minimum 10 characters)"

    # Check for placeholder text
    placeholders = ["TODO", "FIXME", "[INSERT", "[PLACEHOLDER"]
    for placeholder in placeholders:
        if placeholder in output_str.upper():
            return False, f"❌ Output contains placeholder text: {placeholder}"

    return True, "✅ Output quality check passed"


@output_guard
def filter_profanity(data: Any) -> Tuple[bool, str]:
    """Filter inappropriate language from output"""
    # Simple example - in production use proper profanity filter
    inappropriate_words = ["spam", "junk", "garbage"]  # Example words

    # Extract content from LangGraph output format or fallback to original behavior
    output_str = _extract_ai_message_content(data).lower()

    for word in inappropriate_words:
        if word in output_str:
            # In a real implementation, you might clean the output instead
            return False, f"❌ Output contains inappropriate content: {word}"

    return True, "✅ Content appropriate"


@input_guard
def validate_task_format(data: Any) -> Tuple[bool, str]:
    """Validate that task input has required format"""
    # For LangGraph format, this guardrail focuses on validating the HumanMessage content
    # contains task-related information, while maintaining backward compatibility
    
    # Extract content from LangGraph input format or fallback to original behavior
    if isinstance(data, dict) and "messages" in data:
        # For LangGraph format, we'll validate that the human message contains task information
        content = _extract_human_message_content(data)
        
        # Check if the content contains task-related keywords
        task_keywords = ["task", "priority", "goal", "objective", "requirement"]
        content_lower = content.lower()
        
        has_task_info = any(keyword in content_lower for keyword in task_keywords)
        if has_task_info:
            return True, "✅ Task-related content detected in message"
        else:
            return True, "✅ General message format valid"  # Don't block general messages
    
    # Original validation for dict format (backward compatibility)
    if not isinstance(data, dict):
        return False, "❌ Input must be a dictionary"

    # Check for required fields
    required_fields = ["task_type", "priority"]
    for field in required_fields:
        if field not in data:
            return False, f"❌ Missing required field: {field}"

    # Validate priority
    if data.get("priority") not in ["low", "medium", "high"]:
        return False, "❌ Priority must be 'low', 'medium', or 'high'"

    return True, "✅ Task format valid"


# ==================== Demo Tools ====================


@tool("content_generator")
def generate_content(topic: str) -> str:
    """Generate content on a given topic"""
    return f"Generated content about {topic}: This is a sample article discussing various aspects of {topic}. It covers introduction, main points, and conclusion."


@tool("text_analyzer")
def analyze_text(text: str) -> str:
    """Analyze text and provide insights"""
    word_count = len(text.split())
    char_count = len(text)
    return f"Analysis: {word_count} words, {char_count} characters. Sentiment: Neutral. Readability: Good."


# ==================== Demo Scenarios ====================


def demo_agent_level_guardrails():
    """Demonstrate agent-level guardrails that apply to all tasks"""
    print("Demo 1: Agent-Level Guardrails")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("Agent guardrails apply to ALL tasks executed by this agent")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent with guardrails
    agent = Agent(
        role="Content Creator",
        goal="Generate safe content",
        backstory="Professional content creator with safety checks.",
        llm=llm,
        tools=[generate_content, analyze_text],
        input_guards=[check_no_sensitive_info, check_input_length],
        output_guards=[check_output_quality, filter_profanity],
    )

    # Create task
    task = Task(
        description="Generate an article about artificial intelligence",
        expected_output="A well-written article about AI",
        agent=agent,
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("✅ Task completed with agent guardrails")
        return True

    except GuardrailError as e:
        print(f"❌ Agent guardrail blocked: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def demo_task_level_guardrails():
    """Demonstrate task-specific guardrails"""
    print("\nDemo 2: Task-Level Guardrails")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("Task guardrails apply only to specific tasks")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent without guardrails
    agent = Agent(
        role="Task Processor",
        goal="Process tasks",
        backstory="Basic task processor.",
        llm=llm,
        tools=[generate_content, analyze_text],
    )

    # Task with specific guardrails
    task = Task(
        description="Generate content about technology trends",
        expected_output="An article about current technology trends",
        agent=agent,
        input_guards=[check_input_length],  # Task-specific guard
        output_guards=[check_output_quality],
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("✅ Task completed with task-specific guardrails")
        return True

    except GuardrailError as e:
        print(f"❌ Task guardrail blocked: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def demo_combined_guardrails():
    """Demonstrate using both agent and task guardrails together"""
    print("\nDemo 3: Combined Agent + Task Guardrails")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("Agent and task guardrails work together in layers")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent with guardrails
    agent = Agent(
        role="Content Processor",
        goal="Process content safely",
        backstory="Security-conscious processor.",
        llm=llm,
        tools=[generate_content, analyze_text],
        input_guards=[check_no_sensitive_info],  # Agent-level
        output_guards=[filter_profanity],  # Agent-level
    )

    # Task with additional guardrails
    task = Task(
        description="Generate content about cybersecurity",
        expected_output="Professional article about cybersecurity",
        agent=agent,
        input_guards=[check_input_length],  # Task-level
        output_guards=[check_output_quality],  # Task-level
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("✅ Task completed with layered guardrails")
        return True

    except GuardrailError as e:
        print(f"❌ Layered guardrail blocked: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def demo_guardrail_failure():
    """Demonstrate guardrail blocking behavior"""
    print("\nDemo 4: Guardrail Blocking Behavior")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return True  # Not a real failure

    print("Testing guardrail blocking with sensitive data")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent with input guard that should block sensitive data
    agent = Agent(
        role="Processor",
        goal="Process data",
        backstory="Basic data processor.",
        llm=llm,
        input_guards=[check_no_sensitive_info],
    )

    # Task with sensitive information - should be blocked by input guard
    task = Task(
        description="password: secret123",  # This should trigger the sensitive data guard
        expected_output="Processed data",
        agent=agent,
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("❌ Unexpected: Sensitive data was not blocked!")
        return False

    except GuardrailError as e:
        print("✅ Expected: Guardrail blocked sensitive data")
        print(f"Reason: {e}")
        return True
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


# ==================== Main Demo ====================


def main():
    """Run guardrail demonstrations"""
    print("LangCrew Guardrail Examples")
    print("=" * 50)

    # Check API key
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set your OpenAI API key:")
        print("   export OPENAI_API_KEY=your_api_key")
        return 0

    print("Running guardrail demonstrations...\n")

    # Run demos
    results = []

    results.append(("Agent Guardrails", demo_agent_level_guardrails()))
    results.append(("Task Guardrails", demo_task_level_guardrails()))
    results.append(("Combined Guardrails", demo_combined_guardrails()))
    results.append(("Blocking Behavior", demo_guardrail_failure()))

    # Summary
    print("\nResults:")
    print("-" * 20)

    for name, success in results:
        status = "✅ Success" if success else "❌ Failed"
        print(f"{name}: {status}")

    return 0 if all(r[1] for r in results) else 1


if __name__ == "__main__":
    exit(main())
