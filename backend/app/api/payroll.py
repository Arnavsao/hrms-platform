from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.models.payroll import (
    Payroll,
    PayrollCreate,
    PayrollUpdate,
    EmployeeSalary
)
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from typing import List, Optional
from datetime import date
from decimal import Decimal

logger = get_logger(__name__)
router = APIRouter()


@router.post("/", response_model=Payroll)
async def create_payroll(
    payroll_data: PayrollCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create payroll record for an employee"""
    try:
        # Check if payroll already exists for this month
        existing = supabase.table("payroll").select("id").eq(
            "employee_id", payroll_data.employee_id
        ).eq("salary_month", str(payroll_data.salary_month)).execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Payroll already exists for this month"
            )

        # Convert Decimal to float for JSON serialization
        payroll_dict = payroll_data.dict()
        payroll_dict['base_salary'] = float(payroll_dict['base_salary'])
        payroll_dict['allowances'] = float(payroll_dict['allowances'])
        payroll_dict['deductions'] = float(payroll_dict['deductions'])
        payroll_dict['tax'] = float(payroll_dict['tax'])
        payroll_dict['net_salary'] = float(payroll_dict['net_salary'])
        payroll_dict['status'] = 'pending'

        response = supabase.table("payroll").insert(payroll_dict).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create payroll")

        logger.info(f"Created payroll for employee: {payroll_data.employee_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create payroll: {str(e)}")


@router.get("/", response_model=List[Payroll])
async def list_payroll(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    month: Optional[date] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List payroll records with optional filters"""
    try:
        query = supabase.table("payroll").select("*")

        if employee_id:
            query = query.eq("employee_id", employee_id)

        if status:
            query = query.eq("status", status)

        if month:
            query = query.eq("salary_month", str(month))

        response = query.order("salary_month", desc=True).execute()
        return response.data

    except Exception as e:
        logger.error(f"Error listing payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list payroll: {str(e)}")


@router.get("/{payroll_id}", response_model=Payroll)
async def get_payroll(
    payroll_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get payroll record by ID"""
    try:
        response = supabase.table("payroll").select("*").eq("id", payroll_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Payroll record not found")

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get payroll: {str(e)}")


@router.get("/employee/{employee_id}/history", response_model=List[Payroll])
async def get_employee_payroll_history(
    employee_id: str,
    limit: int = Query(12, ge=1, le=24),
    supabase: Client = Depends(get_supabase_client)
):
    """Get payroll history for an employee"""
    try:
        response = supabase.table("payroll").select("*").eq(
            "employee_id", employee_id
        ).order("salary_month", desc=True).limit(limit).execute()

        return response.data

    except Exception as e:
        logger.error(f"Error getting payroll history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get payroll history: {str(e)}")


@router.put("/{payroll_id}", response_model=Payroll)
async def update_payroll(
    payroll_id: str,
    payroll_data: PayrollUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update payroll record"""
    try:
        update_dict = payroll_data.dict(exclude_unset=True)

        response = supabase.table("payroll").update(update_dict).eq("id", payroll_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Payroll record not found")

        logger.info(f"Updated payroll: {payroll_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update payroll: {str(e)}")


@router.post("/{payroll_id}/process")
async def process_payroll(
    payroll_id: str,
    processed_by: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Mark payroll as processed"""
    try:
        update_data = {
            "status": "processed",
            "processed_by": processed_by,
            "processed_at": str(date.today())
        }

        response = supabase.table("payroll").update(update_data).eq("id", payroll_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Payroll record not found")

        logger.info(f"Processed payroll: {payroll_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process payroll: {str(e)}")


@router.post("/{payroll_id}/mark-paid")
async def mark_payroll_paid(
    payroll_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Mark payroll as paid"""
    try:
        update_data = {
            "status": "paid"
        }

        response = supabase.table("payroll").update(update_data).eq("id", payroll_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Payroll record not found")

        logger.info(f"Marked payroll as paid: {payroll_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking payroll as paid: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark payroll as paid: {str(e)}")


@router.post("/generate-monthly")
async def generate_monthly_payroll(
    month: date,
    supabase: Client = Depends(get_supabase_client)
):
    """Generate payroll for all active employees for a given month"""
    try:
        # Get all active employees
        employees = supabase.table("employees").select("*").eq("status", "active").execute()

        if not employees.data:
            return {"message": "No active employees found", "generated": 0}

        generated_count = 0
        errors = []

        for emp in employees.data:
            try:
                # Check if payroll already exists
                existing = supabase.table("payroll").select("id").eq(
                    "employee_id", emp['id']
                ).eq("salary_month", str(month)).execute()

                if existing.data:
                    continue

                # Calculate net salary (simplified calculation)
                base_salary = float(emp['base_salary'])
                allowances = 0  # Can be customized
                tax = base_salary * 0.15  # 15% tax rate
                deductions = 0  # Can be customized
                net_salary = base_salary + allowances - tax - deductions

                payroll_data = {
                    "employee_id": emp['id'],
                    "salary_month": str(month),
                    "base_salary": base_salary,
                    "allowances": allowances,
                    "deductions": deductions,
                    "tax": tax,
                    "net_salary": net_salary,
                    "status": "pending"
                }

                supabase.table("payroll").insert(payroll_data).execute()
                generated_count += 1

            except Exception as emp_error:
                errors.append({
                    "employee_id": emp['id'],
                    "employee_name": emp['name'],
                    "error": str(emp_error)
                })

        logger.info(f"Generated payroll for {generated_count} employees")
        return {
            "message": f"Generated payroll for {generated_count} employees",
            "generated": generated_count,
            "errors": errors
        }

    except Exception as e:
        logger.error(f"Error generating monthly payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate payroll: {str(e)}")


@router.delete("/{payroll_id}")
async def delete_payroll(
    payroll_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete payroll record"""
    try:
        # Only allow deletion of pending payroll
        payroll = supabase.table("payroll").select("status").eq("id", payroll_id).single().execute()

        if not payroll.data:
            raise HTTPException(status_code=404, detail="Payroll record not found")

        if payroll.data['status'] != 'pending':
            raise HTTPException(
                status_code=400,
                detail="Cannot delete processed or paid payroll"
            )

        response = supabase.table("payroll").delete().eq("id", payroll_id).execute()

        logger.info(f"Deleted payroll: {payroll_id}")
        return {"message": "Payroll record deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payroll: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete payroll: {str(e)}")
