from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .bubblewrap_sandbox import AsyncSandbox
else:
    sandbox_type = os.getenv("LANGCREW_SANDBOX_TYPE", "agentbox").lower()

    if sandbox_type == "bubblewrap":
        from .bubblewrap_sandbox import AsyncSandbox
    else:
        from agentbox import AsyncSandbox


__all__ = ["AsyncSandbox"]
