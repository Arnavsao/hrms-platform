from typing import Dict, List
from app.models.screening import ScreeningResponse, ScreeningEvaluation
from app.core.config import settings
from app.core.logging import get_logger
import google.generativeai as genai

logger = get_logger(__name__)

# Configure Gemini AI
genai.configure(api_key=settings.GEMINI_API_KEY)

async def generate_screening_questions(job_role: str, candidate_profile: Dict) -> List[str]:
    """Generate adaptive screening questions based on job and candidate"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""
        Generate 3 screening interview questions for a candidate.
        
        Job Role: {job_role}
        Candidate Profile: {candidate_profile}
        
        Questions should:
        1. Test domain knowledge relevant to the role
        2. Assess communication skills
        3. Be open-ended but specific
        
        Return questions as a JSON array of strings.
        """
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean markdown
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        import json
        questions = json.loads(result_text)
        
        return questions
    
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        return [
            "Tell me about your experience with the technologies mentioned in the job description.",
            "Describe a challenging project you worked on and how you overcame obstacles.",
            "Where do you see yourself in the next 2-3 years?"
        ]

async def evaluate_screening_responses(questions: List[str], responses: List[str]) -> ScreeningEvaluation:
    """Evaluate candidate's responses using AI"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Build Q&A pairs
        qa_pairs = "\n\n".join([
            f"Q: {q}\nA: {a}" 
            for q, a in zip(questions, responses)
        ])
        
        prompt = f"""
        Evaluate this candidate's screening interview responses.
        
        Interview Transcript:
        {qa_pairs}
        
        Provide evaluation in JSON format with:
        1. communication_score: 0-100 score for communication clarity and professionalism
        2. domain_knowledge_score: 0-100 score for technical/domain expertise
        3. overall_score: 0-100 overall performance score
        4. summary: Brief summary of the candidate's performance
        5. strengths: List of notable strengths
        6. weaknesses: List of areas for improvement
        
        Return ONLY valid JSON.
        """
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean markdown
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        import json
        evaluation_data = json.loads(result_text)
        
        evaluation = ScreeningEvaluation(**evaluation_data)
        
        return evaluation
    
    except Exception as e:
        logger.error(f"Error evaluating responses: {str(e)}")
        raise

async def conduct_screening(application_id: str, mode: str = "text") -> ScreeningResponse:
    """
    Conduct a conversational AI screening.
    
    For MVP, simulates a screening with pre-defined Q&A.
    In production, this would be interactive.
    """
    try:
        from app.core.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        # Fetch application and candidate data from database
        app_response = supabase.table("applications").select(
            "*, candidates(*), jobs(*)"
        ).eq("id", application_id).single().execute()
        
        if not app_response.data:
            raise ValueError(f"Application {application_id} not found")
        
        application = app_response.data
        candidate = application.get('candidates', {})
        job = application.get('jobs', {})
        
        candidate_profile = {
            "name": candidate.get('name', 'Unknown'),
            "role": job.get('title', 'Software Engineer'),
            "parsed_data": candidate.get('parsed_data', {})
        }
        job_role = job.get('title', 'Software Engineer')
        
        # Generate questions
        questions = await generate_screening_questions(job_role, candidate_profile)
        
        # Simulate responses (in production, these would be collected interactively)
        simulated_responses = [
            "I have extensive experience with Python, FastAPI, and cloud technologies. I've built scalable microservices that handle millions of requests.",
            "In my last project, we faced performance issues with our API. I profiled the code, identified bottlenecks, and optimized database queries, reducing response time by 60%.",
            "I aim to grow into a technical leadership role, mentoring junior developers and architecting large-scale systems."
        ]
        
        # Build transcript
        transcript = "\n\n".join([
            f"Interviewer: {q}\nCandidate: {a}" 
            for q, a in zip(questions, simulated_responses)
        ])
        
        # Evaluate responses
        evaluation = await evaluate_screening_responses(questions, simulated_responses)
        
        # Generate screening ID
        import uuid
        screening_id = str(uuid.uuid4())
        
        logger.info(f"Completed screening for application {application_id}")
        
        return ScreeningResponse(
            screening_id=screening_id,
            transcript=transcript,
            evaluation=evaluation
        )
    
    except Exception as e:
        logger.error(f"Error conducting screening: {str(e)}")
        raise

