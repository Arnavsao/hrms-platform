"""
Script to create multiple employee users for the admin portal
This will create 15+ employees across different departments
"""

import os
from datetime import datetime, timedelta, date
from supabase import create_client, Client
from dotenv import load_dotenv
import uuid
import random

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Employee data templates
DEPARTMENTS = ["Engineering", "Product", "Design", "Sales", "Marketing", "HR", "Finance", "Operations"]

POSITIONS = {
    "Engineering": ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Engineering Manager", "Tech Lead"],
    "Product": ["Product Manager", "Senior Product Manager", "Product Owner", "Product Analyst"],
    "Design": ["UI/UX Designer", "Senior Designer", "Design Lead", "Product Designer"],
    "Sales": ["Sales Representative", "Senior Sales Executive", "Sales Manager", "Account Executive"],
    "Marketing": ["Marketing Manager", "Content Writer", "SEO Specialist", "Digital Marketing Manager"],
    "HR": ["HR Manager", "Recruiter", "HR Coordinator", "Talent Acquisition Specialist"],
    "Finance": ["Financial Analyst", "Accountant", "Finance Manager", "Controller"],
    "Operations": ["Operations Manager", "Operations Coordinator", "Logistics Manager", "Office Manager"]
}

FIRST_NAMES = ["John", "Sarah", "Michael", "Emily", "David", "Jessica", "Robert", "Ashley", "James", "Jennifer",
               "William", "Amanda", "Richard", "Melissa", "Joseph", "Michelle", "Thomas", "Stephanie", "Christopher", "Nicole"]

LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
              "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"]

STATUSES = ["active", "active", "active", "active", "active", "on_leave", "active", "active"]  # More active employees

def generate_employee_data(index):
    """Generate random employee data"""
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    name = f"{first_name} {last_name}"
    email = f"{first_name.lower()}.{last_name.lower()}{index}@company.com"
    department = random.choice(DEPARTMENTS)
    position = random.choice(POSITIONS[department])
    status = random.choice(STATUSES)

    # Generate join date (between 6 months and 5 years ago)
    days_ago = random.randint(180, 1825)
    joined_date = (date.today() - timedelta(days=days_ago)).isoformat()

    # Generate salary based on position
    base_salary = random.randint(50000, 150000)

    return {
        "id": str(uuid.uuid4()),
        "employee_id": f"EMP{str(index).zfill(3)}",
        "name": name,
        "email": email,
        "phone": f"+1-{random.randint(200, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
        "department": department,
        "position": position,
        "joined_date": joined_date,
        "status": status,
        "base_salary": float(base_salary),
        "address": f"{random.randint(100, 9999)} {random.choice(['Main', 'Oak', 'Maple', 'Park', 'Washington'])} St, San Francisco, CA 941{random.randint(0, 99):02d}",
        "emergency_contact": {
            "name": f"{random.choice(FIRST_NAMES)} {last_name}",
            "relationship": random.choice(["Spouse", "Parent", "Sibling", "Friend"]),
            "phone": f"+1-{random.randint(200, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
        }
    }

def create_employees(count=20):
    """Create multiple employee records"""
    print(f"\n{'='*60}")
    print(f"Creating {count} Employees")
    print(f"{'='*60}\n")

    employees = []

    # Start from EMP002 (EMP001 is already created by setup_employee_data.py)
    for i in range(2, count + 2):
        try:
            employee_data = generate_employee_data(i)

            # Insert employee
            result = supabase.table("employees").upsert(employee_data).execute()

            if result.data:
                employees.append(result.data[0])
                print(f"✓ Created: {employee_data['name']} ({employee_data['employee_id']}) - {employee_data['department']}")

                # Create leave balance for this employee
                current_year = datetime.now().year
                leave_balance = {
                    "employee_id": employee_data['id'],
                    "year": current_year,
                    "vacation_days": 20,
                    "sick_days": 10,
                    "personal_days": 5,
                    "used_vacation": random.randint(0, 10),
                    "used_sick": random.randint(0, 5),
                    "used_personal": random.randint(0, 3)
                }
                supabase.table("leave_balances").upsert(leave_balance).execute()

        except Exception as e:
            print(f"✗ Error creating employee {i}: {str(e)}")

    print(f"\n{'='*60}")
    print(f"Successfully created {len(employees)} employees!")
    print(f"{'='*60}\n")

    # Print summary by department
    print("Department Summary:")
    print("-" * 40)
    dept_count = {}
    for emp in employees:
        dept = emp.get('department', 'Unknown')
        dept_count[dept] = dept_count.get(dept, 0) + 1

    for dept, count in sorted(dept_count.items()):
        print(f"  {dept}: {count} employees")

    print(f"\n{'='*60}\n")

def main():
    """Main function"""
    print("\n" + "="*60)
    print("Multiple Employees Setup")
    print("="*60 + "\n")

    # Create 20 employees
    create_employees(20)

    print("Setup Complete!")
    print("You can now view all employees in the admin portal.\n")

if __name__ == "__main__":
    main()
