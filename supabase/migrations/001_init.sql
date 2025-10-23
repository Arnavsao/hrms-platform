-- AI-Powered HRMS Database Schema
-- Initial migration: Create core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Candidates table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    resume_url TEXT,
    parsed_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX idx_candidates_email ON candidates(email);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster status filtering
CREATE INDEX idx_jobs_status ON jobs(status);

-- Applications table (links candidates to jobs)
CREATE TABLE applications (
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
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_fit_score ON applications(fit_score DESC);

-- Screenings table (AI screening results)
CREATE TABLE screenings (
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
CREATE INDEX idx_screenings_application ON screenings(application_id);

-- Digital Footprints table (scraped data from external sources)
CREATE TABLE digital_footprints (
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
CREATE INDEX idx_digital_footprints_candidate ON digital_footprints(candidate_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables to auto-update updated_at
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screenings_updated_at
    BEFORE UPDATE ON screenings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_footprints_updated_at
    BEFORE UPDATE ON digital_footprints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- View: Candidate applications with scores
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

-- View: Top candidates per job
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

-- Comments for documentation
COMMENT ON TABLE candidates IS 'Stores candidate information and parsed resume data';
COMMENT ON TABLE jobs IS 'Stores job postings and requirements';
COMMENT ON TABLE applications IS 'Links candidates to jobs with AI-generated fit scores';
COMMENT ON TABLE screenings IS 'Stores AI screening interview results';
COMMENT ON TABLE digital_footprints IS 'Stores scraped data from candidate online profiles';

