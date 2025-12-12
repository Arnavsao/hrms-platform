'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Job } from '@/models/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  CheckCircle2,
  Edit,
  Trash2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Props = {
  params: { id: string };
};

export default function JobDetailPage({ params }: Props) {
  const { id } = params;
  const router = useRouter();
  const { session } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = session?.user?.role;
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  useEffect(() => {
    async function fetchJob() {
      try {
        const jobData = await api.getJob(id);
        setJob(jobData);

        // Check if candidate has already applied
        if (!isRecruiter && session?.user?.email) {
          try {
            const candidateResponse = await api.getCandidateByEmail(session.user.email);
            if (candidateResponse?.id) {
              const applications = await api.listApplications(id, candidateResponse.id);
              setHasApplied(applications && applications.length > 0);
            }
          } catch (err) {
            console.error('Failed to check application status', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch job', err);
        setError('Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    }
    fetchJob();
  }, [id, session, isRecruiter]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.deleteJob(id);
      router.push('/jobs');
    } catch (err) {
      console.error('Failed to delete job', err);
      alert('Failed to delete job');
    }
  };

  const getStatusBadge = (status?: string) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading job details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Job Not Found
                </h3>
                <p className="text-gray-500 mb-4">
                  {error || 'The job you are looking for does not exist.'}
                </p>
                <Button onClick={() => router.push('/jobs')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/jobs')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>

          {/* Job Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <CardTitle className="text-3xl">{job.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {formatDate(job.created_at)}</span>
                    </div>
                    <div>{getStatusBadge(job.status)}</div>
                  </div>
                </div>
                {isRecruiter && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/jobs/edit/${id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.requirements}
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          {!isRecruiter && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {hasApplied ? 'Application Submitted' : 'Ready to Apply?'}
                    </h3>
                    <p className="text-gray-600">
                      {hasApplied
                        ? 'You have already applied to this position'
                        : 'Submit your application for this position'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => router.push(`/jobs/${id}/apply`)}
                    disabled={hasApplied || job.status === 'closed'}
                  >
                    {hasApplied
                      ? 'Applied'
                      : job.status === 'closed'
                      ? 'Position Closed'
                      : 'Apply Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recruiter Actions */}
          {isRecruiter && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Manage Applications
                    </h3>
                    <p className="text-gray-600">
                      View and manage candidate applications for this position
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => router.push(`/recruiter/jobs/${id}`)}
                  >
                    View Applications
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
