from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from supabase import Client
from app.models.candidate import ResumeUploadResponse, Candidate
from app.services.ai_parser import parse_resume
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
import uuid

logger = get_logger(__name__)
router = APIRouter()

@router.post("/parse", response_model=ResumeUploadResponse)
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Upload and parse a candidate's resume.
    
    This endpoint:
    1. Accepts a resume file (PDF/DOC/DOCX)
    2. Uploads the resume to Supabase Storage
    3. Uses AI to extract structured data
    4. Scrapes links found in the resume
    5. Stores the candidate in the database
    """
    try:
        logger.info(f"Parsing resume: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Generate a unique file name
        file_ext = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        # Upload to Supabase Storage
        storage_path = f"resumes/{unique_filename}"
        supabase.storage.from_("resumes").upload(file=content, path=storage_path, file_options={"content-type": file.content_type})
        
        # Get public URL
        resume_url = supabase.storage.from_("resumes").get_public_url(storage_path)
        
        # Parse resume using AI service
        result = await parse_resume(content, file.filename, resume_url)
        
        return result
    
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@router.get("/{candidate_id}", response_model=Candidate)
async def get_candidate(candidate_id: str):
    """Get candidate details by ID"""
    # TODO: Implement database fetch
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/")
async def list_candidates():
    """List all candidates"""
    # TODO: Implement database fetch with pagination
    raise HTTPException(status_code=501, detail="Not implemented yet")

