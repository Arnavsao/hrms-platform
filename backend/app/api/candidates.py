from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from supabase import Client
from app.models.candidate import ResumeUploadResponse, Candidate, CandidateCreate, ParsedData
from app.services.ai_parser import parse_resume
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client, ensure_storage_bucket_exists
from pydantic import BaseModel
from typing import Optional
import uuid

logger = get_logger(__name__)
router = APIRouter()

# Storage bucket name for resumes
RESUMES_BUCKET_NAME = "resumes"

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
    2. Ensures the storage bucket exists
    3. Uploads the resume to Supabase Storage
    4. Uses AI to extract structured data
    5. Scrapes links found in the resume
    6. Stores the candidate in the database

    Args:
        file: The resume file to upload and parse
        supabase: Supabase client instance (injected dependency)

    Returns:
        ResumeUploadResponse with parsed candidate data

    Raises:
        HTTPException: If file upload, parsing, or storage fails
    """
    try:
        logger.info(f"Starting resume parsing for file: {file.filename}")

        # Validate file extension
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if file_ext not in ['pdf', 'doc', 'docx']:
            error_msg = f"Unsupported file format: {file_ext}. Supported formats: PDF, DOC, DOCX"
            logger.warning(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)

        # Ensure storage bucket exists before uploading
        # Note: If automatic creation fails, user must create bucket manually in Supabase Dashboard
        try:
            ensure_storage_bucket_exists(RESUMES_BUCKET_NAME, supabase)
        except Exception as bucket_error:
            error_msg = str(bucket_error)
            logger.warning(
                f"Could not automatically create storage bucket '{RESUMES_BUCKET_NAME}': {error_msg}. "
                f"Will attempt upload - if bucket doesn't exist, upload will fail with clear instructions."
            )
            # Don't fail here - let the upload attempt happen
            # The upload error will provide better context

        # Read file content
        content = await file.read()

        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            error_msg = f"File size ({len(content)} bytes) exceeds maximum allowed size ({max_size} bytes)"
            logger.warning(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)

        # Generate a unique file name
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        storage_path = f"resumes/{unique_filename}"

        logger.info(f"Uploading resume to storage: {storage_path}")

        # Upload to Supabase Storage
        try:
            upload_response = supabase.storage.from_(RESUMES_BUCKET_NAME).upload(
                file=content,
                path=storage_path,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            logger.info(f"Successfully uploaded resume to storage: {storage_path}")
        except Exception as upload_error:
            error_msg = str(upload_error)
            logger.error(f"Failed to upload resume to storage: {error_msg}")

            # Provide more helpful error messages
            if "Bucket not found" in error_msg or "bucket" in error_msg.lower():
                raise HTTPException(
                    status_code=500,
                    detail=f"Storage bucket '{RESUMES_BUCKET_NAME}' not found. Please create it in your Supabase dashboard under Storage."
                )
            raise HTTPException(status_code=500, detail=f"Failed to upload resume: {error_msg}")

        # Get public URL
        try:
            resume_url = supabase.storage.from_(RESUMES_BUCKET_NAME).get_public_url(storage_path)
            logger.info(f"Resume public URL: {resume_url}")
        except Exception as url_error:
            logger.error(f"Failed to get public URL: {str(url_error)}")
            # Continue without URL if it fails, but log the error
            resume_url = f"{RESUMES_BUCKET_NAME}/{storage_path}"

        # Parse resume using AI service
        logger.info("Starting AI parsing of resume content...")
        result = await parse_resume(content, file.filename, resume_url)

        # Log the parsed data for debugging
        logger.info(f"Parse result - candidate_id: {result.candidate_id}")
        logger.info(f"Parse result - links: {result.parsed_data.links}")
        logger.info(f"Parse result - full parsed_data: {result.parsed_data.dict()}")

        logger.info(f"Successfully parsed resume for candidate: {result.candidate_id}")
        return result

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        error_msg = f"Failed to parse resume: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)

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
