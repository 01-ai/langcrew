"""
Widget lifecycle management using ChatKit's diff algorithm.

This module manages the complete lifecycle of widgets from creation to completion,
including streaming updates and incremental diffs. It reuses ChatKit's battle-tested
diff_widget algorithm while adapting the events to LangCrew's protocol format.
"""

import logging
from collections.abc import AsyncGenerator, AsyncIterator
from typing import Any

try:
    from chatkit.server import diff_widget
    from chatkit.types import (
        WidgetComponentUpdated,
        WidgetRootUpdated,
        WidgetStreamingTextValueDelta,
    )
    from chatkit.widgets import WidgetRoot
except ImportError:
    diff_widget = None  # type: ignore[assignment]
    WidgetComponentUpdated = None  # type: ignore[assignment,misc]
    WidgetRootUpdated = None  # type: ignore[assignment,misc]
    WidgetStreamingTextValueDelta = None  # type: ignore[assignment,misc]
    WidgetRoot = None  # type: ignore[assignment,misc]

logger = logging.getLogger(__name__)


class WidgetLifecycleManager:
    """
    Manages widget lifecycle with support for static and streaming widgets.

    This manager handles:
    1. Initial widget creation (added event)
    2. Incremental updates using ChatKit's diff algorithm (update events)
    3. Completion marking (done event)

    It converts ChatKit's ThreadItemUpdate types to LangCrew's flat protocol format.

    Args:
        item_id: Unique identifier for this widget instance

    Example:
        ```python
        from langchain_core.callbacks.manager import adispatch_custom_event

        manager = WidgetLifecycleManager("wid_123")

        async def widget_gen():
            yield Text(id="msg", value="Loading...", streaming=True)
            yield Text(id="msg", value="Loading...Done!", streaming=False)

        async for event_data in manager.stream(widget_gen()):
            await adispatch_custom_event(
                "on_langcrew_widget",
                event_data,
                config=config,
            )
        ```
    """

    def __init__(self, item_id: str):
        """
        Initialize the lifecycle manager.

        Args:
            item_id: Unique identifier for this widget instance
        """
        self.item_id = item_id
        self.current_state: WidgetRoot | None = None

    async def stream(
        self,
        widget_generator: AsyncGenerator[WidgetRoot, None],
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Process a streaming widget and yield LangCrew-formatted event dictionaries.

        This method:
        1. Yields an "added" event with the initial state
        2. Uses ChatKit's diff_widget() to compute incremental updates
        3. Converts ChatKit update types to LangCrew format
        4. Yields a "done" event with the final state

        Args:
            widget_generator: Async generator yielding widget states

        Yields:
            dict: Event dictionaries ready for StreamMessage.detail
                - type: "added" | "update" | "done"
                - item_id: Widget identifier
                - widget/component/delta: Relevant data based on event type

        Raises:
            ValueError: If diff_widget produces unknown update types
        """
        try:
            # Get initial state
            initial = await widget_generator.__anext__()
            self.current_state = initial

            # 1. Send added event
            yield {
                "type": "added",
                "item_id": self.item_id,
                "widget": initial.model_dump(),
                "copy_text": None,
            }

            # 2. Stream incremental updates
            last_state = initial
            async for new_state in widget_generator:
                # Use ChatKit's diff_widget algorithm
                deltas = diff_widget(last_state, new_state)

                for delta in deltas:
                    # Convert ChatKit update to LangCrew format
                    yield self._convert_update(delta)

                last_state = new_state

            self.current_state = last_state

            # 3. Send done event
            yield {
                "type": "done",
                "item_id": self.item_id,
                "widget": last_state.model_dump(),
            }

        except StopAsyncIteration:
            # Generator ended - send done with last known state
            if self.current_state:
                yield {
                    "type": "done",
                    "item_id": self.item_id,
                    "widget": self.current_state.model_dump(),
                }
        except Exception as e:
            logger.error(f"Error streaming widget {self.item_id}: {e}", exc_info=True)
            raise

    def _convert_update(
        self,
        delta: Any,
    ) -> dict[str, Any]:
        """
        Convert ChatKit's ThreadItemUpdate to LangCrew protocol format.

        Maps ChatKit update types:
        - WidgetStreamingTextValueDelta -> streaming_text_delta
        - WidgetComponentUpdated -> component_updated
        - WidgetRootUpdated -> root_updated

        Args:
            delta: ChatKit update object from diff_widget()

        Returns:
            dict: LangCrew-formatted update event for StreamMessage.detail

        Raises:
            ValueError: If delta type is unknown
        """
        if isinstance(delta, WidgetStreamingTextValueDelta):
            return {
                "type": "update",
                "item_id": self.item_id,
                "update_type": "streaming_text_delta",
                "component_id": delta.component_id,
                "delta": delta.delta,
                "done": delta.done,
            }

        elif isinstance(delta, WidgetComponentUpdated):
            return {
                "type": "update",
                "item_id": self.item_id,
                "update_type": "component_updated",
                "component_id": delta.component_id,
                "component": delta.component.model_dump(),
            }

        elif isinstance(delta, WidgetRootUpdated):
            return {
                "type": "update",
                "item_id": self.item_id,
                "update_type": "root_updated",
                "widget": delta.widget.model_dump(),
            }

        else:
            raise ValueError(f"Unknown delta type: {type(delta).__name__}")
