from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class CandidateBase(BaseModel):
    """Base candidate model with common fields"""
    name: str
    email: EmailStr

class CandidateCreate(CandidateBase):
    """Model for creating a new candidate"""
    pass

class ParsedData(BaseModel):
    """Structured data extracted from resume"""
    name: str
    email: str
    phone: Optional[str] = None
    skills: List[str] = []
    education: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    links: Dict[str, str] = {}

class Candidate(CandidateBase):
    """Complete candidate model"""
    id: str
    resume_url: Optional[str] = None
    parsed_data: Optional[ParsedData] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ResumeUploadResponse(BaseModel):
    """Response after resume upload"""
    candidate_id: str
    message: str
    parsed_data: ParsedData

