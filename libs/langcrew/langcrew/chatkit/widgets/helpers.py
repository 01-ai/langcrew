"""
Helper functions for streaming widgets in LangCrew agents.

This module provides a simple API for LangCrew agents and tools to send widgets
through LangGraph's custom event system. It handles both static and streaming widgets
seamlessly.
"""

import logging
from collections.abc import AsyncGenerator
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables.config import RunnableConfig

from ...utils.message_utils import generate_message_id

# Import ChatKit dependencies (optional)
try:
    from chatkit.widgets import WidgetRoot
except ImportError:
    WidgetRoot = None  # type: ignore[assignment,misc]

from .lifecycle import WidgetLifecycleManager

logger = logging.getLogger(__name__)


async def stream_widget(
    config: RunnableConfig | None,
    widget: WidgetRoot | AsyncGenerator[WidgetRoot, None],
    copy_text: str | None = None,
    widget_id: str | None = None,
) -> str:
    """
    Stream a widget through LangGraph's custom event system.

    This is the main API for sending widgets from LangCrew agents and tools.
    It supports both static widgets (sent immediately) and streaming widgets
    (sent with incremental updates).

    The function automatically:
    - Generates a unique widget ID (or uses provided ID)
    - Handles lifecycle management (add -> update -> done)
    - Uses ChatKit's diff algorithm for streaming updates
    - Sends events through LangGraph callbacks

    Args:
        config: RunnableConfig containing callbacks from LangGraph execution context.
                This is automatically provided to @tool decorated functions.
                Can be None (events won't be dispatched but function won't error).
        widget: Either a static WidgetRoot instance or an async generator that yields
                WidgetRoot instances for streaming updates.
        copy_text: Optional text that will be copied to clipboard when user clicks
                   the copy button on the widget. Useful for providing a text fallback
                   of the widget content.
        widget_id: Optional custom widget ID. If not provided, a unique ID will be generated.
                   Useful when you need to remove or replace the widget later.

    Returns:
        str: The widget ID (either generated or the provided one)

    Raises:
        ValueError: If config doesn't contain callbacks
        Exception: Propagates any errors from widget generation or lifecycle management

    Example - Static Widget:
        ```python
        from langcrew.widgets import Card, Text, Button
        from langcrew.widgets.helpers import stream_widget
        from langchain_core.tools import tool

        @tool
        async def show_weather(city: str, config: RunnableConfig):
            '''Display weather information'''
            widget = Card(
                children=[
                    Text(value=f"Weather in {city}", size="lg"),
                    Text(value="Temperature: 25°C"),
                    Button(label="Refresh"),
                ]
            )
            await stream_widget(config, widget, copy_text=f"Weather: {city}, 25°C")
            return "Weather widget displayed"
        ```

    Example - Streaming Widget:
        ```python
        from langcrew.widgets import Text
        from langcrew.widgets.helpers import stream_widget
        import asyncio

        @tool
        async def search_with_progress(query: str, config: RunnableConfig):
            '''Search with live progress updates'''
            async def progress_widget():
                for i in range(0, 101, 10):
                    # Must have id for streaming text updates
                    yield Text(
                        id="progress_text",
                        value=f"Searching... {i}%",
                        streaming=True if i < 100 else False
                    )
                    await asyncio.sleep(0.2)

            await stream_widget(config, progress_widget())
            return f"Search completed for: {query}"
        ```

    Example - Complex Streaming Widget:
        ```python
        from langcrew.widgets import Card, Text, Markdown
        import asyncio

        @tool
        async def analyze_data(data: dict, config: RunnableConfig):
            '''Analyze data with streaming results'''
            async def analysis_widget():
                # Initial state
                yield Card(
                    children=[
                        Text(id="status", value="Starting analysis...", streaming=True),
                        Markdown(id="results", value="", streaming=True),
                    ]
                )

                # Update status
                await asyncio.sleep(1)
                yield Card(
                    children=[
                        Text(id="status", value="Analyzing data...", streaming=True),
                        Markdown(id="results", value="## Preliminary Results\\n", streaming=True),
                    ]
                )

                # Add results incrementally
                await asyncio.sleep(1)
                yield Card(
                    children=[
                        Text(id="status", value="Analysis complete!", streaming=False),
                        Markdown(
                            id="results",
                            value="## Results\\n- Finding 1\\n- Finding 2\\n",
                            streaming=False
                        ),
                    ]
                )

            await stream_widget(config, analysis_widget())
            return "Analysis complete"
        ```

    Note:
        - For streaming text updates, components must have an 'id' field
        - Set 'streaming=True' on Text/Markdown during updates, 'streaming=False' when done
        - ChatKit's diff algorithm ensures only deltas are sent for efficiency
        - All widget data is serialized to ChatKit-compatible JSON format
        - The returned widget ID can be used with remove_widget() or replace_widget()
    """
    # Generate unique widget ID or use provided one
    item_id = widget_id or generate_message_id()

    # Handle static widget (non-streaming)
    if not isinstance(widget, AsyncGenerator):
        # Align with ChatKit: static widgets only send "done" event, not "added"
        # ChatKit's stream_widget yields ThreadItemDoneEvent directly for static widgets
        event_data = {
            "type": "done",
            "item_id": item_id,
            "widget": widget.model_dump(),
            "copy_text": copy_text,
        }

        try:
            await adispatch_custom_event(
                "on_langcrew_widget",
                event_data,
                config=config,
            )
        except Exception as e:
            logger.error(
                f"Failed to send static widget event {item_id}: {e}", exc_info=True
            )
            raise

        logger.debug(f"Static widget sent successfully: {item_id}")
        return item_id  # Return ID for static widgets

    # Handle streaming widget
    manager = WidgetLifecycleManager(item_id)

    try:
        async for event_data in manager.stream(widget):
            # Add copy_text to initial widget_added event
            if event_data.get("type") == "widget_added" and copy_text:
                event_data["copy_text"] = copy_text

            # Send through LangGraph custom event system
            await adispatch_custom_event(
                "on_langcrew_widget",
                event_data,
                config=config,
            )

        logger.debug(f"Streaming widget completed successfully: {item_id}")
        return item_id  # Return ID for streaming widgets

    except Exception as e:
        logger.error(f"Failed to stream widget {item_id}: {e}", exc_info=True)
        raise


