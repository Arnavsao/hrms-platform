"""
Quick script to check if employee portal tables exist in Supabase
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env")
    exit(1)

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# List of tables to check
tables_to_check = [
    "employees",
    "attendance",
    "leave_requests",
    "leave_balances",
    "payroll",
    "performance_reviews"
]

print("\n" + "="*60)
print("Checking Employee Portal Tables in Supabase")
print("="*60 + "\n")

for table_name in tables_to_check:
    try:
        # Try to query the table (limit 1 for efficiency)
        response = supabase.table(table_name).select("*").limit(1).execute()
        print(f"✅ {table_name:25s} - EXISTS (found {len(response.data)} row(s))")
    except Exception as e:
        error_msg = str(e)
        if "PGRST205" in error_msg or "does not exist" in error_msg or "schema cache" in error_msg:
            print(f"❌ {table_name:25s} - DOES NOT EXIST")
        else:
            print(f"⚠️  {table_name:25s} - ERROR: {error_msg}")

print("\n" + "="*60)
print("Summary")
print("="*60)
print("\nIf any tables show ❌, you need to run the migration:")
print("  File: supabase/migrations/003_employee_portal.sql")
print("\nTo run the migration:")
print("  1. Go to Supabase Dashboard → SQL Editor")
print("  2. Copy the contents of supabase/migrations/003_employee_portal.sql")
print("  3. Paste and execute in the SQL Editor")
print("="*60 + "\n")

