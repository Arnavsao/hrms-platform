'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
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
                  Review, filter, and manage all candidate applications
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{applications.length} applications found</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Applications Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Applications Overview
              </h3>
              <p className="text-gray-600 text-lg mb-8">
                {applications.length} applications found across all job postings
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {applications.length}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Total Applications</div>
                </div>
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {applications.filter(app => app.fit_score > 85).length}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Excellent Matches</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {Math.round(applications.reduce((acc, app) => acc + app.fit_score, 0) / applications.length) || 0}%
                  </div>
                  <div className="text-sm text-yellow-600 font-medium">Avg Match Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}