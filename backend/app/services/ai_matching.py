import asyncio
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

        # Fetch candidate and job in parallel
        import concurrent.futures
        loop = asyncio.get_event_loop()
        candidate_fut = loop.run_in_executor(
            None,
            lambda: supabase.table("candidates")
                .select("parsed_data")
                .eq("id", candidate_id)
                .single()
                .execute()
        )
        job_fut = loop.run_in_executor(
            None,
            lambda: supabase.table("jobs")
                .select("title, requirements")
                .eq("id", job_id)
                .single()
                .execute()
        )
        candidate_response, job_response = await asyncio.gather(candidate_fut, job_fut)

        if not candidate_response.data:
            raise ValueError(f"Candidate {candidate_id} not found.")
        if not job_response.data:
            raise ValueError(f"Job {job_id} not found.")

        # Extract only the fields needed — skip raw description blobs
        parsed = candidate_response.data.get("parsed_data") or {}
        candidate_summary = {
            "skills": parsed.get("skills", []),
            "experience": [
                {"role": e.get("role"), "company": e.get("company"), "duration": e.get("duration")}
                for e in (parsed.get("experience") or [])[:5]
            ],
            "education": parsed.get("education", []),
        }

        job = job_response.data
        requirements = str(job.get("requirements") or "")[:1500]

        prompt = f"""Score this candidate against the job. Return JSON only.

Job: {job.get("title")}
Requirements: {requirements}

Candidate skills: {candidate_summary["skills"]}
Experience: {candidate_summary["experience"]}
Education: {candidate_summary["education"]}

Return exactly:
{{"fit_score": <0-100>, "strengths": [<up to 3 strings>], "weaknesses": [<up to 3 strings>], "recommendations": [<up to 2 strings>]}}"""

        analysis = await generate_json_response(
            prompt=prompt,
            model=settings.AI_MODEL,
            temperature=0.2,
            max_tokens=400,
            system_message="You are an HR recruiter. Return only valid JSON, no explanation.",
        )

        logger.info(f"Matched candidate {candidate_id} to job {job_id} with score {analysis['fit_score']}")

        return {
            "fit_score": analysis["fit_score"],
            "highlights": {
                "strengths": analysis.get("strengths", []),
                "weaknesses": analysis.get("weaknesses", []),
                "recommendations": analysis.get("recommendations", []),
            },
        }

    except Exception as e:
        logger.error(f"Error matching candidate to job: {str(e)}")
        raise

