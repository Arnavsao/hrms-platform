-- Employee Portal Database Schema
-- This migration creates tables for employee management, attendance, payroll, performance, and leave

-- Enable UUID extension (already enabled but ensuring)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- Company employee ID (like EMP001)
    joined_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, on_leave, terminated
    base_salary DECIMAL(12, 2) NOT NULL,
    manager_id UUID REFERENCES employees(id),
    address TEXT,
    date_of_birth DATE,
    emergency_contact JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'present', -- present, absent, late, half-day, remote
    location JSONB, -- GPS coordinates or location data
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYROLL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    salary_month DATE NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    allowances DECIMAL(12, 2) DEFAULT 0,
    deductions DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, paid
    payslip_url TEXT,
    notes TEXT,
    processed_by UUID REFERENCES employees(id),
    processed_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, salary_month)
);

-- ============================================
-- PERFORMANCE REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewed_by UUID REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'draft', -- draft, self-review, manager-review, completed
    self_review TEXT,
    achievements JSONB,
    challenges JSONB,
    goals_next_period TEXT,
    manager_review TEXT,
    technical_score INT CHECK (technical_score >= 0 AND technical_score <= 5),
    communication_score INT CHECK (communication_score >= 0 AND communication_score <= 5),
    teamwork_score INT CHECK (teamwork_score >= 0 AND teamwork_score <= 5),
    overall_score INT CHECK (overall_score >= 0 AND overall_score <= 5),
    feedback TEXT,
    recommendations TEXT,
    bonus_amount DECIMAL(12, 2),
    promotion_recommendation BOOLEAN DEFAULT false,
    ai_summary TEXT,
    strengths TEXT[],
    areas_for_improvement TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LEAVE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- sick, vacation, personal, maternity, paternity
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES employees(id),
    rejected_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LEAVE BALANCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    vacation_days INT DEFAULT 20,
    sick_days INT DEFAULT 10,
    personal_days INT DEFAULT 5,
    used_vacation INT DEFAULT 0,
    used_sick INT DEFAULT 0,
    used_personal INT DEFAULT 0,
    year INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, year)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Employees indexes
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_manager ON employees(manager_id);

-- Attendance indexes
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);

-- Payroll indexes
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_month ON payroll(salary_month);
CREATE INDEX idx_payroll_status ON payroll(status);

-- Performance reviews indexes
CREATE INDEX idx_performance_employee ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviewer ON performance_reviews(reviewed_by);
CREATE INDEX idx_performance_status ON performance_reviews(status);
CREATE INDEX idx_performance_period ON performance_reviews(review_period_start, review_period_end);

-- Leave requests indexes
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_type ON leave_requests(leave_type);

-- ============================================
-- TRIGGER FUNCTION
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp for employees
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for attendance
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for payroll
CREATE TRIGGER update_payroll_updated_at
    BEFORE UPDATE ON payroll
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for performance_reviews
CREATE TRIGGER update_performance_reviews_updated_at
    BEFORE UPDATE ON performance_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for leave_requests
CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for leave_balances
CREATE TRIGGER update_leave_balances_updated_at
    BEFORE UPDATE ON leave_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Employee with manager details
CREATE OR REPLACE VIEW employee_hierarchy AS
SELECT
    e.id,
    e.name,
    e.email,
    e.department,
    e.position,
    e.employee_id,
    e.status,
    m.id as manager_id,
    m.name as manager_name,
    m.email as manager_email
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- Monthly attendance summary
CREATE OR REPLACE VIEW monthly_attendance_summary AS
SELECT
    e.id as employee_id,
    e.name as employee_name,
    DATE_TRUNC('month', a.date) as month,
    COUNT(*) as total_days,
    COUNT(*) FILTER (WHERE a.status = 'present') as present_days,
    COUNT(*) FILTER (WHERE a.status = 'absent') as absent_days,
    COUNT(*) FILTER (WHERE a.status = 'late') as late_days,
    COUNT(*) FILTER (WHERE a.status = 'remote') as remote_days,
    ROUND(COUNT(*) FILTER (WHERE a.status IN ('present', 'remote', 'late'))::numeric / COUNT(*) * 100, 2) as attendance_percentage
FROM employees e
LEFT JOIN attendance a ON e.id = a.employee_id
GROUP BY e.id, e.name, DATE_TRUNC('month', a.date);

