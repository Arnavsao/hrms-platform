"""
Unified AI Client for MegaLLM Integration

This module provides a centralized OpenAI-compatible client for accessing
AI models through MegaLLM API. Supports GPT-5 and other models via unified interface.
"""

from openai import OpenAI
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# MegaLLM API Configuration
MEGALLM_BASE_URL = "https://ai.megallm.io/v1"
DEFAULT_MODEL = "gpt-5"

# Initialize OpenAI client with MegaLLM base URL
def get_ai_client() -> OpenAI:
    """
    Creates and returns an OpenAI-compatible client configured for MegaLLM.
    
    This client can be used to access GPT-5 and other models through
    the MegaLLM unified API interface.
    
    Returns:
        OpenAI: Configured client instance for MegaLLM API
    
    Raises:
        ValueError: If MEGALLM_API_KEY is not configured
    """
    if not settings.MEGALLM_API_KEY:
        raise ValueError(
            "MEGALLM_API_KEY is not configured. "
            "Please set MEGALLM_API_KEY in your environment variables."
        )
    
    client = OpenAI(
        base_url=MEGALLM_BASE_URL,
        api_key=settings.MEGALLM_API_KEY
    )
    
    logger.debug(f"Initialized MegaLLM AI client with model: {settings.AI_MODEL}")
    return client

async def generate_ai_response(
    prompt: str,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
    system_message: str = None
) -> str:
    """
    Generate a text response using the AI model via MegaLLM.
    
    Args:
        prompt: The user prompt/message
        model: Model name (defaults to settings.AI_MODEL or gpt-5)
        temperature: Sampling temperature (defaults to settings.AI_TEMPERATURE)
        max_tokens: Maximum tokens in response (defaults to settings.AI_MAX_TOKENS)
        system_message: Optional system message for context
    
    Returns:
        str: Generated text response
    
    Raises:
        Exception: If API call fails
    """
    try:
        client = get_ai_client()
        
        # Use defaults from settings if not provided
        model = model or settings.AI_MODEL or DEFAULT_MODEL
        
        # Clean model name - remove any "google/" prefix if present (legacy format)
        if model.startswith("google/"):
            logger.warning(f"Removing 'google/' prefix from model name: {model}")
            model = model.replace("google/", "")
        
        # Ensure we're using a valid MegaLLM model name
        if model.startswith("gemini"):
            logger.warning(f"Legacy Gemini model detected: {model}. Consider using 'gpt-5' instead.")
            # Don't change it automatically, but log a warning
        
        temperature = temperature if temperature is not None else settings.AI_TEMPERATURE
        max_tokens = max_tokens or settings.AI_MAX_TOKENS
        
        logger.info(f"Making AI API call with model: {model}, base_url: {MEGALLM_BASE_URL}")
        
        # Build messages array
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})
        
        # Make API call
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Extract response text
        result_text = response.choices[0].message.content.strip()
        
        logger.debug(f"Generated AI response using model: {model}")
        return result_text
        
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        raise

async def generate_json_response(
    prompt: str,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
    system_message: str = None
) -> dict:
    """
    Generate a JSON response using the AI model via MegaLLM.
    
    This is a convenience method that ensures the response is valid JSON.
    It automatically cleans markdown code blocks if present.
    
    Args:
        prompt: The user prompt/message requesting JSON output
        model: Model name (defaults to settings.AI_MODEL or gpt-5)
        temperature: Sampling temperature (defaults to settings.AI_TEMPERATURE)
        max_tokens: Maximum tokens in response (defaults to settings.AI_MAX_TOKENS)
        system_message: Optional system message for context
    
    Returns:
        dict: Parsed JSON response
    
    Raises:
        Exception: If API call fails or response is not valid JSON
    """
    import json
    
    # Enhance prompt to ensure JSON output
    json_prompt = f"""{prompt}

Return ONLY valid JSON without any markdown formatting or additional text."""
    
    response_text = await generate_ai_response(
        prompt=json_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        system_message=system_message
    )
    
    # Clean markdown code blocks if present
    cleaned_text = response_text
    if cleaned_text.startswith("```json"):
        cleaned_text = cleaned_text[7:]
    elif cleaned_text.startswith("```"):
        cleaned_text = cleaned_text[3:]
    
    if cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[:-3]
    
    cleaned_text = cleaned_text.strip()
    
    # Parse JSON
    try:
        parsed_json = json.loads(cleaned_text)
        return parsed_json
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {str(e)}")
        logger.error(f"Response text: {cleaned_text[:500]}")
        raise ValueError(f"AI response is not valid JSON: {str(e)}")
