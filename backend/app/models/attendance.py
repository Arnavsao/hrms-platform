from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class AttendanceBase(BaseModel):
    """Base attendance model"""
    employee_id: str
    check_in: datetime
    check_out: Optional[datetime] = None
    date: date
    status: str = "present"  # present, absent, late, half-day, remote
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    """Model for creating attendance record"""
    location: Optional[dict] = None  # GPS coordinates


class AttendanceUpdate(BaseModel):
    """Model for updating attendance"""
    check_out: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class Attendance(AttendanceBase):
    """Complete attendance model"""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AttendanceStats(BaseModel):
    """Attendance statistics model"""
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    remote_days: int
    attendance_percentage: float
    current_streak: int
    longest_streak: int

