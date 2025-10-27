from typing import Dict, List
from supabase import Client
from app.core.config import settings
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
import google.generativeai as genai

logger = get_logger(__name__)

# Configure Gemini AI
genai.configure(api_key=settings.GEMINI_API_KEY)

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
        
        # Create AI model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
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
        
        Return ONLY valid JSON without markdown formatting.
        """
        
        # Generate analysis
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean up markdown if present
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        # Parse response
        import json
        analysis = json.loads(result_text)
        
        # TODO: Store application with fit score in database
        
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

