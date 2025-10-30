import io
import re
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

def _sanitize_url(url: str) -> str | None:
    """Best-effort URL sanitizer: strip odd unicode, ensure scheme, and validate hostname.
    Returns a cleaned URL or None if invalid.
    """
    try:
        # Remove control/non-printable and unusual unicode characters
        cleaned = ''.join(ch for ch in url if 31 < ord(ch) < 127)
        # Ensure scheme
        if not cleaned.startswith('http'):
            cleaned = f"https://{cleaned}"
        # Basic hostname validation
        from urllib.parse import urlparse
        parsed = urlparse(cleaned)
        if not parsed.netloc or any(c in parsed.netloc for c in [' ', '\\']):
            return None
        return cleaned.rstrip('/')
    except Exception:
        return None

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

def extract_hyperlinks_from_pdf(content: bytes) -> Dict[str, str]:
    """Extract hyperlinks from PDF annotations"""
    links = {}
    try:
        pdf_file = io.BytesIO(content)
        pdf_reader = PdfReader(pdf_file)

        all_urls = []
        for page in pdf_reader.pages:
            # Extract hyperlinks from annotations
            if "/Annots" in page:
                annotations = page["/Annots"]
                try:
                    for annotation in annotations:
                        obj = annotation.get_object()
                        if obj.get("/Subtype") == "/Link":
                            if "/A" in obj:
                                action = obj["/A"]
                                if "/URI" in action:
                                    uri = str(action["/URI"])
                                    # Skip mailto links
                                    if not uri.startswith('mailto:'):
                                        all_urls.append(uri)
                except Exception as annot_error:
                    logger.warning(f"Error extracting annotations: {str(annot_error)}")

        logger.info(f"Extracted {len(all_urls)} hyperlinks from PDF: {all_urls}")

        # Categorize URLs
        for url in all_urls:
            url_lower = url.lower()
            if 'github.com' in url_lower and 'github' not in links:
                links['github'] = url
            elif 'linkedin.com' in url_lower and 'linkedin' not in links:
                links['linkedin'] = url
            elif 'portfolio' not in links and 'github.com' not in url_lower and 'linkedin.com' not in url_lower:
                # Assume first non-github/linkedin link is portfolio
                # Check if it looks like a personal site (vercel, netlify, personal domain, etc.)
                if any(domain in url_lower for domain in ['vercel', 'netlify', 'github.io', 'herokuapp', 'portfolio']):
                    links['portfolio'] = url

        logger.info(f"Categorized PDF links: {links}")
        return links

    except Exception as e:
        logger.error(f"Error extracting hyperlinks from PDF: {str(e)}")
        return {}

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

def extract_links_with_regex(text: str) -> Dict[str, str]:
    """
    Extract professional links from resume text using regex patterns.
    Looks for GitHub, LinkedIn, and Portfolio URLs with contextual keywords.
    """
    links = {}

    # Normalize text for better matching
    text_lower = text.lower()

    # GitHub patterns - look for github.com URLs
    github_patterns = [
        r'(?:https?://)?(?:www\.)?github\.com/[\w-]+/?',  # Standard GitHub URL
        r'github\.com/[\w-]+',  # Without protocol
    ]
    for pattern in github_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            url = match.group()
            # Ensure it has https://
            if not url.startswith('http'):
                url = f"https://{url}"
            # Remove trailing slash
            links['github'] = url.rstrip('/')
            logger.info(f"Extracted GitHub URL: {links['github']}")
            break

    # LinkedIn patterns - look for linkedin.com URLs
    linkedin_patterns = [
        r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+/?',  # Standard LinkedIn profile
        r'linkedin\.com/in/[\w-]+',  # Without protocol
    ]
    for pattern in linkedin_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            url = match.group()
            if not url.startswith('http'):
                url = f"https://{url}"
            links['linkedin'] = url.rstrip('/')
            logger.info(f"Extracted LinkedIn URL: {links['linkedin']}")
            break

    # Portfolio patterns - look for personal websites
    # Look for URLs near keywords like "portfolio", "website", "personal site"
    portfolio_keywords = ['portfolio', 'website', 'personal site', 'web site', 'blog']

    # Find all URLs in text
    url_pattern = r'(?:https?://)?(?:www\.)?[\w.-]+\.(?:com|net|org|io|dev|me|co|in|app|site)(?:/[\w/-]*)?'
    all_urls = re.findall(url_pattern, text, re.IGNORECASE)

    for url in all_urls:
        # Skip if already identified as GitHub or LinkedIn
        if 'github.com' in url.lower() or 'linkedin.com' in url.lower():
            continue

        # Find the context around this URL
        url_index = text_lower.find(url.lower())
        if url_index != -1:
            # Check 100 characters before the URL for portfolio keywords
            context_start = max(0, url_index - 100)
            context = text_lower[context_start:url_index]

            if any(keyword in context for keyword in portfolio_keywords):
                if not url.startswith('http'):
                    url = f"https://{url}"
                links['portfolio'] = url.rstrip('/')
                logger.info(f"Extracted Portfolio URL: {links['portfolio']}")
                break

    # If no portfolio found but there's a URL that's not github/linkedin, consider it
    if 'portfolio' not in links and all_urls:
        for url in all_urls:
            if 'github.com' not in url.lower() and 'linkedin.com' not in url.lower():
                if not url.startswith('http'):
                    url = f"https://{url}"
                links['portfolio'] = url.rstrip('/')
                logger.info(f"Extracted potential Portfolio URL: {links['portfolio']}")
                break

    return links

