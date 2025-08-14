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
            return (
                True,
                "✅ General message format valid",
            )  # Don't block general messages

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


# ==================== Advanced Guardrail Functions ====================


@input_guard
def check_language_support(data: Any) -> Tuple[bool, str]:
    """Check if input language is supported by the system"""
    content = _extract_human_message_content(data)

    # Simple language detection (in production, use proper language detection)
    # Check for non-Latin characters that might indicate non-English
    non_latin_chars = sum(1 for char in content if ord(char) > 127)
    total_chars = len(content)

    if total_chars > 0 and non_latin_chars / total_chars > 0.3:
        return (
            False,
            "❌ Input contains too many non-Latin characters (language not supported)",
        )

    return True, "✅ Language supported"


@input_guard
def check_content_category(data: Any) -> Tuple[bool, str]:
    """Validate content category for specialized processing"""
    content = _extract_human_message_content(data).lower()

    # Define allowed categories
    allowed_categories = {
        "technical": ["code", "programming", "software", "algorithm", "database"],
        "creative": ["story", "poem", "art", "design", "creative"],
        "business": ["strategy", "marketing", "finance", "business", "analysis"],
        "educational": ["learn", "teach", "education", "tutorial", "course"],
    }

    # Check which category the content belongs to
    detected_categories = []
    for category, keywords in allowed_categories.items():
        if any(keyword in content for keyword in keywords):
            detected_categories.append(category)

    if not detected_categories:
        return False, "❌ Content category not recognized"

    if len(detected_categories) > 1:
        return (
            False,
            f"❌ Content spans multiple categories: {', '.join(detected_categories)}",
        )

    return True, f"✅ Content category: {detected_categories[0]}"


@output_guard
def check_output_format(data: Any) -> Tuple[bool, str]:
    """Validate output format and structure"""
    output_str = _extract_ai_message_content(data)

    # Check for proper sentence structure
    sentences = output_str.split(".")
    if len(sentences) < 2:
        return False, "❌ Output should contain at least 2 sentences"

    # Check for proper capitalization
    if not output_str[0].isupper():
        return False, "❌ Output should start with capital letter"

    # Check for proper punctuation
    if not output_str.rstrip().endswith((".", "!", "?")):
        return False, "❌ Output should end with proper punctuation"

    return True, "✅ Output format valid"


@output_guard
def check_factual_accuracy(data: Any) -> Tuple[bool, str]:
    """Basic factual accuracy check (example implementation)"""
    output_str = _extract_ai_message_content(data).lower()

    # Check for common factual errors or misleading statements
    misleading_patterns = [
        "definitely true",
        "100% certain",
        "without a doubt",
        "proven fact",
        "scientific proof",
    ]

    for pattern in misleading_patterns:
        if pattern in output_str:
            return False, f"❌ Output contains overly confident language: {pattern}"

    # Check for balanced language
    balanced_indicators = ["may", "might", "could", "possibly", "suggests", "indicates"]
    has_balanced_language = any(
        indicator in output_str for indicator in balanced_indicators
    )

    if not has_balanced_language and len(output_str) > 100:
        return False, "❌ Output lacks balanced language for longer content"

    return True, "✅ Factual accuracy check passed"


@input_guard
def check_rate_limiting(data: Any) -> Tuple[bool, str]:
    """Simple rate limiting guardrail (example implementation)"""
    # In a real implementation, this would check against a database or cache
    # For demo purposes, we'll use a simple counter
    if not hasattr(check_rate_limiting, "_request_count"):
        check_rate_limiting._request_count = 0
        check_rate_limiting._last_reset = __import__("time").time()

    current_time = __import__("time").time()

    # Reset counter every minute
    if current_time - check_rate_limiting._last_reset > 60:
        check_rate_limiting._request_count = 0
        check_rate_limiting._last_reset = current_time

    # Allow max 5 requests per minute
    max_requests = 5
    check_rate_limiting._request_count += 1

    if check_rate_limiting._request_count > max_requests:
        return (
            False,
            f"❌ Rate limit exceeded: {check_rate_limiting._request_count} > {max_requests} requests per minute",
        )

    return (
        True,
        f"✅ Rate limit OK: {check_rate_limiting._request_count}/{max_requests} requests",
    )


