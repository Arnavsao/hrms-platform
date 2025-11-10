"""
Test the employee endpoint directly to see the actual error
"""

import asyncio
from app.api.employees import list_employees
from app.core.supabase_client import get_supabase_client

async def test_endpoint():
    print("Testing employee endpoint...")
    try:
        supabase = get_supabase_client()
        result = await list_employees(
            department=None,
            status=None,
            search=None,
            supabase=supabase
        )
        print(f"✓ Success! Retrieved {len(result)} employees")
        for emp in result[:3]:
            print(f"  - {emp.get('name')} - {emp.get('department')}")
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_endpoint())
