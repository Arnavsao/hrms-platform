'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number; // Changed from total_days to duration_days
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null; // Changed from rejection_reason
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  vacation_days: number;
  sick_days: number;
  personal_days: number;
  used_vacation: number;
  used_sick: number;
  used_personal: number;
}

export default function EmployeeLeavePage() {
  const { session } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: '',
  });

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
        // Fetch leave requests
        const requests = await api.listLeaveRequests({ employee_id: employeeData.id });
        setLeaveRequests(requests);

        // Fetch leave balance
        const balance = await api.getLeaveBalance(employeeData.id);
        setLeaveBalance(balance);
      }
    } catch (error: any) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.id) return;

    // Validate dates
    if (!formData.start_date || !formData.end_date) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    
    // Check if end date is before start date
    if (end < start) {
      alert('End date must be on or after the start date');
      return;
    }

    // Check if start date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      alert('Start date cannot be in the past');
      return;
    }

    try {
      setIsSubmitting(true);

      // Calculate duration days (inclusive of both start and end dates)
      const diffTime = end.getTime() - start.getTime();
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Format dates as YYYY-MM-DD for backend
      const formatDateForBackend = (dateString: string) => {
        return dateString; // Already in YYYY-MM-DD format from input type="date"
      };

      await api.createLeaveRequest({
        employee_id: employee.id,
        leave_type: formData.leave_type,
        start_date: formatDateForBackend(formData.start_date),
        end_date: formatDateForBackend(formData.end_date),
        duration_days: durationDays, // Changed from total_days to duration_days
        reason: formData.reason || undefined,
      });

      alert('Leave request submitted successfully!');
      setIsDialogOpen(false);
      setFormData({
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        reason: '',
      });
      fetchEmployeeData();
    } catch (error: any) {
      // Better error handling to show proper error messages
      let errorMessage = 'Failed to submit leave request';
      
      // Handle network/CORS errors
      if (error.networkError || error.code === 'ERR_NETWORK' || error.message === 'Network Error' || 
          (error.message && (error.message.includes('CORS') || error.message.includes('Network')))) {
        errorMessage = error.userMessage || 
          `Unable to connect to backend server at http://localhost:8000.
          
Please verify:
1. Backend server is running (check http://localhost:8000/health in your browser)
2. No firewall is blocking the connection
3. Try refreshing the page after starting the backend`;
        console.error('Network/CORS error:', error);
      } else if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle different error formats
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors are arrays
          const messages = errorData.detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.msg) return err.msg;
            if (err.loc && err.msg) {
              const field = err.loc[err.loc.length - 1];
              return `${field}: ${err.msg}`;
            }
            return JSON.stringify(err);
          });
          errorMessage = messages.join('\n');
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          // Try to extract meaningful message
          if (errorData.detail.message) {
            errorMessage = errorData.detail.message;
          } else {
            errorMessage = JSON.stringify(errorData.detail, null, 2);
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Leave request error:', error);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacation':
        return 'bg-blue-500';
      case 'sick':
        return 'bg-red-500';
      case 'personal':
        return 'bg-purple-500';
      case 'unpaid':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
            <CalendarIcon className="h-8 w-8" />
            Leave Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Request and manage your time off
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leave_type">Leave Type</Label>
                <Select
                  value={formData.leave_type}
                  onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide a reason for your leave request"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Vacation Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveBalance
                ? leaveBalance.vacation_days - leaveBalance.used_vacation
                : 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              of {leaveBalance?.vacation_days || 0} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sick Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveBalance ? leaveBalance.sick_days - leaveBalance.used_sick : 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              of {leaveBalance?.sick_days || 0} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Personal Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveBalance
                ? leaveBalance.personal_days - leaveBalance.used_personal
                : 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              of {leaveBalance?.personal_days || 0} available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Your leave request history and status</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No leave requests found. Click "Request Leave" to submit your first request.
            </p>
          ) : (
            <div className="space-y-3">
              {leaveRequests
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type)}`} />
                          <span className="font-medium capitalize">{request.leave_type} Leave</span>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </div>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{request.duration_days} day(s)</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Reason: </span>
                          <span>{request.reason}</span>
                        </div>
                        {request.status === 'rejected' && request.rejected_reason && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                            <span className="text-destructive font-medium">Rejection Reason: </span>
                            <span className="text-destructive">{request.rejected_reason}</span>
                          </div>
                        )}
                        {request.approved_at && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {request.status === 'approved' ? 'Approved' : 'Processed'} on{' '}
                            {formatDate(request.approved_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Balance Details */}
      {leaveBalance && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Balance Summary ({leaveBalance.year})</CardTitle>
            <CardDescription>Detailed breakdown of your leave balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Vacation</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span>{leaveBalance.vacation_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used:</span>
                    <span>{leaveBalance.used_vacation} days</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining:</span>
                    <span>{leaveBalance.vacation_days - leaveBalance.used_vacation} days</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Sick Leave</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span>{leaveBalance.sick_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used:</span>
                    <span>{leaveBalance.used_sick} days</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining:</span>
                    <span>{leaveBalance.sick_days - leaveBalance.used_sick} days</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Personal Leave</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span>{leaveBalance.personal_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used:</span>
                    <span>{leaveBalance.used_personal} days</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining:</span>
                    <span>{leaveBalance.personal_days - leaveBalance.used_personal} days</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
