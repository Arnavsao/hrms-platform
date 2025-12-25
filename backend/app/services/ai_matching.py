from typing import Dict, List
from supabase import Client
from app.core.config import settings
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from app.core.ai_client import generate_json_response

logger = get_logger(__name__)

async def match_candidate_to_job(candidate_id: str, job_id: str) -> Dict:
    """
    Match a candidate against a job description using AI.
    
    Returns:
    - fit_score: 0-100 score indicating match quality
    - highlights: Strengths, weaknesses, and recommendations
    """
    try:
        supabase = get_supabase_client()
        
        # Fetch candidate data from database
        candidate_response = supabase.table("candidates").select("parsed_data, digital_footprints(github_data, linkedin_data)").eq("id", candidate_id).single().execute()
        if not candidate_response.data:
            raise ValueError(f"Candidate with id {candidate_id} not found.")
        candidate_profile = candidate_response.data
        
        # Fetch job data from database
        job_response = supabase.table("jobs").select("title, description, requirements").eq("id", job_id).single().execute()
        if not job_response.data:
            raise ValueError(f"Job with id {job_id} not found.")
        job_description = job_response.data
        
        # Craft matching prompt
        prompt = f"""
        You are an expert HR recruiter. Analyze how well this candidate matches the job requirements.
        
        Candidate Profile:
        {candidate_profile}
        
        Job Description:
        {job_description}
        
        Provide a detailed analysis in JSON format with:
        1. fit_score: A number from 0-100 indicating overall match quality
        2. strengths: List of candidate's strengths relevant to this role
        3. weaknesses: List of gaps or areas where candidate doesn't match
        4. recommendations: List of suggestions for the recruiter
        """
        
        # Generate analysis using MegaLLM
        analysis = await generate_json_response(
            prompt=prompt,
            model=settings.AI_MODEL,
            temperature=settings.AI_TEMPERATURE,
            max_tokens=settings.AI_MAX_TOKENS,
            system_message="You are an expert HR recruiter specializing in candidate-job matching. Provide accurate, detailed analysis."
        )
        
        # Store application with fit score in database
        application_data = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "fit_score": analysis["fit_score"],
            "highlights": analysis
        }
        
        # Check if application already exists
        existing_app = supabase.table("applications").select("id").eq(
            "candidate_id", candidate_id
        ).eq("job_id", job_id).execute()
        
        if existing_app.data:
            # Update existing application
            supabase.table("applications").update(application_data).eq(
                "id", existing_app.data[0]['id']
            ).execute()
            logger.info(f"Updated application for candidate {candidate_id} to job {job_id}")
        else:
            # Create new application
            supabase.table("applications").insert(application_data).execute()
            logger.info(f"Created new application for candidate {candidate_id} to job {job_id}")
        
        logger.info(f"Matched candidate {candidate_id} to job {job_id} with score {analysis['fit_score']}")
        
        return {
            "fit_score": analysis["fit_score"],
            "highlights": {
                "strengths": analysis.get("strengths", []),
                "weaknesses": analysis.get("weaknesses", []),
                "recommendations": analysis.get("recommendations", [])
            }
        }
    
    except Exception as e:
        logger.error(f"Error matching candidate to job: {str(e)}")
        raise

