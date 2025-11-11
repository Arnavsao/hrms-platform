'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Download,
  FileText,
  TrendingUp,
  Calendar,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  employee_id: string;
  salary_month: string; // Date string (YYYY-MM-DD format)
  base_salary: number;  // Changed from basic_salary
  allowances: number;
  deductions: number;
  tax: number;
  net_salary: number;
  status: string;
  payslip_url: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function EmployeePayrollPage() {
  const { session } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

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
        const history = await api.getPayrollHistory(employeeData.id);
        setPayrollHistory(history);

        // Set the most recent payroll as selected by default
        if (history.length > 0) {
          setSelectedPayroll(history[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'processed':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-500';
      case 'processed':
        return 'text-blue-500';
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatMonthYear = (salaryMonth: string) => {
    const date = new Date(salaryMonth);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getMonthYear = (salaryMonth: string) => {
    const date = new Date(salaryMonth);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  };

  const handleDownloadPayslip = (payroll: PayrollRecord) => {
    const monthYear = getMonthYear(payroll.salary_month);
    const formattedMonthYear = formatMonthYear(payroll.salary_month);
    
    // Create a detailed payslip content
    const payslipContent = `
╔═══════════════════════════════════════════════════════════╗
║                      PAYSLIP                              ║
║                   ${formattedMonthYear.padEnd(45)}       ║
╚═══════════════════════════════════════════════════════════╝

EMPLOYEE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Employee Name:     ${employee?.name || 'N/A'}
Employee ID:       ${employee?.employee_id || 'N/A'}
Department:        ${employee?.department || 'N/A'}
Position:          ${employee?.position || 'N/A'}
Email:             ${employee?.email || 'N/A'}

PAYROLL PERIOD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period:            ${formattedMonthYear}
Status:            ${payroll.status.toUpperCase()}

EARNINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Salary:       ${formatCurrency(payroll.base_salary).padStart(15)}
Allowances:        ${formatCurrency(payroll.allowances).padStart(15)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gross Salary:      ${formatCurrency(payroll.base_salary + payroll.allowances).padStart(15)}

DEDUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deductions:        ${formatCurrency(payroll.deductions).padStart(15)}
Tax:               ${formatCurrency(payroll.tax).padStart(15)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Deductions:  ${formatCurrency(payroll.deductions + payroll.tax).padStart(15)}

NET SALARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NET PAY:           ${formatCurrency(payroll.net_salary).padStart(15)}

PAYMENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment Date:      ${payroll.processed_at ? new Date(payroll.processed_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Pending'}
${payroll.notes ? `Notes:             ${payroll.notes}` : ''}

═══════════════════════════════════════════════════════════
This is a system-generated payslip. For queries, contact HR.
Generated on: ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
═══════════════════════════════════════════════════════════
    `.trim();

    // Create and download the file
    const blob = new Blob([payslipContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip_${formattedMonthYear.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const calculateYearToDate = () => {
    const currentYear = new Date().getFullYear();
    return payrollHistory
      .filter(p => {
        const payrollDate = new Date(p.salary_month);
        return payrollDate.getFullYear() === currentYear && p.status === 'paid';
      })
      .reduce((sum, p) => sum + p.net_salary, 0);
  };

  const getLastPaymentDate = () => {
    const paidPayrolls = payrollHistory
      .filter(p => p.status === 'paid')
      .sort((a, b) => new Date(b.salary_month).getTime() - new Date(a.salary_month).getTime());
    
    return paidPayrolls.length > 0 ? paidPayrolls[0].salary_month : null;
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
            <DollarSign className="h-8 w-8" />
            Payroll
          </h1>
          <p className="text-muted-foreground mt-1">
            View your salary and payslips
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Current Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee.base_salary 
                ? formatCurrency(employee.base_salary / 12) 
                : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Year to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculateYearToDate())}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().getFullYear()} earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Payslips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollHistory.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Available records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getLastPaymentDate()
                ? new Date(getLastPaymentDate()!).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Payment date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll History List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Payroll History</CardTitle>
            <CardDescription>Select a month to view details</CardDescription>
          </CardHeader>
          <CardContent>
            {payrollHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payroll records found.
              </p>
            ) : (
              <div className="space-y-2">
                {payrollHistory
                  .sort((a, b) => {
                    return new Date(b.salary_month).getTime() - new Date(a.salary_month).getTime();
                  })
                  .map((payroll) => (
                    <button
                      key={payroll.id}
                      onClick={() => setSelectedPayroll(payroll)}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedPayroll?.id === payroll.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {formatMonthYear(payroll.salary_month)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(payroll.net_salary)}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(payroll.status)}>
                          {payroll.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payslip Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payslip Details</CardTitle>
                <CardDescription>
                  {selectedPayroll
                    ? formatMonthYear(selectedPayroll.salary_month)
                    : 'Select a payroll record'}
                </CardDescription>
              </div>
              {selectedPayroll && (
                <Button
                  onClick={() => handleDownloadPayslip(selectedPayroll)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPayroll ? (
              <p className="text-center text-muted-foreground py-8">
                Select a payroll record from the list to view details.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedPayroll.status === 'paid' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium">Status:</span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(selectedPayroll.status)}>
                    {selectedPayroll.status}
                  </Badge>
                </div>

                <Separator />

                {/* Earnings Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Salary</span>
                      <span className="font-medium">
                        {formatCurrency(selectedPayroll.base_salary)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowances</span>
                      <span className="font-medium">
                        {formatCurrency(selectedPayroll.allowances)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Gross Salary</span>
                      <span>
                        {formatCurrency(
                          selectedPayroll.base_salary + selectedPayroll.allowances
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deductions Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Deductions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions</span>
                      <span className="font-medium text-red-500">
                        -{formatCurrency(selectedPayroll.deductions)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium text-red-500">
                        -{formatCurrency(selectedPayroll.tax)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Deductions</span>
                      <span className="text-red-500">
                        -{formatCurrency(selectedPayroll.deductions + selectedPayroll.tax)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Net Salary */}
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Salary</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedPayroll.net_salary)}
                    </span>
                  </div>
                </div>

                {/* Payment Information */}
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3">Payment Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payroll Period</span>
                      <span className="font-medium">
                        {formatMonthYear(selectedPayroll.salary_month)}
                      </span>
                    </div>
                    {selectedPayroll.processed_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processed Date</span>
                        <span className="font-medium">
                          {new Date(selectedPayroll.processed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {selectedPayroll.processed_by && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processed By</span>
                        <span className="font-medium">HR Department</span>
                      </div>
                    )}
                    {selectedPayroll.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-muted-foreground block mb-1">Notes</span>
                        <p className="text-sm text-gray-700">{selectedPayroll.notes}</p>
                      </div>
                    )}
                    {!selectedPayroll.processed_at && (
                      <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        ⏳ Payment pending processing
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Employee Details Section */}
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3">Employee Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{employee?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Employee ID:</span>
                      <p className="font-medium">{employee?.employee_id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-medium">{employee?.department || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Position:</span>
                      <p className="font-medium">{employee?.position || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
