import asyncio
import re

from bs4 import BeautifulSoup
from e2b import AsyncSandbox

from ..utils.s3.base_s3_client import AsyncS3Client
from ..utils.sandbox import sandbox_s3_toolkit


async def fix_content(
    sandbox: AsyncSandbox, s3: AsyncS3Client, file_path: str, content: str
) -> str:
    """help llm check and fix generated content"""
    lower_file_path = file_path.lower()
    if lower_file_path.endswith((".html", ".htm", ".md", ".markdown")):
        return await fix_image_src(sandbox, s3, file_path, content)

    return content


async def fix_image_src(
    sandbox: AsyncSandbox, s3: AsyncS3Client, file_path: str, content: str
) -> str:
    """
    Analyzes HTML/MD content to fix <img> tags src.
    """

    async def get_s3_url(src: str) -> str | None:
        src = src.removeprefix("./")
        src = src.removeprefix("/workspace/")

        return await sandbox_s3_toolkit.upload_file_to_s3(
            sandbox, s3, f"/workspace/{src}", f"user_attachments/{src}"
        )

    def is_local_img(src: str) -> bool:
        return not src.startswith(("http://", "https://", "data:"))

    if file_path.lower().endswith((".md", ".markdown")):
        matches = list(re.finditer(r"!\[(.*?)\]\((.*?)\)", content))

        srcs = {
            match.group(2)
            for match in matches
            if match.group(2) and is_local_img(match.group(2))
        }

        if not srcs:
            return content

        s3_urls = await asyncio.gather(*[get_s3_url(src) for src in srcs])
        src_to_s3_map = dict(zip(srcs, s3_urls))

        def replace_link(match: re.Match[str]) -> str:
            alt_text, src = match.group(1), match.group(2)
            if src in src_to_s3_map:
                url = src_to_s3_map.get(src, None)
                if url:
                    return f"![{alt_text}]({url})"
            return match.group(0)

        return re.sub(r"!\[(.*?)\]\((.*?)\)", replace_link, content)

    if file_path.lower().endswith((".html", ".htm")):
        soup = BeautifulSoup(content, "html.parser")
        for img in soup.find_all("img"):
            src: str = img.get("src")
            if src and is_local_img(src):
                url = await get_s3_url(src)
                if url:
                    img["src"] = url
            if src and src.startswith(("http://", "https://")):
                img["src"] = src.replace("#", "%23")

        return str(soup)

    return content


def is_binary_file(data: bytes | bytearray) -> bool:
    """
    Detect if the file is binary using multiple heuristic rules.

    Args:
        data: File content as bytes or bytearray

    Returns:
        bool: True if binary, False if text

    Heuristic rules:
    1. Null bytes presence (most reliable)
    2. High ratio of non-printable ASCII characters
    3. Presence of common binary file signatures
    4. UTF-8/UTF-16 encoding validation
    5. Control character ratio
    6. Support for Chinese and other Unicode characters
    """
    if not data:
        return False

    # Convert to bytearray if needed
    if isinstance(data, bytes):
        data = bytearray(data)

    # Rule 1: Check for null bytes (most reliable indicator)
    if b"\x00" in data:
        return True

    # Rule 2: Check for common binary file signatures
    binary_signatures = [
        b"\x7fELF",  # ELF executables
        b"MZ",  # Windows PE executables
        b"PK\x03\x04",  # ZIP files
        b"PK\x05\x06",  # ZIP files (empty)
        b"PK\x07\x08",  # ZIP files (spanned)
        b"\x1f\x8b",  # GZIP
        b"\x89PNG\r\n\x1a\n",  # PNG
        b"GIF87a",  # GIF
        b"GIF89a",  # GIF
        b"\xff\xd8\xff",  # JPEG
        b"%PDF",  # PDF
        b"\x00\x00\x01\x00",  # ICO
        b"\x00\x00\x02\x00",  # ICO
        b"BM",  # BMP
        b"RIFF",  # WAV, AVI, etc.
        b"\x00\x00\x00\x20ftyp",  # MP4
        b"\x00\x00\x00\x18ftyp",  # MP4
        b"\x00\x00\x00\x1cftyp",  # MP4
    ]

    for signature in binary_signatures:
        if data.startswith(signature):
            return True

    # Rule 3: Try to decode as UTF-8 first (handles Chinese, etc.)
    try:
        text_content = data.decode("utf-8")
        # If successful UTF-8 decode, check if it's reasonable text
        return not _is_reasonable_text(text_content)
    except UnicodeDecodeError:
        # If UTF-8 fails, try other encodings
        pass

    # Rule 4: Try other common encodings for Chinese text
    chinese_encodings = [
        "gbk",
        "gb2312",
        "gb18030",
        "big5",
        "utf-16",
        "utf-16le",
        "utf-16be",
    ]
    for encoding in chinese_encodings:
        try:
            text_content = data.decode(encoding)
            return not _is_reasonable_text(text_content)
        except UnicodeDecodeError:
            continue

    # Rule 5: If all text decodings fail, analyze byte patterns
    return _analyze_byte_patterns(data)


