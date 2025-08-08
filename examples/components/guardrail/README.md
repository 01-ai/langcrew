# Guardrail Example

Simple examples showing how to use guardrails in LangCrew.

## What are Guardrails?

Guardrails are safety checks that validate inputs and outputs:
- **Input Guards**: Check data before processing
- **Output Guards**: Validate results after processing

## Types

### Agent-Level Guardrails
Apply to ALL tasks executed by an agent.

```python
agent = Agent(
    role="Safe Agent",
    goal="Process safely",
    backstory="...",
    input_guards=[check_sensitive_data],
    output_guards=[check_quality]
)
```

### Task-Level Guardrails  
Apply only to specific tasks.

```python
task = Task(
    description="Process data",
    expected_output="Result",
    agent=agent,
    input_guards=[validate_format],
    output_guards=[filter_content]
)
```

### Combined
Agent and task guardrails work together in layers.

## Creating Guards

```python
from langcrew.guardrail import input_guard, output_guard

@input_guard
def check_sensitive_data(data):
    if "password" in str(data).lower():
        return False, "Contains sensitive data"
    return True, "Safe data"

@output_guard  
def check_quality(data):
    if len(str(data)) < 10:
        return False, "Output too short"
    return True, "Good quality"
```

## Running the Example

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your_api_key

# Run the example
python guardrail_example.py
```

## Error Handling

```python
from langcrew.guardrail import GuardrailError

try:
    crew.kickoff()
except GuardrailError as e:
    print(f"Guardrail blocked: {e}")
```