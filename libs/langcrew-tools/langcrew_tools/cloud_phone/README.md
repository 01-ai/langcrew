# Cloud Phone Tools for LangCrew

## Description

The `cloud_phone` module in LangCrew provides tools for interacting with cloud-based Android devices and emulators. These tools enable AI agents to control Android applications, perform automated testing, and interact with mobile devices through ADB (Android Debug Bridge) connections.

The cloud phone tools support various cloud phone platforms and provide comprehensive device management and automation capabilities.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for cloud phone automation:

```shell
pip install adb-enhanced
```

3. The cloud phone tools are part of the internal module and are automatically available when using LangCrew.

## Usage

```python
from langcrew_tools.internal.cloud_phone import CloudPhoneTool

# Initialize the cloud phone tool
phone_tool = CloudPhoneTool()

# Connect to a cloud device and perform actions
result = await phone_tool.arun(
    device_id="cloud_device_123",
    action="open_app",
    app_package="com.example.app"
)
```

## Supported Cloud Phone Tools

### CloudPhoneTool

The `CloudPhoneTool` provides comprehensive cloud phone automation capabilities with support for various cloud phone platforms.

**Features:**
- Cloud device connection and management
- Android application automation
- ADB command execution
- Device state monitoring
- App installation and management
- Screen interaction and navigation
- File transfer and management
- Device information retrieval

**Usage Example:**
```python
from langcrew_tools.internal.cloud_phone import CloudPhoneTool

tool = CloudPhoneTool()

# Connect to device and open an app
result = await tool.arun(
    device_id="cloud_device_123",
    action="open_app",
    app_package="com.example.app"
)

# Perform screen interaction
result = await tool.arun(
    device_id="cloud_device_123",
    action="click",
    coordinates="500,800"
)
```

### ADB Connect Helper

The ADB connect helper provides low-level ADB connection management:

**Features:**
- Device connection establishment
- Connection status monitoring
- Automatic reconnection
- Connection pooling
- Error handling and recovery

**Usage:**
```python
from langcrew_tools.internal.cloud_phone import ADBConnectHelper

helper = ADBConnectHelper()

# Connect to a device
connection = await helper.connect_device("cloud_device_123")

# Execute ADB command
result = await connection.execute_command("shell pm list packages")
```

### DroidRun Integration

The module includes DroidRun integration for advanced Android automation:

**Features:**
- Advanced device control
- Gesture recognition
- App state management
- Performance monitoring
- Automated testing support

## Cloud Phone Platforms

The tools support various cloud phone platforms:

### Common Platforms
- **AWS Device Farm** - Amazon's cloud device testing platform
- **Firebase Test Lab** - Google's mobile app testing service
- **BrowserStack** - Cross-platform testing platform
- **Sauce Labs** - Cloud-based testing platform
- **Custom Platforms** - Configurable for custom cloud phone services

## Device Management

### Connection Management
- Device discovery and connection
- Connection pooling and optimization
- Automatic reconnection handling
- Connection health monitoring
- Resource cleanup

### Device Information
- Device specifications retrieval
- OS version and build information
- Installed applications list
- Device state monitoring
- Performance metrics

## Application Automation

### App Management
- Application installation and uninstallation
- App launch and termination
- App state management
- Package information retrieval
- App permissions management

### Screen Interaction
- Touch and gesture simulation
- Text input and typing
- Swipe and scroll actions
- Button and element clicking
- Screen capture and analysis

## Integration with LangCrew Agents

These tools are designed to be used within LangCrew agent workflows:

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.internal.cloud_phone import CloudPhoneTool

@agent
def mobile_automation_agent(self) -> Agent:
    return Agent(
        config=self.agents_config["mobile_automation_agent"],
        allow_delegation=False,
        tools=[CloudPhoneTool()]
    )
```

## Automation Workflow

The cloud phone tools support a complete automation workflow:

1. **Device Connection** - Connect to cloud device
2. **App Launch** - Launch target application
3. **Interaction** - Perform screen interactions
4. **Validation** - Verify expected outcomes
5. **Data Collection** - Gather results and screenshots
6. **Cleanup** - Close apps and disconnect

## Error Handling

The tools include comprehensive error handling:
- Connection failures and timeouts
- Device unavailability
- App launch failures
- Screen interaction errors
- ADB command failures
- Network connectivity issues

## Performance Optimization

- **Connection Pooling** - Efficient device connection management
- **Command Batching** - Batch ADB commands for better performance
- **Resource Management** - Proper cleanup of device resources
- **Timeout Configuration** - Configurable timeouts for different operations

## Security Features

- **Secure Connections** - Encrypted device connections
- **Access Control** - Device access authentication
- **Session Management** - Secure session handling
- **Data Protection** - Secure data transfer and storage

## Configuration Options

### Device Configuration
- Device ID and platform selection
- Connection timeout settings
- Retry configuration
- Resource limits

### Automation Settings
- Interaction timeout values
- Screenshot quality settings
- Command execution timeouts
- Error retry policies

## License

This module is part of the LangCrew project and is released under the MIT License. 