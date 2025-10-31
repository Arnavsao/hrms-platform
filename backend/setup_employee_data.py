"""
Script to create employee user and add mock data for employee portal
Email: employee@gmail.com
Password: 123456
"""

import os
from datetime import datetime, timedelta, date
from supabase import create_client, Client
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fixed employee ID for consistency (valid UUID format)
EMPLOYEE_ID = "e1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c"
EMPLOYEE_EMAIL = "employee@gmail.com"
EMPLOYEE_PASSWORD = "123456"

def create_employee_user():
    """Create employee user in Supabase Auth"""
    print("Creating employee user in Supabase Auth...")
    try:
        # Create user using admin API
        user = supabase.auth.admin.create_user({
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD,
            "email_confirm": True,
            "user_metadata": {
                "role": "employee",
                "name": "John Smith"
            }
        })
        print(f"✓ User created with ID: {user.user.id}")
        return user.user.id
    except Exception as e:
        print(f"Note: User might already exist. Error: {str(e)}")
        # Try to get existing user
        try:
            response = supabase.table("employees").select("user_id").eq("email", EMPLOYEE_EMAIL).execute()
            if response.data and response.data[0].get("user_id"):
                print(f"✓ Using existing user")
                return response.data[0]["user_id"]
        except:
            pass
        return None

def insert_employee_record(user_id=None):
    """Insert employee record"""
    print("Inserting employee record...")
    try:
        data = {
            "id": EMPLOYEE_ID,
            "employee_id": "EMP001",
            "name": "John Smith",
            "email": EMPLOYEE_EMAIL,
            "phone": "+1-234-567-8900",
            "department": "Engineering",
            "position": "Senior Software Engineer",
            "joined_date": "2023-01-15",
            "status": "active",
            "base_salary": 95000.00,
            "address": "123 Main St, San Francisco, CA 94102",
            "emergency_contact": {
                "name": "Jane Smith",
                "relationship": "Spouse",
                "phone": "+1-234-567-8901"
            }
        }

        # Try insert, if exists try update
        try:
            result = supabase.table("employees").insert(data).execute()
            print("✓ Employee record created")
        except:
            result = supabase.table("employees").upsert(data).execute()
            print("✓ Employee record updated")
        return True
    except Exception as e:
        print(f"✗ Error inserting employee: {str(e)}")
        return False

def insert_salary_info():
    """Insert salary information - Note: base_salary is now in employees table"""
    print("Salary information is included in employee record...")
    # base_salary is already part of employees table, so no separate insert needed
    return True

def insert_leave_balance():
    """Insert leave balance"""
    print("Inserting leave balance...")
    try:
        current_year = datetime.now().year
        data = {
            "employee_id": EMPLOYEE_ID,
            "year": current_year,
            "vacation_days": 20,
            "sick_days": 10,
            "personal_days": 5,
            "used_vacation": 8,
            "used_sick": 2,
            "used_personal": 1
        }
        supabase.table("leave_balances").upsert(data).execute()
        print("✓ Leave balance added")
        return True
    except Exception as e:
        print(f"✗ Error inserting leave balance: {str(e)}")
        return False

def insert_attendance_records():
    """Insert attendance records for last 30 days"""
    print("Inserting attendance records...")
    try:
        records = []
        today = date.today()

        for i in range(30):
            check_date = today - timedelta(days=i)
            # Skip weekends
            if check_date.weekday() >= 5:
                continue

            status = "present"
            notes = None

            if i % 10 == 0:
                status = "remote"
                notes = "Working from home"
            elif i % 15 == 0:
                status = "late"
                notes = "Traffic delay"

            check_in = datetime.combine(check_date, datetime.min.time().replace(hour=9))
            check_out = datetime.combine(check_date, datetime.min.time().replace(hour=18))

            records.append({
                "employee_id": EMPLOYEE_ID,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "date": check_date.isoformat(),
                "status": status,
                "notes": notes
            })

        # Insert in batches
        supabase.table("attendance").upsert(records).execute()
        print(f"✓ {len(records)} attendance records added")
        return True
    except Exception as e:
        print(f"✗ Error inserting attendance: {str(e)}")
        return False

def insert_payroll_records():
    """Insert payroll records for last 6 months"""
    print("Inserting payroll records...")
    try:
        records = []
        today = date.today()

        for i in range(6):
            salary_month = today - timedelta(days=30 * i)
            salary_month = salary_month.replace(day=1)

            status = "paid"
            notes = "Successfully processed"

            if i == 0:
                status = "pending"
                notes = "Current month payroll - pending processing"
            elif i == 1:
                status = "processed"

            # Calculate monthly amounts from annual salary
            monthly_base = 95000.00 / 12
            monthly_allowances = 5000.00 / 12
            monthly_tax = 18000.00 / 12
            monthly_net = 80000.00 / 12
            
            records.append({
                "employee_id": EMPLOYEE_ID,
                "salary_month": salary_month.isoformat(),
                "base_salary": round(monthly_base, 2),
                "allowances": round(monthly_allowances, 2),
                "deductions": 2000.00,  # Monthly deduction
                "tax": round(monthly_tax, 2),
                "net_salary": round(monthly_net, 2),
                "status": status,
                "notes": notes
            })

        supabase.table("payroll").upsert(records).execute()
        print(f"✓ {len(records)} payroll records added")
        return True
    except Exception as e:
        print(f"✗ Error inserting payroll: {str(e)}")
        return False