async def send_widget_event(
    config: RunnableConfig,
    event_type: str,
    item_id: str,
    **kwargs: Any,
) -> None:
    """
    Low-level function to send a widget event directly through callbacks.

    This is an advanced API for cases where you need fine-grained control
    over widget events. Most users should use stream_widget() instead.

    Args:
        config: RunnableConfig from the tool execution context
        event_type: Widget event type ("added", "update", "done", "removed")
        item_id: Widget identifier
        **kwargs: Additional event data (widget, component, delta, etc.)

    Example:
        ```python
        await send_widget_event(
            config,
            "added",
            "wid_123",
            widget={"type": "text", "value": "Hello"},
        )
        ```
    """
    event_data = {
        "type": event_type,
        "item_id": item_id,
        **kwargs,
    }

    try:
        await adispatch_custom_event(
            "on_langcrew_widget",
            event_data,
            config=config,
        )
    except Exception as e:
        logger.error(
            f"Failed to send widget event {event_type} for {item_id}: {e}",
            exc_info=True,
        )
        raise


async def remove_widget(
    config: RunnableConfig,
    item_id: str,
) -> None:
    """
    Remove a widget from display.

    This sends a widget removal event to the frontend, which should
    remove the widget from the UI and conversation history.

    Args:
        config: RunnableConfig from the tool execution context
        item_id: ID of the widget to remove

    Returns:
        None: The removal event is sent through LangGraph callbacks

    Raises:
        Exception: If the event dispatch fails (logged but propagated)

    Example - Temporary Widget:
        ```python
        from langcrew.widgets import Card, Text, stream_widget, remove_widget
        from langchain_core.tools import tool
        from langchain_core.runnables.config import RunnableConfig
        import asyncio

        @tool
        async def show_temporary_message(message: str, config: RunnableConfig):
            '''Show a temporary message that disappears after 3 seconds'''
            # Generate a known ID for this widget
            from langcrew.utils.message_utils import generate_message_id
            widget_id = generate_message_id()

            # Show the widget (you'd need to modify stream_widget to accept custom ID)
            widget = Card(children=[Text(value=message)])
            await stream_widget(config, widget)

            # Wait 3 seconds
            await asyncio.sleep(3)

            # Remove the widget
            await remove_widget(config, widget_id)

            return "Temporary message shown and removed"
        ```

    Example - Remove Loading Widget:
        ```python
        @tool
        async def process_data(data: str, config: RunnableConfig):
            '''Process data with loading indicator'''
            # Show loading widget
            loading_id = "loading_widget"
            loading = Card(children=[Text(value="Processing...")])
            await stream_widget(config, loading)

            # Do processing
            result = await process(data)

            # Remove loading widget
            await remove_widget(config, loading_id)

            # Show results
            results_widget = Card(children=[Text(value=f"Results: {result}")])
            await stream_widget(config, results_widget)

            return "Processing complete"
        ```

    Note:
        You need to track widget IDs if you want to remove them later.
        The current stream_widget() generates IDs automatically, so you'd
        need to either:
        1. Modify stream_widget() to accept a custom ID parameter
        2. Use the lower-level send_widget_event() with known IDs
        3. Rely on frontend to track and manage widget IDs
    """
    event_data = {
        "type": "removed",
        "item_id": item_id,
    }

    try:
        await adispatch_custom_event(
            "on_langcrew_widget",
            event_data,
            config=config,
        )
        logger.debug(f"Widget removed: {item_id}")
    except Exception as e:
        logger.error(f"Failed to remove widget {item_id}: {e}", exc_info=True)
        raise


