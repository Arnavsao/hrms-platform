from typing import Dict, List
from app.core.config import settings
from app.core.logging import get_logger
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
        # TODO: Fetch candidate data from database
        # For now, using placeholder data
        candidate_profile = {
            "name": "John Doe",
            "skills": ["Python", "FastAPI", "Machine Learning", "SQL"],
            "experience": "5 years in software development",
        }
        
        # TODO: Fetch job data from database
        job_description = {
            "title": "Senior Software Engineer",
            "requirements": "Python, FastAPI, AWS, 5+ years experience",
        }
        
        # Create AI model
        model = genai.GenerativeModel('gemini-pro')
        
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

