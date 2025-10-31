from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.models.attendance import (
    Attendance,
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceStats
)
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from typing import List, Optional
from datetime import datetime, date, timedelta

logger = get_logger(__name__)
router = APIRouter()


@router.post("/", response_model=Attendance)
async def create_attendance(
    attendance_data: AttendanceCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create attendance record (check-in)"""
    try:
        # Check if attendance already exists for this employee today
        existing = supabase.table("attendance").select("id").eq(
            "employee_id", attendance_data.employee_id
        ).eq("date", str(attendance_data.date)).execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Attendance already marked for today"
            )

        attendance_dict = attendance_data.dict()
        attendance_dict['check_in'] = attendance_dict['check_in'].isoformat()
        if attendance_dict.get('check_out'):
            attendance_dict['check_out'] = attendance_dict['check_out'].isoformat()

        response = supabase.table("attendance").insert(attendance_dict).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create attendance")

        logger.info(f"Created attendance for employee: {attendance_data.employee_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create attendance: {str(e)}")


@router.get("/", response_model=List[Attendance])
async def list_attendance(
    employee_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List attendance records with optional filters"""
    try:
        query = supabase.table("attendance").select("*")

        if employee_id:
            query = query.eq("employee_id", employee_id)

        if start_date:
            query = query.gte("date", str(start_date))

        if end_date:
            query = query.lte("date", str(end_date))

        if status:
            query = query.eq("status", status)

        response = query.order("date", desc=True).execute()
        return response.data

    except Exception as e:
        logger.error(f"Error listing attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list attendance: {str(e)}")


@router.get("/stats/{employee_id}", response_model=AttendanceStats)
async def get_attendance_stats(
    employee_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Get attendance statistics for an employee"""
    try:
        # Default to current month if no dates provided
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()

        response = supabase.table("attendance").select("*").eq(
            "employee_id", employee_id
        ).gte("date", str(start_date)).lte("date", str(end_date)).execute()

        records = response.data

        total_days = len(records)
        present_days = len([r for r in records if r['status'] in ['present', 'remote']])
        absent_days = len([r for r in records if r['status'] == 'absent'])
        late_days = len([r for r in records if r['status'] == 'late'])
        remote_days = len([r for r in records if r['status'] == 'remote'])

        attendance_percentage = (present_days / total_days * 100) if total_days > 0 else 0

        # Calculate streaks
        sorted_records = sorted(records, key=lambda x: x['date'], reverse=True)
        current_streak = 0
        longest_streak = 0
        temp_streak = 0

        for record in sorted_records:
            if record['status'] in ['present', 'remote']:
                temp_streak += 1
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
            else:
                if current_streak == 0:
                    current_streak = temp_streak
                temp_streak = 0

        return AttendanceStats(
            total_days=total_days,
            present_days=present_days,
            absent_days=absent_days,
            late_days=late_days,
            remote_days=remote_days,
            attendance_percentage=round(attendance_percentage, 2),
            current_streak=current_streak,
            longest_streak=longest_streak
        )

    except Exception as e:
        logger.error(f"Error getting attendance stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get attendance stats: {str(e)}")


@router.get("/{attendance_id}", response_model=Attendance)
async def get_attendance(
    attendance_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get attendance record by ID"""
    try:
        response = supabase.table("attendance").select("*").eq("id", attendance_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Attendance record not found")

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get attendance: {str(e)}")


@router.put("/{attendance_id}", response_model=Attendance)
async def update_attendance(
    attendance_id: str,
    attendance_data: AttendanceUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update attendance record (check-out or modify)"""
    try:
        update_dict = attendance_data.dict(exclude_unset=True)

        if 'check_out' in update_dict and update_dict['check_out']:
            update_dict['check_out'] = update_dict['check_out'].isoformat()

        response = supabase.table("attendance").update(update_dict).eq("id", attendance_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Attendance record not found")

        logger.info(f"Updated attendance: {attendance_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update attendance: {str(e)}")


@router.post("/checkout/{employee_id}")
async def checkout_attendance(
    employee_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Checkout for today's attendance"""
    try:
        today = date.today()

        # Find today's attendance record
        response = supabase.table("attendance").select("*").eq(
            "employee_id", employee_id
        ).eq("date", str(today)).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="No check-in found for today")

        attendance_id = response.data[0]['id']

        # Update with check-out time
        update_response = supabase.table("attendance").update({
            "check_out": datetime.now().isoformat()
        }).eq("id", attendance_id).execute()

        logger.info(f"Checked out employee: {employee_id}")
        return update_response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check out: {str(e)}")


@router.delete("/{attendance_id}")
async def delete_attendance(
    attendance_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete attendance record"""
    try:
        response = supabase.table("attendance").delete().eq("id", attendance_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Attendance record not found")

        logger.info(f"Deleted attendance: {attendance_id}")
        return {"message": "Attendance record deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete attendance: {str(e)}")
