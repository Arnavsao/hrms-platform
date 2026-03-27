"""
Unified AI Client — Google Gemini Integration

Provides a centralized async client for Google Gemini models.
Public API (generate_ai_response / generate_json_response) is unchanged
so all callers (ai_parser, ai_matching, ai_screening, etc.) work as-is.
"""

import asyncio
import json
import google.generativeai as genai

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Default model — confirmed working with the project's GEMINI_API_KEY
DEFAULT_MODEL = "gemini-2.5-flash"

# Configure the Gemini SDK once at import time
def _configure_gemini() -> None:
    if not settings.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Please set GEMINI_API_KEY in your environment variables."
        )
    genai.configure(api_key=settings.GEMINI_API_KEY)
    logger.debug("Configured Google Gemini SDK")

_configure_gemini()


def _get_model_name(model: str | None) -> str:
    """Resolve final model name to use, defaulting to gemini-2.5-flash."""
    chosen = model or settings.AI_MODEL or DEFAULT_MODEL
    # If someone still passes the legacy gpt-5 value from config, swap it
    if chosen in ("gpt-5", "gpt5") or chosen.startswith("gpt"):
        logger.warning(
            f"Legacy model name '{chosen}' detected. "
            "Switching to gemini-2.5-flash."
        )
        chosen = DEFAULT_MODEL
    return chosen


async def generate_ai_response(
    prompt: str,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
    system_message: str = None,
) -> str:
    """
    Generate a text response using Google Gemini.

    Args:
        prompt: The user prompt/message
        model: Gemini model name (defaults to gemini-2.5-flash)
        temperature: Sampling temperature (0-2, defaults to settings.AI_TEMPERATURE)
        max_tokens: Max tokens in response (defaults to settings.AI_MAX_TOKENS)
        system_message: Optional system instruction for context

    Returns:
        str: Generated text response

    Raises:
        Exception: If API call fails
    """
    try:
        model_name = _get_model_name(model)
        temp = temperature if temperature is not None else settings.AI_TEMPERATURE
        tokens = max_tokens or settings.AI_MAX_TOKENS

        generation_config = genai.types.GenerationConfig(
            temperature=temp,
            max_output_tokens=tokens,
        )

        # Build the Gemini model (system_instruction replaces OpenAI's system role)
        # Note: Gemini SDK rejects empty string — must use None when no system message
        gemini_model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_message if system_message else None,
            generation_config=generation_config,
        )

        logger.info(f"Making Gemini API call — model: {model_name}")

        # The google-generativeai SDK is synchronous; wrap in asyncio.to_thread
        # so we don't block FastAPI's event loop
        response = await asyncio.to_thread(
            gemini_model.generate_content, prompt
        )

        result_text = response.text.strip()
        logger.debug(f"Gemini response length: {len(result_text)} chars")
        return result_text

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error generating Gemini response: {error_msg}")
        raise Exception(f"AI API Error: {error_msg}")


async def generate_json_response(
    prompt: str,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
    system_message: str = None,
) -> dict:
    """
    Generate a JSON response using Google Gemini.

    Automatically strips markdown code fences if present.

    Args:
        prompt: The user prompt requesting JSON output
        model: Gemini model name (defaults to gemini-2.5-flash)
        temperature: Sampling temperature
        max_tokens: Max tokens in response
        system_message: Optional system instruction

    Returns:
        dict: Parsed JSON response

    Raises:
        ValueError: If response is not valid JSON
        Exception: If API call fails
    """
    json_prompt = (
        f"{prompt}\n\n"
        "Return ONLY valid JSON without any markdown formatting or additional text."
    )

    response_text = await generate_ai_response(
        prompt=json_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        system_message=system_message,
    )

    # Strip markdown fences if the model adds them
    cleaned = response_text
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
        logger.error(f"Raw text (first 500 chars): {cleaned[:500]}")
        raise ValueError(f"AI response is not valid JSON: {e}")
