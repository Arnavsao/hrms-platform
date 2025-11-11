-- Mock data for employee portal
-- Email: employee@gmail.com
-- Password: 123456
-- 
-- IMPORTANT: Make sure you've run the migration file first:
-- supabase/migrations/003_employee_portal.sql
--
-- Step 1: Create user in Supabase Auth (via Dashboard or using Supabase client)
-- After running this SQL, create the auth user with:
--    - Email: employee@gmail.com
--    - Password: 123456    
--    - User metadata: {"role": "employee"}

-- Step 2: Insert employee record (uses 'name' not first_name/last_name)
INSERT INTO employees (
    id,
    employee_id,
    name,
    email,
    phone,
    department,
    position,
    joined_date,
    status,
    base_salary,
    address,
    emergency_contact
) VALUES (
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    'EMP001',
    'John Smith',
    'employee@gmail.com',
    '+1-234-567-8900',
    'Engineering',
    'Senior Software Engineer',
    '2023-01-15',
    'active',
    95000.00,
    '123 Main St, San Francisco, CA 94102',
    '{"name": "Jane Smith", "relationship": "Spouse", "phone": "+1-234-567-8901"}'::jsonb
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    status = EXCLUDED.status,
    base_salary = EXCLUDED.base_salary;

-- Step 3: Insert leave balance (must include 'year' field)
INSERT INTO leave_balances (
    employee_id,
    year,
    vacation_days,
    sick_days,
    personal_days,
    used_vacation,
    used_sick,
    used_personal
) VALUES (
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    EXTRACT(YEAR FROM CURRENT_DATE),
    20,
    10,
    5,
    8,
    2,
    1
) ON CONFLICT (employee_id, year) DO UPDATE SET
    vacation_days = EXCLUDED.vacation_days,
    sick_days = EXCLUDED.sick_days,
    personal_days = EXCLUDED.personal_days,
    used_vacation = EXCLUDED.used_vacation,
    used_sick = EXCLUDED.used_sick,
    used_personal = EXCLUDED.used_personal;

-- Step 4: Insert attendance records (last 30 days, weekdays only)
INSERT INTO attendance (employee_id, check_in, check_out, date, status, notes)
SELECT
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    ((current_date - i)::date + time '09:00:00')::timestamptz,
    ((current_date - i)::date + time '18:00:00')::timestamptz,
    (current_date - i)::date,
    CASE
        WHEN i % 10 = 0 THEN 'remote'
        WHEN i % 15 = 0 THEN 'late'
        ELSE 'present'
    END,
    CASE
        WHEN i % 10 = 0 THEN 'Working from home'
        WHEN i % 15 = 0 THEN 'Traffic delay'
        ELSE NULL
    END
FROM generate_series(0, 29) AS i
WHERE extract(dow from (current_date - i)::date) NOT IN (0, 6) -- Exclude weekends
ON CONFLICT DO NOTHING;

-- Step 5: Insert payroll records (last 6 months)
-- Note: salary_month should be the first day of the month
INSERT INTO payroll (
    employee_id,
    salary_month,
    base_salary,
    allowances,
    deductions,
    tax,
    net_salary,
    status,
    notes
)
SELECT
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    (date_trunc('month', current_date) - (i || ' months')::interval)::date,
    95000.00 / 12,  -- Monthly base salary
    5000.00 / 12,   -- Monthly allowances
    2000.00,        -- Monthly deductions
    18000.00 / 12,  -- Monthly tax
    80000.00 / 12,  -- Monthly net salary
    CASE
        WHEN i = 0 THEN 'pending'
        WHEN i = 1 THEN 'processed'
        ELSE 'paid'
    END,
    CASE
        WHEN i = 0 THEN 'Current month payroll - pending processing'
        ELSE 'Successfully processed'
    END
FROM generate_series(0, 5) AS i
ON CONFLICT (employee_id, salary_month) DO NOTHING;

-- Step 6: Insert leave requests
INSERT INTO leave_requests (
    employee_id,
    leave_type,
    start_date,
    end_date,
    duration_days,
    reason,
    status,
    submitted_at
) VALUES
(
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    'vacation',
    current_date + interval '10 days',
    current_date + interval '14 days',
    5,
    'Family vacation to Hawaii',
    'pending',
    current_timestamp - interval '2 days'
),
(
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    'sick',
    current_date - interval '15 days',
    current_date - interval '14 days',
    2,
    'Flu and fever',
    'approved',
    current_timestamp - interval '16 days'
),
(
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    'personal',
    current_date - interval '30 days',
    current_date - interval '30 days',
    1,
    'Personal matters',
    'approved',
    current_timestamp - interval '32 days'
),
(
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    'vacation',
    current_date - interval '90 days',
    current_date - interval '85 days',
    5,
    'Summer break',
    'approved',
    current_timestamp - interval '95 days'
)
ON CONFLICT DO NOTHING;

-- Step 7: Insert performance review
-- Note: Performance scores are on a 1-5 scale (not 0-100)
INSERT INTO performance_reviews (
    employee_id,
    review_period_start,
    review_period_end,
    status,
    self_review,
    achievements,
    challenges,
    goals_next_period,
    manager_review,
    technical_score,
    communication_score,
    teamwork_score,
    overall_score,
    feedback,
    recommendations,
    ai_summary,
    strengths,
    areas_for_improvement
) VALUES (
    'e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    (current_date - interval '6 months')::date,
    current_date,
    'completed',
    'This period has been very productive. I''ve successfully delivered multiple projects and improved team processes.',
    '[
        {"title": "Led microservices migration", "impact": "Reduced deployment time by 40%"},
        {"title": "Mentored 3 junior developers", "impact": "Improved team velocity"},
        {"title": "Implemented CI/CD pipeline", "impact": "Automated testing and deployment"}
    ]'::jsonb,
    '[
        {"challenge": "Legacy code refactoring", "resolution": "Gradual migration strategy"},
        {"challenge": "Tight deadlines", "resolution": "Better time management and prioritization"}
    ]'::jsonb,
    'Focus on system architecture and explore cloud-native technologies. Lead more cross-functional initiatives.',
    'John has been an exceptional contributor this period. His technical skills and leadership have been instrumental in our team''s success.',
    4,  -- Technical score (1-5 scale)
    4,  -- Communication score (1-5 scale)
    5,  -- Teamwork score (1-5 scale)
    4,  -- Overall score (1-5 scale)
    'Excellent performance. John shows strong technical capabilities and leadership potential. His contributions have significantly improved our development processes.',
    'Consider for promotion to Tech Lead role. Recommend advanced architecture training.',
    'John Smith demonstrates excellent technical proficiency and leadership qualities. Shows strong problem-solving skills and ability to mentor junior team members. His contributions to process improvements have had measurable impact on team productivity.',
    ARRAY['Technical expertise', 'Leadership', 'Problem solving', 'Mentoring', 'Process improvement'],
    ARRAY['Time management under pressure', 'Delegation skills', 'Public speaking']
)
ON CONFLICT DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- After running this SQL:
-- 1. Go to Supabase Dashboard -> Authentication -> Users
-- 2. Create user with:
--    - Email: employee@gmail.com
--    - Password: 123456
--    - User metadata: {"role": "employee"}
-- 3. The employee should now be able to login and access the portal
-- 
-- Note: The employee table uses 'name' (full name) not first_name/last_name
-- Note: The employee table includes 'base_salary' directly (not in separate table)
-- Note: Performance scores are on a 1-5 scale
-- Note: Leave balances require a 'year' field
