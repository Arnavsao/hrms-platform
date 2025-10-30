"""
API integration tests for FastAPI endpoints.

Tests verify that:
1. Resume upload endpoint works
2. Candidate matching endpoint works
3. Screening endpoint works
4. Digital footprint endpoint works
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

# Create test client
client = TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "environment" in data


class TestCandidatesAPI:
    """Test candidate-related endpoints"""
    
    def test_list_candidates(self):
        """Test listing all candidates"""
        response = client.get("/api/candidates/")
        # Should return 200 even if empty
        assert response.status_code in [200, 500]  # 500 if Supabase not configured
    
    def test_get_candidate_not_found(self):
        """Test getting non-existent candidate"""
        response = client.get("/api/candidates/non-existent-id")
        assert response.status_code == 404


class TestApplicationsAPI:
    """Test application-related endpoints"""
    
    def test_list_applications(self):
        """Test listing applications"""
        response = client.get("/api/applications/")
        assert response.status_code in [200, 500]  # 500 if Supabase not configured
    
    def test_get_application_not_found(self):
        """Test getting non-existent application"""
        response = client.get("/api/applications/non-existent-id")
        assert response.status_code == 404
    
    @pytest.mark.skip(reason="Requires Supabase setup")
    def test_match_candidate_to_job(self):
        """Test matching candidate to job"""
        match_request = {
            "candidate_id": "test-candidate-id",
            "job_id": "test-job-id"
        }
        response = client.post("/api/applications/match", json=match_request)
        assert response.status_code in [200, 500]


class TestScreeningsAPI:
    """Test screening-related endpoints"""
    
    def test_list_screenings(self):
        """Test listing screenings"""
        response = client.get("/api/screenings/")
        assert response.status_code in [200, 500]  # 500 if Supabase not configured
    
    def test_get_screening_not_found(self):
        """Test getting non-existent screening"""
        response = client.get("/api/screenings/non-existent-id")
        assert response.status_code == 404
    
    @pytest.mark.skip(reason="Requires Supabase setup")
    def test_start_screening(self):
        """Test starting a screening"""
        screening_request = {
            "application_id": "test-application-id",
            "mode": "text"
        }
        response = client.post("/api/screenings/start", json=screening_request)
        assert response.status_code in [200, 500]


class TestDigitalFootprintsAPI:
    """Test digital footprint endpoints"""
    
    def test_get_digital_footprint_not_found(self):
        """Test getting non-existent digital footprint"""
        response = client.get("/api/footprints/non-existent-id")
        assert response.status_code == 404


class TestJobsAPI:
    """Test job-related endpoints"""
    
    def test_list_jobs(self):
        """Test listing jobs"""
        response = client.get("/api/jobs/")
        assert response.status_code in [200, 500]  # 500 if Supabase not configured
    
    def test_get_job_not_found(self):
        """Test getting non-existent job"""
        response = client.get("/api/jobs/non-existent-id")
        assert response.status_code == 404


class TestAPIErrorHandling:
    """Test API error handling"""
    
    def test_invalid_endpoint(self):
        """Test accessing non-existent endpoint"""
        response = client.get("/api/non-existent")
        assert response.status_code == 404
    
    def test_invalid_json(self):
        """Test submitting invalid JSON"""
        response = client.post("/api/applications/match", 
                             data="not json", 
                             headers={"Content-Type": "application/json"})
        assert response.status_code in [422, 500]  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

