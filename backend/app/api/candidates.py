from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from supabase import Client
from app.models.candidate import ResumeUploadResponse, Candidate, CandidateCreate, ParsedData
from app.services.ai_parser import parse_resume
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from pydantic import BaseModel
from typing import Optional
import uuid

logger = get_logger(__name__)
router = APIRouter()

class CandidateUpdate(BaseModel):
    """Model for updating candidate information"""
    name: Optional[str] = None
    email: Optional[str] = None
    parsed_data: Optional[ParsedData] = None

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
        
        # Validate file extension
        file_ext = file.filename.split('.')[-1].lower()
        if file_ext not in ['pdf', 'doc', 'docx']:
            raise HTTPException(status_code=400, detail="Only PDF, DOC, and DOCX files are supported")
        
        # Read file content
        content = await file.read()
        
        # Validate file size (max 10MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Generate a unique file name
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        # Upload to Supabase Storage (create bucket if it doesn't exist)
        try:
            supabase.storage.from_("resumes").upload(
                path=unique_filename,
                file=content,
                file_options={"content-type": file.content_type or "application/pdf"}
            )
            # Get public URL
            resume_url = supabase.storage.from_("resumes").get_public_url(unique_filename)
        except Exception as storage_error:
            logger.error(f"Storage error: {str(storage_error)}")
            # Continue without storage URL if upload fails
            resume_url = f"local://{unique_filename}"
        
        # Parse resume using AI service
        result = await parse_resume(content, file.filename, resume_url)

        # Log the parsed data for debugging
        logger.info(f"Parse result - candidate_id: {result.candidate_id}")
        logger.info(f"Parse result - links: {result.parsed_data.links}")
        logger.info(f"Parse result - full parsed_data: {result.parsed_data.dict()}")

        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@router.get("/{candidate_id}")
async def get_candidate(
    candidate_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get candidate details by ID including digital footprint"""
    try:
        # Validate UUID format early to avoid 500 from Supabase for invalid IDs like "me"
        try:
            uuid.UUID(candidate_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid candidate_id. Provide a UUID or use /api/candidates/me?email=...",
            )

        # Fetch candidate with digital footprint
        response = supabase.table("candidates").select(
            "*, digital_footprints(github_data, linkedin_data, portfolio_data)"
        ).eq("id", candidate_id).single().execute()
        
        if response.data:
            return response.data
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting candidate {candidate_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_candidates(
    supabase: Client = Depends(get_supabase_client)
):
    """List all candidates with pagination"""
    try:
        response = supabase.table("candidates").select(
            "id, name, email, created_at, updated_at"
        ).order("created_at", desc=True).limit(100).execute()
        
        return response.data
    
    except Exception as e:
        logger.error(f"Error listing candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
async def get_current_candidate(
    email: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get candidate by email. Useful for mapping the authenticated user to candidate profile."""
    try:
        response = supabase.table("candidates").select("*").eq("email", email).limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Candidate not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving candidate by email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve candidate")

@router.post("/", response_model=Candidate)
async def create_candidate(
    candidate: CandidateCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new candidate manually"""
    try:
        data = {
            "name": candidate.name,
            "email": candidate.email,
            "parsed_data": candidate.parsed_data.dict() if hasattr(candidate, 'parsed_data') and candidate.parsed_data else None
        }

        response = supabase.table("candidates").insert(data).execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=500, detail="Failed to create candidate")

    except Exception as e:
        logger.error(f"Error creating candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{candidate_id}")
async def update_candidate(
    candidate_id: str,
    update_data: CandidateUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update candidate profile"""
    try:
        # Build update dictionary with only provided fields
        data = {}
        if update_data.name is not None:
            data["name"] = update_data.name
        if update_data.email is not None:
            data["email"] = update_data.email
        if update_data.parsed_data is not None:
            data["parsed_data"] = update_data.parsed_data.dict()

        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = supabase.table("candidates").update(data).eq("id", candidate_id).execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Candidate not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating candidate {candidate_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

