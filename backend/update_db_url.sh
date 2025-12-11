#!/bin/bash
# Quick script to update DATABASE_URL in .env file
# Usage: ./update_db_url.sh <database_password>

if [ -z "$1" ]; then
    echo "Usage: ./update_db_url.sh <database_password>"
    echo ""
    echo "To get your database password:"
    echo "1. Go to Supabase Dashboard > Settings > Database"
    echo "2. Find 'Connection string' or reset password"
    exit 1
fi

DB_PASSWORD="$1"
PROJECT_REF="dwzxawcllpolpezulpun"  # From your SUPABASE_URL

# URL-encode the password to handle special characters like @, #, etc.
# Using Python's urllib.parse.quote for proper encoding
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DB_PASSWORD', safe=''))")
DATABASE_URL="postgresql://postgres:${ENCODED_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Update .env file
if [ -f .env ]; then
    # Use sed to replace DATABASE_URL line
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
    else
        # Linux
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
    fi
    echo "✓ Updated DATABASE_URL in .env file"
    echo "Database URL: postgresql://postgres:***@db.${PROJECT_REF}.supabase.co:5432/postgres"
else
    echo "ERROR: .env file not found"
    exit 1
fi

