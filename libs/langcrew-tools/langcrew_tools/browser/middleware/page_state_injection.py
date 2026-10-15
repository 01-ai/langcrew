"""
Page State Dynamic Injection Middleware

This middleware dynamically injects current page state (including interactive elements)
before each LLM call, and automatically removes it after completion to avoid history bloat.

How it works:
1. Before model call (before_model): Get current page state and inject into messages
2. After model call (after_model): Remove injected state from messages
3. Ensure only actual conversation is retained in history, not stale page state

Visual enhancement features:
- When use_vision=True in state, also inject page screenshot
- AI can see both structured element data and visual info for more accurate decisions
- Works with vision-enabled models: GPT-4V, Claude 3+, Gemini Pro Vision, etc.

Viewport-first strategy:
- By default only inject interactive elements within viewport (viewport_only=True)
- Ensures text-described elements match screenshot exactly
- Reduces token consumption, improves AI decision accuracy
- AI can proactively call scroll tools when target not found
"""

import base64
import logging
from typing import Any

from langchain.agents.middleware import after_model, before_model
from langchain_core.messages import HumanMessage, RemoveMessage
from langgraph.runtime import Runtime

from .element_index import (  # Import indexing system (removed unused get_element)
    clear_index,
    register_element,
)

logger = logging.getLogger(__name__)

# 用于标识动态注入的消息
PAGE_STATE_MARKER = "__DYNAMIC_PAGE_STATE__"


