def detect_chinese(text: str) -> bool:
    """Detect if the input text is Chinese.

    Args:
        text: Input text to detect

    Returns:
        True if text is primarily Chinese, False otherwise
    """
    if not text:
        return False

    # Simple language detection based on character patterns
    chinese_chars = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
    total_chars = len(text.strip())

    if total_chars == 0:
        return False

    chinese_ratio = chinese_chars / total_chars
    # If more than 30% Chinese characters, consider it Chinese
    return chinese_ratio >= 0.3


def detect_language(text: str = "") -> str:
    """Detect language from text"""
    return "zh" if detect_chinese(text) else "en"
