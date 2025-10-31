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
    // Enhanced error logging
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const errorMsg = `Cannot connect to backend server at ${API_BASE_URL}. Please ensure:
1. Backend server is running (check: ${API_BASE_URL}/health)
2. No firewall is blocking the connection
3. CORS is properly configured`;
      console.error('Network error:', errorMsg);
      console.error('Request URL:', error.config?.url);
      console.error('Base URL:', API_BASE_URL);
      // Enhance error with helpful message
      error.networkError = true;
      error.userMessage = errorMsg;
    } else {
      console.error('API response error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('URL:', error.config?.url);
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
    strengths?: string[];
    weaknesses?: string[];
  };
}

export interface VoiceInterviewSession {
  session_id: string;
}

export interface VoiceInterviewFinalizeResponse extends ScreeningResponse {
  session_id: string;
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

  // Update job status
  updateJobStatus: async (jobId: string, status: string) => {
    const response = await apiClient.patch(`/api/jobs/${jobId}/status`, { status });
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

  // Voice interviews
  createVoiceInterviewSession: async (
    applicationId: string,
    options?: { questionCount?: number },
  ): Promise<VoiceInterviewSession> => {
    const response = await apiClient.post('/api/voice-interviews/sessions', {
      application_id: applicationId,
      question_count: options?.questionCount,
    });
    return response.data;
  },

  finalizeVoiceInterviewSession: async (sessionId: string): Promise<VoiceInterviewFinalizeResponse> => {
    const response = await apiClient.post(`/api/voice-interviews/sessions/${sessionId}/finalize`);
    return response.data;
  },

  listScreeningsForApplication: async (applicationId: string) => {
    const response = await apiClient.get(`/api/screenings/application/${applicationId}`);
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

  // ==================== ADMIN APIs ====================

  // Analytics
  getAnalyticsOverview: async () => {
    const response = await apiClient.get('/api/admin/analytics/overview');
    return response.data;
  },

  getAnalyticsTrends: async (days: number = 30) => {
    const response = await apiClient.get('/api/admin/analytics/trends', { params: { days } });
    return response.data;
  },

  // User Management
  listAllUsers: async (filters?: { role?: string; status?: string; search?: string }) => {
    const response = await apiClient.get('/api/admin/users', { params: filters });
    return response.data;
  },

  deleteUser: async (userId: string, userType: 'candidate' | 'recruiter') => {
    const response = await apiClient.delete(`/api/admin/users/${userId}`, { params: { user_type: userType } });
    return response.data;
  },

  updateUserStatus: async (userId: string, status: string, userType: 'candidate' | 'recruiter') => {
    const response = await apiClient.put(`/api/admin/users/${userId}/status`, null, {
      params: { status, user_type: userType }
    });
    return response.data;
  },

  // System Settings
  getSystemSettings: async () => {
    const response = await apiClient.get('/api/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (settings: any) => {
    const response = await apiClient.put('/api/admin/settings', settings);
    return response.data;
  },

  // Security
  getAuditLog: async (limit: number = 50, offset: number = 0) => {
    const response = await apiClient.get('/api/admin/security/audit-log', { params: { limit, offset } });
    return response.data;
  },

  getActiveSessions: async () => {
    const response = await apiClient.get('/api/admin/security/active-sessions');
    return response.data;
  },

  terminateSession: async (sessionId: string) => {
    const response = await apiClient.post(`/api/admin/security/sessions/${sessionId}/terminate`);
    return response.data;
  },

  getSecurityThreats: async () => {
    const response = await apiClient.get('/api/admin/security/threats');
    return response.data;
  },

  // ==================== EMPLOYEE APIs ====================

  // Employee Management
  createEmployee: async (employeeData: any) => {
    const response = await apiClient.post('/api/employees/', employeeData);
    return response.data;
  },

  listEmployees: async (filters?: { department?: string; status?: string; search?: string }) => {
    const response = await apiClient.get('/api/employees/', { params: filters });
    return response.data;
  },

  getEmployee: async (employeeId: string) => {
    const response = await apiClient.get(`/api/employees/${employeeId}`);
    return response.data;
  },

  getCurrentEmployee: async (email: string) => {
    const response = await apiClient.get('/api/employees/me', { params: { email } });
    return response.data;
  },

  getEmployeeStats: async () => {
    const response = await apiClient.get('/api/employees/stats');
    return response.data;
  },

  updateEmployee: async (employeeId: string, employeeData: any) => {
    const response = await apiClient.put(`/api/employees/${employeeId}`, employeeData);
    return response.data;
  },

  deleteEmployee: async (employeeId: string) => {
    const response = await apiClient.delete(`/api/employees/${employeeId}`);
    return response.data;
  },

  // Attendance Management
  createAttendance: async (attendanceData: any) => {
    const response = await apiClient.post('/api/attendance/', attendanceData);
    return response.data;
  },

  listAttendance: async (filters?: { employee_id?: string; start_date?: string; end_date?: string; status?: string }) => {
    const response = await apiClient.get('/api/attendance/', { params: filters });
    return response.data;
  },

  getAttendance: async (attendanceId: string) => {
    const response = await apiClient.get(`/api/attendance/${attendanceId}`);
    return response.data;
  },

  getAttendanceStats: async (employeeId: string, startDate?: string, endDate?: string) => {
    const response = await apiClient.get(`/api/attendance/stats/${employeeId}`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  updateAttendance: async (attendanceId: string, attendanceData: any) => {
    const response = await apiClient.put(`/api/attendance/${attendanceId}`, attendanceData);
    return response.data;
  },

  checkoutAttendance: async (employeeId: string) => {
    const response = await apiClient.post(`/api/attendance/checkout/${employeeId}`);
    return response.data;
  },

  deleteAttendance: async (attendanceId: string) => {
    const response = await apiClient.delete(`/api/attendance/${attendanceId}`);
    return response.data;
  },

  // Payroll Management
  createPayroll: async (payrollData: any) => {
    const response = await apiClient.post('/api/payroll/', payrollData);
    return response.data;
  },

  listPayroll: async (filters?: { employee_id?: string; status?: string; month?: string }) => {
    const response = await apiClient.get('/api/payroll/', { params: filters });
    return response.data;
  },

  getPayroll: async (payrollId: string) => {
    const response = await apiClient.get(`/api/payroll/${payrollId}`);
    return response.data;
  },

  getPayrollHistory: async (employeeId: string, limit: number = 12) => {
    const response = await apiClient.get(`/api/payroll/employee/${employeeId}/history`, { params: { limit } });
    return response.data;
  },

  updatePayroll: async (payrollId: string, payrollData: any) => {
    const response = await apiClient.put(`/api/payroll/${payrollId}`, payrollData);
    return response.data;
  },

  processPayroll: async (payrollId: string, processedBy: string) => {
    const response = await apiClient.post(`/api/payroll/${payrollId}/process`, null, { params: { processed_by: processedBy } });
    return response.data;
  },

  markPayrollPaid: async (payrollId: string) => {
    const response = await apiClient.post(`/api/payroll/${payrollId}/mark-paid`);
    return response.data;
  },

  generateMonthlyPayroll: async (month: string) => {
    const response = await apiClient.post('/api/payroll/generate-monthly', null, { params: { month } });
    return response.data;
  },

  deletePayroll: async (payrollId: string) => {
    const response = await apiClient.delete(`/api/payroll/${payrollId}`);
    return response.data;
  },

  // Performance Management
  createPerformanceReview: async (reviewData: any) => {
    const response = await apiClient.post('/api/performance/', reviewData);
    return response.data;
  },

  listPerformanceReviews: async (filters?: { employee_id?: string; reviewed_by?: string; status?: string }) => {
    const response = await apiClient.get('/api/performance/', { params: filters });
    return response.data;
  },

  getPerformanceReview: async (reviewId: string) => {
    const response = await apiClient.get(`/api/performance/${reviewId}`);
    return response.data;
  },

  getPerformanceStats: async (employeeId: string) => {
    const response = await apiClient.get(`/api/performance/stats/${employeeId}`);
    return response.data;
  },

  updatePerformanceReview: async (reviewId: string, reviewData: any) => {
    const response = await apiClient.put(`/api/performance/${reviewId}`, reviewData);
    return response.data;
  },

  submitSelfReview: async (reviewId: string, data: any) => {
    const response = await apiClient.post(`/api/performance/${reviewId}/submit-self-review`, data);
    return response.data;
  },

  completePerformanceReview: async (reviewId: string, data: any) => {
    const response = await apiClient.post(`/api/performance/${reviewId}/complete`, data);
    return response.data;
  },

  deletePerformanceReview: async (reviewId: string) => {
    const response = await apiClient.delete(`/api/performance/${reviewId}`);
    return response.data;
  },

  // Leave Management
  createLeaveRequest: async (leaveData: any) => {
    const response = await apiClient.post('/api/leave/requests', leaveData);
    return response.data;
  },

  listLeaveRequests: async (filters?: { employee_id?: string; status?: string; leave_type?: string }) => {
    const response = await apiClient.get('/api/leave/requests', { params: filters });
    return response.data;
  },

  getLeaveRequest: async (requestId: string) => {
    const response = await apiClient.get(`/api/leave/requests/${requestId}`);
    return response.data;
  },

  updateLeaveRequest: async (requestId: string, leaveData: any) => {
    const response = await apiClient.put(`/api/leave/requests/${requestId}`, leaveData);
    return response.data;
  },

  approveLeaveRequest: async (requestId: string, approvedBy: string) => {
    const response = await apiClient.post(`/api/leave/requests/${requestId}/approve`, null, {
      params: { approved_by: approvedBy }
    });
    return response.data;
  },

  rejectLeaveRequest: async (requestId: string, approvedBy: string, rejectedReason: string) => {
    const response = await apiClient.post(`/api/leave/requests/${requestId}/reject`, null, {
      params: { approved_by: approvedBy, rejected_reason: rejectedReason }
    });
    return response.data;
  },

  getLeaveBalance: async (employeeId: string, year?: number) => {
    const response = await apiClient.get(`/api/leave/balance/${employeeId}`, { params: { year } });
    return response.data;
  },

  updateLeaveBalance: async (employeeId: string, balanceData: any) => {
    const response = await apiClient.put(`/api/leave/balance/${employeeId}`, balanceData);
    return response.data;
  },

  deleteLeaveRequest: async (requestId: string) => {
    const response = await apiClient.delete(`/api/leave/requests/${requestId}`);
    return response.data;
  },
};

export default apiClient;

