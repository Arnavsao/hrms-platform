import logging
import sys
from app.core.config import settings

def setup_logging():
    """Configure application-wide logging"""
    
    # Get log level from settings
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Setup console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(log_level)
    logging.getLogger("fastapi").setLevel(log_level)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a specific module"""
    return logging.getLogger(name)

