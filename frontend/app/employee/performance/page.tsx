'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  Award,
  Target,
  Calendar,
  FileText,
  Loader2,
  Star,
  CheckCircle2,
  Clock,
  Edit,
} from 'lucide-react';

interface PerformanceReview {
  id: number;
  employee_id: number;
  review_period_start: string;
  review_period_end: string;
  reviewer_id: number | null;
  self_review: string | null;
  manager_review: string | null;
  goals_score: number | null;
  skills_score: number | null;
  teamwork_score: number | null;
  communication_score: number | null;
  overall_score: number | null;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

interface PerformanceStats {
  total_reviews: number;
  average_score: number;
  latest_review: PerformanceReview | null;
  reviews_by_status: { [key: string]: number };
}

export default function EmployeePerformancePage() {
  const { session } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selfReview, setSelfReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      fetchEmployeeData();
    }
  }, [session]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const employeeData = await api.getCurrentEmployee(session!.user.email);
      setEmployee(employeeData);

      if (employeeData?.id) {
        // Fetch performance reviews
        const reviewsData = await api.listPerformanceReviews({ employee_id: employeeData.id });
        setReviews(reviewsData);

        // Fetch performance stats
        const performanceStats = await api.getPerformanceStats(employeeData.id);
        setStats(performanceStats);
      }
    } catch (error: any) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSelfReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setSelfReview(review.self_review || '');
    setIsDialogOpen(true);
  };

  const handleSubmitSelfReview = async () => {
    if (!selectedReview) return;

    try {
      setIsSubmitting(true);
      await api.submitSelfReview(selectedReview.id, selfReview);
      alert('Self-review submitted successfully!');
      setIsDialogOpen(false);
      fetchEmployeeData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to submit self-review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 4) return 'text-green-500';
    if (score >= 3) return 'text-blue-500';
    if (score >= 2) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number | null) => {
    if (!score) return 'N/A';
    if (score >= 4.5) return 'Excellent';
    if (score >= 4) return 'Very Good';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Needs Improvement';
    return 'Poor';
  };

  const renderStars = (score: number | null) => {
    if (!score) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= score ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Employee profile not found. Please contact HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Performance Reviews
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your performance and development
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats?.average_score || null)}`}>
              {stats?.average_score ? stats.average_score.toFixed(1) : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats?.average_score ? getScoreBadge(stats.average_score) : 'No reviews yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_reviews || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Jira Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.reviews_by_status?.completed || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Reviews completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Github Commits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.reviews_by_status?.pending || 0) +
                (stats?.reviews_by_status?.in_progress || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Awaiting completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Review Highlight */}
      {stats?.latest_review && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Performance Review</CardTitle>
            <CardDescription>
              {formatDate(stats.latest_review.review_period_start)} -{' '}
              {formatDate(stats.latest_review.review_period_end)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold ${getScoreColor(stats.latest_review.overall_score)}`}>
                      {stats.latest_review.overall_score || 'N/A'}
                    </span>
                    {renderStars(stats.latest_review.overall_score)}
                  </div>
                  <Badge variant={getStatusBadgeVariant(stats.latest_review.status)} className="mt-2">
                    {stats.latest_review.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Goals Achievement</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getScoreColor(stats.latest_review.goals_score)}`}>
                      {stats.latest_review.goals_score || 'N/A'}
                    </span>
                    {renderStars(stats.latest_review.goals_score)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Skills Development</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getScoreColor(stats.latest_review.skills_score)}`}>
                      {stats.latest_review.skills_score || 'N/A'}
                    </span>
                    {renderStars(stats.latest_review.skills_score)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Teamwork</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getScoreColor(stats.latest_review.teamwork_score)}`}>
                      {stats.latest_review.teamwork_score || 'N/A'}
                    </span>
                    {renderStars(stats.latest_review.teamwork_score)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Communication</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getScoreColor(stats.latest_review.communication_score)}`}>
                      {stats.latest_review.communication_score || 'N/A'}
                    </span>
                    {renderStars(stats.latest_review.communication_score)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review History */}
      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
          <CardDescription>Your performance review timeline</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No performance reviews found yet.
            </p>
          ) : (
            <div className="space-y-4">
              {reviews
                .sort((a, b) => new Date(b.review_period_end).getTime() - new Date(a.review_period_end).getTime())
                .map((review) => (
                  <div
                    key={review.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusIcon(review.status)}
                          <span className="font-medium">
                            Review Period: {formatDate(review.review_period_start)} -{' '}
                            {formatDate(review.review_period_end)}
                          </span>
                          <Badge variant={getStatusBadgeVariant(review.status)}>
                            {review.status}
                          </Badge>
                        </div>

                        {review.overall_score && (
                          <div className="mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">Overall Score:</span>
                              <span className={`text-xl font-bold ${getScoreColor(review.overall_score)}`}>
                                {review.overall_score}
                              </span>
                              {renderStars(review.overall_score)}
                              <Badge variant="outline">{getScoreBadge(review.overall_score)}</Badge>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Goals: </span>
                            <span className={`font-medium ${getScoreColor(review.goals_score)}`}>
                              {review.goals_score || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Skills: </span>
                            <span className={`font-medium ${getScoreColor(review.skills_score)}`}>
                              {review.skills_score || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Teamwork: </span>
                            <span className={`font-medium ${getScoreColor(review.teamwork_score)}`}>
                              {review.teamwork_score || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Communication: </span>
                            <span className={`font-medium ${getScoreColor(review.communication_score)}`}>
                              {review.communication_score || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {review.self_review && (
                          <div className="mb-2">
                            <p className="text-sm font-medium mb-1">Self Review:</p>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                              {review.self_review}
                            </p>
                          </div>
                        )}

                        {review.manager_review && (
                          <div className="mb-2">
                            <p className="text-sm font-medium mb-1">Manager Review:</p>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                              {review.manager_review}
                            </p>
                          </div>
                        )}

                        {review.comments && (
                          <div>
                            <p className="text-sm font-medium mb-1">Additional Comments:</p>
                            <p className="text-sm text-muted-foreground">{review.comments}</p>
                          </div>
                        )}
                      </div>

                      {review.status === 'pending' && !review.self_review && (
                        <Button
                          onClick={() => handleOpenSelfReview(review)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Complete Self-Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Self Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Self-Review</DialogTitle>
            <DialogDescription>
              {selectedReview &&
                `Review Period: ${formatDate(selectedReview.review_period_start)} - ${formatDate(
                  selectedReview.review_period_end
                )}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="self_review">
                Reflect on your achievements, challenges, and growth during this review period
              </Label>
              <Textarea
                id="self_review"
                value={selfReview}
                onChange={(e) => setSelfReview(e.target.value)}
                placeholder="Describe your accomplishments, areas for improvement, and goals for the next period..."
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitSelfReview} disabled={isSubmitting || !selfReview.trim()}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Submit Self-Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
