# Employee Portal Mock Data Setup

## ⚠️ Important: Run Database Migrations First

The employee portal tables need to be created in your Supabase database before adding mock data.

### Step 1: Run the Employee Portal Migration

**CRITICAL**: You must run the correct migration file. The employee portal uses a specific schema.

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy the contents of `supabase/migrations/003_employee_portal.sql` file
6. Paste it into the SQL editor
7. Click **Run** to execute the migration

This will create the following tables:
- `employees` (with `name`, `joined_date`, `base_salary` fields)
- `attendance`
- `leave_requests`
- `leave_balances` (with `year` field)
- `payroll`
- `performance_reviews`

**Schema Notes:**
- Employees table uses `name` (full name), NOT `first_name`/`last_name`
- Employees table uses `joined_date`, NOT `hire_date`
- `base_salary` is stored directly in the `employees` table
- Leave balances require a `year` field
- Performance scores are on a 1-5 scale (not 0-100)

### Step 2: Create Employee User in Supabase Auth

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** or **Invite User**
3. Create user with:
   - **Email**: `employee@gmail.com`
   - **Password**: `123456`
   - **User Metadata**: `{"role": "employee"}`

### Step 3: Add Mock Data

After running the migration, you have two options:

#### Option A: Use Python Script (Recommended)
```bash
cd backend
source venv/bin/activate  # If using virtual environment
python setup_employee_data.py
```

The script will:
- Create/update the employee user in Supabase Auth
- Insert employee record with all details
- Add leave balance, attendance, payroll, leave requests, and performance review

#### Option B: Use SQL Script
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/employee_mock_data.sql`
3. Paste and run the SQL
4. Then manually create the auth user as described in Step 2

### Step 4: Verify Setup

1. Check that the employee record exists:
```sql
SELECT * FROM employees WHERE email = 'employee@gmail.com';
```

2. Check that leave balance was created:
```sql
SELECT * FROM leave_balances WHERE employee_id = 'e1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o';
```

3. Check that attendance records were created:
```sql
SELECT COUNT(*) FROM attendance WHERE employee_id = 'e1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o';
```

### Step 5: Login

You can now login to the employee portal with:
- **Email**: `employee@gmail.com`
- **Password**: `123456`

The employee will have access to:
- **Dashboard**: Overview of attendance, leave, payroll
- **Profile**: Personal information and salary details
- **Attendance**: Check-in/out and attendance history (30 days of mock data)
- **Payroll**: Salary slips and payment history (6 months of mock data)
- **Leave**: Leave requests and balance (4 sample requests)
- **Performance**: Performance reviews (1 completed review)

## Mock Data Summary

### Employee Profile
- **Name**: John Smith
- **Employee ID**: EMP001
- **Email**: employee@gmail.com
- **Department**: Engineering
- **Position**: Senior Software Engineer
- **Joined Date**: Jan 15, 2023
- **Base Salary**: $95,000/year
- **Status**: Active

### Attendance
- 30 days of attendance records (weekdays only)
- Mostly "present" status
- Some "remote" and "late" entries
- Regular 9 AM - 6 PM schedule

### Leave Balance (Current Year)
- **Vacation**: 20 days total (8 used, 12 available)
- **Sick**: 10 days total (2 used, 8 available)
- **Personal**: 5 days total (1 used, 4 available)

### Leave Requests
1. **Upcoming vacation** (pending) - 5 days starting in 10 days
2. **Recent sick leave** (approved) - 2 days, 15 days ago
3. **Personal day** (approved) - 1 day, 30 days ago
4. **Past vacation** (approved) - 5 days, 90 days ago

### Payroll
- 6 months of payroll records
- Current month: **Pending**
- Last month: **Processed**
- Previous months: **Paid**
- Monthly net salary: ~$6,667/month (based on $80k annual net)

### Performance Review
- **Period**: Last 6 months
- **Status**: Completed
- **Overall Score**: 4/5
- **Technical**: 4/5
- **Communication**: 4/5
- **Teamwork**: 5/5
- Multiple achievements and goals listed
- Manager feedback and recommendations included

## Troubleshooting

### Error: "relation 'employees' does not exist"
- **Solution**: Run the migration file `supabase/migrations/003_employee_portal.sql` first

### Error: "column 'first_name' does not exist"
- **Solution**: The schema uses `name` (full name), not `first_name`/`last_name`. Make sure you're using the correct migration file.

### Error: "column 'hire_date' does not exist"
- **Solution**: The schema uses `joined_date`, not `hire_date`. Make sure you're using the correct migration file.

### Error: "column 'user_id' does not exist"
- **Solution**: The current schema does not use a `user_id` field in the employees table. User linking is done via email matching.

### Employee profile not found after login
- **Solution**: Make sure the email in the employees table exactly matches the email used for authentication (`employee@gmail.com`)
