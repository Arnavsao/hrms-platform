'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Job } from '@/models/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Clock,
  Building2,
  Edit,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { session } = useAuth();
  const router = useRouter();

  const userRole = session?.user?.role;
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.listJobs();
        setJobs(data);
        setFilteredJobs(data);

        // If candidate, fetch their applications to mark applied jobs
        if (!isRecruiter && session?.user?.email) {
          try {
            const candidateResponse = await api.getCandidateByEmail(session.user.email);
            if (candidateResponse?.id) {
              const applications = await api.listApplications(null, candidateResponse.id);
              const appliedIds = new Set(applications.map((app: any) => app.job_id));
              setAppliedJobIds(appliedIds);
            }
          } catch (err) {
            console.error("Failed to fetch candidate applications", err);
          }
        }
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [session, isRecruiter]);

  useEffect(() => {
    const filtered = jobs.filter(job =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredJobs(filtered);
  }, [searchTerm, jobs]);

  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        await api.deleteJob(jobId);
        setJobs(jobs.filter(job => job.id !== jobId));
        setFilteredJobs(filteredJobs.filter(job => job.id !== jobId));
      } catch (error) {
        console.error("Failed to delete job", error);
      }
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await api.updateJobStatus(jobId, newStatus);
      // Update the job status in both state arrays
      const updateStatus = (jobsList: Job[]) =>
        jobsList.map(job =>
          job.id === jobId ? { ...job, status: newStatus } : job
        );
      setJobs(updateStatus(jobs));
      setFilteredJobs(updateStatus(filteredJobs));
    } catch (error) {
      console.error("Failed to update job status", error);
      alert("Failed to update job status. Please try again.");
    }
  };

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
      render: (value: string, row: Job) => (
        isRecruiter ? (
          <Select
            value={value || 'active'}
            onValueChange={(newStatus) => handleStatusChange(row.id, newStatus)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <Badge variant="default">Active</Badge>
              </SelectItem>
              <SelectItem value="paused">
                <Badge variant="secondary">Paused</Badge>
              </SelectItem>
              <SelectItem value="closed">
                <Badge variant="destructive">Closed</Badge>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          getStatusBadge(value || 'active')
        )
      ),
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

  const actions = isRecruiter ? [
    {
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: Job) => router.push(`/recruiter/jobs/${row.id}`),
    },
    {
      label: 'Edit Job',
      icon: <Edit className="h-4 w-4" />,
      onClick: (row: Job) => router.push(`/jobs/edit/${row.id}`),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      onClick: (row: Job) => handleDeleteJob(row.id),
    },
  ] : [
    {
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: Job) => router.push(`/jobs/${row.id}`),
    },
    {
      label: (row: Job) => {
        if (row.status === 'closed') return 'Closed';
        if (appliedJobIds.has(row.id)) return 'Applied';
        return 'Apply';
      },
      icon: <PlusCircle className="h-4 w-4" />,
      onClick: (row: Job) => {
        if (!appliedJobIds.has(row.id) && row.status !== 'closed') {
          router.push(`/jobs/${row.id}/apply`);
        }
      },
      disabled: (row: Job) => appliedJobIds.has(row.id) || row.status === 'closed',
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading jobs...</p>
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {isRecruiter ? 'Job Management' : 'Available Jobs'}
                </h1>
                <p className="text-gray-600 text-lg">
                  {isRecruiter 
                    ? 'Manage your job postings and track applications'
                    : 'Discover opportunities that match your skills'
                  }
                </p>
              </div>
              {isRecruiter && (
                <Button 
                  onClick={() => router.push('/jobs/create')} 
                  className="w-full sm:w-auto h-12 px-6 text-base font-medium"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create New Job
                </Button>
              )}
            </div>
          </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search jobs by title, company, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <ResponsiveTable
          columns={columns}
          data={filteredJobs}
          actions={actions}
          emptyState={{
            title: filteredJobs.length === 0 && searchTerm ? 'No jobs found' : 'No jobs available',
            description: filteredJobs.length === 0 && searchTerm 
              ? 'Try adjusting your search criteria'
              : isRecruiter 
                ? 'Get started by creating your first job posting'
                : 'Check back later for new opportunities',
            action: isRecruiter ? {
              label: 'Create Job',
              onClick: () => router.push('/jobs/create'),
            } : undefined,
          }}
        />

        {/* Stats */}
        {filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{filteredJobs.length}</p>
                  <p className="text-sm text-gray-500">Total Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {filteredJobs.filter(job => job.status === 'active' || !job.status).length}
                  </p>
                  <p className="text-sm text-gray-500">Active Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredJobs.length}
                  </p>
                  <p className="text-sm text-gray-500">Total Jobs</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
