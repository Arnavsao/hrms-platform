#!/usr/bin/env python3
"""
Utility script to create the 'resumes' storage bucket in Supabase.

This script ensures the storage bucket exists for resume uploads.
Run this if you encounter "Bucket not found" errors.

Usage:
    python create_storage_bucket.py
"""

import sys
import os
from app.core.supabase_client import get_supabase_client, ensure_storage_bucket_exists
from app.core.logging import get_logger

logger = get_logger(__name__)

def main():
    """Main function to create the storage bucket."""
    print("\n" + "="*60)
    print("HRMS Platform - Storage Bucket Setup")
    print("="*60)
    print()
    
    try:
        # Get Supabase client
        print("Connecting to Supabase...")
        supabase = get_supabase_client()
        print("✓ Connected to Supabase")
        print()
        
        # Ensure bucket exists
        bucket_name = "resumes"
        print(f"Ensuring storage bucket '{bucket_name}' exists...")
        
        ensure_storage_bucket_exists(bucket_name, supabase)
        
        print()
        print("="*60)
        print("✓ Storage bucket setup complete!")
        print("="*60)
        print()
        print(f"Bucket '{bucket_name}' is ready for resume uploads.")
        print()
        print("Note: If you still encounter errors, you may need to:")
        print("  1. Check your Supabase project settings")
        print("  2. Verify RLS policies allow bucket access")
        print("  3. Create the bucket manually in Supabase Dashboard:")
        print("     - Go to Storage → New bucket")
        print("     - Name: 'resumes'")
        print("     - Public: Yes")
        print()
        
        return 0
        
    except Exception as e:
        print()
        print("="*60)
        print("❌ Error creating storage bucket")
        print("="*60)
        print()
        print(f"Error: {str(e)}")
        print()
        print("Manual setup instructions:")
        print("  1. Go to your Supabase Dashboard")
        print("  2. Navigate to Storage")
        print("  3. Click 'New bucket'")
        print("  4. Name: 'resumes'")
        print("  5. Set as Public: Yes")
        print("  6. Click 'Create bucket'")
        print()
        return 1

if __name__ == "__main__":
    sys.exit(main())