async def parse_resume_with_ai(text: str, pdf_links: Dict[str, str] = None) -> ParsedData:
    """
    Use Gemini AI to parse resume text and extract structured data.

    Extracts: name, email, phone, skills, education, experience, and links
    Args:
        text: Resume text content
        pdf_links: Optional dictionary of links extracted from PDF annotations
    """
    try:
        if pdf_links is None:
            pdf_links = {}
        # Create AI model instance
        model = genai.GenerativeModel('gemini-2.0-flash')
        
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

        IMPORTANT for links extraction:
        - Look for URLs near keywords like "GitHub Profile", "LinkedIn Profile", "Portfolio Website"
        - Extract the FULL URL including https://
        - For GitHub: Look for github.com/username patterns
        - For LinkedIn: Look for linkedin.com/in/username patterns
        - For Portfolio: Look for personal website URLs near "portfolio" or "website" keywords
        - If a label exists (e.g., "GitHub Profile") but no URL follows, mark as null
        - Only include valid, complete URLs

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

        # Extract links using regex as a fallback/enhancement
        regex_links = extract_links_with_regex(text)
        logger.info(f"Regex extracted links: {regex_links}")
        logger.info(f"PDF annotation links: {pdf_links}")

        # Merge links with priority: PDF annotations > AI > Regex
        # Start with AI-extracted links
        if "links" in parsed_json and parsed_json["links"]:
            # Clean up AI-extracted links
            ai_links = {
                k: v for k, v in parsed_json["links"].items()
                if v is not None and v != "" and isinstance(v, str)
            }
            logger.info(f"AI extracted links: {ai_links}")
        else:
            ai_links = {}

        # Merge with regex links (fills in missing values)
        for key in ['github', 'linkedin', 'portfolio']:
            if key not in ai_links or not ai_links[key]:
                if key in regex_links:
                    ai_links[key] = regex_links[key]
                    logger.info(f"Using regex-extracted {key} URL: {regex_links[key]}")

        # Override with PDF annotation links (highest priority)
        for key in ['github', 'linkedin', 'portfolio']:
            if key in pdf_links and pdf_links[key]:
                ai_links[key] = pdf_links[key]
                logger.info(f"Using PDF annotation {key} URL: {pdf_links[key]}")

        # Sanitize merged links and drop invalid ones
        sanitized: Dict[str, str] = {}
        for k, v in ai_links.items():
            cleaned = _sanitize_url(v)
            if cleaned:
                sanitized[k] = cleaned
        parsed_json["links"] = sanitized
        logger.info(f"Final merged links: {parsed_json.get('links', {})}")

        # Ensure required fields have defaults
        if "skills" not in parsed_json or parsed_json["skills"] is None:
            parsed_json["skills"] = []
        if "education" not in parsed_json or parsed_json["education"] is None:
            parsed_json["education"] = []
        if "experience" not in parsed_json or parsed_json["experience"] is None:
            parsed_json["experience"] = []

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

        # Extract hyperlinks from PDF annotations (if PDF)
        pdf_links = {}
        if file_ext == 'pdf':
            text = await extract_text_from_pdf(content)
            pdf_links = extract_hyperlinks_from_pdf(content)
            logger.info(f"Extracted PDF hyperlinks: {pdf_links}")
        elif file_ext in ['doc', 'docx']:
            text = await extract_text_from_docx(content)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Parse with AI, passing PDF links for merging
        parsed_data = await parse_resume_with_ai(text, pdf_links)
        
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

