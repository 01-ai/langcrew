"""Middleware for handling skills.

This middleware loads skill metadata from directories (via a filesystem backend)
and injects a Skills section into the system prompt, following the deepagents
pattern for progressive skill disclosure.

Supports both sandbox and local filesystem backends.
"""

from __future__ import annotations

import asyncio
import logging
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

import yaml
from langchain.agents.middleware import AgentMiddleware, AgentState
from langchain.agents.middleware.types import ModelRequest
from langchain_core.messages import SystemMessage
from langchain_core.tools import BaseTool, tool
from langgraph.runtime import Runtime

from .protocols import FilesystemBackend

logger = logging.getLogger(__name__)

# YAML frontmatter regex pattern (same approach as deepagents)
YAML_FRONTMATTER_PATTERN = re.compile(
    r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL | re.MULTILINE
)


@dataclass
class SkillMetadata:
    """Metadata for a single skill.

    Attributes:
        name: Unique name of the skill (required)
        description: Human-readable description of the skill (required)
        path: Absolute path to the SKILL.md file
        license: Optional license information
        compatibility: Optional compatibility requirements
        metadata: Optional additional metadata
        allowed_tools: Optional list of tools the skill can use
    """

    name: str
    description: str
    path: str
    license: str | None = None
    compatibility: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    allowed_tools: list[str] = field(default_factory=list)


async def parse_skill_metadata(
    skill_dir: str,
    backend: FilesystemBackend,
) -> SkillMetadata | None:
    """Parse SKILL.md file and extract metadata from the sandbox filesystem.

    Args:
        skill_dir: Absolute path to the skill directory containing SKILL.md
        backend: Filesystem backend for sandbox operations

    Returns:
        SkillMetadata if successfully parsed, None otherwise
    """
    skill_path = f"{skill_dir.rstrip('/')}/SKILL.md"

    try:
        exists = await backend.exists(skill_path)
    except Exception as e:
        logger.error(f"Failed to check existence of SKILL.md in {skill_dir}: {e}")
        return None

    if not exists:
        logger.warning(f"SKILL.md not found in {skill_dir}")
        return None

    try:
        content = await backend.read(skill_path)
    except Exception as e:
        logger.error(f"Failed to read SKILL.md in {skill_dir}: {e}")
        return None

    # Extract YAML frontmatter
    match = YAML_FRONTMATTER_PATTERN.match(content)
    if not match:
        logger.warning(f"No valid YAML frontmatter found in {skill_path}")
        return None

    frontmatter_content = match.group(1)

    try:
        frontmatter = yaml.safe_load(frontmatter_content)
    except yaml.YAMLError as e:
        logger.error(f"Failed to parse YAML frontmatter in {skill_path}: {e}")
        return None

    if not isinstance(frontmatter, dict):
        logger.warning(f"YAML frontmatter is not a dict in {skill_path}")
        return None

    # Validate required fields
    name = frontmatter.get("name")
    description = frontmatter.get("description")

    if not name:
        logger.warning(f"Missing 'name' in SKILL.md frontmatter: {skill_path}")
        return None

    if not description:
        logger.warning(f"Missing 'description' in SKILL.md frontmatter: {skill_path}")
        return None

    # Build SkillMetadata
    return SkillMetadata(
        name=str(name),
        description=str(description),
        path=skill_path,
        license=frontmatter.get("license"),
        compatibility=frontmatter.get("compatibility"),
        metadata=frontmatter.get("metadata", {}) or {},
        allowed_tools=frontmatter.get("allowed-tools", []) or [],
    )


async def load_skills_metadata(
    skill_dirs: list[str],
    backend: FilesystemBackend,
) -> dict[str, SkillMetadata]:
    """Load skill metadata from multiple directories via the sandbox backend.

    Skills are merged by name, with later entries overriding earlier ones
    (last one wins).

    Args:
        skill_dirs: List of absolute paths to skill directories
        backend: Filesystem backend for sandbox operations

    Returns:
        Dictionary mapping skill name to SkillMetadata
    """
    skills_metadata: dict[str, SkillMetadata] = {}

    for skill_dir in skill_dirs:
        skill = await parse_skill_metadata(skill_dir, backend)
        if skill is not None:
            if skill.name in skills_metadata:
                logger.info(
                    f"Overriding skill '{skill.name}' from {skills_metadata[skill.name].path} "
                    f"with {skill.path}"
                )
            skills_metadata[skill.name] = skill

    return skills_metadata


