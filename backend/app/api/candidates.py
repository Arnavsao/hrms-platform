from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from supabase import Client
from app.models.candidate import ResumeUploadResponse, Candidate
from app.services.ai_parser import parse_resume
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client, ensure_storage_bucket_exists
import uuid

logger = get_logger(__name__)
router = APIRouter()

# Storage bucket name for resumes
RESUMES_BUCKET_NAME = "resumes"

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
        
        logger.info(f"Successfully parsed resume for candidate: {result.candidate_id}")
        return result
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        error_msg = f"Failed to parse resume: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)

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

