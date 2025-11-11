'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar as CalendarIcon,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  Award,
} from 'lucide-react';

interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  check_in: string;
  check_out: string | null;
  status: string;
  location_in: string | null;
  location_out: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceStats {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  remote_days: number;
  attendance_percentage: number;
  current_streak: number;
  longest_streak: number;
}

export default function EmployeeAttendancePage() {
  const { session } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
        // Fetch attendance records for current month
        const startDate = new Date();
        startDate.setDate(1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);

        const records = await api.listAttendance({
          employee_id: employeeData.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        });
        setAttendanceRecords(records);

        // Fetch attendance stats
        const attendanceStats = await api.getAttendanceStats(employeeData.id);
        setStats(attendanceStats);
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
      setIsCheckingIn(true);

      // Try to get current location
      let location = null;
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              location = `${position.coords.latitude},${position.coords.longitude}`;
              resolve(location);
            },
            () => {
              resolve(null);
            }
          );
        });
      }

      await api.createAttendance({
        employee_id: employee.id,
        check_in: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        location_in: location,
      });

      alert('Checked in successfully!');
      fetchEmployeeData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employee?.id) return;

    try {
      setIsCheckingOut(true);

      // Try to get current location
      let location = null;
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              location = `${position.coords.latitude},${position.coords.longitude}`;
              resolve(location);
            },
            () => {
              resolve(null);
            }
          );
        });
      }

      await api.checkoutAttendance(employee.id);
      alert('Checked out successfully!');
      fetchEmployeeData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to check out');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-500';
      case 'absent':
        return 'bg-red-500';
      case 'late':
        return 'bg-yellow-500';
      case 'remote':
        return 'bg-blue-500';
      case 'half-day':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'default';
      case 'absent':
        return 'destructive';
      case 'late':
        return 'secondary';
      case 'remote':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Not recorded';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateWorkHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'In progress...';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find(record => record.date === today);
  };

  const todayAttendance = getTodayAttendance();

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
            <Clock className="h-8 w-8" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your attendance and work hours
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Check In: {formatTime(todayAttendance.check_in)}</span>
                  </div>
                  {todayAttendance.check_out && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Check Out: {formatTime(todayAttendance.check_out)}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Work Hours: {calculateWorkHours(todayAttendance.check_in, todayAttendance.check_out)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge variant={getStatusBadgeVariant(todayAttendance.status)}>
                    {todayAttendance.status}
                  </Badge>
                  {!todayAttendance.check_out && (
                    <Button
                      onClick={handleCheckOut}
                      disabled={isCheckingOut}
                      variant="outline"
                      size="sm"
                    >
                      {isCheckingOut ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Check Out
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full"
              size="lg"
            >
              {isCheckingIn ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-5 w-5" />
              )}
              Check In for Today
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.attendance_percentage.toFixed(1) || 0}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Present Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.present_days || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Out of {stats?.total_days || 0} working days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.current_streak || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Longest: {stats?.longest_streak || 0} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Absent Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.absent_days || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Late: {stats?.late_days || 0} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Your attendance records for this month</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No attendance records found for this month.
            </p>
          ) : (
            <div className="space-y-2">
              {attendanceRecords
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(record.status)}`} />
                      <div>
                        <p className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            In: {formatTime(record.check_in)}
                          </span>
                          {record.check_out && (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Out: {formatTime(record.check_out)}
                            </span>
                          )}
                          {record.location_in && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Location tracked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {calculateWorkHours(record.check_in, record.check_out)}
                        </p>
                        <Badge variant={getStatusBadgeVariant(record.status)} className="mt-1">
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
