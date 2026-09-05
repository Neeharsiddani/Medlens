"""Shared AI utilities for prompt processing and response sanitization."""

def clean_markdown_json(raw_json_str: str) -> str:
    """
    Safely strip markdown code block fences (```json ... ``` or ``` ... ```)
    from LLM response strings before JSON deserialization.
    """
    cleaned = (raw_json_str or "").strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()
