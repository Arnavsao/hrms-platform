from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from typing import Dict, Any

logger = get_logger(__name__)
router = APIRouter()

@router.get("/{candidate_id}")
async def get_digital_footprint(
    candidate_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get digital footprint data for a candidate.
    
    Returns GitHub, LinkedIn, and portfolio data scraped from links in the resume.
    """
    try:
        response = supabase.table("digital_footprints").select("*").eq(
            "candidate_id", candidate_id
        ).single().execute()
        
        if response.data:
            return response.data
        raise HTTPException(status_code=404, detail="Digital footprint not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting digital footprint for candidate {candidate_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{candidate_id}/refresh")
async def refresh_digital_footprint(
    candidate_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Re-scrape and refresh digital footprint data for a candidate.
    """
    try:
        # Get candidate data
        candidate_response = supabase.table("candidates").select(
            "parsed_data"
        ).eq("id", candidate_id).single().execute()
        
        if not candidate_response.data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        parsed_data = candidate_response.data.get("parsed_data", {})
        links = parsed_data.get("links", {})
        
        if not links:
            return {"message": "No links found in candidate resume"}
        
        # Import scraper service
        from app.services.link_scraper import scrape_links
        
        # Scrape all links
        enriched_data = await scrape_links(links)
        
        # Update digital footprint
        footprint_data = {
            "candidate_id": candidate_id,
            "github_data": enriched_data.get("github"),
            "linkedin_data": enriched_data.get("linkedin"),
            "portfolio_data": enriched_data.get("portfolio"),
        }
        
        supabase.table("digital_footprints").upsert(
            footprint_data, on_conflict="candidate_id"
        ).execute()
        
        logger.info(f"Refreshed digital footprint for candidate {candidate_id}")
        
        return footprint_data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing digital footprint for candidate {candidate_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

