-- Combined Migration File
-- Run this file to set up the complete database schema
-- This combines 001_init.sql and 002_rls.sql

-- ============================================
-- PART 1: Initial Schema (001_init.sql)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    resume_url TEXT,
    parsed_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Applications table (links candidates to jobs)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    fit_score NUMERIC(5,2) CHECK (fit_score >= 0 AND fit_score <= 100),
    highlights JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_fit_score ON applications(fit_score DESC);

-- Screenings table (AI screening results)
CREATE TABLE IF NOT EXISTS screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    transcript TEXT,
    ai_summary JSONB,
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    mode VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster application lookups
CREATE INDEX IF NOT EXISTS idx_screenings_application ON screenings(application_id);

-- Digital Footprints table (scraped data from external sources)
CREATE TABLE IF NOT EXISTS digital_footprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    github_data JSONB,
    linkedin_data JSONB,
    portfolio_data JSONB,
    last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id)
);

-- Index for faster candidate lookups
CREATE INDEX IF NOT EXISTS idx_digital_footprints_candidate ON digital_footprints(candidate_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables to auto-update updated_at
DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_screenings_updated_at ON screenings;
CREATE TRIGGER update_screenings_updated_at
    BEFORE UPDATE ON screenings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_digital_footprints_updated_at ON digital_footprints;
CREATE TRIGGER update_digital_footprints_updated_at
    BEFORE UPDATE ON digital_footprints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
DROP VIEW IF EXISTS candidate_applications_view;
CREATE VIEW candidate_applications_view AS
SELECT 
    c.id as candidate_id,
    c.name,
    c.email,
    j.id as job_id,
    j.title as job_title,
    a.id as application_id,
    a.fit_score,
    a.status as application_status,
    a.created_at as applied_at
FROM candidates c
JOIN applications a ON c.id = a.candidate_id
JOIN jobs j ON a.job_id = j.id;

DROP VIEW IF EXISTS top_candidates_per_job;
CREATE VIEW top_candidates_per_job AS
SELECT 
    j.id as job_id,
    j.title as job_title,
    c.id as candidate_id,
    c.name,
    c.email,
    a.fit_score,
    a.id as application_id,
    ROW_NUMBER() OVER (PARTITION BY j.id ORDER BY a.fit_score DESC) as rank
FROM jobs j
JOIN applications a ON j.id = a.job_id
JOIN candidates c ON a.candidate_id = c.id
WHERE a.fit_score IS NOT NULL;

-- ============================================
-- PART 2: Row Level Security (002_rls.sql)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_footprints ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
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

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Admins have full access to candidates" ON candidates;
DROP POLICY IF EXISTS "Recruiters can view all candidates" ON candidates;
DROP POLICY IF EXISTS "Candidates can view their own profile" ON candidates;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON candidates;
DROP POLICY IF EXISTS "Anyone can create candidate profile" ON candidates;

DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
DROP POLICY IF EXISTS "Recruiters can create jobs" ON jobs;
DROP POLICY IF EXISTS "Recruiters can update jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON jobs;

DROP POLICY IF EXISTS "Recruiters can view all applications" ON applications;
DROP POLICY IF EXISTS "Candidates can view their own applications" ON applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON applications;
DROP POLICY IF EXISTS "Recruiters can update applications" ON applications;

DROP POLICY IF EXISTS "Recruiters can view all screenings" ON screenings;
DROP POLICY IF EXISTS "Candidates can view their own screenings" ON screenings;
DROP POLICY IF EXISTS "Recruiters can manage screenings" ON screenings;

DROP POLICY IF EXISTS "Recruiters can view all digital footprints" ON digital_footprints;
DROP POLICY IF EXISTS "Candidates can view their own digital footprint" ON digital_footprints;
DROP POLICY IF EXISTS "System can manage digital footprints" ON digital_footprints;

-- CANDIDATES TABLE POLICIES
CREATE POLICY "Admins have full access to candidates"
ON candidates
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Recruiters can view all candidates"
ON candidates
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "Candidates can view their own profile"
ON candidates
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = get_user_id()));

CREATE POLICY "Candidates can update their own profile"
ON candidates
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = get_user_id()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = get_user_id()));

CREATE POLICY "Anyone can create candidate profile"
ON candidates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- JOBS TABLE POLICIES
CREATE POLICY "Anyone can view active jobs"
ON jobs
FOR SELECT
TO authenticated
USING (status = 'active');

CREATE POLICY "Recruiters can create jobs"
ON jobs
FOR INSERT
TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "Recruiters can update jobs"
ON jobs
FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "Admins can delete jobs"
ON jobs
FOR DELETE
TO authenticated
USING (get_user_role() = 'admin');

-- APPLICATIONS TABLE POLICIES
CREATE POLICY "Recruiters can view all applications"
ON applications
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "Candidates can view their own applications"
ON applications
FOR SELECT
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM candidates WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

CREATE POLICY "Candidates can create applications"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (
    candidate_id IN (
        SELECT id FROM candidates WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

CREATE POLICY "Recruiters can update applications"
ON applications
FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- SCREENINGS TABLE POLICIES
CREATE POLICY "Recruiters can view all screenings"
ON screenings
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "Candidates can view their own screenings"
ON screenings
FOR SELECT
TO authenticated
USING (
    application_id IN (
        SELECT a.id FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        WHERE c.email = (SELECT email FROM auth.users WHERE id = get_user_id())
    )
);

CREATE POLICY "Recruiters can manage screenings"
ON screenings
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- DIGITAL FOOTPRINTS TABLE POLICIES
CREATE POLICY "Recruiters can view all digital footprints"
ON digital_footprints
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "Candidates can view their own digital footprint"
ON digital_footprints
FOR SELECT
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM candidates WHERE email = (
            SELECT email FROM auth.users WHERE id = get_user_id()
        )
    )
);

CREATE POLICY "System can manage digital footprints"
ON digital_footprints
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- Grant access to views
GRANT SELECT ON candidate_applications_view TO authenticated;
GRANT SELECT ON top_candidates_per_job TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
END $$;

