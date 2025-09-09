import asyncio
import io
import json
import logging
import os
import tempfile
import time
from typing import Any

from agentbox import AsyncSandbox
from PIL import Image

<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
logger = logging.getLogger(__name__)
=======
CLICKABLE_ELEMENTS_CACHE = []  # Global variable to store clickable elements for index-based tapping
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py

logger = logging.getLogger(__name__)


async def get_clickables(sbx: AsyncSandbox) -> dict[str, Any]:
    """
    Get all clickable UI elements from the device using the custom TopViewService.

    This function interacts with the TopViewService app installed on the device
    to capture only the clickable UI elements. The service writes UI data
    to a JSON file on the device, which is then pulled to the host.
    """
    # Add a short sleep to ensure UI is fully loaded/processed
    await asyncio.sleep(0.5)  # 500ms sleep

    def get_elements(elements) -> list[dict]:
        ret = []
        for e in elements:
            ret.append({k: v for k, v in e.items() if k != "children"})
            if "children" in e and e["children"]:
                ret.extend(get_elements(e["children"]))
        return ret

    DROIDRUN_STATE_CMD = "content query --uri content://com.droidrun.portal/state"

    try:
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        output = sbx.adb_shell2.shell(DROIDRUN_STATE_CMD)
=======
        output = await sbx.adb_shell.shell(DROIDRUN_STATE_CMD)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py

        all = []
        for line in output.strip().split("\n"):
            line = line.strip()
            if "result=" in line:
                ret = json.loads(line[line.find("result=") + 7 :])
                if ret["status"] == "success":
                    all = get_elements(json.loads(ret["data"])["a11y_tree"])
                break

        all.sort(key=lambda x: x.get("index", 0))

        return {"clickable_elements": all, "count": len(all)}
    except Exception as e:
        raise ValueError(f"Error getting clickable elements: {e}")


<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
async def clear_text(sbx: Sandbox, x: int, y: int, num_chars: int = 20) -> str:
    """Clear text from an input field by tapping and deleting characters."""
    try:
        sbx.adb_shell2.shell(f"input tap {x} {y}")
        await asyncio.sleep(0.5)

        sbx.adb_shell2.shell("input keyevent KEYCODE_MOVE_END")  # 移动到结尾
        for _ in range(num_chars):  # 多次删除以确保清空
            sbx.adb_shell2.shell("input keyevent KEYCODE_DEL")
        await asyncio.sleep(0.5)
        return f"Cleared up to {num_chars} characters from text field at ({x},{y})"

    except ValueError as e:
        print(f"Error clearing text: {e}")
        return f"Error: {str(e)}"


# Rename the old tap function to tap_by_coordinates for backward compatibility
async def tap_by_coordinates(x: int, y: int, sbx: Sandbox) -> str:
    """Tap on the device screen at specific coordinates."""
    try:
        sbx.adb_shell2.shell(f"input tap {x} {y}")
        return f"Tapped at ({x}, {y})"
    except ValueError as e:
        return f"Error: {str(e)}"

