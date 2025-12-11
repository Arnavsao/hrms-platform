# Database Migration Guide

This guide will help you set up and run database migrations for your HRMS platform.

## Prerequisites

1. **Supabase Project**: You should have a Supabase project created
2. **Database Password**: You need your Supabase database password
3. **Service Role Key**: Backend service role key (not publishable key)

## Step 1: Get Your Supabase Database Password

You have two options:

### Option A: Get from Connection String (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `dwzxawcllpolpezulpun`
3. Navigate to: **Settings** → **Database**
4. Scroll to **Connection string** section
5. Copy the password from the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
   ```

### Option B: Reset Database Password

1. Go to: **Settings** → **Database**
2. Click **Reset Database Password**
3. Copy the new password (save it securely!)

## Step 2: Update Your .env File

You need to update the `DATABASE_URL` in your `.env` file with your actual database password.

### Method 1: Using the Update Script (Recommended)

```bash
cd backend
./update_db_url.sh YOUR_DATABASE_PASSWORD
```

Replace `YOUR_DATABASE_PASSWORD` with the password you got from Step 1.

### Method 2: Manual Update

Edit `backend/.env` and update this line:

```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
```

Replace `YOUR_PASSWORD` with your actual database password.

## Step 3: Verify Service Role Key

Make sure your `SUPABASE_KEY` in `.env` is the **service role key** (not publishable key).

- ✅ Service role key starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- ❌ Publishable key starts with: `sb_publishable_...` or `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (but has `"role":"anon"`)

To get your service role key:
1. Go to: **Settings** → **API**
2. Find **service_role** key (⚠️ Keep this secret!)
3. Copy it to your `.env` file

## Step 4: Run Migrations

Once your `DATABASE_URL` is configured, run the migrations:

```bash
cd backend

# Activate virtual environment (if using one)
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Run migrations
python run_migrations.py
```

The script will:
1. Connect to your Supabase database
2. Run `001_init.sql` (creates tables, indexes, triggers, views)
3. Run `002_rls.sql` (sets up Row Level Security policies)
4. Show success/failure for each migration

## Expected Output

```
Found 2 migration file(s)
  - 001_init.sql
  - 002_rls.sql

Connecting to database...
✓ Connected to database successfully

============================================================
Running migration: 001_init.sql
============================================================
✓ Successfully executed 001_init.sql

============================================================
Running migration: 002_rls.sql
============================================================
✓ Successfully executed 002_rls.sql

============================================================
✓ All migrations completed successfully (2/2)
============================================================
```

## What Gets Created

### Tables Created:
- `candidates` - Candidate profiles and resume data
- `jobs` - Job postings
- `applications` - Candidate-job applications with AI fit scores
- `screenings` - AI screening results
- `digital_footprints` - Scraped data from external profiles

### Security:
- Row Level Security (RLS) policies for role-based access
- Helper functions for JWT token parsing

### Views:
- `candidate_applications_view` - Candidate applications with scores
- `top_candidates_per_job` - Top candidates per job

## Troubleshooting

### Error: "DATABASE_URL is not configured properly"
- Make sure you've updated the `DATABASE_URL` in `.env` with your actual password
- Check that the format is correct: `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`

### Error: "Failed to connect to database"
- Verify your database password is correct
- Check that your Supabase project is active
- Ensure your IP is not blocked (check Supabase dashboard → Settings → Database → Connection Pooling)

### Error: "relation already exists"
- Tables already exist in your database
- This is okay if you're re-running migrations (they use `CREATE TABLE IF NOT EXISTS`)
- If you want to start fresh, you can drop tables manually or reset your database

### Error: "permission denied"
- Make sure you're using the `postgres` user (not a restricted user)
- Verify your database password is correct

## Alternative: Using Supabase Dashboard

If you prefer, you can run migrations directly in the Supabase Dashboard:

1. Go to: **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_init.sql`
3. Paste and run it
4. Copy the contents of `supabase/migrations/002_rls.sql`
5. Paste and run it

## Next Steps

After migrations are complete:
1. Verify tables were created: Check Supabase Dashboard → **Table Editor**
2. Test your backend API: Start your FastAPI server
3. Test authentication: Try logging in through your frontend

## Need Help?

- Check Supabase docs: https://supabase.com/docs
- Review migration files in `supabase/migrations/`
- Check backend logs for detailed error messages