-- Employee leave summary
CREATE OR REPLACE VIEW employee_leave_summary AS
SELECT
    e.id as employee_id,
    e.name as employee_name,
    lb.vacation_days,
    lb.sick_days,
    lb.personal_days,
    lb.used_vacation,
    lb.used_sick,
    lb.used_personal,
    (lb.vacation_days - lb.used_vacation) as available_vacation,
    (lb.sick_days - lb.used_sick) as available_sick,
    (lb.personal_days - lb.used_personal) as available_personal,
    COUNT(lr.id) FILTER (WHERE lr.status = 'pending') as pending_requests
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id
LEFT JOIN leave_requests lr ON e.id = lr.employee_id
GROUP BY e.id, e.name, lb.vacation_days, lb.sick_days, lb.personal_days, lb.used_vacation, lb.used_sick, lb.used_personal;

-- Recent performance scores
CREATE OR REPLACE VIEW recent_performance_scores AS
SELECT
    e.id as employee_id,
    e.name as employee_name,
    pr.id as review_id,
    pr.review_period_start,
    pr.review_period_end,
    pr.overall_score,
    pr.technical_score,
    pr.communication_score,
    pr.teamwork_score,
    pr.status,
    ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY pr.review_period_end DESC) as review_rank
FROM employees e
LEFT JOIN performance_reviews pr ON e.id = pr.employee_id
WHERE pr.status = 'completed';

-- ============================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================

-- Helper function to get user role from JWT
-- These functions are needed by the RLS policies below
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        'candidate'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user ID from JWT
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- EMPLOYEES POLICIES

-- Admins can do everything with employees
CREATE POLICY "Admins have full access to employees"
ON employees
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- HR (recruiters) can view all employees
CREATE POLICY "HR can view all employees"
ON employees
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Employees can view their own profile
CREATE POLICY "Employees can view their own profile"
ON employees
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = get_user_id()));

-- Employees can update their own basic info
CREATE POLICY "Employees can update their own profile"
ON employees
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = get_user_id()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = get_user_id()));

-- ATTENDANCE POLICIES

-- Admins and HR can view all attendance
CREATE POLICY "Admins and HR can view all attendance"
ON attendance
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Employees can view their own attendance
CREATE POLICY "Employees can view their own attendance"
ON attendance
FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- Employees can create their own attendance
CREATE POLICY "Employees can create attendance"
ON attendance
FOR INSERT
TO authenticated
WITH CHECK (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- Employees can update their own attendance (for checkout)
CREATE POLICY "Employees can update their own attendance"
ON attendance
FOR UPDATE
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- PAYROLL POLICIES

-- Admins and HR can manage all payroll
CREATE POLICY "Admins and HR can manage payroll"
ON payroll
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- Employees can view their own payroll
CREATE POLICY "Employees can view their own payroll"
ON payroll
FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- PERFORMANCE REVIEWS POLICIES

-- Admins and HR can view all reviews
CREATE POLICY "Admins and HR can view all performance reviews"
ON performance_reviews
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Employees can view their own reviews
CREATE POLICY "Employees can view their own reviews"
ON performance_reviews
FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- Employees can update their own reviews (for self-review)
CREATE POLICY "Employees can update their own reviews"
ON performance_reviews
FOR UPDATE
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    ) AND status IN ('draft', 'self-review')
);

-- Admins and HR can create and manage reviews
CREATE POLICY "Admins and HR can manage performance reviews"
ON performance_reviews
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- LEAVE REQUESTS POLICIES

-- Admins and HR can view all leave requests
CREATE POLICY "Admins and HR can view all leave requests"
ON leave_requests
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Employees can view their own leave requests
CREATE POLICY "Employees can view their own leave requests"
ON leave_requests
FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- Employees can create leave requests
CREATE POLICY "Employees can create leave requests"
ON leave_requests
FOR INSERT
TO authenticated
WITH CHECK (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- Admins and HR can update leave requests (approve/reject)
CREATE POLICY "Admins and HR can update leave requests"
ON leave_requests
FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- LEAVE BALANCES POLICIES

-- Admins and HR can view all leave balances
CREATE POLICY "Admins and HR can view all leave balances"
ON leave_balances
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Employees can view their own leave balance
CREATE POLICY "Employees can view their own leave balance"
ON leave_balances
FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM employees WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

-- Admins and HR can manage leave balances
CREATE POLICY "Admins and HR can manage leave balances"
ON leave_balances
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON employee_hierarchy TO authenticated;
GRANT SELECT ON monthly_attendance_summary TO authenticated;
GRANT SELECT ON employee_leave_summary TO authenticated;
GRANT SELECT ON recent_performance_scores TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE employees IS 'Stores employee information and details';
COMMENT ON TABLE attendance IS 'Tracks daily employee attendance with check-in/check-out';
COMMENT ON TABLE payroll IS 'Manages employee salary and payroll processing';
COMMENT ON TABLE performance_reviews IS 'Stores employee performance reviews and evaluations';
COMMENT ON TABLE leave_requests IS 'Manages employee leave requests and approvals';
COMMENT ON TABLE leave_balances IS 'Tracks available leave balances for employees';