async def tap(sbx: Sandbox, index: int) -> str:
=======
async def tap(sbx: AsyncSandbox, index: int) -> str:
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
    """
    Tap on a UI element by its index.

    This function uses the cached clickable elements from the last get_clickables call
    to find the element with the given index and tap on its center coordinates.
    """
    global CLICKABLE_ELEMENTS_CACHE

    try:
        # Check if we have cached elements
        if not CLICKABLE_ELEMENTS_CACHE:
            await get_clickables(sbx)

        # Find the element with the given index
        element = None
        for item in CLICKABLE_ELEMENTS_CACHE:
            if item.get("index") == index:
                element = item
                break

        if not element:
            # List available indices to help the user
            indices = sorted([
                item.get("index", "") for item in CLICKABLE_ELEMENTS_CACHE
            ])
            indices_str = ", ".join(str(idx) for idx in indices[:20])
            if len(indices) > 20:
                indices_str += f"... and {len(indices) - 20} more"

            return f"Error: No element found with index {index}. Available indices: {indices_str}"

        # Get the bounds of the element
        bounds_str = element.get("bounds")
        if not bounds_str:
            element_text = element.get("text", "No text")
            element_type = element.get("type", "unknown")
            element_class = element.get("className", "Unknown class")

            # Check if this is a child element with a parent that can be tapped instead
            parent_suggestion = ""
            if "parentIndex" in element:
                parent_idx = element.get("parentIndex")
                parent_suggestion = f" You might want to tap its parent element with index {parent_idx} instead."

            return f"Error: Element with index {index} ('{element_text}', {element_class}, type: {element_type}) has no bounds and cannot be tapped directly.{parent_suggestion}"

        # Parse the bounds (format: "left,top,right,bottom")
        try:
            left, top, right, bottom = map(int, bounds_str.split(","))
        except ValueError:
            return f"Error: Invalid bounds format for element with index {index}: {bounds_str}"

        # Calculate the center of the element
        x = (left + right) // 2
        y = (top + bottom) // 2

        # Get the device and tap at the coordinates
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.shell(f"input tap {x} {y}")
=======
        await sbx.adb_shell.shell(f"input tap {x} {y}")
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py

        # Gather element details for the response
        element_text = element.get("text", "No text")
        element_class = element.get("className", "Unknown class")
        element_type = element.get("type", "unknown")
        is_parent = element.get("isParent", False)

        # Create a descriptive response
        response_parts = []
        response_parts.append(f"Tapped element with index {index}")
        response_parts.append(f"Text: '{element_text}'")
        response_parts.append(f"Class: {element_class}")
        response_parts.append(f"Type: {element_type}")
        response_parts.append(f"Role: {'parent' if is_parent else 'child'}")

        # If it's a parent element, include information about its text children
        if is_parent:
            # Find all child elements that are text elements
            text_children = []
            for item in CLICKABLE_ELEMENTS_CACHE:
                if (
                    item.get("parentIndex") == index
                    and item.get("type") == "text"
                    and item.get("text")
                ):
                    text_children.append(item.get("text"))

            if text_children:
                response_parts.append(f"Contains text: {' | '.join(text_children)}")

        # If it's a child element, include parent information
        if not is_parent and "parentIndex" in element:
            parent_index = element.get("parentIndex")
            # Find the parent element
            parent = None
            for item in CLICKABLE_ELEMENTS_CACHE:
                if item.get("index") == parent_index:
                    parent = item
                    break

            if parent:
                parent_text = parent.get("text", "No text")
                response_parts.append(f"Parent: {parent_index} ('{parent_text}')")

                # Find sibling text elements (other children of the same parent)
                sibling_texts = []
                for item in CLICKABLE_ELEMENTS_CACHE:
                    if (
                        item.get("parentIndex") == parent_index
                        and item.get("index") != index
                        and item.get("type") == "text"
                        and item.get("text")
                    ):
                        sibling_texts.append(item.get("text"))

                if sibling_texts:
                    response_parts.append(f"Related text: {' | '.join(sibling_texts)}")

        response_parts.append(f"Coordinates: ({x}, {y})")
        await asyncio.sleep(1)  # Add a small delay after tapping
        return " | ".join(response_parts)
    except ValueError as e:
        return f"Error: {str(e)}"

<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
async def long_tap(x: int, y: int, sbx: Sandbox) -> str:
=======

async def clear_text(sbx: AsyncSandbox, x: int, y: int, num_chars: int = 20) -> str:
    """Clear text from an input field by tapping and deleting characters."""
    try:
        await sbx.adb_shell.shell(f"input tap {x} {y}")
        await asyncio.sleep(0.5)

        await sbx.adb_shell.shell("input keyevent KEYCODE_MOVE_END")  # 移动到结尾
        for _ in range(num_chars):  # 多次删除以确保清空
            await sbx.adb_shell.shell("input keyevent KEYCODE_DEL")
        await asyncio.sleep(0.5)
        return f"Cleared up to {num_chars} characters from text field at ({x},{y})"

    except ValueError as e:
        print(f"Error clearing text: {e}")
        return f"Error: {str(e)}"