@before_model
async def inject_page_state_before_model(
    state: dict[str, Any], runtime: Runtime
) -> None:
    """
    Inject current page state before model call
    """
    try:
        if not runtime.store:
            logger.debug("No store in runtime, skipping page state injection")
            return

        result = runtime.store.get(("browser",), "cdp_url")
        cdp_url = result.value.get("url") if result else None
        if not cdp_url:
            logger.debug("No cdp_url in state, skipping page state injection")
            return

        # Dynamic import
        from ..cdp.browser_manager import CDPBrowserManager
        from ..helpers.element_selector_enhanced import EnhancedElementSelector

        browser_manager = CDPBrowserManager.get_instance(cdp_url=cdp_url)

        # Ensure browser connection and sync state
        try:
            await browser_manager.ensure_browser()
            # Brief sync to ensure we have the latest list
            await browser_manager.sync_pages()
        except Exception as e:
            logger.warning(f"Browser unavailable, skipping state injection: {e}")
            return

        # Get current page
        try:
            page = await browser_manager.get_current_page()
        except Exception as e:
            logger.debug(f"Cannot get current page: {e}")
            return

        if not page:
            return

        # Get basic page info
        url = page.url
        title = await page.title()

        # Use enhanced element selector
        elements = await EnhancedElementSelector.get_interactive_elements(
            page, viewport_only=True
        )

        # Optimization: Increase limit to 250 to ensure Agent sees most viewport elements
        max_elements = 250
        truncated = len(elements) > max_elements
        if truncated:
            logger.warning(
                f"⚠️ Viewport has {len(elements)} elements, truncating to {max_elements}"
            )
            elements = elements[:max_elements]

        # Simplify element info
        simplified_elements = []
        for elem in elements:
            selector = EnhancedElementSelector.generate_selector(elem)
            simplified = {
                "tag": elem.get("tag", ""),
                "text": elem.get("text", ""),
                "selector": selector,
                "onclick": elem.get("onclick", ""),
                "category": elem.get("category"),
                "type": elem.get("type") if elem.get("tag") == "input" else None,
                "href": elem.get("href"),
                "disabled": elem.get("disabled"),
            }
            simplified_elements.append(simplified)

        # Detect if page has more content (to prompt AI that scrolling is available)
        # Optimized two-level detection: first quick check window, then check large internal containers
        has_more_content = await page.evaluate("""() => {
            // Step 1: Quick window check
            const windowScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const viewportHeight = window.innerHeight;
            const windowScrollHeight = Math.max(
                document.body.scrollHeight, 
                document.documentElement.scrollHeight
            );
            
            // If window can still scroll down, return true immediately
            if (windowScrollTop + viewportHeight < windowScrollHeight - 100) {
                return true;
            }
            
            // Step 2: Check for internal scroll containers (Crucial for modern SPAs like Ctrip)
            try {
                // Focus on semantic containers that are likely to hold main content
                const elements = document.querySelectorAll('div, main, section, article, aside, nav, ul, ol, form');
                
                for (const el of elements) {
                    // Performance optimization: fast check scrollHeight before expensive style calculation
                    if (el.scrollHeight <= el.clientHeight + 50) continue;

                    const style = window.getComputedStyle(el);
                    const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll');
                    
                    if (isScrollable) {
                        // Only consider containers that occupy a significant part of the viewport
                        const rect = el.getBoundingClientRect();
                        if (rect.width > window.innerWidth * 0.2 && rect.height > window.innerHeight * 0.2) {
                            // Check if this container still has room to scroll down
                            if (el.scrollTop + el.clientHeight < el.scrollHeight - 50) {
                                return true;
                            }
                        }
                    }
                }
            } catch (e) {
                return false; 
            }
            return false;
        }""")

        # Get session_id
        session_id = state.get("session_id", "local-browser-001")

        # Safe Tab Info Fetching: Use Manager's async method
        tab_info = None
        try:
            tabs_list = await browser_manager.get_page_info_async()
            if len(tabs_list) > 1:
                tab_info = {
                    "current_tab_index": browser_manager.current_page_index,
                    "total_tabs": len(tabs_list),
                    "tabs": tabs_list,
                }
        except Exception as e:
            logger.debug(f"Failed to get tab info: {e}")

        # Format as readable text
        page_state_text = _format_page_state(
            url,
            title,
            simplified_elements,
            truncated,
            has_more_content,
            session_id,
            tab_info,
        )

        # Vision support
        use_vision = state.get("use_vision", False)
        screenshot_data = None

        if use_vision:
            try:
                screenshot_bytes = await page.screenshot(type="png", full_page=False)
                screenshot_base64 = base64.b64encode(screenshot_bytes).decode("utf-8")
                screenshot_data = f"data:image/png;base64,{screenshot_base64}"
            except Exception as e:
                logger.error(f"Failed to capture screenshot: {e}")
                use_vision = False

        # Create temporary message
        if use_vision and screenshot_data:
            page_state_msg = HumanMessage(
                content=[
                    {"type": "text", "text": page_state_text},
                    {
                        "type": "image_url",
                        "image_url": {"url": screenshot_data, "detail": "high"},
                    },
                ],
                additional_kwargs={PAGE_STATE_MARKER: True},
            )
        else:
            page_state_msg = HumanMessage(
                content=page_state_text, additional_kwargs={PAGE_STATE_MARKER: True}
            )
            logger.info(
                f"✅ Injected page state: {len(simplified_elements)} viewport elements from {url[:60]}..."
            )

        state["messages"].append(page_state_msg)

    except Exception as e:
        logger.error(f"❌ Failed to inject page state: {e}", exc_info=True)


@after_model
def remove_page_state_after_model(state: dict[str, Any], runtime: Runtime):
    """
    Remove dynamically injected page state messages after model call
    """
    try:
        messages = state.get("messages", [])
        if not messages:
            return {"messages": []}

        remove_messages = []
        page_state_removed = 0
        for msg in messages:
            if getattr(msg, "additional_kwargs", {}).get(PAGE_STATE_MARKER, False):
                remove_messages.append(RemoveMessage(id=msg.id))
                page_state_removed += 1

        if page_state_removed > 0:
            logger.debug(f"🧹 Cleaned {page_state_removed} page state messages")

        return {"messages": remove_messages}

    except Exception as e:
        logger.error(f"Error in remove_page_state_after_model: {e}", exc_info=True)
        return {"messages": []}


