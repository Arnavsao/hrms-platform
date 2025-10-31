"""
Script to automatically create employee portal tables by executing the migration SQL
This script reads the migration file and executes it via Supabase API
"""

import os
import sys
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env")
    sys.exit(1)

# Get the migration file path
project_root = Path(__file__).parent.parent
migration_file = project_root / "supabase" / "migrations" / "003_employee_portal.sql"

if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    print("Please make sure the file exists at: supabase/migrations/003_employee_portal.sql")
    sys.exit(1)

# Read the migration SQL
try:
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
except Exception as e:
    print(f"❌ Error reading migration file: {e}")
    sys.exit(1)

print("\n" + "="*60)
print("Creating Employee Portal Tables")
print("="*60)
print(f"\n📄 Migration file: {migration_file}")
print(f"🔗 Supabase URL: {SUPABASE_URL[:30]}...")
print("\n⚠️  NOTE: This script uses the Supabase REST API.")
print("   For better results, use Method 1 (Supabase Dashboard) or Method 2 (Supabase CLI)")
print("\n" + "="*60 + "\n")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Split SQL into individual statements (simple approach)
    # Note: Supabase REST API doesn't support executing raw SQL directly
    # We'll need to use the SQL execution endpoint if available
    
    print("⚠️  The Supabase REST API doesn't support executing raw SQL.")
    print("   Please use one of these methods instead:")
    print("\n   Method 1: Supabase Dashboard")
    print("   1. Go to Supabase Dashboard → SQL Editor")
    print(f"   2. Open: {migration_file}")
    print("   3. Copy and paste the SQL, then Run")
    print("\n   Method 2: Supabase CLI")
    print("   supabase db push")
    print("\n" + "="*60)
    print("\n📋 The SQL migration is ready at:")
    print(f"   {migration_file}")
    print("\n" + "="*60 + "\n")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\n💡 Recommendation: Use Supabase Dashboard SQL Editor")
    print("   1. Go to https://app.supabase.com")
    print("   2. Select your project → SQL Editor")
    print(f"   3. Open {migration_file}")
    print("   4. Copy and paste, then execute")
    sys.exit(1)

