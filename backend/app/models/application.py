from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class ApplicationBase(BaseModel):
    """Base application model"""
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    fit_score: Optional[float] = None
    highlights: Optional[Dict[str, Any]] = None
    status: str = "pending"

class ApplicationCreate(ApplicationBase):
    """Model for creating an application"""
    pass

class Application(ApplicationBase):
    """Complete application model"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MatchResponse(BaseModel):
    """Response with matching score and highlights"""
    fit_score: float
    highlights: dict


class ApplicationStatusUpdate(BaseModel):
    """Payload to update application status"""
    status: str


class ApplicationDetail(BaseModel):
    """Application with joined candidate, job and optional digital footprint"""
    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    fit_score: Optional[float] = None
    highlights: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: datetime
    candidate: Optional[Dict[str, Any]] = None
    job: Optional[Dict[str, Any]] = None
    digital_footprint: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
