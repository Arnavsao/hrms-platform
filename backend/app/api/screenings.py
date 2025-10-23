from fastapi import APIRouter, HTTPException
from app.models.screening import ScreeningCreate, ScreeningResponse, Screening
from app.services.ai_screening import conduct_screening
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.post("/start", response_model=ScreeningResponse)
async def start_screening(request: ScreeningCreate):
    """
    Start a conversational AI screening.
    
    This endpoint:
    1. Initiates a conversational screening (text/voice)
    2. Asks adaptive questions
    3. Evaluates responses
    4. Generates transcript and evaluation report
    """
    try:
        logger.info(f"Starting screening for application {request.application_id}")
        
        # Conduct screening using AI service
        result = await conduct_screening(request.application_id, request.mode)
        
        return result
    
    except Exception as e:
        logger.error(f"Error conducting screening: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{screening_id}", response_model=Screening)
async def get_screening(screening_id: str):
    """Get screening details and results"""
    # TODO: Implement database fetch
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/")
async def list_screenings():
    """List all screenings"""
    # TODO: Implement database fetch with filtering
    raise HTTPException(status_code=501, detail="Not implemented yet")