async def replace_widget(
    config: RunnableConfig,
    item_id: str,
    new_widget: WidgetRoot,
    copy_text: str | None = None,
) -> None:
    """
    Replace an existing widget atomically (single event, same ID).

    This matches ChatKit's ThreadItemReplacedEvent behavior where the
    replacement is atomic and the item_id remains unchanged. The frontend
    receives a single "replaced" event with the new widget content.

    Args:
        config: RunnableConfig from the tool execution context
        item_id: ID of the widget to replace
        new_widget: New widget to display (will use the same item_id)
        copy_text: Optional clipboard text for the new widget

    Returns:
        None: The replacement event is sent through LangGraph callbacks

    Raises:
        Exception: If the event dispatch fails (logged but propagated)

    Example - Replace Loading with Results:
        ```python
        from langcrew.widgets import Card, Text, Progress, Markdown
        from langcrew.widgets import stream_widget, replace_widget
        from langchain_core.tools import tool
        import asyncio

        @tool
        async def search_with_loading(query: str, config: RunnableConfig):
            '''Search with loading indicator that gets replaced'''
            # Show loading widget with custom ID
            loading_id = "search_loading"
            loading_widget = Card(children=[
                Text(value="Searching...", size="lg"),
                Progress(value=None),  # Indeterminate progress
            ])
            await stream_widget(config, loading_widget, widget_id=loading_id)

            # Simulate search
            await asyncio.sleep(2)
            results = ["Result 1", "Result 2", "Result 3"]

            # Atomically replace with results (same ID)
            results_widget = Card(children=[
                Text(value="Search Results", size="xl"),
                Markdown(value=f"## Results for '{query}'\\n\\n" +
                        "\\n".join(f"- {r}" for r in results))
            ])
            await replace_widget(config, loading_id, results_widget)

            return f"Search completed for: {query}"
        ```

    Example - Update Status Widget:
        ```python
        @tool
        async def multi_step_process(config: RunnableConfig):
            '''Process with status updates'''
            status_id = "status_widget"

            # Step 1
            await stream_widget(
                config,
                Card(children=[Text(value="Step 1: Initializing...")]),
                widget_id=status_id
            )

            await asyncio.sleep(1)

            # Step 2 - atomic replace
            await replace_widget(config, status_id, Card(children=[
                Text(value="Step 2: Processing...")
            ]))

            await asyncio.sleep(1)

            # Step 3 - atomic replace again
            await replace_widget(config, status_id, Card(children=[
                Text(value="Step 3: Complete!", color="green")
            ]))

            return "Process complete"
        ```

    Note:
        This is an atomic operation that sends a single "replaced" event.
        The widget keeps the same item_id, providing a seamless transition
        on the frontend without flickering or temporary removal.

        This matches ChatKit's ThreadItemReplacedEvent behavior.
    """
    # Send atomic replace event (matches ChatKit's ThreadItemReplacedEvent)
    event_data = {
        "type": "replaced",
        "item_id": item_id,
        "widget": new_widget.model_dump(),
        "copy_text": copy_text,
    }

    try:
        await adispatch_custom_event(
            "on_langcrew_widget",
            event_data,
            config=config,
        )
        logger.debug(f"Widget replaced: {item_id}")
    except Exception as e:
        logger.error(f"Failed to replace widget {item_id}: {e}", exc_info=True)
        raise