@output_guard
def check_ethical_guidelines(data: Any) -> Tuple[bool, str]:
    """Check output against ethical guidelines"""
    output_str = _extract_ai_message_content(data).lower()

    # Define ethical guidelines
    ethical_violations = {
        "discrimination": ["racist", "sexist", "discriminatory", "prejudiced"],
        "harmful_content": ["harm", "hurt", "dangerous", "illegal"],
        "misinformation": ["fake news", "conspiracy", "unverified"],
        "inappropriate": ["offensive", "vulgar", "inappropriate"],
    }

    violations = []
    for category, keywords in ethical_violations.items():
        if any(keyword in output_str for keyword in keywords):
            violations.append(category)

    if violations:
        return False, f"❌ Ethical guidelines violated: {', '.join(violations)}"

    return True, "✅ Ethical guidelines check passed"


@input_guard
def check_user_permissions(data: Any) -> Tuple[bool, str]:
    """Check user permissions for specific operations"""
    # Extract user info from input (example implementation)
    if isinstance(data, dict) and "user_id" in data:
        user_id = data.get("user_id")
        user_role = data.get("user_role", "user")

        # Check if user has permission for sensitive operations
        sensitive_operations = ["admin", "delete", "modify", "access"]
        operation = data.get("operation", "")

        if any(op in operation.lower() for op in sensitive_operations):
            if user_role != "admin":
                return (
                    False,
                    f"❌ User {user_id} ({user_role}) lacks permission for operation: {operation}",
                )

    return True, "✅ User permissions check passed"


@output_guard
def check_data_privacy(data: Any) -> Tuple[bool, str]:
    """Ensure output doesn't contain private user data"""
    output_str = _extract_ai_message_content(data)

    # Check for potential PII (Personally Identifiable Information)
    pii_patterns = [
        r"\b\d{3}-\d{2}-\d{4}\b",  # SSN format
        r"\b\d{3}-\d{3}-\d{4}\b",  # Phone format
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
        r"\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b",  # Credit card
    ]

    import re

    for pattern in pii_patterns:
        if re.search(pattern, output_str):
            return False, "❌ Output contains potential PII data"

    return True, "✅ Data privacy check passed"


# ==================== Conditional Guardrail Functions ====================


@input_guard
def conditional_sensitive_check(data: Any) -> Tuple[bool, str]:
    """Conditional sensitive data check based on context"""
    content = _extract_human_message_content(data)

    # Check if this is a security-related task
    security_keywords = ["security", "authentication", "login", "password", "access"]
    is_security_task = any(keyword in content.lower() for keyword in security_keywords)

    if is_security_task:
        # For security tasks, be more strict about sensitive data
        strict_patterns = ["password:", "pwd:", "secret:", "key:"]
        for pattern in strict_patterns:
            if pattern.lower() in content.lower():
                return False, f"❌ Security task contains sensitive data: {pattern}"
    else:
        # For non-security tasks, be more lenient
        lenient_patterns = ["password:", "pwd:"]
        for pattern in lenient_patterns:
            if pattern.lower() in content.lower():
                return False, f"❌ Input contains sensitive data: {pattern}"

    return True, "✅ Conditional sensitive data check passed"


@output_guard
def context_aware_quality_check(data: Any) -> Tuple[bool, str]:
    """Quality check that adapts based on content type"""
    output_str = _extract_ai_message_content(data)

    # Detect content type
    if "code" in output_str.lower() or "function" in output_str.lower():
        # For code content, check different quality metrics
        if "def " in output_str or "function " in output_str:
            return True, "✅ Code quality check passed"
        else:
            return False, "❌ Code content should contain function definitions"

    elif "article" in output_str.lower() or "paragraph" in output_str.lower():
        # For article content, check writing quality
        sentences = output_str.split(".")
        if len(sentences) >= 3:
            return True, "✅ Article quality check passed"
        else:
            return False, "❌ Article should have at least 3 sentences"

    else:
        # Default quality check
        if len(output_str) >= 20:
            return True, "✅ General quality check passed"
        else:
            return False, "❌ Content too short for general use"


