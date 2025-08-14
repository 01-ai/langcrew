# Plan Tool

Structured task planning and progress tracking tool.

## Features

- Create and manage task lists
- Track task execution status
- Support async/sync execution

## Status

- `pending`: Not started
- `running`: Currently executing (only one at a time)
- `done`: Completed

## Usage

```python
from langcrew_tools.plan.langchain_tool import PlanTool, PlanItem

# Create tool
tool = PlanTool()

# Execute plan
plans = [
    PlanItem(id="1", content="Analyze requirements", status="running"),
    PlanItem(id="2", content="Design solution", status="pending"),
    PlanItem(id="3", content="Implement features", status="pending")
]

result = tool.run({"plans": plans})
```

## Rules

- Only one task can be in `running` status at a time
- Update status to `done` promptly after completion
- Best for multi-step complex tasks
