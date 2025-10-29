import httpx
from bs4 import BeautifulSoup
import re
from typing import Dict, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)

async def scrape_github(github_url: str) -> Optional[Dict]:
    """
    Scrape GitHub profile for repositories and activity.
    
    Extracts:
    - Profile username
    - Number of repositories
    - Contributions count
    - Followers count
    - Bio
    - Location
    - Company
    """
    try:
        # Extract username from URL
        username_match = re.search(r'github\.com/([^/\s]+)', github_url)
        if not username_match:
            logger.warning(f"Invalid GitHub URL: {github_url}")
            return None
        
        username = username_match.group(1)
        
        async with httpx.AsyncClient() as client:
            # Scrape profile page
            response = await client.get(
                github_url, 
                follow_redirects=True, 
                timeout=10.0,
                headers={'User-Agent': 'Mozilla/5.0 (compatible; HRMS-Bot/1.0)'}
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to scrape GitHub: {github_url} (status: {response.status_code})")
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract profile information
            bio_elem = soup.find('div', class_='p-note')
            bio = bio_elem.get_text(strip=True) if bio_elem else ""
            
            location_elem = soup.find('span', class_='p-label')
            location = location_elem.get_text(strip=True) if location_elem else ""
            
            # Extract stats
            repos_elem = soup.find('span', class_='Counter')
            repo_count = 0
            if repos_elem:
                repo_text = repos_elem.get_text(strip=True)
                repo_count = int(repo_text.replace(',', '')) if repo_text.isdigit() else 0
            
            # Get followers count
            followers_elem = soup.find('a', href=re.compile(f'/{username}\\?tab=followers'))
            followers = 0
            if followers_elem:
                followers_text = followers_elem.get_text(strip=True).split()[0]
                followers = int(followers_text.replace(',', '')) if re.match(r'^\d+', followers_text) else 0
            
            # Try to get contributions from contribution graph
            contributions_elem = soup.find('h2', string=re.compile('contributions'))
            contributions = 0
            if contributions_elem:
                # The contributions text should be nearby
                contrib_parent = contributions_elem.find_parent()
                if contrib_parent:
                    contrib_text = contrib_parent.get_text(strip=True)
                    contrib_match = re.search(r'(\d+)', contrib_text)
                    if contrib_match:
                        contributions = int(contrib_match.group(1))
            
            data = {
                "url": github_url,
                "username": username,
                "scraped": True,
                "bio": bio,
                "location": location,
                "repositories": repo_count,
                "contributions": contributions,
                "followers": followers,
                "company": "",  # Would extract from profile
            }
            
            logger.info(f"Successfully scraped GitHub profile: {username}")
            return data
    
    except Exception as e:
        logger.error(f"Error scraping GitHub {github_url}: {str(e)}")
        return None

async def scrape_linkedin(linkedin_url: str) -> Optional[Dict]:
    """Scrape LinkedIn profile (note: LinkedIn has scraping restrictions)"""
    try:
        # Note: LinkedIn actively prevents scraping
        # In production, use LinkedIn API or manual data entry
        logger.warning("LinkedIn scraping is restricted. Using placeholder data.")
        
        data = {
            "url": linkedin_url,
            "scraped": False,
            "note": "LinkedIn API integration required for real data"
        }
        
        return data
    
    except Exception as e:
        logger.error(f"Error scraping LinkedIn {linkedin_url}: {str(e)}")
        return None

async def scrape_portfolio(portfolio_url: str) -> Optional[Dict]:
    """
    Scrape portfolio website for projects and information.
    
    Extracts:
    - Page title
    - Meta description
    - Open Graph tags
    - Social media links
    - Technologies used
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                portfolio_url, 
                follow_redirects=True, 
                timeout=10.0,
                headers={'User-Agent': 'Mozilla/5.0 (compatible; HRMS-Bot/1.0)'}
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to scrape portfolio: {portfolio_url} (status: {response.status_code})")
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title
            title = soup.title.string if soup.title else ""
            
            # Extract meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '') if meta_desc else ""
            
            # Extract Open Graph data
            og_title = soup.find('meta', property='og:title')
            og_description = soup.find('meta', property='og:description')
            og_image = soup.find('meta', property='og:image')
            
            # Extract social media links
            social_links = {}
            for link in soup.find_all('a', href=True):
                href = link['href']
                if 'linkedin.com' in href:
                    social_links['linkedin'] = href
                elif 'github.com' in href:
                    social_links['github'] = href
                elif 'twitter.com' in href or 'x.com' in href:
                    social_links['twitter'] = href
            
            # Try to detect technologies (basic keywords)
            technologies = []
            body_text = soup.get_text().lower()
            tech_keywords = ['react', 'vue', 'angular', 'node', 'python', 'javascript', 'typescript', 
                           'php', 'java', 'ruby', 'go', 'rust', 'django', 'flask', 'express']
            for tech in tech_keywords:
                if tech in body_text:
                    technologies.append(tech.capitalize())
            
            data = {
                "url": portfolio_url,
                "scraped": True,
                "title": og_title.get('content', title) if og_title else title,
                "description": og_description.get('content', description) if og_description else description,
                "image": og_image.get('content', '') if og_image else "",
                "social_links": social_links,
                "technologies": list(set(technologies))[:5],  # Limit to 5 unique technologies
            }
            
            logger.info(f"Successfully scraped portfolio: {portfolio_url}")
            return data
    
    except Exception as e:
        logger.error(f"Error scraping portfolio {portfolio_url}: {str(e)}")
        return None

async def scrape_links(links: Dict[str, str]) -> Dict[str, Optional[Dict]]:
    """
    Scrape all provided links and return enriched data.
    
    This function automatically scrapes GitHub, LinkedIn, and portfolio links
    found in a candidate's resume and enriches their profile with:
    - GitHub: Repos, contributions, followers, bio
    - LinkedIn: Profile information (limited due to restrictions)
    - Portfolio: Technologies, projects, social links
    
    Args:
        links: Dictionary with keys like 'github', 'linkedin', 'portfolio'
    
    Returns:
        Dictionary with scraped data for each link type
    """
    enriched_data = {}
    
    # Scrape GitHub profile
    if "github" in links and links["github"]:
        logger.info(f"Scraping GitHub profile: {links['github']}")
        github_data = await scrape_github(links["github"])
        enriched_data["github"] = github_data
    else:
        logger.info("No GitHub link provided")
    
    # Scrape LinkedIn profile (note: LinkedIn has restrictions)
    if "linkedin" in links and links["linkedin"]:
        logger.info(f"Scraping LinkedIn profile: {links['linkedin']}")
        linkedin_data = await scrape_linkedin(links["linkedin"])
        enriched_data["linkedin"] = linkedin_data
    else:
        logger.info("No LinkedIn link provided")
    
    # Scrape portfolio website
    if "portfolio" in links and links["portfolio"]:
        logger.info(f"Scraping portfolio: {links['portfolio']}")
        portfolio_data = await scrape_portfolio(links["portfolio"])
        enriched_data["portfolio"] = portfolio_data
    else:
        logger.info("No portfolio link provided")
    
    # Log summary
    scraped_count = sum(1 for data in enriched_data.values() if data and data.get('scraped', False))
    logger.info(f"Successfully scraped {scraped_count}/{len(links)} links")
    
    return enriched_data


async def enrich_candidate_profile(candidate_data: Dict) -> Dict:
    """
    Automatically enrich a candidate profile with digital footprint data.
    
    This function:
    1. Extracts links from candidate's parsed data
    2. Scrapes each link to get additional information
    3. Stores the enriched data in the database
    4. Returns the complete enriched profile
    
    Args:
        candidate_data: Candidate data from database
        
    Returns:
        Enriched candidate profile with digital footprint
    """
    try:
        from app.core.supabase_client import get_supabase_client
        
        supabase = get_supabase_client()
        
        # Get parsed data with links
        parsed_data = candidate_data.get('parsed_data', {})
        links = parsed_data.get('links', {})
        
        if not links:
            logger.info("No links found in candidate profile")
            return candidate_data
        
        # Scrape all links
        enriched_data = await scrape_links(links)
        
        # Store in database
        candidate_id = candidate_data['id']
        footprint_data = {
            "candidate_id": candidate_id,
            "github_data": enriched_data.get("github"),
            "linkedin_data": enriched_data.get("linkedin"),
            "portfolio_data": enriched_data.get("portfolio"),
        }
        
        # Upsert digital footprint
        supabase.table("digital_footprints").upsert(
            footprint_data, on_conflict="candidate_id"
        ).execute()
        
        logger.info(f"Enriched candidate profile {candidate_id} with digital footprint data")
        
        # Return enriched profile
        return {
            **candidate_data,
            "digital_footprint": footprint_data
        }
    
    except Exception as e:
        logger.error(f"Error enriching candidate profile: {str(e)}")
        return candidate_data

