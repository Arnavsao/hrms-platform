'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Star, User, Briefcase, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Application {
    id: string;
    candidate_id: string;
    job_id: string;
    fit_score: number;
    candidate_name?: string;
    job_title?: string;
    created_at: string;
    status?: string;
}

interface CandidatesTabProps {
    jobId: string | null;
}

export function CandidatesTab({ jobId }: CandidatesTabProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchApplications() {
      setIsLoading(true);
      try {
        const data = await api.listApplications(jobId);
        setApplications(data);

        if (jobId) {
            const jobData = await api.getJob(jobId);
            setJobTitle(jobData.title);
        } else {
            setJobTitle(null);
        }

      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, [jobId]);

  const getScoreBadgeVariant = (score: number) => {
    if (score > 85) return "default";
    if (score > 70) return "secondary";
    if (score > 50) return "outline";
    return "destructive";
  };

  const getScoreColor = (score: number) => {
    if (score > 85) return "text-green-600";
    if (score > 70) return "text-blue-600";
    if (score > 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score > 85) return "Excellent";
    if (score > 70) return "Good";
    if (score > 50) return "Fair";
    return "Poor";
  };

  const columns = [
    {
      key: 'candidate_name',
      label: 'Candidate',
      sortable: true,
      render: (value: string, row: Application) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.candidate_id}`} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">
              {value || `Candidate ${row.candidate_id.slice(0, 8)}`}
            </p>
            <p className="text-sm text-gray-500">ID: {row.candidate_id.slice(0, 8)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: 'job_title',
      label: 'Job Position',
      sortable: true,
      render: (value: string, row: Application) => (
        <div>
          <p className="font-medium text-gray-900">{value || `Job ${row.job_id.slice(0, 8)}`}</p>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Briefcase className="h-4 w-4" />
            <span>Applied {formatDate(row.created_at)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'fit_score',
      label: 'Match Score',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Star className={`h-4 w-4 ${getScoreColor(value)}`} />
            <span className={`font-medium ${getScoreColor(value)}`}>
              {Math.round(value)}%
            </span>
          </div>
          <Badge variant={getScoreBadgeVariant(value)}>
            {getScoreLabel(value)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => {
        const status = value || 'pending';
        const variants = {
          pending: { variant: 'secondary' as const, label: 'Pending' },
          reviewed: { variant: 'default' as const, label: 'Reviewed' },
          shortlisted: { variant: 'default' as const, label: 'Shortlisted' },
          rejected: { variant: 'destructive' as const, label: 'Rejected' },
          hired: { variant: 'default' as const, label: 'Hired' },
        };
        const config = variants[status as keyof typeof variants] || variants.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
  ];

  const actions = [
    {
      label: 'Review Application',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: Application) => router.push(`/recruiter/applications/${row.id}`),
    },
  ];

  if (isLoading) {
    return <div className='p-4 text-center text-muted-foreground'>Loading candidates...</div>;
  }

  return (
    <div className="space-y-4">
      <ResponsiveTable
        columns={columns}
        data={applications}
        actions={actions}
        emptyState={{
          title: jobId ? "No Applications Yet" : "No Applications Found",
          description: jobId 
            ? "No candidates have applied to this job posting yet." 
            : "There are currently no applications to display.",
          action: {
            label: "View All Jobs",
            onClick: () => router.push('/recruiter'),
          },
        }}
      />
    </div>
  );
}
