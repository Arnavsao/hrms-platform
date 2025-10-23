from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ScreeningBase(BaseModel):
    """Base screening model"""
    application_id: str

class ScreeningCreate(ScreeningBase):
    """Model for creating a screening"""
    mode: str = "text"  # text or voice

class ScreeningEvaluation(BaseModel):
    """AI evaluation of screening"""
    communication_score: float
    domain_knowledge_score: float
    overall_score: float
    summary: str
    strengths: list[str] = []
    weaknesses: list[str] = []

class Screening(ScreeningBase):
    """Complete screening model"""
    id: str
    transcript: Optional[str] = None
    ai_summary: Optional[ScreeningEvaluation] = None
    score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ScreeningResponse(BaseModel):
    """Response for screening completion"""
    screening_id: str
    transcript: str
    evaluation: ScreeningEvaluation

