from pydantic import BaseModel, field_validator
from typing import Optional, List, Union
from datetime import date, datetime


class LeaveRequestBase(BaseModel):
    """Base leave request model"""
    employee_id: str
    leave_type: str  # sick, vacation, personal, maternity, paternity
    start_date: date
    end_date: date
    duration_days: int
    reason: Optional[str] = None


class LeaveRequestCreate(LeaveRequestBase):
    """Model for creating leave request"""
    pass


class LeaveRequestUpdate(BaseModel):
    """Model for updating leave request"""
    status: Optional[str] = None
    approved_by: Optional[str] = None
    rejected_reason: Optional[str] = None


class LeaveRequest(LeaveRequestBase):
    """Complete leave request model"""
    id: str
    status: str  # pending, approved, rejected
    approved_by: Optional[str] = None
    rejected_reason: Optional[str] = None
    submitted_at: date
    approved_at: Optional[date] = None
    created_at: date
    updated_at: date
    
    @field_validator('submitted_at', 'created_at', 'updated_at', 'approved_at', mode='before')
    @classmethod
    def parse_date(cls, v):
        """Convert datetime strings to date objects"""
        if isinstance(v, str):
            # Extract date part from ISO datetime string
            if 'T' in v:
                return v.split('T')[0]
            return v
        elif isinstance(v, datetime):
            return v.date()
        return v
    
    class Config:
        from_attributes = True


class LeaveBalance(BaseModel):
    """Leave balance model"""
    employee_id: str
    vacation_days: int = 20
    sick_days: int = 10
    personal_days: int = 5
    used_vacation: int = 0
    used_sick: int = 0
    used_personal: int = 0
    
    @property
    def available_vacation(self) -> int:
        return max(0, self.vacation_days - self.used_vacation)
    
    @property
    def available_sick(self) -> int:
        return max(0, self.sick_days - self.used_sick)
    
    @property
    def available_personal(self) -> int:
        return max(0, self.personal_days - self.used_personal)