async def discover_skill_dirs(
    base_dir: str,
    backend: FilesystemBackend,
) -> list[str]:
    """Auto-discover skill directories containing SKILL.md under a base directory.

    Scans first-level subdirectories of *base_dir* for the presence of a
    ``SKILL.md`` file. Any subdirectory that contains one is treated as a skill
    directory.

    Args:
        base_dir: Absolute path to the parent directory to scan
        backend: Filesystem backend for directory listing / existence checks

    Returns:
        List of absolute paths to discovered skill directories
    """
    skill_dirs: list[str] = []
    try:
        entries = await backend.list(base_dir)
    except Exception:
        logger.warning(f"Failed to list skills base dir: {base_dir}")
        return skill_dirs

    for entry in entries:
        if entry.startswith("."):
            continue
        subdir = f"{base_dir.rstrip('/')}/{entry}"
        skill_path = f"{subdir}/SKILL.md"
        try:
            if await backend.exists(skill_path):
                skill_dirs.append(subdir)
        except Exception:
            continue

    return skill_dirs


def _create_skill_read_tool(backend: FilesystemBackend) -> BaseTool:
    """Create a lightweight ``read_file`` tool backed by *backend*.

    This tool is auto-injected by :class:`SandboxSkillsMiddleware` so that the
    agent can read ``SKILL.md`` files on demand (progressive disclosure).
    """

    @tool("read_file")
    async def read_file(path: str) -> str:
        """Read the contents of a file. Use this to read SKILL.md files
        when you need the full instructions for a skill."""
        try:
            return await backend.read(path)
        except Exception as e:
            return f"Error reading file: {e}"

    return read_file


def build_skills_system_prompt(
    skill_dirs: list[str],
    skills_metadata: dict[str, SkillMetadata],
) -> str:
    """Build the skills section for the system prompt.

    Follows the deepagents-style format for progressive skill disclosure.

    Args:
        skill_dirs: List of configured skill directories
        skills_metadata: Dictionary of loaded skill metadata

    Returns:
        Formatted skills section for injection into system prompt
    """
    if not skills_metadata:
        return ""

    lines = [
        "<skills>",
        "You can use specialized 'skills' to help you with complex tasks. "
        "Each skill has a name and a description listed below.",
        "",
        "Skills are folders of instructions, scripts, and resources that extend "
        "your capabilities for specialized tasks. Each skill folder contains:",
        "- **SKILL.md** (required): The main instruction file with YAML frontmatter "
        "(name, description) and detailed markdown instructions",
        "",
        "More complex skills may include additional directories and files as needed, "
        "for example:",
        "- **scripts/** - Helper scripts and utilities that extend your capabilities",
        "- **examples/** - Reference implementations and usage patterns",
        "- **resources/** - Additional files, templates, or assets the skill may reference",
        "",
        "If a skill seems relevant to your current task, you MUST use the "
        "`read_file` tool on the SKILL.md file to read its full instructions "
        "before proceeding. Once you have read the instructions, follow them exactly "
        "as documented.",
        "",
        "**Skill Locations:**",
        "",
        "Skills are located in the following directories:",
        "",
    ]

    for skill_dir in skill_dirs:
        lines.append(f"- `{skill_dir}`")

    lines.extend([
        "",
        "**Available Skills:**",
        "",
    ])

    for skill_name, skill in sorted(skills_metadata.items()):
        lines.append(f"- **{skill_name}**: {skill.description}")
        lines.append(f"  -> Read `{skill.path}` for full instructions")

    lines.append("</skills>")

    return "\n".join(lines)


# State key for storing loaded skills metadata
SKILLS_METADATA_STATE_KEY = "skills_metadata"


