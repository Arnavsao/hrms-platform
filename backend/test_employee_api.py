"""
Quick test script to verify employee API endpoints
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

print(f"Connecting to Supabase...")
print(f"URL: {SUPABASE_URL}")
print(f"Key: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "No key")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("\nTesting employee query...")
try:
    result = supabase.table("employees").select("id, name, email, department, position, status").limit(5).execute()

    if result.data:
        print(f"\n✓ Successfully retrieved {len(result.data)} employees:")
        for emp in result.data:
            print(f"  - {emp['name']} ({emp['email']}) - {emp['department']}")
    else:
        print("✗ No employees found")

except Exception as e:
    print(f"✗ Error: {str(e)}")

print("\nTesting count...")
try:
    result = supabase.table("employees").select("id", count="exact").execute()
    print(f"✓ Total employees in database: {result.count}")
except Exception as e:
    print(f"✗ Error counting: {str(e)}")
