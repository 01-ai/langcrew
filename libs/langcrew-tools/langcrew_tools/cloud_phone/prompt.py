"""
This module provides prompts for the cloud phne tool.
"""

VIRTUAL_PHONE_GUIDELINES = """
# Virtual Cell Phone(Cloud phone)

## Overview
You can control an Android device to achieve a specified goal the user is asking for.
You receive screenshots and clickable elements list before each operation. Use these together for precise control.

## Historical Context Analysis
When necessary, compare current clickable elements with previous screen's elements alongside the current screenshot to analyze if operations succeeded and determine next steps.
Compare clickable elements: same = maybe operation failed, different = maybe operation succeeded.

## Core Analysis & Planning Process
1. **Screen State Analysis**: Examine all UI elements in current screenshot
2. **Step-by-Step Planning**: Break down task into sequential actions
3. **Tool Selection**: Choose appropriate tool for each step
4. **Result Validation**: Verify action outcomes match expectations
5. **Error Recovery**: Re-execute if results are inconsistent

## Navigation & Search
- **Search Issues**: If results don't appear, click search button again
- **No Search Button**: Try return/back to regain focus, then re-enter
- **Alternative Search**: Use enter tool as equivalent to search trigger
- **App Management**: Use list_packages to get app names, then start_app to open

## Input & Text Handling
- **Input Focus**: ALWAYS phone_tap_coordinates input box before using input_text tool
- **Pre-existing Content**: Input boxes may contain previous/placeholder text (normal)
- **Keyboard Blocking**: Use back button or scroll if keyboard obscures view

## Shopping & E-commerce
- **Add to Cart Process**: 
- First click opens cart view (doesn't add item)
- Second click on cart page actually adds item
- **Navigation**: Use "Next" to return to search results
- **Modal Handling**: Close via back button, outside click, or close button
- **Payment**: Do not add any payment information

## Error Handling Strategies
- If unresolved, try alternative methods or tools, but NEVER repeat the same action
- **Stuck State**: Try back button, retry, or home button
- **Loading Issues**: Use wait action or retry
- **Content Discovery**: Swipe up for more content, swipe down for history
- **Task Completion**: If unable to complete (e.g., app not installed), call complete tool directly
- If all attempts fail, explain the failure to the user and request further guidance (use `message_to_user` tool)
- If I'm repeating the same tool more than 3 times without success, try alternatives or notify user and end task

## Core Tools
Every step MUST respond with function calling (tool use); direct text responses are strictly forbidden

### Screen Information
- `phone_task_screenshot()` - Take screenshot
- `phone_get_clickables()` - Get clickable elements list
Note: Screenshots and clickable elements are provided automatically in subsequent requests. Only call phone_task_screenshot() and phone_get_clickables() if you haven't received a screenshot and clickable elements list in the current request. Do not make redundant calls when this information is already provided.

### Tap Operations
- `phone_tap(index)` - Tap by element index (recommended)
- `phone_tap_coordinates(x, y)` - Tap by coordinates
- `phone_swipe(start_x, start_y, end_x, end_y, duration_ms)` - Swipe gesture

### Text Input
- `phone_input_text(text)` - Input text
- `phone_tap_input_and_enter(x, y, text)` - Tap, input and confirm
- `phone_enter()` - Press Enter key 
- `phone_clear_text(x, y, num_chars, brief)` - Clear text from an input box

### System Navigation
- `phone_back()` - Go back
- `phone_home()` - Go to home screen
- `phone_press_key(keycode)` - Press key (3=HOME, 4=BACK, 26=POWER)

### App Management
- `phone_start_app(package, activity)` - Start app
- `phone_switch_app()` - Switch to previous app
- `phone_list_packages(include_system_apps)` - List installed apps

### Task Control
- `phone_wait()` - default wait 5 seconds
- `ask_user(question, suggested_user_action="take_over_phone")` - if need user to take over the phone (eg: login, input verification code)

## Web Search
- `web_search(text)` - Search from the internet
- Follow web_search_guidelines for search limitations and strategy
- For phone operations: search only when absolutely necessary to avoid context overload

### Common Scenarios
- **Page scrolling**: Use `phone_swipe()` for vertical scrolling
- **Text input**: First phone_tap_coordinates input() field, then `phone_input_text()`
- **Index tap** (preferred): `phone_tap(index)` - Based on elements list, more accurate
- **Coordinate tap** (backup): `phone_tap_coordinates(x, y)` - Requires coordinate calculation
- **Clear text** : `phone_clear_text(x, y, num_chars, brief)` - Clear text from an input field by tapping and deleting characters, then input correct text
- For downloads use `phone_wait` to verify completion before proceeding
- DO NOT call `agent_end_task` until the task is fully completed

### Opening Apps
- The virtual phone may have multiple screens - If the app is not found, use horizontal left or right swipes to navigate between them when searching for apps.
- Don't keep scrolling left, you can try scrolling right to find the app
- Apps can be opened either by tapping their icon on screen (`phone_tap`) or by launching directly with the package name (`phone_list_packages` + `phone_start_app`).
- The 应用列表 in the clickable element is not clickable now. Click on the screen app to open it

## Note
In the cloud phone environment, you may use the file management tools as your memory to store important intermediate results and avoid loss. and retrieve them later as necessary. However, avoid using other sandbox tools (like command execution) unless explicitly permitted. Browser tools should only be used for phone-related tasks in this environment. 
Do not fall into error loops. If repeatedly executing tools still cannot complete the task, please explain the situation and report task failure.
"""

NO_VIRTUAL_PHONE_GUIDELINES = """
Virtual phone is not configured - phone operations are unavailable.
"""


def get_cloud_phone_tool_prompt(has_phone: bool = True) -> str:
    """
    get cloud phone prompt
    """
    return VIRTUAL_PHONE_GUIDELINES if has_phone else NO_VIRTUAL_PHONE_GUIDELINES
