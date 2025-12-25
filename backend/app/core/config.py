from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
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
    
    # AI Configuration - MegaLLM
    MEGALLM_API_KEY: str
    AI_MODEL: str = "gpt-5"
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 2048
    
    # Legacy AI Configuration (deprecated, kept for backward compatibility)
    OPENROUTER_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    @field_validator('AI_MODEL')
    @classmethod
    def normalize_ai_model(cls, v: str) -> str:
        """
        Normalize AI model name to ensure compatibility with MegaLLM.
        Removes 'google/' prefix and converts legacy Gemini models to gpt-5.
        """
        if not v:
            return "gpt-5"
        
        original = v
        
        # Remove google/ prefix if present
        if v.startswith("google/"):
            logger.warning(f"Removing 'google/' prefix from AI_MODEL: {v}")
            v = v.replace("google/", "")
        
        # Convert legacy Gemini models to gpt-5
        if "gemini" in v.lower():
            logger.warning(
                f"Legacy Gemini model '{original}' detected. "
                f"Converting to 'gpt-5' for MegaLLM compatibility."
            )
            return "gpt-5"
        
        return v
    
    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = "pdf,doc,docx"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
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

