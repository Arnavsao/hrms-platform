'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  fit_score: number;
  candidate_name?: string;
  job_title?: string;
  company?: string;
  created_at: string;
  status?: string;
}

interface JobGroup {
  job_id: string;
  job_title: string;
  applications: Application[];
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const router = useRouter();

  const userRole = session?.user?.role;
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  useEffect(() => {
    async function fetchApplications() {
      try {
        const data = await api.listApplications(null);
        setApplications(data);

        // Group applications by job
        const grouped = data.reduce((acc: { [key: string]: JobGroup }, app: Application) => {
          const jobId = app.job_id;
          if (!acc[jobId]) {
            acc[jobId] = {
              job_id: jobId,
              job_title: app.job_title || '',
              applications: []
            };
          }
          acc[jobId].applications.push(app);
          return acc;
        }, {});

        setJobGroups(Object.values(grouped));
      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isRecruiter) {
      fetchApplications();
    }
  }, [isRecruiter]);

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
                You don&apos;t have permission to view applications.
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
            <p className="text-gray-500">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full">
        <div className="space-y-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Management</h1>
                <p className="text-gray-600 text-lg">
                  Review candidate applications organized by job posting
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{applications.length} applications across {jobGroups.length} jobs</span>
                </div>
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
                    <p className="text-sm text-gray-500">Total Applications</p>
                    <p className="text-2xl font-bold">{applications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Briefcase className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Active Jobs</p>
                    <p className="text-2xl font-bold">{jobGroups.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">High Matches</p>
                    <p className="text-2xl font-bold">{applications.filter(app => app.fit_score >= 80).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Avg Score</p>
                    <p className="text-2xl font-bold">
                      {Math.round(applications.reduce((acc, app) => acc + app.fit_score, 0) / applications.length) || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job-wise Applications */}
          {jobGroups.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-500">Applications will appear here once candidates start applying to your jobs.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {jobGroups.map((group) => (
                <Card key={group.job_id}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{group.job_title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {group.applications.length} applicant{group.applications.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/recruiter/jobs/${group.job_id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Job
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {group.applications.map((app) => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}