from pydantic_settings import BaseSettings
from typing import List

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
    
    # AI Configuration
    OPENROUTER_API_KEY: str = ""
    GEMINI_API_KEY: str
    AI_MODEL: str = "google/gemini-2.0-flash"
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 2048
    
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

