'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Edit,
  ArrowLeft,
  Users,
  TrendingUp,
  Clock,
  MapPin,
  Briefcase,
  DollarSign,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  fit_score: number;
  candidate_name?: string;
  created_at: string;
  status?: string;
  highlights?: any;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  salary_range?: string;
  employment_type?: string;
  status?: string;
  created_at: string;
}

export default function RecruiterJobDetailPage({
  params
}: {
  params: { id: string }
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const router = useRouter();

  const userRole = session?.user?.role;
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch job details
        const jobData = await api.getJob(params.id);
        setJob(jobData);

        // Fetch applications for this job
        const applicationsData = await api.listApplications(params.id, null);
        setApplications(applicationsData);
      } catch (error) {
        console.error("Failed to fetch job or applications", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isRecruiter) {
      fetchData();
    }
  }, [params.id, isRecruiter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'shortlisted':
        return <Badge className="bg-green-500">Shortlisted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'closed':
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="default">Active</Badge>;
    }
  };

  if (!isRecruiter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-500 mb-4">
                You don&apos;t have permission to view this page.
              </p>
              <Button onClick={() => router.push('/')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Job Not Found
              </h3>
              <p className="text-gray-500 mb-4">
                The job you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button onClick={() => router.push('/jobs')}>
                Back to Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
        <div className="space-y-6 h-full overflow-y-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/jobs')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>

          {/* Job Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                  {getJobStatusBadge(job.status || 'active')}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-4">
                  {job.company && (
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      <span>{job.company}</span>
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  {job.employment_type && (
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-2" />
                      <span>{job.employment_type}</span>
                    </div>
                  )}
                  {job.salary_range && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span>{job.salary_range}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-4">
                  <Clock className="h-4 w-4 mr-1" />
                  Posted {formatDate(job.created_at)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/jobs/edit/${job.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Job
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Total Applicants</p>
                    <p className="text-2xl font-bold">{applications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Shortlisted</p>
                    <p className="text-2xl font-bold">
                      {applications.filter(app => app.status === 'shortlisted').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">High Matches</p>
                    <p className="text-2xl font-bold">
                      {applications.filter(app => app.fit_score >= 80).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Avg Score</p>
                    <p className="text-2xl font-bold">
                      {applications.length > 0
                        ? Math.round(applications.reduce((acc, app) => acc + app.fit_score, 0) / applications.length)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job Description */}
          {job.description && (
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Applicants List */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Applicants ({applications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                  <p className="text-gray-500">Applications will appear here once candidates start applying to this job.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications
                    .sort((a, b) => b.fit_score - a.fit_score)
                    .map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => router.push(`/recruiter/applications/${app.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              Candidate #{app.candidate_id.slice(0, 8)}
                            </h4>
                            {getStatusBadge(app.status || 'pending')}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Applied {formatDate(app.created_at)}
                            </span>
                            <span className={`flex items-center font-semibold ${getFitScoreColor(app.fit_score)}`}>
                              <TrendingUp className="h-4 w-4 mr-1" />
                              {app.fit_score}% Match
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/recruiter/applications/${app.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
