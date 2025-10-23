import io
from typing import Dict, Any
from PyPDF2 import PdfReader
from docx import Document
from supabase import Client

from app.models.candidate import ResumeUploadResponse, ParsedData
from app.services.link_scraper import scrape_links
from app.core.config import settings
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
import google.generativeai as genai

logger = get_logger(__name__)

# Configure Gemini AI
genai.configure(api_key=settings.GEMINI_API_KEY)

async def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(content)
        pdf_reader = PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise

async def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc_file = io.BytesIO(content)
        doc = Document(doc_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        logger.error(f"Error extracting DOCX text: {str(e)}")
        raise

async def parse_resume_with_ai(text: str) -> ParsedData:
    """
    Use Gemini AI to parse resume text and extract structured data.
    
    Extracts: name, email, phone, skills, education, experience, and links
    """
    try:
        # Create AI model instance
        model = genai.GenerativeModel('gemini-pro')
        
        # Craft prompt for structured extraction
        prompt = f"""
        Parse the following resume and extract structured information in JSON format.
        
        Extract the following fields:
        - name: Full name of the candidate
        - email: Email address
        - phone: Phone number (if available)
        - skills: List of technical and professional skills
        - education: List of education entries with degree, institution, year
        - experience: List of work experience with company, role, duration, description
        - links: Object with github, linkedin, portfolio URLs (if found)
        
        Resume text:
        {text}
        
        Return ONLY valid JSON without any markdown formatting or additional text.
        """
        
        # Generate response
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        # Parse JSON response
        import json
        parsed_json = json.loads(result_text)
        
        # Create ParsedData object
        parsed_data = ParsedData(**parsed_json)
        
        logger.info(f"Successfully parsed resume for {parsed_data.name}")
        return parsed_data
    
    except Exception as e:
        logger.error(f"Error parsing resume with AI: {str(e)}")
        raise

async def store_candidate_data(parsed_data: ParsedData, resume_url: str, supabase: Client) -> str:
    """
    Stores candidate and digital footprint data in the database.
    Creates a new candidate or updates an existing one based on email.
    """
    # Check if candidate exists
    existing_candidate = supabase.table("candidates").select("id").eq("email", parsed_data.email).execute()
    
    candidate_data = {
        "name": parsed_data.name,
        "email": parsed_data.email,
        "resume_url": resume_url,
        "parsed_data": parsed_data.dict()
    }

    if existing_candidate.data:
        # Update existing candidate
        candidate_id = existing_candidate.data[0]['id']
        supabase.table("candidates").update(candidate_data).eq("id", candidate_id).execute()
        logger.info(f"Updated existing candidate: {candidate_id}")
    else:
        # Create new candidate
        new_candidate = supabase.table("candidates").insert(candidate_data).execute()
        candidate_id = new_candidate.data[0]['id']
        logger.info(f"Created new candidate: {candidate_id}")
        
    # Scrape links and store digital footprint
    if parsed_data.links:
        enriched_data = await scrape_links(parsed_data.links)
        footprint_data = {
            "candidate_id": candidate_id,
            "github_data": enriched_data.get("github"),
            "linkedin_data": enriched_data.get("linkedin"),
            "portfolio_data": enriched_data.get("portfolio"),
        }
        # Upsert to handle existing footprints
        supabase.table("digital_footprints").upsert(footprint_data, on_conflict="candidate_id").execute()
        logger.info(f"Stored digital footprint for candidate: {candidate_id}")
        
    return candidate_id

async def parse_resume(content: bytes, filename: str, resume_url: str) -> ResumeUploadResponse:
    """
    Main function to parse resume.
    
    Steps:
    1. Extract text from file
    2. Use AI to parse structured data
    3. Scrape links found in resume
    4. Store candidate and footprint data in database
    """
    try:
        # Get supabase client
        supabase = get_supabase_client()

        # Extract text based on file type
        file_ext = filename.lower().split('.')[-1]
        
        if file_ext == 'pdf':
            text = await extract_text_from_pdf(content)
        elif file_ext in ['doc', 'docx']:
            text = await extract_text_from_docx(content)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        # Parse with AI
        parsed_data = await parse_resume_with_ai(text)
        
        # Store candidate and enriched data in Supabase
        candidate_id = await store_candidate_data(parsed_data, resume_url, supabase)
        
        return ResumeUploadResponse(
            candidate_id=candidate_id,
            message="Resume parsed successfully",
            parsed_data=parsed_data
        )
    
    except Exception as e:
        logger.error(f"Error in parse_resume: {str(e)}")
        raise

