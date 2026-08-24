"""
Unified AI Client — Google Gemini

Primary model : gemini-2.5-flash via GEMINI_API_KEY
SDK           : google-genai (`google.genai`) — the same SDK voice_interview.py uses
                for the Live API, so text and voice share one client and one auth path.

Public API: generate_ai_response / generate_json_response
All callers (ai_parser, ai_matching, ai_screening) use these.
"""

import json
from typing import Optional

from google import genai
from google.genai import types as genai_types

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

DEFAULT_MODEL = "gemini-2.5-flash"

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    """
    Build the Gemini client on first use.

    Deliberately lazy: a missing key then fails the AI call that needs it rather than
    the import of app.main, which would take the whole API down.
    """
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set. Add it to backend/.env")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.debug("Initialized Gemini client")
    return _client


def _resolve_model(model: Optional[str]) -> str:
    """Resolve the model name, mapping legacy OpenAI-style values onto Gemini."""
    chosen = model or settings.AI_MODEL or DEFAULT_MODEL
    if chosen.startswith("google/"):
        chosen = chosen.split("/", 1)[1]
    if chosen.startswith("gpt"):
        logger.warning(f"Legacy model name '{chosen}' detected. Using {DEFAULT_MODEL}.")
        return DEFAULT_MODEL
    return chosen


# ── JSON truncation repair ────────────────────────────────────────────────────

def _repair_truncated_json(raw: str) -> str:
    text = raw.rstrip()
    in_string = escape_next = False
    last_open_q = -1
    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False; continue
        if ch == "\\": escape_next = True; continue
        if ch == '"':
            if in_string: in_string = False
            else:         in_string = True; last_open_q = i
    if in_string and last_open_q != -1:
        text = text[:last_open_q].rstrip(" \t\n\r,:")
    stack = []
    in_string = escape_next = False
    for ch in text:
        if escape_next:       escape_next = False; continue
        if ch == "\\":        escape_next = True;  continue
        if ch == '"':         in_string = not in_string; continue
        if in_string:         continue
        if ch in ("{", "["):  stack.append(ch)
        elif ch in ("}", "]") and stack: stack.pop()
    closing = {"{": "}", "[": "]"}
    for opener in reversed(stack):
        text += closing[opener]
    return text


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_ai_response(
    prompt: str,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
    system_message: str = None,
) -> str:
    client = _get_client()
    model_name = _resolve_model(model)
    temp   = temperature if temperature is not None else getattr(settings, "AI_TEMPERATURE", 0.7)
    tokens = max_tokens or getattr(settings, "AI_MAX_TOKENS", 8192)

    logger.info(f"[Gemini] model={model_name}")

    config = genai_types.GenerateContentConfig(
        temperature=temp,
        max_output_tokens=tokens,
        # These are extraction and scoring tasks, not reasoning puzzles. Gemini 2.5
        # thinks by default and its thinking tokens are billed against
        # max_output_tokens, which can consume the whole budget and return empty
        # text. Disabling it keeps responses non-empty and latency low.
        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
    )
    if system_message:
        config.system_instruction = system_message

    try:
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config,
        )
    except Exception as e:
        logger.error(f"[Gemini] error: {e}")
        raise Exception(f"AI API Error: {e}")

    text = (response.text or "").strip()
    if not text:
        # Usually a safety block or an exhausted token budget; surface why.
        feedback = getattr(response, "prompt_feedback", None)
        finish = None
        candidates = getattr(response, "candidates", None) or []
        if candidates:
            finish = getattr(candidates[0], "finish_reason", None)
        logger.error(f"[Gemini] empty response (finish_reason={finish}, feedback={feedback})")
        raise Exception(f"AI API Error: empty response from Gemini (finish_reason={finish})")

    logger.debug(f"[Gemini] response length: {len(text)} chars")
    return text


async def generate_json_response(
    prompt: str,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
    system_message: str = None,
) -> dict:
    json_prompt = (
        f"{prompt}\n\n"
        "IMPORTANT: Return ONLY raw JSON. No markdown, no code fences, "
        "no explanation — output the JSON object directly."
    )

    response_text = await generate_ai_response(
        prompt=json_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        system_message=system_message,
    )

    cleaned = response_text
    if cleaned.startswith("```json"):  cleaned = cleaned[7:]
    elif cleaned.startswith("```"):    cleaned = cleaned[3:]
    if cleaned.endswith("```"):        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as first_err:
        logger.warning(f"Initial JSON parse failed ({first_err}). Attempting repair...")

    repaired = _repair_truncated_json(cleaned)
    try:
        result = json.loads(repaired)
        logger.info("JSON repaired successfully after truncation.")
        return result
    except json.JSONDecodeError as second_err:
        logger.error(f"JSON repair failed: {second_err}")
        logger.error(f"Raw response (first 800 chars): {cleaned[:800]}")
        raise ValueError(f"AI response is not valid JSON: {second_err}")
