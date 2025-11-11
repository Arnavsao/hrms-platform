from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal


class PayrollBase(BaseModel):
    """Base payroll model"""
    employee_id: str
    salary_month: date
    base_salary: Decimal
    allowances: Decimal = Decimal('0')
    deductions: Decimal = Decimal('0')
    tax: Decimal = Decimal('0')
    net_salary: Decimal


class PayrollCreate(PayrollBase):
    """Model for creating payroll"""
    notes: Optional[str] = None


class PayrollUpdate(BaseModel):
    """Model for updating payroll"""
    status: Optional[str] = None
    payslip_url: Optional[str] = None
    notes: Optional[str] = None


class Payroll(PayrollBase):
    """Complete payroll model"""
    id: str
    status: str  # pending, processed, paid
    payslip_url: Optional[str] = None
    notes: Optional[str] = None
    processed_by: Optional[str] = None
    processed_at: Optional[date] = None
    created_at: date
    updated_at: date
    
    class Config:
        from_attributes = True


class EmployeeSalary(BaseModel):
    """Employee salary information model"""
    employee_id: str
    base_salary: Decimal
    allowances: Decimal = Decimal('0')
    bank_account: Optional[str] = None
    tax_id: Optional[str] = None
    joined_date: Optional[date] = None
    
    class Config:
        from_attributes = True

