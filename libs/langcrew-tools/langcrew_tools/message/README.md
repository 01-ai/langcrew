# Message Tools for LangCrew

## Description

The `message` module provides tools for sending notifications and messages to users in LangCrew workflows. These tools enable agents to communicate progress updates, deliver attachments, and send task completion reports without expecting immediate responses.

## Features

- **MessageToUserTool**: Send messages with optional file attachments
- **Multiple Intent Types**: task_completed, asking_user, progress_update, general
- **File Attachments**: Support for multiple files with S3 upload capability
- **Sandbox Integration**: Secure file handling within sandbox environment
- **Configurable**: Environment variable support for customization

## Usage

```python
from langcrew_tools.message import MessageToUserTool, MessageConfig

# Initialize with default config
message_tool = MessageToUserTool()

# Send a simple message
result = await message_tool._arun(
    text="Task completed successfully!",
    intent_type="task_completed"
)

# Send message with attachments
result = await message_tool._arun(
    text="Here are the generated reports",
    attachments=["/workspace/report.pdf", "/workspace/chart.png"],
    intent_type="progress_update"
)

# Custom configuration
config = MessageConfig(
    sandbox_workspace_path="/custom/workspace",
    s3_upload_enabled=True
)
custom_tool = MessageToUserTool(config=config)
```

## Configuration

Environment variables:

- `MESSAGE_SANDBOX_WORKSPACE_PATH`: Sandbox workspace path (default: `/workspace`)
- `MESSAGE_S3_PREFIX_TEMPLATE`: S3 prefix template (default: `user_attachments/{sandbox_id}`)

## Best Practices

- Use for one-way communication (notifications, not questions)
- Reply immediately to user messages before other actions
- Order attachments by importance
- Use absolute paths for attachments within sandbox
- Choose appropriate intent_type for better UX

## License

This module is part of the LangCrew project and is released under the MIT License.
