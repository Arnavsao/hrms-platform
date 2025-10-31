from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.models.leave import (
    LeaveRequest,
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveBalance
)
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from typing import List, Optional
from datetime import date, datetime

logger = get_logger(__name__)
router = APIRouter()


@router.post("/requests", response_model=LeaveRequest)
async def create_leave_request(
    leave_data: LeaveRequestCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new leave request"""
    try:
        # Get employee's leave balance
        balance_response = supabase.table("leave_balances").select("*").eq(
            "employee_id", leave_data.employee_id
        ).eq("year", datetime.now().year).execute()

        if not balance_response.data:
            raise HTTPException(
                status_code=404,
                detail="Leave balance not found for employee"
            )

        balance = balance_response.data[0]

        # Check if sufficient balance is available
        leave_type_map = {
            "vacation": ("vacation_days", "used_vacation"),
            "sick": ("sick_days", "used_sick"),
            "personal": ("personal_days", "used_personal")
        }

        if leave_data.leave_type in leave_type_map:
            total_key, used_key = leave_type_map[leave_data.leave_type]
            available = balance[total_key] - balance[used_key]

            if leave_data.duration_days > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient {leave_data.leave_type} leave balance. Available: {available} days"
                )

        # Convert Pydantic model to dict and ensure all dates are strings for JSON serialization
        # Use model_dump() for Pydantic v2 or dict() for v1
        try:
            leave_dict = leave_data.model_dump()  # Pydantic v2
        except AttributeError:
            leave_dict = leave_data.dict()  # Pydantic v1
        
        # Convert date objects to ISO format strings (Supabase requires string format)
        if 'start_date' in leave_dict and isinstance(leave_dict['start_date'], date):
            leave_dict['start_date'] = leave_dict['start_date'].isoformat()
        if 'end_date' in leave_dict and isinstance(leave_dict['end_date'], date):
            leave_dict['end_date'] = leave_dict['end_date'].isoformat()
        
        # Ensure duration_days is an integer
        if 'duration_days' in leave_dict:
            leave_dict['duration_days'] = int(leave_dict['duration_days'])
        
        leave_dict['status'] = 'pending'
        leave_dict['submitted_at'] = datetime.now().isoformat()

        logger.info(f"Creating leave request with data: {leave_dict}")
        response = supabase.table("leave_requests").insert(leave_dict).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create leave request")

        logger.info(f"Created leave request for employee: {leave_data.employee_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create leave request: {str(e)}")


@router.get("/requests", response_model=List[LeaveRequest])
async def list_leave_requests(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    leave_type: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List leave requests with optional filters"""
    try:
        query = supabase.table("leave_requests").select("*")

        if employee_id:
            query = query.eq("employee_id", employee_id)

        if status:
            query = query.eq("status", status)

        if leave_type:
            query = query.eq("leave_type", leave_type)

        # Order by submitted_at if available, otherwise by created_at
        try:
            response = query.order("submitted_at", desc=True).execute()
        except:
            # Fallback if submitted_at doesn't exist
            response = query.order("created_at", desc=True).execute()
        
        # Convert datetime fields to date strings for Pydantic validation
        # Supabase returns timestamps but our model expects dates
        processed_data = []
        for item in response.data:
            processed_item = item.copy()
            # Convert datetime strings to date strings (YYYY-MM-DD format)
            for date_field in ['start_date', 'end_date', 'approved_at']:
                if processed_item.get(date_field):
                    date_val = processed_item[date_field]
                    if isinstance(date_val, str):
                        # Extract just the date part from ISO datetime string
                        processed_item[date_field] = date_val.split('T')[0]
            
            # Convert timestamp fields to date strings for created_at/updated_at/submitted_at
            for ts_field in ['submitted_at', 'created_at', 'updated_at']:
                if processed_item.get(ts_field):
                    ts_val = processed_item[ts_field]
                    if isinstance(ts_val, str) and 'T' in ts_val:
                        # Extract just the date part
                        processed_item[ts_field] = ts_val.split('T')[0]
            
            processed_data.append(processed_item)
        
        return processed_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing leave requests: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to list leave requests: {str(e)}")


@router.get("/requests/{request_id}", response_model=LeaveRequest)
async def get_leave_request(
    request_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get leave request by ID"""
    try:
        response = supabase.table("leave_requests").select("*").eq("id", request_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Leave request not found")

        # Convert datetime strings to date strings for Pydantic validation
        data = response.data.copy()
        for date_field in ['start_date', 'end_date', 'approved_at', 'submitted_at', 'created_at', 'updated_at']:
            if data.get(date_field) and isinstance(data[date_field], str) and 'T' in data[date_field]:
                data[date_field] = data[date_field].split('T')[0]

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get leave request: {str(e)}")


@router.put("/requests/{request_id}", response_model=LeaveRequest)
async def update_leave_request(
    request_id: str,
    leave_data: LeaveRequestUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update leave request"""
    try:
        update_dict = leave_data.dict(exclude_unset=True)

        response = supabase.table("leave_requests").update(update_dict).eq("id", request_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Leave request not found")

        logger.info(f"Updated leave request: {request_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update leave request: {str(e)}")


@router.post("/requests/{request_id}/approve")
async def approve_leave_request(
    request_id: str,
    approved_by: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Approve leave request and update leave balance"""
    try:
        # Get leave request
        request_response = supabase.table("leave_requests").select("*").eq("id", request_id).single().execute()

        if not request_response.data:
            raise HTTPException(status_code=404, detail="Leave request not found")

        leave_request = request_response.data

        if leave_request['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Leave request is not pending")

        # Update leave request status
        update_request = {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": str(date.today())
        }

        supabase.table("leave_requests").update(update_request).eq("id", request_id).execute()

        # Update leave balance
        leave_type_map = {
            "vacation": "used_vacation",
            "sick": "used_sick",
            "personal": "used_personal"
        }

        if leave_request['leave_type'] in leave_type_map:
            used_key = leave_type_map[leave_request['leave_type']]

            # Get current balance
            balance_response = supabase.table("leave_balances").select("*").eq(
                "employee_id", leave_request['employee_id']
            ).eq("year", datetime.now().year).execute()

            if balance_response.data:
                current_used = balance_response.data[0][used_key]
                new_used = current_used + leave_request['duration_days']

                supabase.table("leave_balances").update({
                    used_key: new_used
                }).eq("employee_id", leave_request['employee_id']).eq("year", datetime.now().year).execute()

        logger.info(f"Approved leave request: {request_id}")
        return {"message": "Leave request approved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to approve leave request: {str(e)}")


@router.post("/requests/{request_id}/reject")
async def reject_leave_request(
    request_id: str,
    approved_by: str,
    rejected_reason: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Reject leave request"""
    try:
        # Get leave request
        request_response = supabase.table("leave_requests").select("*").eq("id", request_id).single().execute()

        if not request_response.data:
            raise HTTPException(status_code=404, detail="Leave request not found")

        if request_response.data['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Leave request is not pending")

        # Update leave request status
        update_data = {
            "status": "rejected",
            "approved_by": approved_by,
            "rejected_reason": rejected_reason,
            "approved_at": str(date.today())
        }

        response = supabase.table("leave_requests").update(update_data).eq("id", request_id).execute()

        logger.info(f"Rejected leave request: {request_id}")
        return {"message": "Leave request rejected successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reject leave request: {str(e)}")


@router.get("/balance/{employee_id}", response_model=LeaveBalance)
async def get_leave_balance(
    employee_id: str,
    year: Optional[int] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Get leave balance for an employee"""
    try:
        if not year:
            year = datetime.now().year

        response = supabase.table("leave_balances").select("*").eq(
            "employee_id", employee_id
        ).eq("year", year).execute()

        if not response.data:
            # Create default leave balance if not found
            default_balance = {
                "employee_id": employee_id,
                "year": year,
                "vacation_days": 20,
                "sick_days": 10,
                "personal_days": 5,
                "used_vacation": 0,
                "used_sick": 0,
                "used_personal": 0
            }
            create_response = supabase.table("leave_balances").insert(default_balance).execute()
            return create_response.data[0]

        return response.data[0]

    except Exception as e:
        logger.error(f"Error getting leave balance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get leave balance: {str(e)}")


@router.put("/balance/{employee_id}")
async def update_leave_balance(
    employee_id: str,
    vacation_days: Optional[int] = None,
    sick_days: Optional[int] = None,
    personal_days: Optional[int] = None,
    year: Optional[int] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Update leave balance for an employee"""
    try:
        if not year:
            year = datetime.now().year

        update_data = {}
        if vacation_days is not None:
            update_data["vacation_days"] = vacation_days
        if sick_days is not None:
            update_data["sick_days"] = sick_days
        if personal_days is not None:
            update_data["personal_days"] = personal_days

        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")

        response = supabase.table("leave_balances").update(update_data).eq(
            "employee_id", employee_id
        ).eq("year", year).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Leave balance not found")

        logger.info(f"Updated leave balance for employee: {employee_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating leave balance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update leave balance: {str(e)}")


@router.delete("/requests/{request_id}")
async def delete_leave_request(
    request_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete leave request (only if pending)"""
    try:
        # Only allow deletion of pending requests
        request = supabase.table("leave_requests").select("status").eq("id", request_id).single().execute()

        if not request.data:
            raise HTTPException(status_code=404, detail="Leave request not found")

        if request.data['status'] != 'pending':
            raise HTTPException(
                status_code=400,
                detail="Cannot delete non-pending leave request"
            )

        response = supabase.table("leave_requests").delete().eq("id", request_id).execute()

        logger.info(f"Deleted leave request: {request_id}")
        return {"message": "Leave request deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting leave request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete leave request: {str(e)}")
