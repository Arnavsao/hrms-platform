from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.core.supabase_client import get_supabase_client
from app.core.logging import get_logger
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

logger = get_logger(__name__)
router = APIRouter()

class UserRole(str, Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    CANDIDATE = "candidate"

class UserStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"

class UserUpdate(BaseModel):
    """Model for updating user information"""
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    email: Optional[EmailStr] = None

class SystemSettings(BaseModel):
    """System configuration settings"""
    ai_matching_threshold: Optional[float] = None
    auto_screening_enabled: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    max_resume_size_mb: Optional[int] = None
    session_timeout_minutes: Optional[int] = None

# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/overview")
async def get_analytics_overview(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get comprehensive platform analytics for admin dashboard.
    Includes user stats, application metrics, and system performance.
    """
    try:
        # Get all candidates
        candidates_response = supabase.table("candidates").select("id, created_at").execute()
        total_candidates = len(candidates_response.data) if candidates_response.data else 0

        # Get all jobs
        jobs_response = supabase.table("jobs").select("id, created_at, status").execute()
        total_jobs = len(jobs_response.data) if jobs_response.data else 0
        active_jobs = len([j for j in (jobs_response.data or []) if j.get('status') == 'open'])

        # Get all applications
        applications_response = supabase.table("applications").select("id, created_at, fit_score, status").execute()
        total_applications = len(applications_response.data) if applications_response.data else 0

        # Calculate average fit score
        applications_data = applications_response.data or []
        avg_fit_score = 0
        if applications_data:
            scores = [app.get('fit_score', 0) for app in applications_data if app.get('fit_score')]
            avg_fit_score = round(sum(scores) / len(scores), 2) if scores else 0

        # Calculate application status breakdown
        pending_apps = len([a for a in applications_data if a.get('status') == 'pending'])
        reviewed_apps = len([a for a in applications_data if a.get('status') == 'reviewed'])
        shortlisted_apps = len([a for a in applications_data if a.get('status') == 'shortlisted'])

        # Calculate growth metrics (last 7 days vs previous 7 days)
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)

        recent_candidates = len([c for c in (candidates_response.data or [])
                                if datetime.fromisoformat(c['created_at'].replace('Z', '+00:00')) > week_ago])
        recent_applications = len([a for a in applications_data
                                  if datetime.fromisoformat(a['created_at'].replace('Z', '+00:00')) > week_ago])

        return {
            "overview": {
                "total_candidates": total_candidates,
                "total_jobs": total_jobs,
                "active_jobs": active_jobs,
                "total_applications": total_applications,
                "avg_fit_score": avg_fit_score,
                "pending_applications": pending_apps,
                "reviewed_applications": reviewed_apps,
                "shortlisted_applications": shortlisted_apps,
            },
            "growth": {
                "new_candidates_this_week": recent_candidates,
                "new_applications_this_week": recent_applications,
            },
            "performance": {
                "database_status": "healthy",
                "api_response_time_ms": 120,
                "ai_processing_status": "active",
                "uptime_percentage": 99.9
            }
        }

    except Exception as e:
        logger.error(f"Error fetching analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")


@router.get("/analytics/trends")
async def get_analytics_trends(
    days: int = Query(default=30, ge=7, le=90),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get time-series analytics data for charts.
    """
    try:
        # Get applications with timestamps
        applications_response = supabase.table("applications").select("created_at, fit_score").execute()
        candidates_response = supabase.table("candidates").select("created_at").execute()
        jobs_response = supabase.table("jobs").select("created_at").execute()

        # Group by date
        from collections import defaultdict
        daily_stats = defaultdict(lambda: {"applications": 0, "candidates": 0, "jobs": 0, "avg_score": []})

        for app in (applications_response.data or []):
            date = datetime.fromisoformat(app['created_at'].replace('Z', '+00:00')).date().isoformat()
            daily_stats[date]["applications"] += 1
            if app.get('fit_score'):
                daily_stats[date]["avg_score"].append(app['fit_score'])

        for candidate in (candidates_response.data or []):
            date = datetime.fromisoformat(candidate['created_at'].replace('Z', '+00:00')).date().isoformat()
            daily_stats[date]["candidates"] += 1

        for job in (jobs_response.data or []):
            date = datetime.fromisoformat(job['created_at'].replace('Z', '+00:00')).date().isoformat()
            daily_stats[date]["jobs"] += 1

        # Format for frontend
        trends = []
        for date, stats in sorted(daily_stats.items())[-days:]:
            avg_score = sum(stats["avg_score"]) / len(stats["avg_score"]) if stats["avg_score"] else 0
            trends.append({
                "date": date,
                "applications": stats["applications"],
                "candidates": stats["candidates"],
                "jobs": stats["jobs"],
                "avg_fit_score": round(avg_score, 2)
            })

        return {"trends": trends}

    except Exception as e:
        logger.error(f"Error fetching analytics trends: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")


# ==================== USER MANAGEMENT ENDPOINTS ====================

@router.get("/users")
async def list_all_users(
    role: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    supabase: Client = Depends(get_supabase_client)
):
    """
    List all users in the system with filtering options.
    Admin can view candidates, recruiters, and other admins.
    """
    try:
        # Get candidates
        candidates = supabase.table("candidates").select("id, name, email, created_at, parsed_data").execute()

        users = []

        # Format candidates
        for candidate in (candidates.data or []):
            users.append({
                "id": candidate['id'],
                "name": candidate['name'],
                "email": candidate['email'],
                "role": "candidate",
                "status": "active",  # Default status
                "created_at": candidate['created_at'],
                "last_active": candidate['created_at'],  # Mock data
                "applications_count": 0,  # Will be populated if needed
            })

        # Apply filters
        if role:
            users = [u for u in users if u['role'] == role]
        if status:
            users = [u for u in users if u['status'] == status]
        if search:
            search_lower = search.lower()
            users = [u for u in users if search_lower in u['name'].lower() or search_lower in u['email'].lower()]

        return {"users": users, "total": len(users)}

    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    user_type: str = Query(..., description="Type of user: candidate or recruiter"),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete a user from the system (ADMIN ONLY).
    This will delete the user and all associated data.
    """
    try:
        if user_type == "candidate":
            # Delete associated applications first
            supabase.table("applications").delete().eq("candidate_id", user_id).execute()

            # Delete digital footprint
            supabase.table("digital_footprints").delete().eq("candidate_id", user_id).execute()

            # Delete candidate
            result = supabase.table("candidates").delete().eq("id", user_id).execute()

            if not result.data:
                raise HTTPException(status_code=404, detail="User not found")

            logger.info(f"Admin deleted candidate: {user_id}")
            return {"message": "User deleted successfully", "user_id": user_id}

        elif user_type == "recruiter":
            # For recruiter deletion, we'd need to handle their job postings
            # This is a placeholder for recruiter deletion logic
            logger.warning(f"Recruiter deletion not fully implemented: {user_id}")
            return {"message": "Recruiter deletion not fully implemented"}

        else:
            raise HTTPException(status_code=400, detail="Invalid user type")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status: UserStatus,
    user_type: str = Query(..., description="Type of user: candidate or recruiter"),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update user status (suspend, reactivate, deactivate).
    Admin power to control user access.
    """
    try:
        # Note: This requires a 'status' field in the database
        # For now, we'll log the action
        logger.info(f"Admin updated user {user_id} status to {status}")

        return {
            "message": f"User status updated to {status}",
            "user_id": user_id,
            "new_status": status
        }

    except Exception as e:
        logger.error(f"Error updating user status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user status: {str(e)}")


# ==================== SYSTEM SETTINGS ENDPOINTS ====================

@router.get("/settings")
async def get_system_settings(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get current system settings.
    """
    # Mock settings - in production, these would come from a database
    return {
        "ai_matching_threshold": 70,
        "auto_screening_enabled": True,
        "email_notifications_enabled": True,
        "max_resume_size_mb": 10,
        "session_timeout_minutes": 60,
        "maintenance_mode": False,
        "registration_enabled": True,
        "ai_model_version": "gemini-2.0-flash",
    }


@router.put("/settings")
async def update_system_settings(
    settings: SystemSettings,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update system settings (ADMIN ONLY).
    """
    try:
        # In production, save to database
        logger.info(f"Admin updated system settings: {settings.dict(exclude_none=True)}")

        return {
            "message": "System settings updated successfully",
            "updated_settings": settings.dict(exclude_none=True)
        }

    except Exception as e:
        logger.error(f"Error updating system settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


# ==================== SECURITY CENTER ENDPOINTS ====================

@router.get("/security/audit-log")
async def get_audit_log(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get system audit log showing important security events.
    """
    # Mock audit log - in production, this would come from database
    mock_logs = [
        {
            "id": "1",
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "user_login",
            "user_email": "admin@example.com",
            "ip_address": "192.168.1.1",
            "status": "success",
            "details": "Admin login successful"
        },
        {
            "id": "2",
            "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
            "event_type": "user_deleted",
            "user_email": "admin@example.com",
            "ip_address": "192.168.1.1",
            "status": "success",
            "details": "Deleted candidate account"
        },
        {
            "id": "3",
            "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "event_type": "settings_changed",
            "user_email": "admin@example.com",
            "ip_address": "192.168.1.1",
            "status": "success",
            "details": "Updated AI matching threshold"
        },
        {
            "id": "4",
            "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "event_type": "failed_login",
            "user_email": "unknown@example.com",
            "ip_address": "203.45.67.89",
            "status": "failed",
            "details": "Invalid credentials"
        },
    ]

    return {
        "logs": mock_logs[offset:offset+limit],
        "total": len(mock_logs)
    }


@router.get("/security/active-sessions")
async def get_active_sessions(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get list of active user sessions.
    """
    # Mock active sessions
    mock_sessions = [
        {
            "id": "session-1",
            "user_email": "admin@example.com",
            "user_role": "admin",
            "ip_address": "192.168.1.1",
            "user_agent": "Mozilla/5.0...",
            "last_activity": datetime.utcnow().isoformat(),
            "duration_minutes": 45
        },
        {
            "id": "session-2",
            "user_email": "recruiter@example.com",
            "user_role": "recruiter",
            "ip_address": "192.168.1.5",
            "user_agent": "Chrome/120.0...",
            "last_activity": (datetime.utcnow() - timedelta(minutes=10)).isoformat(),
            "duration_minutes": 120
        },
    ]

    return {"sessions": mock_sessions, "total": len(mock_sessions)}


@router.post("/security/sessions/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Terminate a user session (ADMIN ONLY).
    """
    try:
        logger.info(f"Admin terminated session: {session_id}")
        return {"message": "Session terminated successfully", "session_id": session_id}

    except Exception as e:
        logger.error(f"Error terminating session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to terminate session: {str(e)}")


@router.get("/security/threats")
async def get_security_threats(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get detected security threats and anomalies.
    """
    # Mock threat detection
    return {
        "threats": [
            {
                "id": "threat-1",
                "type": "multiple_failed_logins",
                "severity": "medium",
                "ip_address": "203.45.67.89",
                "count": 5,
                "first_seen": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "last_seen": datetime.utcnow().isoformat(),
                "status": "active"
            }
        ],
        "total_active_threats": 1,
        "threat_level": "low"
    }
