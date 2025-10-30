'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Activity,
  ArrowLeft,
  Download,
  RefreshCcw,
  Calendar,
  Target,
  CheckCircle,
  Star
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    total_candidates: number;
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    avg_fit_score: number;
    pending_applications: number;
    reviewed_applications: number;
    shortlisted_applications: number;
  };
  growth: {
    new_candidates_this_week: number;
    new_applications_this_week: number;
  };
  performance: {
    database_status: string;
    api_response_time_ms: number;
    ai_processing_status: string;
    uptime_percentage: number;
  };
}

interface TrendData {
  trends: Array<{
    date: string;
    applications: number;
    candidates: number;
    jobs: number;
    avg_fit_score: number;
  }>;
}

export default function SystemAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [overviewData, trendsData] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getAnalyticsTrends(timeRange)
      ]);
      setAnalytics(overviewData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading analytics...</p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <BarChart3 className="mr-3 h-8 w-8 text-blue-600" />
                    System Analytics
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Comprehensive platform metrics and insights
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={fetchAnalytics}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Candidates</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.overview.total_candidates}</p>
                        <p className="text-xs text-green-600 mt-1">
                          +{analytics.growth.new_candidates_this_week} this week
                        </p>
                      </div>
                      <Users className="h-10 w-10 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.overview.total_jobs}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {analytics.overview.active_jobs} active
                        </p>
                      </div>
                      <Briefcase className="h-10 w-10 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Applications</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.overview.total_applications}</p>
                        <p className="text-xs text-green-600 mt-1">
                          +{analytics.growth.new_applications_this_week} this week
                        </p>
                      </div>
                      <Activity className="h-10 w-10 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Avg Match Score</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.overview.avg_fit_score}%</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          AI matching quality
                        </p>
                      </div>
                      <Star className="h-10 w-10 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Application Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Pipeline</CardTitle>
                  <CardDescription>Current status breakdown of all applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-700">Pending Review</p>
                          <p className="text-2xl font-bold text-yellow-900">{analytics.overview.pending_applications}</p>
                        </div>
                        <Target className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Reviewed</p>
                          <p className="text-2xl font-bold text-blue-900">{analytics.overview.reviewed_applications}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Shortlisted</p>
                          <p className="text-2xl font-bold text-green-900">{analytics.overview.shortlisted_applications}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>Real-time system health and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Database Status</span>
                        <Badge className="bg-green-500">{analytics.performance.database_status}</Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">API Response</span>
                        <Badge variant="secondary">{analytics.performance.api_response_time_ms}ms</Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">AI Processing</span>
                        <Badge className="bg-green-500">{analytics.performance.ai_processing_status}</Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Uptime</span>
                        <Badge className="bg-blue-500">{analytics.performance.uptime_percentage}%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trends Chart */}
              {trends && trends.trends.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Activity Trends</CardTitle>
                        <CardDescription>Historical data over the last {timeRange} days</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <select
                          className="border rounded px-3 py-1 text-sm"
                          value={timeRange}
                          onChange={(e) => setTimeRange(Number(e.target.value))}
                        >
                          <option value={7}>7 days</option>
                          <option value={30}>30 days</option>
                          <option value={60}>60 days</option>
                          <option value={90}>90 days</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {trends.trends.slice(-10).map((trend, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500 w-24">{trend.date}</span>
                          <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                            <span><strong>{trend.applications}</strong> apps</span>
                            <span><strong>{trend.candidates}</strong> candidates</span>
                            <span><strong>{trend.jobs}</strong> jobs</span>
                            <span><strong>{trend.avg_fit_score}%</strong> avg score</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
