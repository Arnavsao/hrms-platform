from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_matching import match_candidate_to_job
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

class MatchRequest(BaseModel):
    """Request to match a candidate to a job"""
    candidate_id: str
    job_id: str

class MatchResponse(BaseModel):
    """Response with matching score and highlights"""
    fit_score: float
    highlights: dict

@router.post("/match", response_model=MatchResponse)
async def match_candidate(request: MatchRequest):
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
        
        return result
    
    except Exception as e:
        logger.error(f"Error matching candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{application_id}")
async def get_application(application_id: str):
    """Get application details"""
    # TODO: Implement database fetch
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/")
async def list_applications():
    """List all applications"""
    # TODO: Implement database fetch with filtering
    raise HTTPException(status_code=501, detail="Not implemented yet")

