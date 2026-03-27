from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables"""

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True

    # Environment
    ENVIRONMENT: str = "development"

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    DATABASE_URL: str

    # AI Configuration - Google Gemini
    MEGALLM_API_KEY: str = ""  # kept for backward compat, no longer used
    AI_MODEL: str = "gemini-2.5-flash"
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 2048
    GEMINI_LIVE_MODEL: str = "models/gemini-2.5-flash-native-audio-preview-09-2025"
    GEMINI_LIVE_VOICE: str = "Zephyr"
    GEMINI_LIVE_SAMPLE_RATE_SEND: int = 16000
    GEMINI_LIVE_SAMPLE_RATE_RECEIVE: int = 24000
    VOICE_INTERVIEW_GREETING: str = (
        "You are a friendly, professional HR interviewer having a natural conversation with a candidate. "
        "Your goal is to make them feel comfortable while assessing their fit for the role. "
        "Speak naturally and conversationally. After asking each question, stay completely silent and "
        "give the candidate time to think and respond fully. Never interrupt while they're speaking. "
        "Listen carefully to their answers before moving forward."
    )
    VOICE_INTERVIEW_MAX_QUESTIONS: int = 3
    VOICE_INTERVIEW_STYLE: str = "behavioral"  # behavioral, technical, mixed
    VOICE_INTERVIEW_ALLOW_FOLLOWUPS: bool = True
    VOICE_INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION: int = 1
    VOICE_INTERVIEW_MIN_ANSWER_LENGTH: int = 30  # words - trigger follow-up if too short

    # Legacy AI Configuration (deprecated, kept for backward compatibility)
    OPENROUTER_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    @field_validator('AI_MODEL')
    @classmethod
    def normalize_ai_model(cls, v: str) -> str:
        """
        Normalize AI model name for Google Gemini compatibility.
        Converts any legacy gpt-5/MegaLLM model names to gemini-2.5-flash.
        """
        if not v:
            return "gemini-2.5-flash"

        # Remove google/ prefix if present (not needed for google-generativeai SDK)
        if v.startswith("google/"):
            v = v.replace("google/", "")

        # Convert legacy gpt-5/MegaLLM model names to Gemini
        if v in ("gpt-5", "gpt5") or v.startswith("gpt"):
            logger.warning(
                f"Legacy MegaLLM model '{v}' detected. "
                f"Converting to 'gemini-2.5-flash'."
            )
            return "gemini-2.5-flash"

        return v

    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = "pdf,doc,docx"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS - Can be a comma-separated string or list
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS from string or list format"""
        if isinstance(self.CORS_ORIGINS, str):
            # Handle comma-separated string
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        elif isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        else:
            return ["http://localhost:3000", "http://localhost:3001"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Get list of allowed file extensions"""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

# Create global settings instance
settings = Settings()