class SandboxSkillsMiddleware(AgentMiddleware):
    """Middleware for loading and injecting skills into agent prompts.

    This middleware follows the deepagents pattern:
    1. Load skill metadata from configured directories (once per thread)
    2. Inject a Skills section into the system prompt for progressive disclosure
    3. Auto-inject a ``read_file`` tool so the agent can read SKILL.md on demand

    Args:
        backend: Filesystem backend (sandbox or local)
        skill_dirs: Explicit list of absolute paths to skill directories
        skills_base_dir: Base directory to auto-discover skill subdirectories

    Example:
        >>> from langcrew.middleware import SkillsMiddleware, LocalFilesystemBackend
        >>> middleware = SkillsMiddleware(
        ...     backend=LocalFilesystemBackend(),
        ...     skills_base_dir="/project/skills",
        ... )
    """

    def __init__(
        self,
        backend: FilesystemBackend,
        skill_dirs: list[str] | None = None,
        skills_base_dir: str | None = None,
    ):
        """Initialize the middleware.

        Args:
            backend: Filesystem backend for file operations
            skill_dirs: Explicit list of skill directory paths
            skills_base_dir: Base dir to auto-discover skill subdirectories
        """
        self.backend = backend
        self.skill_dirs = skill_dirs or []
        self.skills_base_dir = skills_base_dir
        self._skills_metadata: dict[str, SkillMetadata] | None = None
        self._skills_prompt: str | None = None
        self._load_lock = asyncio.Lock()

        # Auto-inject read_file tool via langchain middleware tools mechanism
        self.tools: list[BaseTool] = [_create_skill_read_tool(backend)]

        src = []
        if self.skill_dirs:
            src.append(f"{len(self.skill_dirs)} explicit dirs")
        if self.skills_base_dir:
            src.append(f"base_dir={self.skills_base_dir}")
        logger.info(f"SandboxSkillsMiddleware initialized ({', '.join(src) or 'no dirs'})")

    async def _aensure_loaded(self) -> None:
        """Ensure skills metadata is loaded (lazy loading, async)."""
        if self._skills_metadata is not None:
            return

        async with self._load_lock:
            if self._skills_metadata is None:
                # Auto-discover from base dir if configured
                all_dirs = list(self.skill_dirs)
                if self.skills_base_dir:
                    discovered = await discover_skill_dirs(
                        self.skills_base_dir, self.backend
                    )
                    for d in discovered:
                        if d not in all_dirs:
                            all_dirs.append(d)

                self._skills_metadata = await load_skills_metadata(
                    all_dirs, self.backend
                )
                self._skills_prompt = build_skills_system_prompt(
                    all_dirs, self._skills_metadata
                )
                logger.info(
                    f"Loaded {len(self._skills_metadata)} skills: "
                    f"{list(self._skills_metadata.keys())}"
                )

    def before_agent(
        self,
        state: AgentState,
        runtime: Runtime[Any],
    ) -> dict[str, Any] | None:
        """Synchronous hook called before agent execution.

        Stores skills metadata in state if not already present.
        """
        if SKILLS_METADATA_STATE_KEY in state:
            return None

        if self._skills_metadata is None:
            return None

        # Store metadata in state for potential use by tools
        state[SKILLS_METADATA_STATE_KEY] = self._skills_metadata

        return state

    async def abefore_agent(
        self,
        state: AgentState,
        runtime: Runtime[Any],
    ) -> dict[str, Any] | None:
        """Async hook called before agent execution.

        Stores skills metadata in state if not already present.
        """
        if SKILLS_METADATA_STATE_KEY in state:
            return None

        await self._aensure_loaded()

        # Store metadata in state for potential use by tools
        state[SKILLS_METADATA_STATE_KEY] = self._skills_metadata

        return state

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Any],
    ) -> Any:
        """Synchronous model call wrapper.

        Injects skills section into the system message.
        """
        if self._skills_prompt:
            # Append skills section to system message using override()
            if request.system_message:
                new_content = (
                    f"{request.system_message.content}\n\n{self._skills_prompt}"
                )
                request = request.override(
                    system_message=SystemMessage(content=new_content)
                )
            else:
                request = request.override(
                    system_message=SystemMessage(content=self._skills_prompt)
                )

        return handler(request)

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[Any]],
    ) -> Any:
        """Async model call wrapper.

        Injects skills section into the system message.
        """
        await self._aensure_loaded()

        if self._skills_prompt:
            # Append skills section to system message using override()
            if request.system_message:
                new_content = (
                    f"{request.system_message.content}\n\n{self._skills_prompt}"
                )
                request = request.override(
                    system_message=SystemMessage(content=new_content)
                )
            else:
                request = request.override(
                    system_message=SystemMessage(content=self._skills_prompt)
                )

        return await handler(request)


# Convenience alias — prefer this name in new code
SkillsMiddleware = SandboxSkillsMiddleware
