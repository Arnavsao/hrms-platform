'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Star,
  Clock,
  BarChart3,
  Settings,
  Shield,
  Activity,
  Target,
  CheckCircle
} from 'lucide-react';

interface AdminStats {
  totalCandidates: number;
  totalJobs: number;
  totalApplications: number;
  averageFitScore: number;
  activeRecruiters: number;
  recentActivity: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalCandidates: 0,
    totalJobs: 0,
    totalApplications: 0,
    averageFitScore: 0,
    activeRecruiters: 0,
    recentActivity: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const [jobs, applications] = await Promise.all([
          api.listJobs(),
          api.listApplications(null)
        ]);

        const totalJobs = jobs.length;
        const totalApplications = applications.length;
        const averageFitScore = applications.length > 0 
          ? Math.round(applications.reduce((acc: number, app: any) => acc + app.fit_score, 0) / applications.length)
          : 0;
        
        // Mock data for demonstration
        const totalCandidates = Math.floor(totalApplications * 0.8); // Estimate
        const activeRecruiters = Math.floor(totalJobs * 0.3); // Estimate
        const recentActivity = Math.floor(totalApplications * 0.1); // Estimate

        setStats({
          totalCandidates,
          totalJobs,
          totalApplications,
          averageFitScore,
          activeRecruiters,
          recentActivity,
        });
      } catch (error) {
        console.error("Failed to fetch admin data", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  const quickActions = [
    {
      title: 'System Analytics',
      description: 'View detailed platform analytics',
      icon: <BarChart3 className="h-6 w-6" />,
      onClick: () => router.push('/admin/analytics'),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: <Users className="h-6 w-6" />,
      onClick: () => router.push('/admin/users'),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: <Settings className="h-6 w-6" />,
      onClick: () => router.push('/admin/settings'),
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Security Center',
      description: 'Monitor security and access',
      icon: <Shield className="h-6 w-6" />,
      onClick: () => router.push('/admin/security'),
      color: 'bg-red-500 hover:bg-red-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading admin dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                <p className="text-gray-600 text-lg">
                  System overview and platform management for administrators.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>System healthy</span>
                </div>
              </div>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Candidates</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Briefcase className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Star className="h-8 w-8 text-yellow-600" />
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
                  <Target className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Recruiters</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeRecruiters}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Recent Activity</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
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
                    className="w-full mt-4"
                    onClick={action.onClick}
                  >
                    Access
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System Health & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database Performance</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Healthy</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">API Response Time</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Fast</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">AI Processing</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Storage Usage</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">75%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">New user registration</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Job posting created</p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">AI analysis completed</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">System backup completed</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
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