@input_guard
def adaptive_rate_limiting(data: Any) -> Tuple[bool, str]:
    """Rate limiting that adapts based on user tier"""
    # Extract user tier from input
    user_tier = "basic"  # Default tier

    if isinstance(data, dict):
        user_tier = data.get("user_tier", "basic")

    # Define rate limits by tier
    tier_limits = {
        "basic": 5,  # 5 requests per minute
        "premium": 20,  # 20 requests per minute
        "enterprise": 100,  # 100 requests per minute
    }

    max_requests = tier_limits.get(user_tier, 5)

    # Initialize rate limiting state
    if not hasattr(adaptive_rate_limiting, "_user_requests"):
        adaptive_rate_limiting._user_requests = {}
        adaptive_rate_limiting._last_reset = __import__("time").time()

    current_time = __import__("time").time()

    # Reset counters every minute
    if current_time - adaptive_rate_limiting._last_reset > 60:
        adaptive_rate_limiting._user_requests = {}
        adaptive_rate_limiting._last_reset = current_time

    # Track requests per user tier
    if user_tier not in adaptive_rate_limiting._user_requests:
        adaptive_rate_limiting._user_requests[user_tier] = 0

    adaptive_rate_limiting._user_requests[user_tier] += 1

    if adaptive_rate_limiting._user_requests[user_tier] > max_requests:
        return (
            False,
            f"❌ Rate limit exceeded for {user_tier} tier: {adaptive_rate_limiting._user_requests[user_tier]}/{max_requests}",
        )

    return (
        True,
        f"✅ Rate limit OK for {user_tier} tier: {adaptive_rate_limiting._user_requests[user_tier]}/{max_requests}",
    )


# ==================== Custom Error Handling Guardrails ====================


class CustomGuardrailError(GuardrailError):
    """Custom guardrail error with additional context"""

    def __init__(
        self,
        message: str,
        guardrail_name: str | None = None,
        error_code: str | None = None,
        suggestions: list[str] | None = None,
    ):
        self.error_code = error_code
        self.suggestions = suggestions or []
        super().__init__(message, guardrail_name)

    def __str__(self):
        base_msg = super().__str__()
        if self.error_code:
            base_msg += f" (Code: {self.error_code})"
        if self.suggestions:
            base_msg += f"\nSuggestions: {', '.join(self.suggestions)}"
        return base_msg


