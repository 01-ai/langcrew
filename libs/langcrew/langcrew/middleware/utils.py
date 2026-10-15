"""Utility functions for middleware operations.

This module provides helper functions for middleware implementations,
particularly for handling large tool results and formatting content.
"""


def sanitize_tool_call_id(tool_call_id: str) -> str:
    r"""Sanitize tool_call_id to prevent path traversal and separator issues.

    Replaces dangerous characters (., /, \) with underscores to make it safe
    for use as a filename component.

    Args:
        tool_call_id: The tool call ID to sanitize

    Returns:
        Sanitized string safe for use in file paths

    Example:
        >>> sanitize_tool_call_id("call_abc.123/456")
        'call_abc_123_456'
    """
    sanitized = tool_call_id.replace(".", "_").replace("/", "_").replace("\\", "_")
    return sanitized


def format_content_with_line_numbers(
    lines: list[str],
    start_line: int = 1,
    max_line_length: int = 10000,
    line_number_width: int = 6,
) -> str:
    """Format content with line numbers (cat -n style).

    Long lines are chunked with continuation markers (e.g., 5.1, 5.2).

    Args:
        lines: List of lines to format
        start_line: Starting line number (default: 1)
        max_line_length: Maximum length before chunking (default: 10000)
        line_number_width: Width for line number padding (default: 6)

    Returns:
        Formatted content with line numbers

    Example:
        >>> lines = ["short", "very long line..." * 1000]
        >>> print(format_content_with_line_numbers(lines))
             1	short
             2	very long line...very long line...
           2.1	...continued...
    """
    result_lines = []
    for i, line in enumerate(lines):
        line_num = i + start_line

        if len(line) <= max_line_length:
            result_lines.append(f"{line_num:{line_number_width}d}\t{line}")
        else:
            # Split long line into chunks with continuation markers
            num_chunks = (len(line) + max_line_length - 1) // max_line_length
            for chunk_idx in range(num_chunks):
                start = chunk_idx * max_line_length
                end = min(start + max_line_length, len(line))
                chunk = line[start:end]
                if chunk_idx == 0:
                    # First chunk: use normal line number
                    result_lines.append(f"{line_num:{line_number_width}d}\t{chunk}")
                else:
                    # Continuation chunks: use decimal notation (e.g., 5.1, 5.2)
                    continuation_marker = f"{line_num}.{chunk_idx}"
                    result_lines.append(
                        f"{continuation_marker:>{line_number_width}}\t{chunk}"
                    )

    return "\n".join(result_lines)


def truncate_if_too_long(
    content: str | list,
    max_length: int = 10000,
    truncation_msg: str = "... [content truncated due to size]",
) -> str:
    """Truncate content if it exceeds maximum length.

    Args:
        content: Content to potentially truncate (string or list)
        max_length: Maximum length in characters (default: 10000)
        truncation_msg: Message to append when truncated

    Returns:
        Original or truncated content as string

    Example:
        >>> truncate_if_too_long("a" * 20000, max_length=100)
        'aaa...aaa... [content truncated due to size]'
    """
    if isinstance(content, list):
        # For lists, convert to string representation and check total length
        total_chars = sum(len(str(item)) for item in content)
        if total_chars > max_length:
            # Truncate list to fit within max_length
            truncated = []
            current_length = 0
            for item in content:
                item_str = str(item)
                if current_length + len(item_str) > max_length:
                    break
                truncated.append(item_str)
                current_length += len(item_str)
            return "\n".join(truncated) + "\n" + truncation_msg
        return "\n".join(str(item) for item in content)

    # For strings
    if len(content) > max_length:
        return content[:max_length] + "\n" + truncation_msg
    return content