# Rename the old tap function to tap_by_coordinates for backward compatibility
async def tap_by_coordinates(x: int, y: int, sbx: AsyncSandbox) -> str:
    """Tap on the device screen at specific coordinates."""
    try:
        await sbx.adb_shell.shell(f"input tap {x} {y}")
        return f"Tapped at ({x}, {y})"
    except ValueError as e:
        return f"Error: {str(e)}"


async def long_tap(x: int, y: int, sbx: AsyncSandbox) -> str:
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
    """
    Perform a long press action on the device screen.
    Implemented by calling swipe function with same start and end coordinates 2000ms duration.
    """
    return await swipe(sbx, x, y, x, y, 2000)


async def swipe(
    sbx: AsyncSandbox,
    start_x: int,
    start_y: int,
    end_x: int,
    end_y: int,
    duration_ms: int = 300,
) -> str:
    """Perform a swipe gesture on the device screen."""
    try:
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.shell(
=======
        await sbx.adb_shell.shell(
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
            f"input swipe {start_x} {start_y} {end_x} {end_y} {duration_ms}"
        )
        return f"Swiped from ({start_x}, {start_y}) to ({end_x}, {end_y})"
    except ValueError as e:
        return f"Error: {str(e)}"


async def input_text(sbx: AsyncSandbox, text: str) -> str:
    """Input text on the device."""
    try:
        # Function to escape special characters
        def escape_text(s: str) -> str:
            # Escape special characters that need shell escaping, excluding space
            special_chars = (
                "[]()|&;$<>\\`\"'{}#!?^~"  # Removed space from special chars
            )
            escaped = ""
            for c in s:
                if c == " ":
                    escaped += " "  # Just add space without escaping
                elif c in special_chars:
                    escaped += "\\" + c
                else:
                    escaped += c
            return escaped

        # Split text into smaller chunks (max 500 chars)
        chunk_size = 500
        chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

        for chunk in chunks:
            # Escape the text chunk
            escaped_chunk = escape_text(chunk)

            # Try different input methods if one fails
            methods = [
                f'am broadcast -a ADB_INPUT_TEXT --es msg "{escaped_chunk}"',  # Broadcast intent method
                f'input text "{escaped_chunk}"',  # Standard method
                f'input keyboard text "{escaped_chunk}"',  # Keyboard method
            ]

            success = False
            last_error = None

            for method in methods:
                try:
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
                    sbx.adb_shell2.shell(method)
=======
                    await sbx.adb_shell.shell(method)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
                    success = True
                    break
                except Exception as e:
                    last_error = str(e)
                    continue

            if not success:
                return f"Error: Failed to input text chunk. Last error: {last_error}"

            # Small delay between chunks
            await asyncio.sleep(0.1)

        return f"Text input tool executed with uncertain success: {text}"
    except ValueError as e:
        return f"Error: {str(e)}"


async def press_key(sbx: AsyncSandbox, keycode: int) -> str:
    """Press a key on the device."""
    try:
        key_names = {
            3: "HOME",
            4: "BACK",
            24: "VOLUME UP",
            25: "VOLUME DOWN",
            26: "POWER",
            66: "ENTER",
            82: "MENU",
        }
        key_name = key_names.get(keycode, str(keycode))
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.shell(f"input keyevent {keycode}")
=======
        await sbx.adb_shell.shell(f"input keyevent {keycode}")
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        return f"Pressed key {key_name}"
    except ValueError as e:
        return f"Error: {str(e)}"


async def switch_app(sbx: AsyncSandbox) -> str:
    """Switch to recent apps view on the device."""
    try:
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.shell("input keyevent KEYCODE_APP_SWITCH")
=======
        await sbx.adb_shell.shell("input keyevent KEYCODE_APP_SWITCH")
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        return "Opened recent apps view"
    except ValueError as e:
        return f"Error: {str(e)}"


async def tap_input_and_enter(x: int, y: int, text: str, sbx: AsyncSandbox) -> str:
    """Tap an input box at position (x,y), clear previous text, input new text, and press Enter."""
    try:
        # Tap at coordinates
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.shell(f"input tap {x} {y}")
        await asyncio.sleep(0.5)

        sbx.adb_shell2.shell("input keyevent KEYCODE_MOVE_END")  # 移动到结尾
        for _ in range(20):  # 多次删除以确保清空
            sbx.adb_shell2.shell("input keyevent KEYCODE_DEL")
=======
        await sbx.adb_shell.shell(f"input tap {x} {y}")
        await asyncio.sleep(0.5)

        await sbx.adb_shell.shell("input keyevent KEYCODE_MOVE_END")  # 移动到结尾
        for _ in range(20):  # 多次删除以确保清空
            await sbx.adb_shell.shell("input keyevent KEYCODE_DEL")
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        await asyncio.sleep(0.5)

        # Input new text using am broadcast (更可靠的方式)
        if text:
            try:
                # 尝试使用 am broadcast 方式
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
                sbx.adb_shell2.shell(
=======
                await sbx.adb_shell.shell(
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
                    f'am broadcast -a ADB_INPUT_TEXT --es msg "{text}"'
                )
            except Exception:
                # 如果失败，尝试使用 input keyboard text
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
                sbx.adb_shell2.shell(f'input keyboard text "{text}"')
            await asyncio.sleep(0.5)

        # Press Enter
        sbx.adb_shell2.shell("input keyevent 66")
=======
                await sbx.adb_shell.shell(f'input keyboard text "{text}"')
            await asyncio.sleep(0.5)

        # Press Enter
        await sbx.adb_shell.shell("input keyevent 66")
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py

        return f"Tapped at ({x},{y}), cleared text, input '{text}' and pressed Enter"
    except ValueError as e:
        return f"Error: {str(e)}"


async def wait() -> str:
    """Wait for 5 seconds."""
    await asyncio.sleep(5)
    return "Waited 5 seconds"


async def user_takeover() -> None:
    pass


async def start_app(sbx: AsyncSandbox, package: str, activity: str = "") -> str:
    """Start an app on the device."""

    try:
        if activity:
            if "." not in activity:
                activity = f".{activity}"

            if (
                not activity.startswith(".")
                and "." in activity
                and not activity.startswith(package)
            ):
                # Fully qualified activity name
                component = activity.split("/", 1)
                package, activity = (
                    component[0],
                    component[1] if len(component) > 1 else activity,
                )

            cmd = f"am start -n {package}/{activity}"
        else:
            # Start main activity using monkey
            cmd = f"monkey -p {package} -c android.intent.category.LAUNCHER 1"

<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.shell(cmd)
=======
        await sbx.adb_shell.shell(cmd)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        # Wait 3 seconds for app to load
        await asyncio.sleep(2)
        return f"Started {package}"
    except ValueError as e:
        return f"Error: {str(e)}"


async def install_app(sbx: AsyncSandbox, apk_path: str, reinstall: bool = False) -> str:
    """Install an app on the device."""

    if not os.path.exists(apk_path):
        return f"Error: APK file not found: {apk_path}"
    try:
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        sbx.adb_shell2.install(apk_path, reinstall=reinstall)
=======
        await sbx.adb_shell.install(apk_path, reinstall=reinstall)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        return f"Successfully installed {os.path.basename(apk_path)}"
    except Exception as e:
        return f"Installation failed: {str(e)}"


async def uninstall_app(
    sbx: AsyncSandbox, package: str, keep_data: bool = False
) -> str:
    """Uninstall an app from the device."""
    try:
        cmd = f"pm uninstall {'-k' if keep_data else ''} {package}"
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        return sbx.adb_shell2.shell(cmd)
=======
        return await sbx.adb_shell.shell(cmd)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
    except ValueError as e:
        return f"Error: {str(e)}"


async def take_screenshot(sbx: AsyncSandbox) -> tuple[str, bytes]:
    """Take a screenshot of the device."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp:
        screenshot_path = temp.name

        try:
            device_path = f"/data/local/tmp/screenshot_{int(time.time() * 1000)}.png"

<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
            sbx.adb_shell2.shell(f"screencap -p {device_path}")
            await asyncio.sleep(0.5)
            sbx.adb_shell2.pull(remote=device_path, local=screenshot_path)
=======
            await sbx.adb_shell.shell(f"screencap -p {device_path}")
            await asyncio.sleep(0.5)
            await sbx.adb_shell.pull(remote=device_path, local=screenshot_path)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py

            # Read the screenshot file
            with open(screenshot_path, "rb") as f:
                screenshot_data = f.read()
                buffer = io.BytesIO()
                # Load the PNG data into a PIL Image
                with Image.open(io.BytesIO(screenshot_data)) as img:
                    # Convert to RGB (removing alpha channel if present) and save as JPEG
                    converted_img = img.convert("RGB") if img.mode == "RGBA" else img
                    converted_img.save(buffer, format="JPEG", quality=70, optimize=True)
                    compressed_data = buffer.getvalue()

                return screenshot_path, compressed_data
        except Exception as e:
            import traceback

            print(traceback.format_exc())
            raise RuntimeError(f"Screenshot capture failed: {str(e)}")


async def list_packages(
    sbx: AsyncSandbox, include_system_apps: bool = False
) -> list[str]:
    """List installed packages on the device."""
    try:
        cmd = f"pm list packages {'' if include_system_apps else '-3'}"
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
        output = sbx.adb_shell2.shell(cmd)
=======
        output = await sbx.adb_shell.shell(cmd)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        return [ln.split(":")[1].strip() for ln in output.splitlines() if ":" in ln]
    except ValueError as e:
        raise ValueError(f"Error listing packages: {str(e)}")


async def complete(success: bool, result: str) -> str:
    """Mark the task as finished."""
    if success:
        return f"Task completed successfully:{result}"
    else:
        return f"Task completed with failure:{result}"


async def enable_a11y(sbx: AsyncSandbox) -> None:
    """Enable could phone sandbox accessibility"""
    pkg = "com.droidrun.portal"
    aty = f"{pkg}/{pkg}.DroidrunPortalService:{pkg}/{pkg}.DroidrunAccessibilityService"
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
    sbx.adb_shell2.push(
=======
    await sbx.adb_shell.push(
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
        os.path.join(os.path.dirname(__file__), "init_configs", "droidrun_config.xml"),
        "/data/local/tmp/droidrun_config.xml",
    )
    droidrun_overlay_disable = """su -c '
cp /data/local/tmp/droidrun_config.xml /data/data/com.droidrun.portal/shared_prefs/droidrun_config.xml
ps -ef|grep com.droidrun.portal|grep -v grep |awk "{print \$2}"|xargs kill -9 2>/dev/null || true
am start com.droidrun.portal/.MainActivity 2>/dev/null || true
input keyevent KEYCODE_HOME || input keyevent 3 || true
' """
<<<<<<< HEAD:libs/langcrew-tools/langcrew_tools/cloud_phone/actions.py
    sbx.adb_shell2.shell(f"settings put secure enabled_accessibility_services {aty}")
    sbx.adb_shell2.shell("settings put secure accessibility_enabled 1")
    sbx.adb_shell2.shell(
        "appops set com.tencent.android.qqdownloader REQUEST_INSTALL_PACKAGES allow"
    )
    sbx.adb_shell2.shell("ime enable com.android.adbkeyboard/.AdbIME")
    sbx.adb_shell2.shell("ime set com.android.adbkeyboard/.AdbIME")
    result = sbx.adb_shell2.shell(droidrun_overlay_disable)
=======
    await sbx.adb_shell.shell(
        f"settings put secure enabled_accessibility_services {aty}"
    )
    await sbx.adb_shell.shell("settings put secure accessibility_enabled 1")
    await sbx.adb_shell.shell(
        "appops set com.tencent.android.qqdownloader REQUEST_INSTALL_PACKAGES allow"
    )
    await sbx.adb_shell.shell("ime enable com.android.adbkeyboard/.AdbIME")
    await sbx.adb_shell.shell("ime set com.android.adbkeyboard/.AdbIME")
    result = sbx.adb_shell.shell(droidrun_overlay_disable)
>>>>>>> acaf48609aa4c66916820dd8e6f2990acd274ccc:libs/langcrew-tools/langcrew_tools/utils/cloud_phone/actions.py
    logger.info(f"Could phone droidrun_overlay_disable result: {result}")