def insert_leave_requests():
    """Insert leave requests"""
    print("Inserting leave requests...")
    try:
        today = date.today()

        requests = [
            {
                "employee_id": EMPLOYEE_ID,
                "leave_type": "vacation",
                "start_date": (today + timedelta(days=10)).isoformat(),
                "end_date": (today + timedelta(days=14)).isoformat(),
                "duration_days": 5,
                "reason": "Family vacation to Hawaii",
                "status": "pending",
                "submitted_at": (datetime.now() - timedelta(days=2)).isoformat()
            },
            {
                "employee_id": EMPLOYEE_ID,
                "leave_type": "sick",
                "start_date": (today - timedelta(days=15)).isoformat(),
                "end_date": (today - timedelta(days=14)).isoformat(),
                "duration_days": 2,
                "reason": "Flu and fever",
                "status": "approved",
                "submitted_at": (datetime.now() - timedelta(days=16)).isoformat()
            },
            {
                "employee_id": EMPLOYEE_ID,
                "leave_type": "personal",
                "start_date": (today - timedelta(days=30)).isoformat(),
                "end_date": (today - timedelta(days=30)).isoformat(),
                "duration_days": 1,
                "reason": "Personal matters",
                "status": "approved",
                "submitted_at": (datetime.now() - timedelta(days=32)).isoformat()
            },
            {
                "employee_id": EMPLOYEE_ID,
                "leave_type": "vacation",
                "start_date": (today - timedelta(days=90)).isoformat(),
                "end_date": (today - timedelta(days=85)).isoformat(),
                "duration_days": 5,
                "reason": "Summer break",
                "status": "approved",
                "submitted_at": (datetime.now() - timedelta(days=95)).isoformat()
            }
        ]

        supabase.table("leave_requests").upsert(requests).execute()
        print(f"✓ {len(requests)} leave requests added")
        return True
    except Exception as e:
        print(f"✗ Error inserting leave requests: {str(e)}")
        return False

def insert_performance_review():
    """Insert performance review"""
    print("Inserting performance review...")
    try:
        today = date.today()

        data = {
            "employee_id": EMPLOYEE_ID,
            "review_period_start": (today - timedelta(days=180)).isoformat(),
            "review_period_end": today.isoformat(),
            "status": "completed",
            "self_review": "This period has been very productive. I've successfully delivered multiple projects and improved team processes.",
            "achievements": [
                {"title": "Led microservices migration", "impact": "Reduced deployment time by 40%"},
                {"title": "Mentored 3 junior developers", "impact": "Improved team velocity"},
                {"title": "Implemented CI/CD pipeline", "impact": "Automated testing and deployment"}
            ],
            "challenges": [
                {"challenge": "Legacy code refactoring", "resolution": "Gradual migration strategy"},
                {"challenge": "Tight deadlines", "resolution": "Better time management and prioritization"}
            ],
            "goals_next_period": "Focus on system architecture and explore cloud-native technologies. Lead more cross-functional initiatives.",
            "manager_review": "John has been an exceptional contributor this period. His technical skills and leadership have been instrumental in our team's success.",
            "technical_score": 4,  # Changed to 1-5 scale per schema
            "communication_score": 4,
            "teamwork_score": 5,
            "overall_score": 4,
            "feedback": "Excellent performance. John shows strong technical capabilities and leadership potential. His contributions have significantly improved our development processes.",
            "recommendations": "Consider for promotion to Tech Lead role. Recommend advanced architecture training.",
            "ai_summary": "John Smith demonstrates excellent technical proficiency and leadership qualities. Shows strong problem-solving skills and ability to mentor junior team members. His contributions to process improvements have had measurable impact on team productivity.",
            "strengths": ["Technical expertise", "Leadership", "Problem solving", "Mentoring", "Process improvement"],
            "areas_for_improvement": ["Time management under pressure", "Delegation skills", "Public speaking"]
        }

        supabase.table("performance_reviews").insert(data).execute()
        print("✓ Performance review added")
        return True
    except Exception as e:
        print(f"✗ Error inserting performance review: {str(e)}")
        return False

def main():
    """Main function to run all insertions"""
    print("\n" + "="*60)
    print("Employee Portal Mock Data Setup")
    print("="*60)
    print(f"\nCredentials:")
    print(f"Email: {EMPLOYEE_EMAIL}")
    print(f"Password: {EMPLOYEE_PASSWORD}")
    print("\n" + "="*60 + "\n")

    # Create user
    user_id = create_employee_user()

    # Insert data
    insert_employee_record(user_id)
    insert_salary_info()
    insert_leave_balance()
    insert_attendance_records()
    insert_payroll_records()
    insert_leave_requests()
    insert_performance_review()

    print("\n" + "="*60)
    print("Setup Complete!")
    print("="*60)
    print(f"\nYou can now login with:")
    print(f"Email: {EMPLOYEE_EMAIL}")
    print(f"Password: {EMPLOYEE_PASSWORD}")
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
