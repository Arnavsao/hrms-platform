#!/usr/bin/env python3
"""
Migration runner script for Supabase database using Supabase REST API.
Runs SQL migration files in order using Supabase's SQL execution endpoint.
"""
import os
import sys
from pathlib import Path
import httpx
from app.core.config import settings

def run_migration_file_via_api(migration_file: Path, supabase_url: str, supabase_key: str):
    """
    Execute a single migration file using Supabase REST API.
    
    Args:
        migration_file: Path to the SQL migration file
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"Running migration: {migration_file.name}")
    print(f"{'='*60}")
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Supabase REST API endpoint for executing SQL
        # Note: This requires the service role key (not anon key)
        api_url = f"{supabase_url}/rest/v1/rpc/exec_sql"
        
        # Alternative: Use Supabase Management API if available
        # For now, we'll use a direct approach with httpx
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }
        
        # Split SQL into statements (simple approach)
        # For complex SQL with functions, we might need to handle differently
        statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
        
        # Note: Supabase doesn't have a direct REST endpoint for raw SQL execution
        # We need to use psql or the Supabase dashboard
        # This is a placeholder - we'll need DATABASE_URL for psycopg2
        
        print(f"⚠ Note: Supabase REST API doesn't support direct SQL execution.")
        print(f"   Please use one of these methods:")
        print(f"   1. Set DATABASE_URL in .env and use run_migrations.py")
        print(f"   2. Use Supabase Dashboard SQL Editor")
        print(f"   3. Use psql with connection string")
        
        return False
        
    except Exception as e:
        print(f"✗ Error reading {migration_file.name}: {str(e)}")
        return False

def main():
    """Main function to run all migrations."""
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_KEY
    
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL or SUPABASE_KEY not configured.")
        sys.exit(1)
    
    # Get migrations directory
    backend_dir = Path(__file__).parent
    migrations_dir = backend_dir.parent / 'supabase' / 'migrations'
    
    if not migrations_dir.exists():
        print(f"ERROR: Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Get all migration files sorted by name
    migration_files = sorted(migrations_dir.glob('*.sql'))
    
    if not migration_files:
        print(f"ERROR: No migration files found in {migrations_dir}")
        sys.exit(1)
    
    print(f"Found {len(migration_files)} migration file(s)")
    for mf in migration_files:
        print(f"  - {mf.name}")
    
    print("\n⚠ Supabase REST API doesn't support direct SQL execution.")
    print("Please use one of these alternatives:\n")
    
    print("Option 1: Use DATABASE_URL with psql")
    print("  Set DATABASE_URL in .env file:")
    print("  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres")
    print("  Then run: python run_migrations.py\n")
    
    print("Option 2: Use Supabase Dashboard")
    print("  1. Go to https://supabase.com/dashboard")
    print("  2. Select your project")
    print("  3. Go to SQL Editor")
    print("  4. Copy and paste the contents of each migration file")
    print("  5. Run them in order (001_init.sql, then 002_rls.sql)\n")
    
    print("Option 3: Use psql directly")
    project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')
    print(f"  psql 'postgresql://postgres:[PASSWORD]@db.{project_ref}.supabase.co:5432/postgres' -f supabase/migrations/001_init.sql")
    print(f"  psql 'postgresql://postgres:[PASSWORD]@db.{project_ref}.supabase.co:5432/postgres' -f supabase/migrations/002_rls.sql\n")
    
    sys.exit(1)

if __name__ == "__main__":
    main()

