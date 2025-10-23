import axios from 'axios';

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for API requests and responses
export interface ParseResumeRequest {
  file: File;
}

export interface ParseResumeResponse {
  candidate_id: string;
  parsed_data: {
    name: string;
    email: string;
    skills: string[];
    education: any[];
    experience: any[];
    links: {
      github?: string;
      linkedin?: string;
      portfolio?: string;
    };
  };
}

export interface MatchCandidateRequest {
  candidate_id: string;
  job_id: string;
}

export interface MatchCandidateResponse {
  fit_score: number;
  highlights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export interface ScreeningRequest {
  application_id: string;
  mode: 'text' | 'voice';
}

export interface ScreeningResponse {
  screening_id: string;
  transcript: string;
  evaluation: {
    communication_score: number;
    domain_knowledge_score: number;
    overall_score: number;
    summary: string;
  };
}

// API methods for interacting with the FastAPI backend
export const api = {
  // Parse resume and extract structured data
  parseResume: async (file: File): Promise<ParseResumeResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/candidates/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Match candidate against job description
  matchCandidate: async (data: MatchCandidateRequest): Promise<MatchCandidateResponse> => {
    const response = await apiClient.post('/api/applications/match', data);
    return response.data;
  },

  // Start conversational screening
  startScreening: async (data: ScreeningRequest): Promise<ScreeningResponse> => {
    const response = await apiClient.post('/api/screenings/start', data);
    return response.data;
  },

  // Get candidate details
  getCandidate: async (candidateId: string) => {
    const response = await apiClient.get(`/api/candidates/${candidateId}`);
    return response.data;
  },

  // Get job details
  getJob: async (jobId: string) => {
    const response = await apiClient.get(`/api/jobs/${jobId}`);
    return response.data;
  },

  // List all jobs
  listJobs: async () => {
    const response = await apiClient.get('/api/jobs/');
    return response.data;
  },
  
  // Create a new job
  createJob: async (jobData: any) => {
    const response = await apiClient.post('/api/jobs/', jobData);
    return response.data;
  },
  
  // Update a job
  updateJob: async (jobId: string, jobData: any) => {
    const response = await apiClient.put(`/api/jobs/${jobId}`, jobData);
    return response.data;
  },
  
  // Delete a job
  deleteJob: async (jobId: string) => {
    const response = await apiClient.delete(`/api/jobs/${jobId}`);
    return response.data;
  },

  // List all applications
  listApplications: async () => {
    const response = await apiClient.get('/api/applications/');
    return response.data;
  },

  // Get application details
  getApplication: async (applicationId: string) => {
    const response = await apiClient.get(`/api/applications/${applicationId}`);
    return response.data;
  },

  // Get screening details
  getScreening: async (screeningId: string) => {
    const response = await apiClient.get(`/api/screenings/${screeningId}`);
    return response.data;
  },
};

export default apiClient;