def _format_page_state(
    url: str,
    title: str,
    elements: list[dict],
    truncated: bool,
    has_more_content: bool = False,
    session_id: str = "default",  # Add session_id
    tab_info: dict = None,  # Add tab info parameter
) -> str:
    """
    Format page state as readable text (with index annotation)
    """
    # Clear old index (when page state updates)
    clear_index(session_id)

    # Header
    lines = [
        "━━ Current Viewport State ━━",
        f"📍 {title[:60]}",
        f"🔗 {url[:80]}",
        "",
    ]

    # Add Tab info
    if tab_info:
        current_idx = tab_info.get("current_tab_index", 0)
        total = tab_info.get("total_tabs", 1)
        tabs = tab_info.get("tabs", [])

        if total > 1:
            lines.append(f"📑 Current tab: {current_idx}")
            lines.append(f"   Available tabs ({total} total):")
            for tab in tabs:
                tab_idx = tab.get("index", 0)
                tab_url = tab.get("url", "")
                tab_title = tab.get("title", "")
                marker = " ← YOU ARE HERE" if tab_idx == current_idx else ""
                display_url = tab_url[:50] + "..." if len(tab_url) > 50 else tab_url
                display_title = (
                    tab_title[:40] + "..." if len(tab_title) > 40 else tab_title
                )
                lines.append(
                    f"   • Tab {tab_idx}: {display_url} - {display_title}{marker}"
                )
            lines.append("")

    lines.append(
        f"🎯 {len(elements)} interactive elements"
        + (" (truncated)" if truncated else "")
        + ":"
    )

    # Format elements
    for elem in elements:
        text = elem.get("text", "")
        selector = elem.get("selector", "")
        onclick = elem.get("onclick", "")
        href = elem.get("href", "")
        tag = elem.get("tag", "")
        elem_type = elem.get("type", "")
        category = elem.get("category", "")

        # Register element and get index
        index = register_element(
            session_id=session_id,
            selector=selector,
            text=text,
            tag=tag,
            href=href,
            onclick=onclick,
            elem_type=elem_type,
            category=category,
        )

        # Determine type label
        if tag == "button" or category == "button":
            type_label = "button"
        elif tag == "a":
            type_label = "link"
        elif tag == "input":
            type_label = elem_type or "input"
        elif tag == "select":
            type_label = "select"
        elif tag == "textarea":
            type_label = "textarea"
        else:
            type_label = tag or "element"

        context_parts = []
        if onclick:
            import re

            params = re.findall(r'[\'"]([^\'"]+)[\'"]', onclick)
            if params:
                main_param = params[0]
                if "/" in main_param:
                    parts = main_param.split("/")
                    meaningful_part = [p for p in parts if p and "?" not in p]
                    display_param = (
                        meaningful_part[-1]
                        if meaningful_part
                        else (
                            main_param.split("=")[-1]
                            if "=" in main_param
                            else main_param
                        )
                    )
                else:
                    display_param = main_param
                if len(display_param) > 40:
                    display_param = display_param[:37] + "..."
                context_parts.append(f"→ {display_param}")
        elif href and not onclick:
            meaningful_part = href.split("/")[-1].split("?")[0] if "/" in href else href
            if (
                meaningful_part
                and meaningful_part != href
                and not href.startswith("http")
            ):
                if len(meaningful_part) > 40:
                    meaningful_part = meaningful_part[:37] + "..."
                context_parts.append(f"href: {meaningful_part}")
        elif tag == "input":
            placeholder = elem.get("placeholder")
            if placeholder:
                display_placeholder = placeholder[:30] + (
                    "..." if len(placeholder) > 30 else ""
                )
                context_parts.append(f"placeholder: {display_placeholder}")
            elif elem_type and elem_type != "text":
                context_parts.append(f"type: {elem_type}")

        line_parts = [f"{index}. [{type_label}]"]
        if text:
            display_text = text[:50] if len(text) > 50 else text
            line_parts.append(f'"{display_text}"')
        if context_parts:
            line_parts.append(f"({', '.join(context_parts)})")
        lines.append(" ".join(line_parts))

    lines.append("")
    if has_more_content:
        lines.append(
            "⬇️ More content available below. You can scroll to see more elements."
        )
    else:
        lines.append("💡 Bottom of page reached.")

    lines.append("")
    lines.append("💡 Tip: Use element index to interact (e.g., browser_click(index=5))")

    return "\n".join(lines)
