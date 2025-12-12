from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.models.employee import (
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeProfile,
    EmployeeStats
)
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from typing import List, Optional
from datetime import datetime

logger = get_logger(__name__)
router = APIRouter()


@router.post("/", response_model=Employee)
async def create_employee(
    employee_data: EmployeeCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new employee"""
    try:
        # Check if employee_id or email already exists
        existing = supabase.table("employees").select("id").or_(
            f"employee_id.eq.{employee_data.employee_id},email.eq.{employee_data.email}"
        ).execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Employee with this employee_id or email already exists"
            )

        # Convert fields to JSON-serializable types
        employee_dict = employee_data.dict()
        # base_salary may be Decimal -> convert to float
        employee_dict['base_salary'] = float(employee_dict['base_salary'])
        # Dates -> ISO strings
        if employee_dict.get('joined_date') is not None:
            employee_dict['joined_date'] = employee_dict['joined_date'].isoformat()
        if employee_dict.get('date_of_birth') is not None:
            employee_dict['date_of_birth'] = employee_dict['date_of_birth'].isoformat()

        # Insert employee
        response = supabase.table("employees").insert(employee_dict).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create employee")

        # Create initial leave balance for the employee
        leave_balance = {
            "employee_id": response.data[0]['id'],
            "year": datetime.now().year,
            "vacation_days": 20,
            "sick_days": 10,
            "personal_days": 5,
            "used_vacation": 0,
            "used_sick": 0,
            "used_personal": 0
        }
        supabase.table("leave_balances").insert(leave_balance).execute()

        logger.info(f"Created employee: {response.data[0]['id']}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create employee: {str(e)}")


@router.get("/", response_model=List[Employee])
async def list_employees(
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List all employees with optional filters"""
    try:
        query = supabase.table("employees").select("*")

        if department:
            query = query.eq("department", department)

        if status:
            query = query.eq("status", status)

        if search:
            query = query.or_(
                f"name.ilike.%{search}%,email.ilike.%{search}%,employee_id.ilike.%{search}%"
            )

        response = query.order("created_at", desc=True).execute()
        return response.data

    except Exception as e:
        logger.error(f"Error listing employees: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list employees: {str(e)}")


@router.get("/stats", response_model=EmployeeStats)
async def get_employee_stats(
    supabase: Client = Depends(get_supabase_client)
):
    """Get employee statistics"""
    try:
        # Get all employees
        all_employees = supabase.table("employees").select("*").execute()

        total_employees = len(all_employees.data)
        active_employees = len([e for e in all_employees.data if e['status'] == 'active'])
        on_leave_employees = len([e for e in all_employees.data if e['status'] == 'on_leave'])
        terminated_employees = len([e for e in all_employees.data if e['status'] == 'terminated'])

        # Department distribution
        department_dist = {}
        for emp in all_employees.data:
            dept = emp.get('department', 'Not Assigned')
            department_dist[dept] = department_dist.get(dept, 0) + 1

        # Calculate average tenure
        total_tenure_days = 0
        for emp in all_employees.data:
            if emp.get('joined_date'):
                joined = datetime.strptime(emp['joined_date'], '%Y-%m-%d')
                tenure_days = (datetime.now() - joined).days
                total_tenure_days += tenure_days

        avg_tenure_months = (total_tenure_days / total_employees / 30) if total_employees > 0 else 0

        # New hires this month
        current_month = datetime.now().month
        current_year = datetime.now().year
        new_hires = len([
            e for e in all_employees.data
            if e.get('joined_date') and
            datetime.strptime(e['joined_date'], '%Y-%m-%d').month == current_month and
            datetime.strptime(e['joined_date'], '%Y-%m-%d').year == current_year
        ])

        return EmployeeStats(
            total_employees=total_employees,
            active_employees=active_employees,
            on_leave_employees=on_leave_employees,
            terminated_employees=terminated_employees,
            department_distribution=department_dist,
            average_tenure_months=round(avg_tenure_months, 1),
            new_hires_this_month=new_hires
        )

    except Exception as e:
        logger.error(f"Error getting employee stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get employee stats: {str(e)}")


@router.get("/me")
async def get_current_employee(
    email: str = Query(...),
    supabase: Client = Depends(get_supabase_client)
):
    """Get current employee details by email"""
    try:
        response = supabase.table("employees").select("*").eq("email", email).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current employee: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get employee: {str(e)}")


@router.get("/{employee_id}", response_model=EmployeeProfile)
async def get_employee(
    employee_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get employee details with aggregated data"""
    try:
        # Get employee
        emp_response = supabase.table("employees").select("*").eq("id", employee_id).single().execute()

        if not emp_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee = emp_response.data

        # Get attendance stats for current month
        current_month = datetime.now().strftime('%Y-%m')
        attendance_response = supabase.table("monthly_attendance_summary").select("*").eq(
            "employee_id", employee_id
        ).gte("month", f"{current_month}-01").execute()

        attendance_stats = attendance_response.data[0] if attendance_response.data else None

        # Get leave balance
        leave_balance_response = supabase.table("leave_balances").select("*").eq(
            "employee_id", employee_id
        ).eq("year", datetime.now().year).execute()

        leave_balance = leave_balance_response.data[0] if leave_balance_response.data else None

        # Get recent performance review
        performance_response = supabase.table("performance_reviews").select("*").eq(
            "employee_id", employee_id
        ).eq("status", "completed").order("review_period_end", desc=True).limit(1).execute()

        recent_performance = performance_response.data[0] if performance_response.data else None

        # Get upcoming reviews
        upcoming_reviews = supabase.table("performance_reviews").select("*").eq(
            "employee_id", employee_id
        ).in_("status", ["draft", "self-review", "manager-review"]).execute()

        return EmployeeProfile(
            employee=employee,
            attendance_stats=attendance_stats,
            leave_balance=leave_balance,
            recent_performance=recent_performance,
            upcoming_reviews=upcoming_reviews.data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get employee profile: {str(e)}")


@router.put("/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: str,
    employee_data: EmployeeUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update employee details"""
    try:
        # Convert Decimal to float if base_salary is provided
        update_dict = employee_data.dict(exclude_unset=True)
        if 'base_salary' in update_dict and update_dict['base_salary'] is not None:
            update_dict['base_salary'] = float(update_dict['base_salary'])

        response = supabase.table("employees").update(update_dict).eq("id", employee_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        logger.info(f"Updated employee: {employee_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employee: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update employee: {str(e)}")


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete an employee (soft delete by setting status to terminated)"""
    try:
        response = supabase.table("employees").update({
            "status": "terminated"
        }).eq("id", employee_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        logger.info(f"Deleted employee: {employee_id}")
        return {"message": "Employee deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting employee: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete employee: {str(e)}")
