'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Eye, 
  Star,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  User,
  FileText
} from 'lucide-react';
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

export default function CandidatesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { session } = useAuth();
  const router = useRouter();

  const userRole = session?.user?.role;
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  useEffect(() => {
    async function fetchApplications() {
      try {
        if (isRecruiter) {
          const data = await api.listApplications(null);
          setApplications(data);
          setFilteredApplications(data);
        } else if (session?.user?.email) {
          // Candidate view: fetch own applications by resolving candidate id
          try {
            const candidate = await api.getCandidateByEmail(session.user.email);
            const data = await api.listApplications(null, candidate?.id);
            setApplications(data);
            setFilteredApplications(data);
          } catch (e) {
            // No candidate profile yet
            setApplications([]);
            setFilteredApplications([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, [isRecruiter, session?.user?.email]);

  useEffect(() => {
    let filtered = applications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.candidate_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === filterStatus);
    }

    setFilteredApplications(filtered);
  }, [searchTerm, filterStatus, applications]);

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
            {value > 85 ? 'Excellent' : value > 70 ? 'Good' : value > 50 ? 'Fair' : 'Poor'}
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
      label: 'View Profile',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: Application) => router.push(`/recruiter/applications/${row.id}`),
    },
  ];

  if (!isRecruiter) {
    // Candidate dashboard view
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Candidate Dashboard</h1>
              <p className="text-gray-600">Upload your resume, browse jobs, and track your applications.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/jobs')}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Browse Jobs</p>
                      <p className="text-sm text-gray-500">Find roles that fit your skills</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Applications</p>
                      <p className="text-sm text-gray-500">Your applications will appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading candidates...</p>
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidate Applications</h1>
                <p className="text-gray-600 text-lg">
                  Review and manage candidate applications across all job postings
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Live candidate data</span>
                </div>
              </div>
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
                    placeholder="Search candidates by name, job title, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="hired">Hired</option>
                </select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <ResponsiveTable
          columns={columns}
          data={filteredApplications}
          actions={actions}
          emptyState={{
            title: filteredApplications.length === 0 && searchTerm ? 'No candidates found' : 'No applications yet',
            description: filteredApplications.length === 0 && searchTerm 
              ? 'Try adjusting your search criteria'
              : 'Candidates will appear here once they start applying to your jobs',
            action: {
              label: 'View Jobs',
              onClick: () => router.push('/jobs'),
            },
          }}
        />

        {/* Stats */}
        {filteredApplications.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{filteredApplications.length}</p>
                  <p className="text-sm text-gray-500">Total Applications</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {filteredApplications.filter(app => app.fit_score > 85).length}
                  </p>
                  <p className="text-sm text-gray-500">Excellent Matches</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredApplications.filter(app => app.fit_score > 70).length}
                  </p>
                  <p className="text-sm text-gray-500">Good Matches</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {Math.round(filteredApplications.reduce((acc, app) => acc + app.fit_score, 0) / filteredApplications.length) || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Avg Match Score</p>
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
