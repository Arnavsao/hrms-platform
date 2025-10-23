# Supabase Database Setup

This directory contains database migrations for the AI-Powered HRMS system.

## Migrations

### 001_init.sql
Initial database schema including:
- `candidates` - Candidate profiles and resume data
- `jobs` - Job postings
- `applications` - Candidate applications with AI fit scores
- `screenings` - AI screening results
- `digital_footprints` - Scraped data from GitHub, LinkedIn, etc.

Also includes:
- Indexes for performance
- Triggers for automatic timestamp updates
- Views for common queries

### 002_rls.sql
Row Level Security (RLS) policies for role-based access control:
- **Admin**: Full access to all data
- **Recruiter**: Can view candidates, manage jobs, view/update applications and screenings
- **Candidate**: Can view/update own profile, apply to jobs, view own applications

## Running Migrations

### Using Supabase CLI

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Apply migrations**
   ```bash
   supabase db push
   ```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of each migration file
4. Run them in order (001, then 002)

### Using Direct SQL Connection

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f migrations/001_init.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f migrations/002_rls.sql
```

## Schema Overview

```
candidates
├── id (UUID, PK)
├── name
├── email (unique)
├── resume_url
├── parsed_data (JSONB)
└── timestamps

jobs
├── id (UUID, PK)
├── title
├── description
├── requirements
├── status
└── timestamps

applications
├── id (UUID, PK)
├── candidate_id (FK)
├── job_id (FK)
├── fit_score (0-100)
├── highlights (JSONB)
├── status
└── timestamps

screenings
├── id (UUID, PK)
├── application_id (FK)
├── transcript
├── ai_summary (JSONB)
├── score (0-100)
├── mode (text/voice)
└── timestamps

digital_footprints
├── id (UUID, PK)
├── candidate_id (FK)
├── github_data (JSONB)
├── linkedin_data (JSONB)
├── portfolio_data (JSONB)
└── timestamps
```

## User Roles

Configure user roles in Supabase Auth by adding custom claims:

```sql
-- Example: Set user role in auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "recruiter"}'
WHERE email = 'recruiter@example.com';
```

Available roles:
- `admin` - Full system access
- `recruiter` - Can manage jobs and view candidates
- `candidate` - Can apply and view own data

## Testing

After running migrations, test the setup:

```sql
-- Test candidate insertion
INSERT INTO candidates (name, email) 
VALUES ('Test User', 'test@example.com');

-- Test job creation
INSERT INTO jobs (title, description, requirements) 
VALUES ('Software Engineer', 'Great opportunity', 'Python, SQL');

-- Test views
SELECT * FROM candidate_applications_view;
SELECT * FROM top_candidates_per_job;
```

