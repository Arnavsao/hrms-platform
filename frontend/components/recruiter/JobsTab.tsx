'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Job } from '@/models/job';
import { Button } from '@/components/ui/button';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileText, Trash2, Edit, Eye, MapPin, Building2, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await api.listJobs();
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchJobs();
  }, []);
  
  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
        try {
            await api.deleteJob(jobId);
            setJobs(jobs.filter(job => job.id !== jobId));
        } catch (error) {
            console.error("Failed to delete job", error);
        }
    }
  }

  const getStatusBadge = (status: string) => {
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

  const columns = [
    {
      key: 'title',
      label: 'Job Title',
      sortable: true,
      render: (value: string, row: Job) => (
        <div className="flex items-center space-x-3">
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Building2 className="h-4 w-4" />
              <span>Company</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => getStatusBadge(value || 'active'),
    },
    {
      key: 'created_at',
      label: 'Posted',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{formatDate(value)}</span>
        </div>
      ),
    },
  ];

  const actions = [
    {
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: Job) => router.push(`/jobs/${row.id}`),
    },
    {
      label: 'Edit Job',
      icon: <Edit className="h-4 w-4" />,
      onClick: (row: Job) => router.push(`/jobs/edit/${row.id}`),
    },
    {
      label: 'View Applications',
      icon: <FileText className="h-4 w-4" />,
      onClick: (row: Job) => router.push(`/recruiter?jobId=${row.id}`),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      onClick: (row: Job) => handleDeleteJob(row.id),
    },
  ];

  if (isLoading) {
    return <div className='p-4 text-center text-muted-foreground'>Loading jobs...</div>;
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => router.push('/jobs/create')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Job
            </Button>
        </div>
      
      <ResponsiveTable
        columns={columns}
        data={jobs}
        actions={actions}
        emptyState={{
          title: "No Jobs Posted Yet",
          description: "Get started by creating your first job posting.",
          action: {
            label: "Create Job",
            onClick: () => router.push('/jobs/create'),
          },
        }}
      />
    </div>
  );
}
