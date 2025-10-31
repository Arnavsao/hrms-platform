from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
from decimal import Decimal


class EmployeeBase(BaseModel):
    """Base employee model"""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: str  # Company's employee ID (like EMP001)
    joined_date: date
    status: str = "active"  # active, on_leave, terminated


class EmployeeCreate(EmployeeBase):
    """Model for creating employee"""
    base_salary: Decimal
    manager_id: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    emergency_contact: Optional[dict] = None


class EmployeeUpdate(BaseModel):
    """Model for updating employee"""
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = None
    base_salary: Optional[Decimal] = None
    manager_id: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[dict] = None


class Employee(EmployeeBase):
    """Complete employee model"""
    id: str
    base_salary: Decimal
    manager_id: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    emergency_contact: Optional[dict] = None
    created_at: date
    updated_at: date

    class Config:
        from_attributes = True


class EmployeeProfile(BaseModel):
    """Employee profile with aggregated data"""
    employee: Employee
    attendance_stats: Optional[dict] = None
    leave_balance: Optional[dict] = None
    recent_performance: Optional[dict] = None
    upcoming_reviews: Optional[list] = None

    class Config:
        from_attributes = True


class EmployeeStats(BaseModel):
    """Employee statistics dashboard"""
    total_employees: int
    active_employees: int
    on_leave_employees: int
    terminated_employees: int
    department_distribution: dict
    average_tenure_months: float
    new_hires_this_month: int
