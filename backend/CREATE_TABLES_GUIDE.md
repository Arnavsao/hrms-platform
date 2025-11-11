# How to Create Employee Portal Tables in Supabase

## Method 1: Using Supabase Dashboard (Easiest) ⭐ Recommended

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration**
   - Open the file: `supabase/migrations/003_employee_portal.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter / Cmd+Enter)

4. **Verify Tables Created**
   - Go to **Table Editor** in the left sidebar
   - You should see these tables:
     - `employees`
     - `attendance`
     - `leave_requests`
     - `leave_balances`
     - `payroll`
     - `performance_reviews`

---

## Method 2: Using Supabase CLI

### Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### Login and Link Project
```bash
# Login to Supabase
supabase login

# Link to your project (get project-ref from Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF
```

### Push Migrations
```bash
# Navigate to project root
cd /Users/arnavsao/Desktop/Developer/hrms-platform

# Push all migrations (will apply 003_employee_portal.sql)
supabase db push
```

---

## Method 3: Using Python Script (Automated)

I'll create a script that reads the migration file and executes it via Supabase API.

```bash
cd backend
source venv/bin/activate
python create_tables.py
```

---

## Method 4: Using psql (Direct Database Connection)

### Get Database Connection String
1. Go to Supabase Dashboard → Settings → Database
2. Find **Connection string** → **URI**
3. Copy the connection string

### Run Migration
```bash
cd /Users/arnavsao/Desktop/Developer/hrms-platform

# Replace with your actual connection string
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/003_employee_portal.sql
```

---

## Quick Verification

After running the migration, verify tables exist:

```bash
cd backend
source venv/bin/activate
python check_tables.py
```

All tables should show ✅ instead of ❌.

---

## Troubleshooting

### Error: "relation already exists"
- The tables may already exist. Check with `check_tables.py`
- The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

### Error: "permission denied"
- Make sure you're using the service role key (not anon key) for admin operations
- Or run via Supabase Dashboard SQL Editor which has admin privileges

### Error: "function update_updated_at_column() does not exist"
- This function should be created by earlier migrations
- Make sure you've run migrations in order: 001_init.sql, 002_rls.sql, then 003_employee_portal.sql

