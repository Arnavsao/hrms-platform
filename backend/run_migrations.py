 #!/usr/bin/env python3
"""
Migration runner script for Supabase database.
Runs SQL migration files in order against the configured database.
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.core.config import settings

def run_migration_file(conn, migration_file: Path):
    """
    Execute a single migration file.
    
    Args:
        conn: PostgreSQL connection object
        migration_file: Path to the SQL migration file
        
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"Running migration: {migration_file.name}")
    print(f"{'='*60}")
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split by semicolons but preserve function definitions
        # This is a simple approach - for complex SQL, you might need a proper parser
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        
        print(f"✓ Successfully executed {migration_file.name}")
        return True
        
    except Exception as e:
        print(f"✗ Error executing {migration_file.name}: {str(e)}")
        conn.rollback()
        return False

def main():
    """Main function to run all migrations."""
    # Get database URL from settings
    database_url = settings.DATABASE_URL
    
    # Check if DATABASE_URL is still a placeholder
    if 'user:password@host:port' in database_url or database_url == 'postgresql://user:password@host:port/database':
        print("ERROR: DATABASE_URL is not configured properly.")
        print("Please update the DATABASE_URL in your .env file with the actual database connection string.")
        print("\nFormat: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres")
        sys.exit(1)
    
    # Get migrations directory
    backend_dir = Path(__file__).parent
    migrations_dir = backend_dir.parent / 'supabase' / 'migrations'
    
    if not migrations_dir.exists():
        print(f"ERROR: Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Get all migration files sorted by name, but exclude combined_migration.sql
    # (it's a convenience file that combines 001 and 002)
    all_files = sorted(migrations_dir.glob('*.sql'))
    migration_files = [f for f in all_files if f.name != 'combined_migration.sql']
    
    # If only combined_migration.sql exists, use it
    if not migration_files and any(f.name == 'combined_migration.sql' for f in all_files):
        migration_files = [f for f in all_files if f.name == 'combined_migration.sql']
        print("⚠️  Using combined_migration.sql (individual migration files not found)")
    
    if not migration_files:
        print(f"ERROR: No migration files found in {migrations_dir}")
        sys.exit(1)
    
    print(f"Found {len(migration_files)} migration file(s)")
    for mf in migration_files:
        print(f"  - {mf.name}")
    
    # Connect to database
    print(f"\nConnecting to database...")
    try:
        # Add SSL mode if not present (required for Supabase)
        if 'sslmode' not in database_url:
            separator = '&' if '?' in database_url else '?'
            database_url = f"{database_url}{separator}sslmode=require"
        
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✓ Connected to database successfully")
    except Exception as e:
        print(f"✗ Failed to connect to database: {str(e)}")
        sys.exit(1)
    
    # Run migrations in order
    success_count = 0
    for migration_file in migration_files:
        if run_migration_file(conn, migration_file):
            success_count += 1
        else:
            print(f"\n✗ Migration failed. Stopping.")
            conn.close()
            sys.exit(1)
    
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"✓ All migrations completed successfully ({success_count}/{len(migration_files)})")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()

