'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Briefcase,
  FileText,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Eye
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Application {
  id: string;
  job_id: string;
  job_title: string;
  fit_score: number;
  status: string;
  created_at: string;
  highlights?: {
    strengths?: string[];
    weaknesses?: string[];
  };
}

interface CandidateStats {
  totalApplications: number;
  averageFitScore: number;
  pendingApplications: number;
  shortlistedApplications: number;
}

export default function CandidateDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<CandidateStats>({
    totalApplications: 0,
    averageFitScore: 0,
    pendingApplications: 0,
    shortlistedApplications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchCandidateData() {
      try {
        // Fetch all applications for this candidate
        const applicationsData = await api.listApplications(null);

        // Filter applications for current candidate (would need candidate_id match in production)
        setApplications(applicationsData);

        // Calculate stats
        const totalApplications = applicationsData.length;
        const averageFitScore = applicationsData.length > 0
          ? Math.round(applicationsData.reduce((acc: number, app: any) => acc + app.fit_score, 0) / applicationsData.length)
          : 0;
        const pendingApplications = applicationsData.filter((app: any) => app.status === 'pending').length;
        const shortlistedApplications = applicationsData.filter((app: any) => app.status === 'shortlisted').length;

        setStats({
          totalApplications,
          averageFitScore,
          pendingApplications,
          shortlistedApplications,
        });
      } catch (error) {
        console.error("Failed to fetch candidate data", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCandidateData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'shortlisted':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'shortlisted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFitScoreProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const quickActions = [
    {
      title: 'Upload Resume',
      description: 'Update your profile with latest resume',
      icon: <Upload className="h-6 w-6" />,
      onClick: () => router.push('/candidate'),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Browse Jobs',
      description: 'Find and apply to new opportunities',
      icon: <Briefcase className="h-6 w-6" />,
      onClick: () => router.push('/jobs'),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'My Applications',
      description: 'Track your application status',
      icon: <FileText className="h-6 w-6" />,
      onClick: () => {
        // Scroll to applications section
        document.getElementById('applications-section')?.scrollIntoView({ behavior: 'smooth' });
      },
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading dashboard...</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Candidate Dashboard</h1>
                <p className="text-gray-600 text-lg">
                  Track your applications and explore new opportunities
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button
                  onClick={() => router.push('/jobs')}
                  className="w-full sm:w-auto"
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Browse Jobs
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Match Score</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.averageFitScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Review</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Shortlisted</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.shortlistedApplications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`p-3 rounded-lg text-white ${action.color}`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{action.title}</h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={action.onClick}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Applications Section */}
          <div id="applications-section" className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">My Applications</h2>
              {applications.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {applications.length} Total
                </Badge>
              )}
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-500 mb-6">
                  Start applying to jobs to see your applications here
                </p>
                <Button onClick={() => router.push('/jobs')}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Browse Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {application.job_title || 'Job Position'}
                              </h3>
                              <div className="flex items-center space-x-3">
                                <Badge variant={getStatusBadgeVariant(application.status)} className="flex items-center space-x-1">
                                  {getStatusIcon(application.status)}
                                  <span className="ml-1 capitalize">{application.status}</span>
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Applied {formatDate(application.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Fit Score */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Match Score</span>
                              <span className={`text-sm font-bold ${getFitScoreColor(application.fit_score)}`}>
                                {application.fit_score}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getFitScoreProgressColor(application.fit_score)}`}
                                style={{ width: `${application.fit_score}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Highlights */}
                          {application.highlights && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {application.highlights.strengths && application.highlights.strengths.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-green-700 mb-2">Strengths</p>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {application.highlights.strengths.slice(0, 2).map((strength, idx) => (
                                      <li key={idx} className="flex items-start">
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                        <span>{strength}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {application.highlights.weaknesses && application.highlights.weaknesses.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-orange-700 mb-2">Areas to Improve</p>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {application.highlights.weaknesses.slice(0, 2).map((weakness, idx) => (
                                      <li key={idx} className="flex items-start">
                                        <AlertCircle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                        <span>{weakness}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 lg:mt-0 lg:ml-6">
                          <Button
                            variant="outline"
                            onClick={() => router.push(`/jobs/${application.job_id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Job
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Profile Completion Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Profile Strength
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Profile Completion</span>
                    <span className="text-sm font-medium">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-gray-600">Resume uploaded</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-gray-600">Profile information complete</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-gray-600">Add portfolio links</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-gray-600">Complete skills assessment</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/candidate')}>
                  Complete Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
