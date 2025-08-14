# Langcrew Cloud Phone Automation Tools

This package provides a set of powerful tools for automating interactions with cloud-based Android devices, specifically designed for integration with LangChain agents. These tools enable agents to perform a wide range of actions on a virtual mobile phone, from basic UI interactions to application management and task completion.

## Features

The `langcrew-tools/cloud_phone` package offers the following capabilities:

* **Device State Retrieval**: Automatically captures screenshots and identifies clickable UI elements, providing real-time visual and interactive context to the agent.
* **Comprehensive UI Interaction**:
  * **Tap**: Interact with UI elements by their index or specific coordinates.
  * **Swipe**: Perform swipe gestures across the screen.
  * **Input Text**: Enter text into input fields.
  * **Press Key**: Simulate pressing various Android keys (e.g., Home, Back, Enter).
  * **Clear Text**: Clear content from text input fields.
* **Application Management**:
  * **Start App**: Launch applications by package and optional activity name.
  * **List Packages**: Retrieve a list of installed applications.
  * **Switch App**: Navigate to the previously used application.
* **Task Control**:
  * **Complete Task**: Mark the current automation task as successful or failed with a descriptive result.
  * **Wait**: Pause execution for a specified duration.
  * **User Takeover**: Request human intervention for complex scenarios like CAPTCHA solving or credential entry.
* **Screenshot and Element Analysis**: Tools to capture the current screen and extract interactive elements for agent decision-making.

## Usage

These tools are intended to be used within a LangChain agent framework. The `get_cloudphone_tools` function initializes and returns a list of available tools, each prefixed to clearly indicate its mobile automation purpose.

### Example

```python
from langcrew_tools.cloud_phone import get_cloudphone_tools
from langcrew_tools.cloud_phone.langchain_tools import TapTool

# Initialize the cloud phone tools
session_id = "your_session_id" # Replace with your actual session ID
cloud_phone_tools = get_cloudphone_tools(session_id=session_id)

tool: TapTool = cloud_phone_tools[0]._arun()
tool._arun(3)
```

## Installation

(Assuming standard Python package installation)

```bash
pip install langcrew-tools
```

## License

This module is part of the LangCrew project and is released under the MIT License.