@input_guard
def enhanced_sensitive_check(data: Any) -> Tuple[bool, str]:
    """Enhanced sensitive data check with custom error handling"""
    content = _extract_human_message_content(data)

    # Enhanced pattern detection
    sensitive_patterns = {
        "credit_card": [
            r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
            r"\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b",
        ],
        "ssn": [r"\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b"],
        "email": [r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"],
        "phone": [r"\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b"],
        "api_key": [r"\b(api[_-]?key|secret[_-]?key|private[_-]?key)\s*[:=]\s*\S+\b"],
    }

    import re

    detected_patterns = []

    for pattern_type, patterns in sensitive_patterns.items():
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                detected_patterns.append(pattern_type)

    if detected_patterns:
        suggestions = [
            "Remove or redact sensitive information",
            "Use placeholder text (e.g., [REDACTED])",
            "Consider using a secure data handling process",
        ]

        # Raise custom error with suggestions
        error_msg = f"❌ Detected sensitive data types: {', '.join(detected_patterns)}"
        raise CustomGuardrailError(
            message=error_msg,
            guardrail_name="enhanced_sensitive_check",
            error_code="SENSITIVE_DATA_DETECTED",
            suggestions=suggestions,
        )

    return True, "✅ Enhanced sensitive data check passed"


@output_guard
def comprehensive_output_validation(data: Any) -> Tuple[bool, str]:
    """Comprehensive output validation with detailed feedback"""
    output_str = _extract_ai_message_content(data)

    validation_results = []
    suggestions = []

    # Length validation
    if len(output_str) < 10:
        validation_results.append("Output too short")
        suggestions.append("Provide more detailed content")

    if len(output_str) > 2000:
        validation_results.append("Output too long")
        suggestions.append("Consider breaking into smaller sections")

    # Structure validation
    if not output_str[0].isupper():
        validation_results.append("Missing capitalization")
        suggestions.append("Start with a capital letter")

    if not output_str.rstrip().endswith((".", "!", "?")):
        validation_results.append("Missing punctuation")
        suggestions.append("End with proper punctuation")

    # Content quality validation
    if "TODO" in output_str.upper() or "FIXME" in output_str.upper():
        validation_results.append("Contains placeholder text")
        suggestions.append("Complete all placeholder content")

    if output_str.count(".") < 2:
        validation_results.append("Insufficient sentence structure")
        suggestions.append("Use multiple sentences for clarity")

    if validation_results:
        error_msg = f"❌ Output validation failed: {', '.join(validation_results)}"
        raise CustomGuardrailError(
            message=error_msg,
            guardrail_name="comprehensive_output_validation",
            error_code="OUTPUT_VALIDATION_FAILED",
            suggestions=suggestions,
        )

    return True, "✅ Comprehensive output validation passed"


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


# ==================== Advanced Demo Scenarios ====================


def demo_language_and_category_guardrails():
    """Demonstrate language support and content category guardrails"""
    print("\nDemo 5: Language & Category Guardrails")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("Testing specialized content processing guardrails")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent with language and category guardrails
    agent = Agent(
        role="Multilingual Content Processor",
        goal="Process content in supported languages and categories",
        backstory="Specialized processor with language and category validation.",
        llm=llm,
        tools=[generate_content, analyze_text],
        input_guards=[check_language_support, check_content_category],
        output_guards=[check_output_format],
    )

    # Test with valid technical content
    task = Task(
        description="Write a tutorial about programming algorithms",
        expected_output="A programming tutorial",
        agent=agent,
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("✅ Language and category guardrails passed")
        return True

    except GuardrailError as e:
        print(f"❌ Language/category guardrail failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def demo_rate_limiting_guardrail():
    """Demonstrate rate limiting guardrail functionality"""
    print("\nDemo 6: Rate Limiting Guardrail")
    print("-" * 40)

    print("Testing rate limiting guardrail (no API key needed)")

    # Create a simple agent with rate limiting
    agent = Agent(
        role="Rate Limited Processor",
        goal="Process requests with rate limiting",
        backstory="Processor with built-in rate limiting.",
        llm=None,  # No LLM needed for this demo
        input_guards=[check_rate_limiting],
    )

    # Test multiple rapid requests
    print("Testing rate limiting with multiple rapid requests...")

    success_count = 0
    blocked_count = 0

    for i in range(7):  # Try 7 requests (limit is 5 per minute)
        try:
            # Simulate a request
            task = Task(
                description=f"Request {i + 1}",
                expected_output="Processed",
                agent=agent,
            )

            # Check input guardrails manually
            from langcrew.guardrail import check_guardrails_sync

            check_guardrails_sync(agent.input_guards, {"request_id": i + 1})
            success_count += 1
            print(f"  ✅ Request {i + 1} allowed")

        except GuardrailError as e:
            blocked_count += 1
            print(f"  ❌ Request {i + 1} blocked: {e}")
        except Exception as e:
            print(f"  ❌ Error on request {i + 1}: {e}")

    print(f"\nRate limiting results: {success_count} allowed, {blocked_count} blocked")

    if blocked_count > 0:
        print("✅ Rate limiting guardrail working correctly")
        return True
    else:
        print("❌ Rate limiting guardrail not working")
        return False


def demo_ethical_and_privacy_guardrails():
    """Demonstrate ethical guidelines and data privacy guardrails"""
    print("\nDemo 7: Ethical & Privacy Guardrails")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("Testing ethical and privacy protection guardrails")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent with ethical and privacy guardrails
    agent = Agent(
        role="Ethical Content Generator",
        goal="Generate content following ethical guidelines",
        backstory="Content generator with strong ethical and privacy standards.",
        llm=llm,
        tools=[generate_content, analyze_text],
        output_guards=[check_ethical_guidelines, check_data_privacy],
    )

    # Test with content that should pass ethical checks
    task = Task(
        description="Write about the benefits of renewable energy",
        expected_output="A positive article about renewable energy",
        agent=agent,
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("✅ Ethical and privacy guardrails passed")
        return True

    except GuardrailError as e:
        print(f"❌ Ethical/privacy guardrail failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def demo_user_permissions_guardrail():
    """Demonstrate user permissions guardrail"""
    print("\nDemo 8: User Permissions Guardrail")
    print("-" * 40)

    print("Testing user permissions guardrail (no API key needed)")

    # Create agent with permissions guardrail
    agent = Agent(
        role="Permission Manager",
        goal="Manage user access and permissions",
        backstory="System that enforces user permissions.",
        llm=None,  # No LLM needed for this demo
        input_guards=[check_user_permissions],
    )

    # Test different permission scenarios
    test_cases = [
        {
            "name": "Regular user trying admin operation",
            "data": {
                "user_id": "user123",
                "user_role": "user",
                "operation": "delete_user",
            },
            "should_block": True,
        },
        {
            "name": "Admin user performing admin operation",
            "data": {
                "user_id": "admin456",
                "user_role": "admin",
                "operation": "delete_user",
            },
            "should_block": False,
        },
        {
            "name": "Regular user performing safe operation",
            "data": {
                "user_id": "user123",
                "user_role": "user",
                "operation": "view_profile",
            },
            "should_block": False,
        },
    ]

    success_count = 0
    for test_case in test_cases:
        try:
            from langcrew.guardrail import check_guardrails_sync

            check_guardrails_sync(agent.input_guards, test_case["data"])

            if not test_case["should_block"]:
                print(f"  ✅ {test_case['name']}: Allowed (correct)")
                success_count += 1
            else:
                print(f"  ❌ {test_case['name']}: Allowed (should have been blocked)")

        except GuardrailError as e:
            if test_case["should_block"]:
                print(f"  ✅ {test_case['name']}: Blocked (correct) - {e}")
                success_count += 1
            else:
                print(
                    f"  ❌ {test_case['name']}: Blocked (should have been allowed) - {e}"
                )

    print(
        f"\nPermission guardrail results: {success_count}/{len(test_cases)} tests passed"
    )
    return success_count == len(test_cases)


def demo_factual_accuracy_guardrail():
    """Demonstrate factual accuracy guardrail"""
    print("\nDemo 9: Factual Accuracy Guardrail")
    print("-" * 40)

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        return False

    print("Testing factual accuracy and balanced language guardrails")

    # Create LLM
    llm = LLMFactory.create_llm(
        {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 200,
        }
    )

    # Create agent with factual accuracy guardrails
    agent = Agent(
        role="Factual Content Generator",
        goal="Generate balanced and factual content",
        backstory="Content generator that prioritizes accuracy and balance.",
        llm=llm,
        tools=[generate_content, analyze_text],
        output_guards=[check_factual_accuracy],
    )

    # Test with content that should be balanced
    task = Task(
        description="Discuss the current state of AI development",
        expected_output="A balanced discussion of AI development",
        agent=agent,
    )

    # Create crew
    crew = Crew(agents=[agent], tasks=[task])

    try:
        crew.kickoff()
        print("✅ Factual accuracy guardrails passed")
        return True

    except GuardrailError as e:
        print(f"❌ Factual accuracy guardrail failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def demo_guardrail_error_handling():
    """Demonstrate comprehensive guardrail error handling"""
    print("\nDemo 10: Guardrail Error Handling")
    print("-" * 40)

    print("Testing guardrail error handling and recovery")

    # Test different types of guardrail failures
    test_guardrails = [
        (check_no_sensitive_info, "password: secret123", True),  # Should block
        (check_input_length, "x" * 1500, True),  # Should block
        (check_output_quality, "Short", True),  # Should block
        (filter_profanity, "This is spam content", True),  # Should block
        (check_language_support, "这是一个中文测试", True),  # Should block
        (
            check_content_category,
            "random content without keywords",
            True,
        ),  # Should block
    ]

    success_count = 0
    for guardrail, test_data, should_block in test_guardrails:
        try:
            # Test the guardrail directly
            is_valid, message = guardrail(test_data)

            if should_block and not is_valid:
                print(f"  ✅ {guardrail.__name__}: Correctly blocked - {message}")
                success_count += 1
            elif not should_block and is_valid:
                print(f"  ✅ {guardrail.__name__}: Correctly allowed - {message}")
                success_count += 1
            else:
                print(f"  ❌ {guardrail.__name__}: Unexpected result - {message}")

        except Exception as e:
            print(f"  ❌ {guardrail.__name__}: Error occurred - {e}")

    print(
        f"\nError handling results: {success_count}/{len(test_guardrails)} tests passed"
    )
    return success_count == len(test_guardrails)


# ==================== Advanced Feature Demo Scenarios ====================


def demo_conditional_guardrails():
    """Demonstrate conditional guardrail behavior"""
    print("\nDemo 11: Conditional Guardrails")
    print("-" * 40)

    print("Testing guardrails that adapt based on context")

    # Test conditional sensitive check with different contexts
    test_cases = [
        {
            "name": "Security task with sensitive data (should block)",
            "content": "Configure login password: secret123 for authentication",
            "should_block": True,
        },
        {
            "name": "Non-security task with sensitive data (should block)",
            "content": "My password: secret123 is easy to remember",
            "should_block": True,
        },
        {
            "name": "Security task without sensitive data (should allow)",
            "content": "Configure login authentication system",
            "should_block": False,
        },
        {
            "name": "Non-security task without sensitive data (should allow)",
            "content": "Write an article about technology",
            "should_block": False,
        },
    ]

    success_count = 0
    for test_case in test_cases:
        try:
            is_valid, message = conditional_sensitive_check(test_case["content"])

            if test_case["should_block"] and not is_valid:
                print(f"  ✅ {test_case['name']}: Correctly blocked - {message}")
                success_count += 1
            elif not test_case["should_block"] and is_valid:
                print(f"  ✅ {test_case['name']}: Correctly allowed - {message}")
                success_count += 1
            else:
                print(f"  ❌ {test_case['name']}: Unexpected result - {message}")

        except Exception as e:
            print(f"  ❌ {test_case['name']}: Error occurred - {e}")

    print(
        f"\nConditional guardrail results: {success_count}/{len(test_cases)} tests passed"
    )
    return success_count == len(test_cases)


def demo_context_aware_guardrails():
    """Demonstrate context-aware quality checking"""
    print("\nDemo 12: Context-Aware Guardrails")
    print("-" * 40)

    print("Testing guardrails that adapt based on content type")

    # Test context-aware quality check with different content types
    test_cases = [
        {
            "name": "Code content with function definition (should pass)",
            "content": "def calculate_sum(a, b): return a + b",
            "should_pass": True,
        },
        {
            "name": "Code content without function definition (should fail)",
            "content": "This is some code about algorithms",
            "should_pass": False,
        },
        {
            "name": "Article content with multiple sentences (should pass)",
            "content": "This is the first paragraph. This is the second paragraph. This is the third paragraph.",
            "should_pass": True,
        },
        {
            "name": "Article content with insufficient sentences (should fail)",
            "content": "This is a short article.",
            "should_pass": False,
        },
        {
            "name": "General content with sufficient length (should pass)",
            "content": "This is general content that meets the minimum length requirement for basic validation.",
            "should_pass": True,
        },
    ]

    success_count = 0
    for test_case in test_cases:
        try:
            is_valid, message = context_aware_quality_check(test_case["content"])

            if test_case["should_pass"] and is_valid:
                print(f"  ✅ {test_case['name']}: Correctly passed - {message}")
                success_count += 1
            elif not test_case["should_pass"] and not is_valid:
                print(f"  ✅ {test_case['name']}: Correctly failed - {message}")
                success_count += 1
            else:
                print(f"  ❌ {test_case['name']}: Unexpected result - {message}")

        except Exception as e:
            print(f"  ❌ {test_case['name']}: Error occurred - {e}")

    print(
        f"\nContext-aware guardrail results: {success_count}/{len(test_cases)} tests passed"
    )
    return success_count == len(test_cases)


def demo_adaptive_rate_limiting():
    """Demonstrate adaptive rate limiting based on user tier"""
    print("\nDemo 13: Adaptive Rate Limiting")
    print("-" * 40)

    print("Testing rate limiting that adapts based on user tier")

    # Test different user tiers
    test_tiers = [
        {"tier": "basic", "max_requests": 5},
        {"tier": "premium", "max_requests": 20},
        {"tier": "enterprise", "max_requests": 100},
    ]

    success_count = 0
    for test_tier in test_tiers:
        tier = test_tier["tier"]
        max_requests = test_tier["max_requests"]

        print(f"\nTesting {tier} tier (limit: {max_requests} requests/minute):")

        # Test requests up to the limit
        tier_success = True
        for i in range(max_requests + 2):  # Try 2 more than the limit
            try:
                test_data = {"user_tier": tier, "request_id": i + 1}
                is_valid, message = adaptive_rate_limiting(test_data)

                if i < max_requests:
                    if is_valid:
                        print(f"  ✅ Request {i + 1}: Allowed")
                    else:
                        print(f"  ❌ Request {i + 1}: Unexpectedly blocked - {message}")
                        tier_success = False
                else:
                    if not is_valid:
                        print(f"  ✅ Request {i + 1}: Correctly blocked - {message}")
                    else:
                        print(f"  ❌ Request {i + 1}: Should have been blocked")
                        tier_success = False

            except Exception as e:
                print(f"  ❌ Request {i + 1}: Error occurred - {e}")
                tier_success = False

        if tier_success:
            success_count += 1
            print(f"  ✅ {tier} tier tests passed")
        else:
            print(f"  ❌ {tier} tier tests failed")

    print(
        f"\nAdaptive rate limiting results: {success_count}/{len(test_tiers)} tiers passed"
    )
    return success_count == len(test_tiers)


def demo_custom_error_handling():
    """Demonstrate custom error handling with enhanced guardrails"""
    print("\nDemo 14: Custom Error Handling")
    print("-" * 40)

    print("Testing enhanced guardrails with custom error handling")

    # Test enhanced sensitive check
    print("\nTesting Enhanced Sensitive Data Check:")
    test_sensitive_cases = [
        "My credit card is 1234-5678-9012-3456",
        "SSN: 123-45-6789",
        "Email: user@example.com",
        "Phone: 555-123-4567",
        "API key: sk-1234567890abcdef",
        "Safe content without sensitive data",
    ]

    sensitive_success = 0
    for i, test_content in enumerate(test_sensitive_cases):
        try:
            is_valid, message = enhanced_sensitive_check(test_content)
            if is_valid:
                print(f"  ✅ Case {i + 1}: Allowed - {message}")
                sensitive_success += 1
            else:
                print(f"  ❌ Case {i + 1}: Unexpectedly blocked - {message}")

        except CustomGuardrailError as e:
            print(f"  ✅ Case {i + 1}: Custom error caught - {e}")
            sensitive_success += 1
        except Exception as e:
            print(f"  ❌ Case {i + 1}: Unexpected error - {e}")

    # Test comprehensive output validation
    print("\nTesting Comprehensive Output Validation:")
    test_output_cases = [
        "Short",  # Too short
        "This is a properly formatted output with multiple sentences. It meets all requirements.",  # Good
        "missing capitalization and punctuation",  # Missing caps and punctuation
        "This has TODO items to complete",  # Contains placeholder
        "A" * 2500,  # Too long
    ]

    output_success = 0
    for i, test_content in enumerate(test_output_cases):
        try:
            is_valid, message = comprehensive_output_validation(test_content)
            if is_valid:
                print(f"  ✅ Case {i + 1}: Passed - {message}")
                output_success += 1
            else:
                print(f"  ❌ Case {i + 1}: Unexpectedly failed - {message}")

        except CustomGuardrailError as e:
            print(f"  ✅ Case {i + 1}: Custom error caught - {e}")
            output_success += 1
        except Exception as e:
            print(f"  ❌ Case {i + 1}: Unexpected error - {e}")

    total_tests = len(test_sensitive_cases) + len(test_output_cases)
    total_success = sensitive_success + output_success

    print(
        f"\nCustom error handling results: {total_success}/{total_tests} tests passed"
    )
    return total_success == total_tests


def demo_guardrail_performance():
    """Demonstrate guardrail performance characteristics"""
    print("\nDemo 15: Guardrail Performance")
    print("-" * 40)

    print("Testing guardrail performance and efficiency")

    import time

    # Test performance of different guardrail types
    guardrail_tests = [
        (
            "Basic Input Check",
            check_no_sensitive_info,
            "Safe content without sensitive data",
        ),
        (
            "Basic Output Check",
            check_output_quality,
            "This is a properly formatted output with multiple sentences.",
        ),
        (
            "Regex-based Check",
            enhanced_sensitive_check,
            "Safe content without sensitive data",
        ),
        (
            "Context-aware Check",
            context_aware_quality_check,
            "This is a properly formatted output with multiple sentences.",
        ),
    ]

    performance_results = []

    for name, guardrail, test_data in guardrail_tests:
        # Warm up
        for _ in range(10):
            try:
                guardrail(test_data)
            except:
                pass

        # Performance test
        iterations = 1000
        start_time = time.time()

        for _ in range(iterations):
            try:
                guardrail(test_data)
            except:
                pass

        end_time = time.time()
        total_time = end_time - start_time
        avg_time = (total_time / iterations) * 1000  # Convert to milliseconds

        performance_results.append((name, avg_time))
        print(f"  {name}: {avg_time:.3f} ms per call")

    # Calculate statistics
    times = [result[1] for result in performance_results]
    avg_time = sum(times) / len(times)
    max_time = max(times)
    min_time = min(times)

    print(f"\nPerformance Summary:")
    print(f"  Average time: {avg_time:.3f} ms per call")
    print(f"  Fastest: {min_time:.3f} ms per call")
    print(f"  Slowest: {max_time:.3f} ms per call")

    # Consider performance acceptable if average is under 1ms
    performance_ok = avg_time < 1.0
    if performance_ok:
        print("✅ Guardrail performance is acceptable")
    else:
        print("⚠️  Guardrail performance may need optimization")

    return performance_ok


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
    results.append(("Language & Category", demo_language_and_category_guardrails()))
    results.append(("Rate Limiting", demo_rate_limiting_guardrail()))
    results.append(("Ethical & Privacy", demo_ethical_and_privacy_guardrails()))
    results.append(("User Permissions", demo_user_permissions_guardrail()))
    results.append(("Factual Accuracy", demo_factual_accuracy_guardrail()))
    results.append(("Error Handling", demo_guardrail_error_handling()))
    results.append(("Conditional Guardrails", demo_conditional_guardrails()))
    results.append(("Context-Aware Guardrails", demo_context_aware_guardrails()))
    results.append(("Adaptive Rate Limiting", demo_adaptive_rate_limiting()))
    results.append(("Custom Error Handling", demo_custom_error_handling()))
    results.append(("Guardrail Performance", demo_guardrail_performance()))

    # Summary
    print("\nResults:")
    print("-" * 20)

    for name, success in results:
        status = "✅ Success" if success else "❌ Failed"
        print(f"{name}: {status}")

    return 0 if all(r[1] for r in results) else 1


if __name__ == "__main__":
    exit(main())
