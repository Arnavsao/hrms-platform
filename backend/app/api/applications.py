from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase import Client
from app.services.ai_matching import match_candidate_to_job
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from app.models.application import Application, ApplicationCreate, MatchResponse

logger = get_logger(__name__)
router = APIRouter()

class MatchRequest(BaseModel):
    """Request to match a candidate to a job"""
    candidate_id: str
    job_id: str

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
        logger.info(f"Matching candidate {request.candidate_id} to job {request.job_id}")
        
        # Match using AI service
        result = await match_candidate_to_job(request.candidate_id, request.job_id)
        
        # Create application in database
        application_data = ApplicationCreate(
            candidate_id=request.candidate_id,
            job_id=request.job_id,
            fit_score=result['fit_score'],
            highlights=result['highlights']
        )
        supabase.table("applications").insert(application_data.dict()).execute()

        return result
    
    except Exception as e:
        logger.error(f"Error matching candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{application_id}", response_model=Application)
async def get_application(
    application_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get application details"""
    try:
        response = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if response.data:
            return response.data
        raise HTTPException(status_code=404, detail="Application not found")
    except Exception as e:
        logger.error(f"Error getting application {application_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve application.")


@router.get("/")
async def list_applications(
    job_id: str | None = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List all applications, optionally filtered by job_id"""
    try:
        query = supabase.table("applications").select("*").order("created_at", desc=True)
        if job_id:
            query = query.eq("job_id", job_id)
            
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error listing applications: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve applications.")

