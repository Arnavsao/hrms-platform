-- Migration: Add HRMS core modules
-- This migration adds tables for attendance, payroll, performance reviews, and leave management

-- ============================================
-- 1. Attendance Management
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    check_in TIMESTAMPTZ DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'present', -- present, absent, late, half-day, remote
    notes TEXT,
    location JSONB, -- GPS coordinates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- ============================================
-- 2. Leave Management
-- ============================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    leave_type VARCHAR(50) NOT NULL, -- sick, vacation, personal, maternity, paternity
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID,
    rejected_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Leave balance tracking
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL UNIQUE,
    vacation_days INTEGER DEFAULT 20,
    sick_days INTEGER DEFAULT 10,
    personal_days INTEGER DEFAULT 5,
    used_vacation INTEGER DEFAULT 0,
    used_sick INTEGER DEFAULT 0,
    used_personal INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON leave_balances(employee_id);

-- ============================================
-- 3. Payroll Processing
-- ============================================
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    salary_month DATE NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL,
    allowances DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processed, paid
    payslip_url TEXT,
    notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(salary_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);

-- Employee salary information
CREATE TABLE IF NOT EXISTS employee_salary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL UNIQUE,
    base_salary DECIMAL(12,2) NOT NULL,
    allowances DECIMAL(12,2) DEFAULT 0,
    bank_account TEXT,
    tax_id TEXT,
    joined_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_salary_employee_id ON employee_salary(employee_id);

-- ============================================
-- 4. Performance Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewed_by UUID, -- Manager who reviewed
    status VARCHAR(20) DEFAULT 'draft', -- draft, self-review, manager-review, completed
    
    -- Self-review section
    self_review TEXT,
    achievements JSONB,
    challenges JSONB,
    goals_next_period TEXT,
    
    -- Manager review section
    manager_review TEXT,
    technical_score INTEGER CHECK (technical_score >= 0 AND technical_score <= 100),
    communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
    teamwork_score INTEGER CHECK (teamwork_score >= 0 AND teamwork_score <= 100),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    feedback TEXT,
    recommendations TEXT,
    bonus_amount DECIMAL(12,2),
    promotion_recommendation BOOLEAN DEFAULT FALSE,
    
    -- AI-generated insights
    ai_summary TEXT,
    strengths TEXT[],
    areas_for_improvement TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON performance_reviews(review_period_start, review_period_end);

-- ============================================
-- 5. Employees table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE, -- Link to auth.users
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- HR ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id UUID,
    hire_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, terminated
    profile_image_url TEXT,
    address JSONB,
    emergency_contact JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);

-- ============================================
-- 6. Add Foreign Keys
-- ============================================
-- Add foreign keys if tables exist
DO $$ 
BEGIN
    -- Attendance -> Employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE attendance 
        ADD CONSTRAINT fk_attendance_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Leave Requests -> Employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE leave_requests 
        ADD CONSTRAINT fk_leave_requests_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Leave Balances -> Employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE leave_balances 
        ADD CONSTRAINT fk_leave_balances_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Payroll -> Employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE payroll 
        ADD CONSTRAINT fk_payroll_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Employee Salary -> Employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE employee_salary 
        ADD CONSTRAINT fk_employee_salary_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Performance Reviews -> Employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE performance_reviews 
        ADD CONSTRAINT fk_performance_reviews_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- 7. Enable RLS and Create Policies
-- ============================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Simple policies for development (should be more restrictive in production)
CREATE POLICY IF NOT EXISTS "employees_read_all" ON employees FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "employees_insert_all" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "employees_update_all" ON employees FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "attendance_read_all" ON attendance FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "attendance_insert_all" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "attendance_update_all" ON attendance FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "leave_read_all" ON leave_requests FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "leave_insert_all" ON leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "leave_update_all" ON leave_requests FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "payroll_read_all" ON payroll FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "payroll_insert_all" ON payroll FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "payroll_update_all" ON payroll FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "performance_read_all" ON performance_reviews FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "performance_insert_all" ON performance_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "performance_update_all" ON performance_reviews FOR UPDATE USING (true);

-- ============================================
-- 8. Create Functions for Auto-updating timestamps
-- ============================================
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_salary_updated_at BEFORE UPDATE ON employee_salary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

