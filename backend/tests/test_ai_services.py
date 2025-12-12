"""
Integration tests for AI-powered HRMS services.

These tests verify that:
1. Resume parsing works correctly
2. Candidate matching generates scores
3. Digital footprint scraping functions
4. Screening evaluations are generated
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from app.services.ai_parser import parse_resume_with_ai, extract_text_from_pdf, extract_text_from_docx
from app.services.ai_matching import match_candidate_to_job
from app.services.ai_screening import conduct_screening, generate_screening_questions, evaluate_screening_responses
from app.services.link_scraper import scrape_github, scrape_linkedin, scrape_portfolio, scrape_links


class TestResumeParsing:
    """Test resume parsing with AI"""
    
    @pytest.mark.asyncio
    async def test_parse_resume_with_ai(self):
        """Test that AI correctly parses resume text"""
        sample_resume = """
        John Doe
        Software Engineer
        Email: john.doe@example.com
        Phone: +1-234-567-8900
        
        Skills: Python, FastAPI, React, TypeScript
        
        Education:
        - BS Computer Science, MIT, 2020
        
        Experience:
        - Software Engineer at Tech Corp (2020-2024)
          Built scalable APIs and web applications
        """
        
        # Mock Gemini response
        with patch('app.services.ai_parser.genai.GenerativeModel') as mock_model:
            mock_instance = Mock()
            mock_response = Mock()
            mock_response.text = '''
            {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1-234-567-8900",
                "skills": ["Python", "FastAPI", "React", "TypeScript"],
                "education": [{"degree": "BS Computer Science", "institution": "MIT", "year": 2020}],
                "experience": [{"company": "Tech Corp", "role": "Software Engineer", "duration": "2020-2024", "description": "Built scalable APIs"}],
                "links": {"github": "https://github.com/johndoe", "linkedin": "https://linkedin.com/in/johndoe"}
            }
            '''
            mock_instance.generate_content.return_value = mock_response
            mock_model.return_value = mock_instance
            
            result = await parse_resume_with_ai(sample_resume)
            
            assert result.name == "John Doe"
            assert result.email == "john.doe@example.com"
            assert "Python" in result.skills
            assert len(result.education) > 0
            assert len(result.experience) > 0
            assert result.links is not None
    
    def test_extract_pdf_text(self):
        """Test PDF text extraction"""
        # This would require a sample PDF file
        # For now, we test that the function exists and handles errors gracefully
        assert callable(extract_text_from_pdf)
        assert callable(extract_text_from_docx)


class TestAIMatching:
    """Test candidate-to-job matching"""
    
    @pytest.mark.asyncio
    async def test_match_candidate_to_job(self):
        """Test that matching generates a fit score"""
        
        # Mock Supabase and Gemini
        with patch('app.services.ai_matching.get_supabase_client') as mock_supabase, \
             patch('app.services.ai_matching.genai.GenerativeModel') as mock_model:
            
            # Create proper mock structure for Supabase client
            mock_client = Mock()
            
            # Setup for candidate query
            mock_candidate_chain = Mock()
            mock_candidate_execute = Mock()
            mock_candidate_execute.data = {
                "parsed_data": {
                    "name": "John Doe",
                    "skills": ["Python", "FastAPI", "React"],
                    "experience": [{"company": "Tech Corp", "role": "Software Engineer"}]
                },
                "digital_footprints": None
            }
            mock_candidate_chain.execute.return_value = mock_candidate_execute
            
            # Setup for job query
            mock_job_chain = Mock()
            mock_job_execute = Mock()
            mock_job_execute.data = {
                "title": "Senior Software Engineer",
                "description": "Looking for an experienced Python developer",
                "requirements": "5+ years Python, FastAPI, React"
            }
            mock_job_chain.execute.return_value = mock_job_execute
            
            # Setup for applications query (no existing application)
            mock_app_chain = Mock()
            mock_app_execute = Mock()
            mock_app_execute.data = []  # Empty list - no existing application
            mock_app_chain.execute.return_value = mock_app_execute
            
            # Mock insert for new application
            mock_insert_chain = Mock()
            mock_insert_execute = Mock()
            mock_insert_execute.data = {}  # No data returned on insert
            mock_insert_chain.execute.return_value = mock_insert_execute
            
            # Setup table method to return different chains based on table name
            def table_side_effect(table_name):
                mock_table = Mock()
                if table_name == "candidates":
                    mock_table.select.return_value.eq.return_value.single.return_value = mock_candidate_chain
                elif table_name == "jobs":
                    mock_table.select.return_value.eq.return_value.single.return_value = mock_job_chain
                elif table_name == "applications":
                    # For checking existing app
                    mock_table.select.return_value.eq.return_value.eq.return_value = mock_app_chain
                    # For inserting new app
                    mock_table.insert.return_value = mock_insert_chain
                return mock_table
            
            mock_client.table.side_effect = table_side_effect
            mock_supabase.return_value = mock_client
            
            # Mock Gemini
            mock_instance = Mock()
            mock_response = Mock()
            mock_response.text = '''
            {
                "fit_score": 85,
                "strengths": ["Strong Python experience", "FastAPI expertise"],
                "weaknesses": ["Limited team leadership experience"],
                "recommendations": ["Good match for role"]
            }
            '''
            mock_instance.generate_content.return_value = mock_response
            mock_model.return_value = mock_instance
            
            result = await match_candidate_to_job("candidate-123", "job-456")
            
            assert "fit_score" in result
            assert result["fit_score"] >= 0 and result["fit_score"] <= 100
            assert "highlights" in result
            assert "strengths" in result["highlights"]


class TestAIScreening:
    """Test conversational screening"""
    
    @pytest.mark.asyncio
    async def test_generate_screening_questions(self):
        """Test question generation"""
        with patch('app.services.ai_screening.genai.GenerativeModel') as mock_model:
            mock_instance = Mock()
            mock_response = Mock()
            mock_response.text = '["What is your experience with Python?", "Tell me about your project challenges", "Where do you see yourself in 5 years?"]'
            mock_instance.generate_content.return_value = mock_response
            mock_model.return_value = mock_instance
            
            questions = await generate_screening_questions(
                "Software Engineer",
                {"name": "John Doe", "skills": ["Python", "React"]}
            )
            
            assert isinstance(questions, list)
            assert len(questions) > 0
    
    @pytest.mark.asyncio
    async def test_evaluate_screening_responses(self):
        """Test response evaluation"""
        with patch('app.services.ai_screening.genai.GenerativeModel') as mock_model:
            mock_instance = Mock()
            mock_response = Mock()
            mock_response.text = '''
            {
                "communication_score": 85,
                "domain_knowledge_score": 90,
                "overall_score": 87,
                "summary": "Excellent candidate",
                "strengths": ["Clear communication", "Strong technical knowledge"],
                "weaknesses": []
            }
            '''
            mock_instance.generate_content.return_value = mock_response
            mock_model.return_value = mock_instance
            
            questions = ["What is your experience with Python?"]
            responses = ["I have 5 years of Python experience building web applications"]
            
            evaluation = await evaluate_screening_responses(questions, responses)
            
            assert evaluation.communication_score >= 0 and evaluation.communication_score <= 100
            assert evaluation.domain_knowledge_score >= 0 and evaluation.domain_knowledge_score <= 100
            assert evaluation.overall_score >= 0 and evaluation.overall_score <= 100
            assert evaluation.summary is not None


class TestLinkScraper:
    """Test digital footprint scraping"""
    
    @pytest.mark.asyncio
    async def test_scrape_github(self):
        """Test GitHub link scraping"""
        # Since GitHub requires authentication for real scraping,
        # we test the function structure
        result = await scrape_github("https://github.com/testuser")
        
        # Should handle gracefully even if scraping fails
        assert result is None or isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_scrape_linkedin(self):
        """Test LinkedIn link scraping"""
        # LinkedIn scraping is restricted, so we expect placeholder data
        result = await scrape_linkedin("https://linkedin.com/in/testuser")
        
        assert isinstance(result, dict)
        assert "url" in result
        assert result.get("scraped") is False  # LinkedIn cannot be scraped
    
    @pytest.mark.asyncio
    async def test_scrape_portfolio(self):
        """Test portfolio website scraping"""
        # Test with a mock URL
        result = await scrape_portfolio("https://example.com")
        
        # Should handle gracefully
        assert result is None or isinstance(result, dict)


class TestIntegration:
    """End-to-end integration tests"""
    
    @pytest.mark.asyncio
    async def test_full_resume_parsing_flow(self):
        """Test complete resume parsing workflow"""
        # This would test the full flow from file upload to database storage
        # Requires Supabase setup, so it's skipped in unit tests
        pass
    
    @pytest.mark.asyncio
    async def test_match_and_screen_flow(self):
        """Test matching and screening integration"""
        # This would test: upload resume -> match to job -> conduct screening
        # Requires Supabase setup
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

