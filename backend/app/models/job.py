from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JobBase(BaseModel):
    """Base job model with common fields"""
    title: str
    description: str
    requirements: str

class JobCreate(JobBase):
    """Model for creating a new job"""
    pass

class JobUpdate(BaseModel):
    """Model for updating a job"""
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None

class Job(JobBase):
    """Complete job model"""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

