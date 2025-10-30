import axios from 'axios';

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Validate API URL
if (!API_BASE_URL || API_BASE_URL === 'undefined') {
  console.error('NEXT_PUBLIC_API_URL is not set. Please create a .env.local file with NEXT_PUBLIC_API_URL=http://localhost:8000');
  throw new Error('API URL is not configured. Please set NEXT_PUBLIC_API_URL in your environment variables.');
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making API request to: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API response error:', error.response?.data || error.message);
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error: Make sure your backend server is running on', API_BASE_URL);
    }
    return Promise.reject(error);
  }
);

// Types for API requests and responses
export interface ParseResumeRequest {
  file: File;
}

export interface ParseResumeResponse {
  candidate_id: string;
  parsed_data: {
    name: string;
    email: string;
    phone?: string;
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
  job_id: string;
  candidate_id?: string;
  candidate_email?: string;
  cover_letter?: string;
}

export interface MatchCandidateResponse {
  fit_score: number;
  highlights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export interface ApplicationStatusUpdateRequest {
  status: string;
}

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  fit_score?: number;
  highlights?: any;
  status: string;
  created_at: string;
  updated_at: string;
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

  // Create application without AI matching
  createApplication: async (payload: {
    candidate_id: string;
    job_id: string;
    fit_score?: number;
    highlights?: any;
    status?: string;
  }): Promise<Application> => {
    const response = await apiClient.post('/api/applications/', payload);
    return response.data;
  },

  // Update application status
  updateApplicationStatus: async (applicationId: string, payload: ApplicationStatusUpdateRequest) => {
    const response = await apiClient.put(`/api/applications/${applicationId}/status`, payload);
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
  listApplications: async (jobId?: string | null, candidateId?: string | null) => {
    const params: any = {};
    if (jobId) params.job_id = jobId;
    if (candidateId) params.candidate_id = candidateId;
    const response = await apiClient.get('/api/applications/', { params });
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

  // Get digital footprint for a candidate
  getDigitalFootprint: async (candidateId: string) => {
    const response = await apiClient.get(`/api/footprints/${candidateId}`);
    return response.data;
  },

  // Get candidate by email
  getCandidateByEmail: async (email: string) => {
    const response = await apiClient.get(`/api/candidates/me`, { params: { email } });
    return response.data;
  },

  // List all candidates
  listCandidates: async () => {
    const response = await apiClient.get('/api/candidates/');
    return response.data;
  },

  // Create a new candidate
  createCandidate: async (candidateData: any) => {
    const response = await apiClient.post('/api/candidates/', candidateData);
    return response.data;
  },

  // Update candidate profile
  updateCandidate: async (candidateId: string, candidateData: any) => {
    const response = await apiClient.put(`/api/candidates/${candidateId}`, candidateData);
    return response.data;
  },
};

export default apiClient;

