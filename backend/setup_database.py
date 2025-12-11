#!/usr/bin/env python3
"""
Database setup script for Supabase migrations.
This script helps configure and run database migrations.
"""
import os
import sys
from pathlib import Path
import getpass

def get_supabase_credentials():
    """
    Prompt user for Supabase credentials if not already set.
    
    Returns:
        tuple: (database_url, supabase_url, supabase_key)
    """
    print("\n" + "="*60)
    print("Supabase Database Configuration")
    print("="*60)
    
    # Get Supabase URL from environment or prompt
    supabase_url = os.getenv('SUPABASE_URL', '').strip()
    if not supabase_url or 'your-project' in supabase_url:
        supabase_url = input("\nEnter your Supabase URL (e.g., https://xxxxx.supabase.co): ").strip()
        if not supabase_url:
            print("ERROR: Supabase URL is required")
            sys.exit(1)
    
    # Extract project reference from URL
    project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '').strip()
    
    # Get database password
    print(f"\nTo get your database password:")
    print(f"1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/{project_ref}")
    print(f"2. Navigate to: Settings > Database")
    print(f"3. Find the 'Connection string' section")
    print(f"4. Copy the password from the connection string")
    print(f"\nAlternatively, reset your database password in Settings > Database > Reset Database Password")
    
    db_password = getpass.getpass("\nEnter your Supabase database password: ").strip()
    if not db_password:
        print("ERROR: Database password is required")
        sys.exit(1)
    
    # Construct DATABASE_URL
    database_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
    
    # Get Supabase Key (service role key for backend)
    supabase_key = os.getenv('SUPABASE_KEY', '').strip()
    if not supabase_key or 'your-service-key' in supabase_key or supabase_key.startswith('sb_publishable_'):
        print(f"\n⚠️  Warning: Your SUPABASE_KEY appears to be a publishable key.")
        print(f"For backend operations, you need the SERVICE ROLE KEY (not publishable key).")
        print(f"\nTo get your service role key:")
        print(f"1. Go to: Settings > API")
        print(f"2. Find 'service_role' key (keep it secret!)")
        print(f"3. Copy the key")
        
        use_existing = input("\nDo you want to enter a new service role key? (y/n): ").strip().lower()
        if use_existing == 'y':
            supabase_key = getpass.getpass("Enter your Supabase SERVICE ROLE KEY: ").strip()
            if not supabase_key:
                print("ERROR: Service role key is required")
                sys.exit(1)
    
    return database_url, supabase_url, supabase_key, project_ref

def update_env_file(database_url: str, supabase_url: str, supabase_key: str):
    """
    Update the .env file with the provided credentials.
    
    Args:
        database_url: PostgreSQL connection string
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
    """
    env_file = Path(__file__).parent / '.env'
    
    if not env_file.exists():
        print(f"ERROR: .env file not found at {env_file}")
        sys.exit(1)
    
    # Read current .env file
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    # Update values
    updated_lines = []
    for line in lines:
        if line.startswith('DATABASE_URL='):
            updated_lines.append(f'DATABASE_URL={database_url}\n')
        elif line.startswith('SUPABASE_URL=') and not line.strip().startswith('#'):
            updated_lines.append(f'SUPABASE_URL={supabase_url}\n')
        elif line.startswith('SUPABASE_KEY=') and not line.strip().startswith('#'):
            updated_lines.append(f'SUPABASE_KEY={supabase_key}\n')
        else:
            updated_lines.append(line)
    
    # Write back to .env file
    with open(env_file, 'w') as f:
        f.writelines(updated_lines)
    
    print(f"\n✓ Updated .env file with database credentials")

def main():
    """Main function to set up database configuration."""
    print("\n" + "="*60)
    print("HRMS Platform - Database Setup")
    print("="*60)
    
    # Check if DATABASE_URL is already configured
    current_db_url = os.getenv('DATABASE_URL', '')
    if current_db_url and 'user:password@host:port' not in current_db_url:
        print("\n✓ DATABASE_URL appears to be configured")
        use_existing = input("Do you want to reconfigure? (y/n): ").strip().lower()
        if use_existing != 'y':
            print("Using existing configuration...")
            return
    
    # Get credentials
    database_url, supabase_url, supabase_key, project_ref = get_supabase_credentials()
    
    # Update .env file
    update_env_file(database_url, supabase_url, supabase_key)
    
    # Set environment variables for current session
    os.environ['DATABASE_URL'] = database_url
    os.environ['SUPABASE_URL'] = supabase_url
    os.environ['SUPABASE_KEY'] = supabase_key
    
    print("\n" + "="*60)
    print("Configuration Complete!")
    print("="*60)
    print(f"\nSupabase Project: {project_ref}")
    print(f"Database URL: postgresql://postgres:***@{project_ref}.supabase.co:5432/postgres")
    print(f"\nNext step: Run migrations with:")
    print(f"  python run_migrations.py")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

