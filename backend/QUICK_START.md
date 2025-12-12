# Quick Start - Run Database Migrations

## Step 1: Get Your Supabase Database Password

1. **Open your Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/dwzxawcllpolpezulpun
   - Or navigate to: Settings → Database

2. **Find your database password:**
   - Look for **"Connection string"** section
   - You'll see something like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
     ```
   - Copy the password (the part between `postgres:` and `@`)

   **OR** if you don't see it:
   - Click **"Reset Database Password"**
   - Copy the new password (save it securely!)

## Step 2: Update DATABASE_URL

You have **3 options**:

### Option A: Use the helper script (Easiest)
```bash
cd backend
./update_db_url.sh YOUR_DATABASE_PASSWORD
```

### Option B: Edit .env file manually
```bash
cd backend
# Open .env file and update this line:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres
```

### Option C: Use environment variable (for testing)
```bash
cd backend
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres"
```

## Step 3: Run Migrations

Once DATABASE_URL is configured:

```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python run_migrations.py
```

## Expected Output

You should see:
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

## Step 4: Verify Tables Created

1. Go to Supabase Dashboard → **Table Editor**
2. You should see these tables:
   - ✅ candidates
   - ✅ jobs
   - ✅ applications
   - ✅ screenings
   - ✅ digital_footprints

## Troubleshooting

**Error: "DATABASE_URL is not configured properly"**
- Make sure you replaced `YOUR_PASSWORD` with your actual password
- Check the format is correct

**Error: "Failed to connect to database"**
- Double-check your password is correct
- Verify your Supabase project is active
- Try resetting the database password in Supabase dashboard

**Error: "ModuleNotFoundError: No module named 'psycopg2'"**
- Make sure virtual environment is activated: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

## Need Help?

See `MIGRATION_GUIDE.md` for detailed instructions.

