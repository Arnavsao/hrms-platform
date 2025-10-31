from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase import Client
from app.services.ai_matching import match_candidate_to_job
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from app.models.application import (
    Application,
    ApplicationCreate,
    MatchResponse,
    ApplicationStatusUpdate,
    ApplicationDetail,
)

logger = get_logger(__name__)
router = APIRouter()

class MatchRequest(BaseModel):
    """Request to match a candidate to a job"""
    candidate_id: str | None = None
    candidate_email: str | None = None
    job_id: str
    cover_letter: str | None = None

@router.post("/match", response_model=MatchResponse)
async def match_candidate(
    request: MatchRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Match a candidate against a job description.
    
    Uses AI to:
    1. Compare candidate profile with JD
    2. Generate fit score (0-100)
    3. Provide explainable highlights
    """
    try:
        # Resolve candidate_id if only email is provided
        candidate_id = request.candidate_id
        if not candidate_id and request.candidate_email:
            logger.info(f"Resolving candidate by email: {request.candidate_email}")
            existing = supabase.table("candidates").select("id").eq("email", request.candidate_email).limit(1).execute()
            if existing.data and len(existing.data) > 0:
                candidate_id = existing.data[0]["id"]
            else:
                raise HTTPException(status_code=404, detail="Candidate not found for provided email")

        if not candidate_id:
            raise HTTPException(status_code=422, detail="candidate_id or candidate_email is required")

        logger.info(f"Matching candidate {candidate_id} to job {request.job_id}")

        # Match using AI service
        result = await match_candidate_to_job(candidate_id, request.job_id)
        
        # Create application in database
        # Merge cover letter into highlights for storage
        merged_highlights = dict(result['highlights'] or {})
        if request.cover_letter:
            merged_highlights["cover_letter"] = request.cover_letter

        application_data = ApplicationCreate(
            candidate_id=candidate_id,
            job_id=request.job_id,
            fit_score=result['fit_score'],
            highlights=merged_highlights
        )
        # Upsert to avoid duplicate applications for same candidate+job
        supabase.table("applications").upsert(application_data.dict(), on_conflict="candidate_id,job_id").execute()

        return result
    
    except Exception as e:
        logger.error(f"Error matching candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{application_id}", response_model=ApplicationDetail)
async def get_application(
    application_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get application details"""
    try:
        response = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if response.data:
            application = response.data
            # Join candidate
            cand = supabase.table("candidates").select("*").eq("id", application["candidate_id"]).single().execute()
            # Join job
            job = supabase.table("jobs").select("*").eq("id", application["job_id"]).single().execute()
            # Digital footprint
            footprint = supabase.table("digital_footprints").select("github_data,linkedin_data,portfolio_data").eq("candidate_id", application["candidate_id"]).single().execute()

            return {
                **application,
                "candidate": cand.data if cand.data else None,
                "job": job.data if job.data else None,
                "digital_footprint": footprint.data if footprint.data else None,
            }
        raise HTTPException(status_code=404, detail="Application not found")
    except Exception as e:
        logger.error(f"Error getting application {application_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve application.")


@router.get("/")
async def list_applications(
    job_id: str | None = None,
    candidate_id: str | None = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List all applications, optionally filtered by job_id or candidate_id"""
    try:
        query = supabase.table("applications").select("*").order("created_at", desc=True)
        if job_id:
            query = query.eq("job_id", job_id)
        if candidate_id:
            query = query.eq("candidate_id", candidate_id)

        response = query.execute()
        applications = response.data or []

        # Enrich with job information
        for app in applications:
            try:
                job_response = supabase.table("jobs").select("id, title, company, location, status").eq("id", app["job_id"]).single().execute()
                if job_response.data:
                    app["job_title"] = job_response.data.get("title", "Job Position")
                    app["company"] = job_response.data.get("company")
                    app["location"] = job_response.data.get("location")
                    app["job_status"] = job_response.data.get("status")
                else:
                    app["job_title"] = "Job Position"
            except Exception as job_err:
                logger.warning(f"Could not fetch job details for {app['job_id']}: {str(job_err)}")
                app["job_title"] = "Job Position"

        return applications
    except Exception as e:
        logger.error(f"Error listing applications: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve applications.")


@router.post("/", response_model=Application)
async def create_application(
    payload: ApplicationCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create an application without AI matching (manual apply)."""
    try:
        logger.info(f"Creating application for candidate {payload.candidate_id} and job {payload.job_id}")
        response = supabase.table("applications").upsert(payload.dict(), on_conflict="candidate_id,job_id").execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating application: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create application.")


@router.put("/{application_id}/status")
async def update_application_status(
    application_id: str,
    payload: ApplicationStatusUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update application status"""
    try:
        logger.info(f"Updating status for application {application_id} to {payload.status}")
        response = supabase.table("applications").update({"status": payload.status}).eq("id", application_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Application not found")
        return {"id": application_id, "status": payload.status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating application status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update application status.")