def _is_reasonable_text(text: str) -> bool:
    """
    Check if decoded content looks like reasonable text.

    Args:
        text: Decoded text content

    Returns:
        bool: True if reasonable text, False if likely binary
    """
    if not text:
        return True

    # Sample first 1KB for analysis
    sample = text[:1024]

    # Count different character types
    printable_ascii = 0
    chinese_chars = 0
    other_unicode = 0
    control_chars = 0
    whitespace = 0

    for char in sample:
        if char.isspace():
            whitespace += 1
        elif ord(char) < 32 and char not in "\t\n\r":
            control_chars += 1
        elif 32 <= ord(char) <= 126:  # Printable ASCII
            printable_ascii += 1
        elif "\u4e00" <= char <= "\u9fff":  # Chinese characters
            chinese_chars += 1
        elif ord(char) > 127:  # Other Unicode
            other_unicode += 1

    total_chars = len(sample)

    # Calculate ratios
    text_chars = printable_ascii + chinese_chars + other_unicode + whitespace
    text_ratio = text_chars / total_chars if total_chars > 0 else 0
    control_ratio = control_chars / total_chars if total_chars > 0 else 0

    # Rule: If more than 80% are reasonable text characters, it's text
    if text_ratio > 0.8:
        return True

    # Rule: If more than 20% are control characters, it's likely binary
    if control_ratio > 0.2:
        return False

    # Rule: Check for excessive repeated patterns (binary indicator)
    if len(sample) > 100:
        # Look for repeated byte sequences
        repeated_patterns = 0
        for i in range(len(sample) - 3):
            pattern = sample[i : i + 4]
            if sample.count(pattern) > 3:  # Pattern appears more than 3 times
                repeated_patterns += 1

        if repeated_patterns > len(sample) * 0.1:  # More than 10% repeated patterns
            return False

    # Rule: Check for Chinese text characteristics
    if chinese_chars > 0:
        # Chinese text should have reasonable punctuation and spacing
        chinese_ratio = chinese_chars / total_chars
        if chinese_ratio > 0.1:  # If more than 10% are Chinese characters
            # Check for reasonable Chinese text patterns
            if _has_reasonable_chinese_patterns(sample):
                return True

    # Default to text if no strong binary indicators
    return text_ratio > 0.5


def _has_reasonable_chinese_patterns(text: str) -> bool:
    """
    Check if text has reasonable Chinese text patterns.

    Args:
        text: Text content to analyze

    Returns:
        bool: True if has reasonable Chinese patterns
    """
    # Common Chinese punctuation and spacing patterns
    chinese_punct = '，。！？；：""（）【】《》…—'
    chinese_spaces = [" ", "\t", "\n", "\r"]

    # Check for reasonable spacing around Chinese characters
    chinese_chars = [c for c in text if "\u4e00" <= c <= "\u9fff"]
    if len(chinese_chars) < 5:  # Need at least 5 Chinese characters
        return True  # Not enough Chinese chars to determine

    # Check for punctuation and spacing
    punct_count = sum(1 for c in text if c in chinese_punct)
    space_count = sum(1 for c in text if c in chinese_spaces)

    # Reasonable Chinese text should have some punctuation and spacing
    if punct_count > 0 or space_count > len(chinese_chars) * 0.3:
        return True

    # Check for repeated character patterns (unlikely in real Chinese text)
    char_freq = {}
    for char in chinese_chars:
        char_freq[char] = char_freq.get(char, 0) + 1

    # If any single character appears too frequently, might be binary
    max_freq = max(char_freq.values()) if char_freq else 0
    if max_freq > len(chinese_chars) * 0.5:  # More than 50% same character
        return False

    return True


