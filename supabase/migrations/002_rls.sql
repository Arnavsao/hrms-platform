-- Row Level Security (RLS) Policies
-- This migration sets up role-based access control

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

-- ============================================
-- CANDIDATES TABLE POLICIES
-- ============================================

-- Admins can do everything with candidates
CREATE POLICY "Admins have full access to candidates"
ON candidates
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- Recruiters can view all candidates
CREATE POLICY "Recruiters can view all candidates"
ON candidates
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Candidates can view their own profile
CREATE POLICY "Candidates can view their own profile"
ON candidates
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = get_user_id()));

-- Candidates can update their own profile
CREATE POLICY "Candidates can update their own profile"
ON candidates
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = get_user_id()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = get_user_id()));

-- Anyone can insert candidates (for registration)
CREATE POLICY "Anyone can create candidate profile"
ON candidates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- JOBS TABLE POLICIES
-- ============================================

-- Everyone can view active jobs
CREATE POLICY "Anyone can view active jobs"
ON jobs
FOR SELECT
TO authenticated
USING (status = 'active');

-- Recruiters and Admins can create jobs
CREATE POLICY "Recruiters can create jobs"
ON jobs
FOR INSERT
TO authenticated
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- Recruiters and Admins can update jobs
CREATE POLICY "Recruiters can update jobs"
ON jobs
FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- Only Admins can delete jobs
CREATE POLICY "Admins can delete jobs"
ON jobs
FOR DELETE
TO authenticated
USING (get_user_role() = 'admin');

-- ============================================
-- APPLICATIONS TABLE POLICIES
-- ============================================

-- Admins and Recruiters can view all applications
CREATE POLICY "Recruiters can view all applications"
ON applications
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Candidates can view their own applications
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

-- Candidates can create applications
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

-- Recruiters can update applications (for scoring)
CREATE POLICY "Recruiters can update applications"
ON applications
FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- ============================================
-- SCREENINGS TABLE POLICIES
-- ============================================

-- Admins and Recruiters can view all screenings
CREATE POLICY "Recruiters can view all screenings"
ON screenings
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Candidates can view their own screening results
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

-- Recruiters can create and update screenings
CREATE POLICY "Recruiters can manage screenings"
ON screenings
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- ============================================
-- DIGITAL FOOTPRINTS TABLE POLICIES
-- ============================================

-- Admins and Recruiters can view all digital footprints
CREATE POLICY "Recruiters can view all digital footprints"
ON digital_footprints
FOR SELECT
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'));

-- Candidates can view their own digital footprint
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

-- System can insert/update digital footprints (service role)
CREATE POLICY "System can manage digital footprints"
ON digital_footprints
FOR ALL
TO authenticated
USING (get_user_role() IN ('admin', 'recruiter'))
WITH CHECK (get_user_role() IN ('admin', 'recruiter'));

-- ============================================
-- VIEWS RLS
-- ============================================

-- Note: Views inherit RLS from their base tables
-- Additional policies can be added if needed

-- Grant access to views
GRANT SELECT ON candidate_applications_view TO authenticated;
GRANT SELECT ON top_candidates_per_job TO authenticated;

-- Comments
COMMENT ON FUNCTION get_user_role() IS 'Extract user role from JWT token';
COMMENT ON FUNCTION get_user_id() IS 'Extract user ID from JWT token';

