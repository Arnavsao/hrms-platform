-- Migration: Add digital_footprints and screenings tables
-- This migration sets up the database schema for AI-powered HRMS

-- ============================================
-- 1. digital_footprints table
-- ============================================
CREATE TABLE IF NOT EXISTS digital_footprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    github_data JSONB,
    linkedin_data JSONB,
    portfolio_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id)
);

-- ============================================
-- 2. screenings table
-- ============================================
CREATE TABLE IF NOT EXISTS screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    transcript TEXT,
    ai_summary JSONB,
    communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
    domain_knowledge_score INTEGER CHECK (domain_knowledge_score >= 0 AND domain_knowledge_score <= 100),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Update existing tables if needed
-- ============================================

-- Ensure candidates table exists with required fields
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    resume_url TEXT,
    parsed_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure jobs table exists
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure applications table exists with fit_score
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
    highlights JSONB,
    status TEXT DEFAULT 'applied',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- ============================================
-- 4. Create indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_digital_footprints_candidate_id ON digital_footprints(candidate_id);
CREATE INDEX IF NOT EXISTS idx_screenings_application_id ON screenings(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_fit_score ON applications(fit_score);

-- ============================================
-- 5. Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE digital_footprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Create policies (simplified for development)
-- In production, you'd want more restrictive policies
-- ============================================

-- Policies for digital_footprints
CREATE POLICY IF NOT EXISTS "digital_footprints_read_all" ON digital_footprints
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "digital_footprints_insert_all" ON digital_footprints
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "digital_footprints_update_all" ON digital_footprints
    FOR UPDATE USING (true);

-- Policies for screenings
CREATE POLICY IF NOT EXISTS "screenings_read_all" ON screenings
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "screenings_insert_all" ON screenings
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "screenings_update_all" ON screenings
    FOR UPDATE USING (true);

-- Policies for applications
CREATE POLICY IF NOT EXISTS "applications_read_all" ON applications
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "applications_insert_all" ON applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "applications_update_all" ON applications
    FOR UPDATE USING (true);

-- Policies for candidates
CREATE POLICY IF NOT EXISTS "candidates_read_all" ON candidates
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "candidates_insert_all" ON candidates
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "candidates_update_all" ON candidates
    FOR UPDATE USING (true);

-- Policies for jobs
CREATE POLICY IF NOT EXISTS "jobs_read_all" ON jobs
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "jobs_insert_all" ON jobs
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "jobs_update_all" ON jobs
    FOR UPDATE USING (true);

-- ============================================
-- 7. Create functions for auto-updating timestamps
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_digital_footprints_updated_at BEFORE UPDATE ON digital_footprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screenings_updated_at BEFORE UPDATE ON screenings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

