'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Button,
} from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Edit, Trash2, Users } from 'lucide-react';

type Employee = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  employee_id: string;
  joined_date: string;
  status: 'active' | 'on_leave' | 'terminated';
  base_salary: number;
  manager_id?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: any;
  created_at: string;
  updated_at: string;
};

type EmployeeFormState = Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>> & {
  id?: string;
};

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<EmployeeFormState>({});
  const [formError, setFormError] = useState<string>('');

  // Derived lists for filters
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch = !search
        || e.name.toLowerCase().includes(search.toLowerCase())
        || e.email.toLowerCase().includes(search.toLowerCase())
        || e.employee_id.toLowerCase().includes(search.toLowerCase());
      const matchesDept = departmentFilter === 'all' || e.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  const isEditMode = Boolean(formState.id);

useEffect(() => {
  // Guard: admin only
  const role = session?.user?.role;
  if (role && role !== 'admin') {
    router.push('/');
    return;
  }

  let cancelled = false;
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const params: { department?: string; status?: string; search?: string } = {};
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const data: Employee[] = await api.listEmployees(params);
      if (!cancelled) setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  };

  const handle = setTimeout(fetchEmployees, search ? 300 : 0);
  return () => {
    cancelled = true;
    clearTimeout(handle);
  };
}, [router, session?.user?.role, departmentFilter, statusFilter, search]);

  const resetForm = () => setFormState({});

  const openCreate = () => {
    resetForm();
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setFormState({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      employee_id: emp.employee_id,
      joined_date: emp.joined_date,
      status: emp.status,
      base_salary: emp.base_salary,
      manager_id: emp.manager_id ?? undefined,
      address: emp.address ?? undefined,
      date_of_birth: emp.date_of_birth ?? undefined,
      emergency_contact: emp.emergency_contact ?? undefined,
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Terminate employee ${emp.name} (${emp.employee_id})?`)) return;
    try {
      await api.deleteEmployee(emp.id);
      const params: { department?: string; status?: string; search?: string } = {};
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const refreshed: Employee[] = await api.listEmployees(params);
      setEmployees(refreshed);
    } catch (err) {
      console.error('Failed to delete employee', err);
    }
  };

  const submitForm = async () => {
    try {
      setIsSaving(true);
      setFormError('');

      // Simple required field validation for create/edit
      const missing: string[] = [];
      if (!formState.name) missing.push('Name');
      if (!isEditMode && !formState.email) missing.push('Email');
      if (!isEditMode && !formState.employee_id) missing.push('Employee ID');
      if (!isEditMode && !formState.joined_date) missing.push('Joined Date');
      const salaryNumber = typeof formState.base_salary === 'number' ? formState.base_salary : Number(formState.base_salary);
      const hasValidSalary = Number.isFinite(salaryNumber) && salaryNumber > 0;
      if (!hasValidSalary) missing.push('Base Salary');

      if (missing.length > 0) {
        setFormError(`Please provide: ${missing.join(', ')}`);
        setIsSaving(false);
        return;
      }

      const payload: any = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone || null,
        department: formState.department || null,
        position: formState.position || null,
        employee_id: formState.employee_id,
        joined_date: formState.joined_date,
        status: formState.status || 'active',
        base_salary: salaryNumber,
        manager_id: formState.manager_id || null,
        address: formState.address || null,
        date_of_birth: formState.date_of_birth || null,
        emergency_contact: formState.emergency_contact || null,
      };

      if (isEditMode && formState.id) {
        const { id, email: _skipEmail, employee_id: _skipEmpId, joined_date: _skipJoined, ...updateOnly } = payload;
        await api.updateEmployee(formState.id, updateOnly);
      } else {
        await api.createEmployee(payload);
      }

      setIsDialogOpen(false);
      resetForm();
      const params: { department?: string; status?: string; search?: string } = {};
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      try {
        const refreshed: Employee[] = await api.listEmployees(params);
        setEmployees(refreshed);
      } catch {}
    } catch (err) {
      console.error('Failed to save employee', err);
      setFormError('Failed to save employee. Please check inputs and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Employee
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, email, employee ID"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No employees found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{emp.name}</span>
                          <span className="text-xs text-gray-500">Joined {emp.joined_date}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{emp.employee_id}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.email}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.department || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.position || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.status === 'active' ? 'default' : emp.status === 'on_leave' ? 'secondary' : 'destructive'}>
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(emp)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(emp)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Employee' : 'Create Employee'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formState.name || ''} onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formState.email || ''} onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))} disabled={isEditMode} />
            </div>
            <div>
              <Label htmlFor="employee_id">Employee ID</Label>
              <Input id="employee_id" value={formState.employee_id || ''} onChange={(e) => setFormState((s) => ({ ...s, employee_id: e.target.value }))} disabled={isEditMode} />
            </div>
            <div>
              <Label htmlFor="joined_date">Joined Date</Label>
              <Input id="joined_date" type="date" value={formState.joined_date || ''} onChange={(e) => setFormState((s) => ({ ...s, joined_date: e.target.value }))} disabled={isEditMode} />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={formState.department || ''} onChange={(e) => setFormState((s) => ({ ...s, department: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={formState.position || ''} onChange={(e) => setFormState((s) => ({ ...s, position: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formState.phone || ''} onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formState.status || 'active'} onValueChange={(v) => setFormState((s) => ({ ...s, status: v as Employee['status'] }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="base_salary">Base Salary</Label>
              <Input id="base_salary" type="number" step="0.01" value={formState.base_salary !== undefined && formState.base_salary !== null ? String(formState.base_salary) : ''} onChange={(e) => {
                const v = e.target.value;
                const n = v === '' ? undefined : Number(v);
                setFormState((s) => ({ ...s, base_salary: n as any }));
              }} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={formState.address || ''} onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))} />
            </div>
          </div>

          {formError && (
            <div className="text-red-600 text-sm px-1">{formError}</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditMode ? 'Save Changes' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


