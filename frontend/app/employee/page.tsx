'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetchEmployeeData();
    }
  }, [session]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      // Fetch employee profile
      const employeeData = await api.getCurrentEmployee(session!.user.email);
      setEmployee(employeeData);

      // Fetch employee profile with stats
      if (employeeData?.id) {
        const profileData = await api.getEmployee(employeeData.id);
        setStats(profileData);
      }
    } catch (error: any) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!employee?.id) return;

    try {
      await api.createAttendance({
        employee_id: employee.id,
        check_in: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        status: 'present'
      });
      alert('Checked in successfully!');
      fetchEmployeeData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    if (!employee?.id) return;

    try {
      await api.checkoutAttendance(employee.id);
      alert('Checked out successfully!');
      fetchEmployeeData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to check out');
    }
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
            <Users className="h-8 w-8" />
            Employee Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {employee.name}!
          </p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          {employee.status}
        </Badge>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your daily attendance</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={handleCheckIn} className="flex-1">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Check In
          </Button>
          <Button onClick={handleCheckOut} variant="outline" className="flex-1">
            <XCircle className="mr-2 h-4 w-4" />
            Check Out
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee.department || 'Not Assigned'}</div>
            <p className="text-sm text-muted-foreground mt-1">{employee.position}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.attendance_stats?.attendance_percentage || 0}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Leave Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.leave_balance
                ? (stats.leave_balance.vacation_days - stats.leave_balance.used_vacation)
                : 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Days available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.recent_performance?.overall_score || 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Last review</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <p className="font-medium">{employee.employee_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{employee.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined Date</p>
              <p className="font-medium">
                {new Date(employee.joined_date).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/employee/profile')}
            >
              <Users className="mr-2 h-4 w-4" />
              View Full Profile
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/employee/attendance')}
            >
              <Clock className="mr-2 h-4 w-4" />
              Attendance History
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/employee/payroll')}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              View Payslips
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/employee/leave')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/employee/performance')}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Performance Reviews
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {stats?.upcoming_reviews && stats.upcoming_reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
            <CardDescription>Reviews and tasks that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcoming_reviews.map((review: any) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">Performance Review</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {review.status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push('/employee/performance')}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
