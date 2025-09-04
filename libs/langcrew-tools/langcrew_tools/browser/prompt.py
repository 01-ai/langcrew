"""
This module provides model-specific prompts for the browser tool.
It allows for different instructions and rules based on the underlying language model,
and supports different languages.
"""

PROMPT_LANGUAGE_SETTINGS = """
<language_settings>
- 默认工作语言: **中文(Chinese)**
- 使用用户在消息中指定的语言作为工作语言
</language_settings>
"""

PROMPT_BASEV_V1 = """
<security_and_intervention_rules>
**Security Restrictions:**
- Never input real usernames, passwords, or sensitive information
- Don't login without provided credentials
- Only observe and analyze pages, avoid sensitive operations
- Don't submit forms with real consequences

**When to Request Human Intervention:**
Call `request_human_intervention` (NOT `done`) when encountering:
- Login pages requiring real credentials (banking, social media, e-commerce)
- CAPTCHA/Bot verification challenges  
- Two-factor authentication requests
- Payment or identity verification processes
- Authentication barriers you cannot solve autonomously
- Website changes that break your automated methods
- Tasks requiring domain-specific knowledge or human judgment

**Action Parameters:**
- `intervention_type`: "authentication", "captcha", "technical_issue", "2fa", "payment", "identity", "login_form"
- `reason`: Specific problem and why you cannot proceed
- `suggestion`: Concrete steps for human to take
- `confidence`: 0.0-1.0 certainty level
- `autonomous_attempts`: Document methods already tried

**Key Guidelines:**
- Exhaust all automated solutions first
- Detect sensitive login forms proactively (before attempting input)
- Use `request_human_intervention` for user input needs
- Use `done` only when task is complete or genuinely impossible
- Document autonomous attempts to avoid repeating failed strategies
</security_and_intervention_rules>

<search_engine_rules>
- When performing web searches, use Bing (https://www.bing.com) as the default search engine unless the user specifically requests a different search engine.
</search_engine_rules>
"""

PROMPT_GEMINI = PROMPT_BASEV_V1

_gemini_name = "gemini"
# --- Model-specific prompts dictionary ---
MODEL_PROMPTS = {_gemini_name: PROMPT_GEMINI}


def get_browser_tool_prompt(
    model_name: str, task_name: str, request_language: str
) -> tuple[str, str]:
    """
    Get browser tool prompt for specific model

    Args:
        model_name: Model name
        task_name: Task name
        request_language: Request language

    Returns:
        Corresponding model prompt string
    """
    prompt_base = PROMPT_BASEV_V1
    formatted_prompt = PROMPT_BASEV_V1
    # 1. First try exact match
    if model_name in MODEL_PROMPTS:
        prompt_base = MODEL_PROMPTS[model_name]
    else:
        # 2. If no exact match, try partial match
        model_name_lower = model_name.lower()
        for key in MODEL_PROMPTS.keys():
            if key.lower() in model_name_lower:
                prompt_base = MODEL_PROMPTS[key]
                break

    # 3. Format prompt with parameters
    try:
        formatted_prompt = prompt_base.format(
            task_name=task_name, request_language=request_language
        )
        if request_language == "zh":
            formatted_prompt = PROMPT_LANGUAGE_SETTINGS + "\n" + formatted_prompt
    except KeyError as e:
        # If formatting fails, log error and return original prompt
        print(f"Warning: Failed to format prompt with error: {e}")
    return formatted_prompt, task_name
