# Delivery Tools for LangCrew

## Description

The `delivery` module provides tools for delivering final results and attachments to users in LangCrew workflows. These tools enable agents to package and deliver completed work products at the end of a task execution flow.

## Features

- **AgentResultDeliveryTool**: Deliver final agent results with attachments
- **Task Completion Marker**: Signals the successful completion of all requested tasks
- **File Attachments**: Support for multiple files with S3 upload capability
- **Sandbox Integration**: Secure file handling within sandbox environment
- **Automatic File Processing**: All workspace files are processed and categorized

## Usage

```python
from langcrew_tools.delivery import AgentResultDeliveryTool

# Initialize the tool
delivery_tool = AgentResultDeliveryTool()

# Deliver final results with attachments
result = await delivery_tool._arun(
    attachments=["/workspace/report.pdf", "/workspace/chart.png"]
)

# You can also pass a JSON string containing file paths
result = await delivery_tool._arun(
    attachments='["/workspace/report.pdf", "/workspace/chart.png"]'
)
```

## Implementation Details

The AgentResultDeliveryTool:
1. Validates attachment paths (must be absolute within sandbox)
2. Uploads all workspace files to S3 for preservation
3. Processes attachments with metadata
4. Determines which files to prominently display to users
5. Returns structured information about all delivered files

## Tool Purpose and Timing

The AgentResultDeliveryTool serves as the **MANDATORY final step** in task execution:

- Must be called when all user tasks are complete
- Marks the official end of the task execution flow
- Should include all relevant deliverables
- Failure to call this tool results in INCOMPLETE task execution

## Best Practices

- Only call when agent task is fully complete
- First provide a summary of the completed work before calling
- Organize attachments in order of importance
- Use absolute paths for attachments within sandbox
- Ensure all deliverables are properly formatted and accessible

## License

This module is part of the LangCrew project and is released under the MIT License.