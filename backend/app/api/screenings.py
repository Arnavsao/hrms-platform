from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from app.models.screening import ScreeningCreate, ScreeningResponse, Screening
from app.services.ai_screening import conduct_screening
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
import uuid

logger = get_logger(__name__)
router = APIRouter()

@router.post("/start", response_model=ScreeningResponse)
async def start_screening(
    request: ScreeningCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Start a conversational AI screening.
    
    This endpoint:
    1. Initiates a conversational screening (text/voice)
    2. Asks adaptive questions
    3. Evaluates responses
    4. Generates transcript and evaluation report
    5. Stores screening results in database
    """
    try:
        logger.info(f"Starting screening for application {request.application_id}")
        
        # Conduct screening using AI service
        result = await conduct_screening(request.application_id, request.mode)
        
        # Store screening in database
        screening_data = {
            "application_id": request.application_id,
            "transcript": result.transcript,
            "ai_summary": result.evaluation.dict(),
            "communication_score": result.evaluation.communication_score,
            "domain_knowledge_score": result.evaluation.domain_knowledge_score,
            "overall_score": result.evaluation.overall_score,
            "score": result.evaluation.overall_score,
            "mode": request.mode,
        }
        
        supabase.table("screenings").insert(screening_data).execute()
        logger.info(f"Stored screening for application {request.application_id}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error conducting screening: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{screening_id}")
async def get_screening(
    screening_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get screening details and results"""
    try:
        response = supabase.table("screenings").select("*").eq("id", screening_id).single().execute()
        
        if response.data:
            return response.data
        raise HTTPException(status_code=404, detail="Screening not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting screening {screening_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/application/{application_id}")
async def get_screenings_for_application(
    application_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get all screenings for a specific application"""
    try:
        response = supabase.table("screenings").select("*").eq(
            "application_id", application_id
        ).order("created_at", desc=True).execute()
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error getting screenings for application {application_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_screenings(
    supabase: Client = Depends(get_supabase_client)
):
    """List all screenings with pagination"""
    try:
        response = supabase.table("screenings").select(
            "*, applications(candidate_id, job_id)"
        ).order("created_at", desc=True).limit(100).execute()
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error listing screenings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

