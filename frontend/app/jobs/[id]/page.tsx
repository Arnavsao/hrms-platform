'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Building,
  Calendar,
  CheckCircle,
  FileText,
  Share2,
  Bookmark,
  AlertCircle,
  Send
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  company?: string;
  location?: string;
  salary_range?: string;
  employment_type?: string;
  experience_level?: string;
  department?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;
  const { session } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const userRole = session?.user?.role;
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  // Redirect recruiters to their specific job detail page
  useEffect(() => {
    if (isRecruiter && jobId) {
      router.push(`/recruiter/jobs/${jobId}`);
    }
  }, [isRecruiter, jobId, router]);

  useEffect(() => {
    if (jobId && !isRecruiter) {
      fetchJobDetails();
      checkIfApplied();
    }
  }, [jobId, isRecruiter]);

  const fetchJobDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const jobData = await api.getJob(jobId);
      setJob(jobData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch job details');
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfApplied = async () => {
    try {
      // Get current user's email from session storage or auth context
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      if (!userEmail) return;

      const candidateResponse = await api.getCandidateByEmail(userEmail);
      if (candidateResponse?.id) {
        const applications = await api.listApplications(jobId, candidateResponse.id);
        setHasApplied(applications && applications.length > 0);
      }
    } catch (err) {
      console.error('Failed to check application status', err);
    }
  };

  const handleApply = () => {
    if (!hasApplied) {
      router.push(`/jobs/${jobId}/apply`);
    }
  };

  const handleSaveJob = () => {
    setIsSaved(!isSaved);
    // In production, this would save to backend
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job?.title || 'Job Opening',
        text: `Check out this job opportunity: ${job?.title}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Job link copied to clipboard!');
    }
  };

  const formatRequirements = (requirements: string) => {
    // Split by bullet points or newlines
    return requirements
      .split(/\n|•/)
      .map(req => req.trim())
      .filter(req => req.length > 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="h-full bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Job not found'}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/jobs')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
        <div className="space-y-6 h-full overflow-y-auto pb-6">
          {/* Header with Back Button */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/jobs')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
            </div>
          </div>

          {/* Main Job Card */}
          <Card className="shadow-lg">
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <Briefcase className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {job.company && (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{job.company}</span>
                          </Badge>
                        )}
                        {job.location && (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{job.location}</span>
                          </Badge>
                        )}
                        {job.employment_type && (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{job.employment_type}</span>
                          </Badge>
                        )}
                        {job.status && (
                          <Badge
                            variant={
                              job.status === 'active' ? 'default' :
                              job.status === 'closed' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSaveJob}
                    className={isSaved ? 'border-blue-500 text-blue-500' : ''}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save Job'}
                  </Button>
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    onClick={handleApply}
                    className={hasApplied ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                    disabled={hasApplied || job.status === 'closed'}
                  >
                    {hasApplied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    {job.status === 'closed' ? 'Closed' : hasApplied ? 'Applied' : 'Apply Now'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Job Description */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Job Description
                    </h2>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Requirements & Qualifications
                    </h2>
                    <ul className="space-y-3">
                      {formatRequirements(job.requirements).map((requirement, index) => (
                        <li key={index} className="flex items-start">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          </div>
                          <span className="ml-3 text-gray-700">{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Additional Information */}
                  {job.department && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Department
                      </h2>
                      <p className="text-gray-700">{job.department}</p>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Job Overview */}
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Job Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Posted</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(job.created_at)}
                          </p>
                        </div>
                      </div>

                      {job.salary_range && (
                        <div className="flex items-start space-x-3">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Salary Range</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {job.salary_range}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.experience_level && (
                        <div className="flex items-start space-x-3">
                          <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Experience Level</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {job.experience_level}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.employment_type && (
                        <div className="flex items-start space-x-3">
                          <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Employment Type</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {job.employment_type}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.location && (
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Location</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {job.location}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Job ID</p>
                          <p className="text-sm font-mono text-gray-900 break-all">
                            {job.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Apply CTA */}
                  <Card className={
                    job.status === 'closed'
                      ? "bg-gradient-to-br from-gray-500 to-gray-600 text-white"
                      : hasApplied
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                  }>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2">
                        {job.status === 'closed' ? 'Position Closed' : hasApplied ? 'Application Submitted' : 'Ready to Apply?'}
                      </h3>
                      <p className="text-sm text-blue-100 mb-4">
                        {job.status === 'closed'
                          ? 'This position is no longer accepting applications.'
                          : hasApplied
                            ? 'You have already applied for this position. Check your dashboard for application status.'
                            : 'Submit your application and let our AI match your profile with this position.'}
                      </p>
                      <Button
                        onClick={handleApply}
                        className={hasApplied ? "w-full bg-white text-green-600 hover:bg-green-50" : "w-full bg-white text-blue-600 hover:bg-blue-50"}
                        disabled={hasApplied || job.status === 'closed'}
                      >
                        {hasApplied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        {job.status === 'closed' ? 'Position Closed' : hasApplied ? 'Already Applied' : 'Apply for this Position'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Tips Card */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Application Tips
                      </h3>
                      <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Ensure your resume is up to date</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Highlight relevant skills from the job requirements</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Our AI will match your profile automatically</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Action Bar */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-lg shadow-lg lg:hidden">
            <Button
              onClick={handleApply}
              className={hasApplied ? "w-full bg-green-600 hover:bg-green-700" : "w-full bg-blue-600 hover:bg-blue-700"}
              disabled={hasApplied || job.status === 'closed'}
            >
              {hasApplied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {job.status === 'closed' ? 'Position Closed' : hasApplied ? 'Already Applied' : 'Apply for this Position'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
