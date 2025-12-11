#!/bin/bash
# Script to update DATABASE_URL and run migrations + backend

set -e  # Exit on error

cd "$(dirname "$0")"

echo "=========================================="
echo "HRMS Platform - Database & Backend Setup"
echo "=========================================="
echo ""

# Check if password is provided as argument
if [ -z "$1" ]; then
    echo "⚠️  DATABASE_URL needs your actual password!"
    echo ""
    echo "Usage: ./run_all.sh YOUR_DATABASE_PASSWORD"
    echo ""
    echo "Or update .env file manually:"
    echo "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.dwzxawcllpolpezulpun.supabase.co:5432/postgres"
    echo ""
    echo "To get your password:"
    echo "  1. Go to Supabase Dashboard → Settings → Database"
    echo "  2. Find 'Connection string' or reset password"
    echo ""
    exit 1
fi

DB_PASSWORD="$1"
PROJECT_REF="dwzxawcllpolpezulpun"

# URL-encode the password to handle special characters like @, #, etc.
# Using Python's urllib.parse.quote for proper encoding
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DB_PASSWORD', safe=''))")
DATABASE_URL="postgresql://postgres:${ENCODED_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "📝 Updating DATABASE_URL in .env file..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
else
    # Linux
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
fi
echo "✓ Updated DATABASE_URL"
echo ""

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Run migrations
echo ""
echo "=========================================="
echo "Running Database Migrations..."
echo "=========================================="
python run_migrations.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Migrations failed! Please check the error above."
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Migrations completed successfully!"
echo "=========================================="
echo ""

# Ask if user wants to start backend
read -p "Start backend server? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "=========================================="
    echo "Starting Backend Server..."
    echo "=========================================="
    echo "Backend will be available at: http://localhost:8000"
    echo "API docs at: http://localhost:8000/docs"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi

