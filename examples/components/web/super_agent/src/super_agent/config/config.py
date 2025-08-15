"""
Super Agent configuration module
"""

from dataclasses import dataclass

from .prompt import COMPLEX_MODE_SYSTEM_PROMPT_NEW


@dataclass
class SuperAgentConfig:
    """Super Agent configuration class"""

    # LLM configuration
    model_name: str = "gpt-4.1"
    temperature: float = 0.0
    max_tokens: int = 10000
    max_retries: int = 3
    request_timeout: float = 60.0

    # Browser LLM configuration
    browser_model: str = "gpt-4.1"
    browser_temperature: float = 0.0
    browser_timeout: float = 30.0
    browser_max_retries: int = 2

    # System configuration
    verbose: bool = True

    # Prompt configuration
    system_prompt_template: str = COMPLEX_MODE_SYSTEM_PROMPT_NEW

    # Logging configuration
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    def get_system_prompt(self) -> str:
        """Get system prompt"""
        import datetime

        current_utc_date = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
        return self.system_prompt_template.format(current_utc_date=current_utc_date)


# Default configuration instance
default_config = SuperAgentConfig()
