from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from typing import List

from app.models.job import Job, JobCreate, JobUpdate
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client

logger = get_logger(__name__)
router = APIRouter()

@router.post("/", response_model=Job)
async def create_job(
    job: JobCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new job posting"""
    try:
        logger.info(f"Creating job: {job.title}")
        response = supabase.table("jobs").insert(job.dict()).execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create job.")
    
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{job_id}", response_model=Job)
async def get_job(
    job_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get job details by ID"""
    try:
        response = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
        if response.data:
            return response.data
        raise HTTPException(status_code=404, detail="Job not found")
    except Exception as e:
        logger.error(f"Error getting job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job.")

@router.get("/", response_model=List[Job])
async def list_jobs(supabase: Client = Depends(get_supabase_client)):
    """List all job postings"""
    try:
        response = supabase.table("jobs").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error listing jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve jobs.")

@router.put("/{job_id}", response_model=Job)
async def update_job(
    job_id: str, 
    job: JobUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update a job posting"""
    try:
        response = supabase.table("jobs").update(job.dict(exclude_unset=True)).eq("id", job_id).execute()
        if response.data:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Job not found to update")
    except Exception as e:
        logger.error(f"Error updating job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update job.")


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a job posting"""
    try:
        response = supabase.table("jobs").delete().eq("id", job_id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Job not found to delete")
        return
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete job.")