def _analyze_byte_patterns(data: bytearray) -> bool:
    """
    Analyze byte patterns when text decoding fails.

    Args:
        data: Raw byte data

    Returns:
        bool: True if binary, False if text
    """
    sample_size = min(len(data), 1024)
    sample = data[:sample_size]

    # Count byte types
    printable_count = 0
    control_count = 0
    high_byte_count = 0

    for byte in sample:
        if 32 <= byte <= 126:  # Printable ASCII
            printable_count += 1
        elif byte < 32 and byte not in (
            9,
            10,
            13,
        ):  # Control chars (excluding tab, LF, CR)
            control_count += 1
        elif byte > 127:  # High byte values
            high_byte_count += 1

    total_bytes = len(sample)

    # If more than 30% are non-printable, likely binary
    non_printable_ratio = (control_count + high_byte_count) / total_bytes
    if non_printable_ratio > 0.3:
        return True

    # Check for excessive control characters
    common_controls = {9, 10, 13}  # tab, LF, CR
    excessive_controls = sum(1 for b in sample if b < 32 and b not in common_controls)
    if excessive_controls / total_bytes > 0.05:  # More than 5% unusual controls
        return True

    # Check for entropy (random-looking data)
    if len(data) >= 256:
        byte_freq = {}
        for byte in data[:256]:
            byte_freq[byte] = byte_freq.get(byte, 0) + 1

        # Calculate entropy-like measure
        entropy = 0
        for count in byte_freq.values():
            p = count / 256
            if p > 0:
                entropy -= p * (p.bit_length() - 1)

        # High entropy suggests binary data
        if entropy > 6.0:
            return True

    return False


def is_text_file(data: bytes | bytearray) -> bool:
    """
    Detect if the file is text using the inverse of binary detection.

    Args:
        data: File content as bytes or bytearray

    Returns:
        bool: True if text, False if binary
    """
    return not is_binary_file(data)


def get_file_type_hint(data: bytes | bytearray) -> str:
    """
    Get a hint about the file type based on content analysis.

    Args:
        data: File content as bytes or bytearray

    Returns:
        str: File type hint
    """
    if not data:
        return "empty"

    if isinstance(data, bytes):
        data = bytearray(data)

    # Check for specific file signatures
    signatures = {
        b"\x7fELF": "ELF executable",
        b"MZ": "Windows executable",
        b"PK\x03\x04": "ZIP archive",
        b"PK\x05\x06": "ZIP archive (empty)",
        b"PK\x07\x08": "ZIP archive (spanned)",
        b"\x1f\x8b": "GZIP archive",
        b"\x89PNG\r\n\x1a\n": "PNG image",
        b"GIF87a": "GIF image",
        b"GIF89a": "GIF image",
        b"\xff\xd8\xff": "JPEG image",
        b"%PDF": "PDF document",
        b"\x00\x00\x01\x00": "ICO icon",
        b"\x00\x00\x02\x00": "ICO icon",
        b"BM": "BMP image",
        b"RIFF": "RIFF container (WAV, AVI, etc.)",
        b"\x00\x00\x00 20ftyp": "MP4 video",
        b"\x00\x00\x00 18ftyp": "MP4 video",
        b"\x00\x00\x00 1cftyp": "MP4 video",
        b"#!/": "Shell script",
        b"#! ": "Script file",
        b"<?php": "PHP script",
        b"<?xml": "XML document",
        b"<!DOCTYPE": "HTML document",
        b"<html": "HTML document",
        b"import ": "Python script",
        b"function ": "JavaScript file",
        b"package ": "Java file",
        b"#include": "C/C++ source",
    }

    for signature, file_type in signatures.items():
        if data.startswith(signature):
            return file_type

    # Try to decode and check content
    try:
        text_content = data.decode("utf-8")
        if _is_reasonable_text(text_content):
            # Count Chinese characters
            chinese_chars = sum(1 for c in text_content if "\u4e00" <= c <= "\u9fff")
            if chinese_chars > 0:
                return f"Chinese text file ({chinese_chars} Chinese characters)"

            # Try to detect text file type
            text_start = text_content[:100].lower()

            if any(keyword in text_start for keyword in ["json", "{", "["]):
                return "JSON data"
            elif any(keyword in text_start for keyword in ["xml", "<"]):
                return "XML document"
            elif any(keyword in text_start for keyword in ["yaml", "yml"]):
                return "YAML document"
            elif any(keyword in text_start for keyword in ["csv", ","]):
                return "CSV data"
            elif any(keyword in text_start for keyword in ["markdown", "# "]):
                return "Markdown document"
            else:
                return "text file"
    except UnicodeDecodeError:
        pass

    return "binary file"
