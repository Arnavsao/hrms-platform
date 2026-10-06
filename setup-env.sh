#!/bin/bash
# Creates backend/.env and frontend/.env.local from their templates.
# Existing files are left untouched.

set -e
cd "$(dirname "$0")"

if [ -f backend/.env ]; then
  echo "backend/.env already exists, skipping"
else
  SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
  sed "s|^SECRET_KEY=.*|SECRET_KEY=${SECRET}|" backend/env.example > backend/.env
  chmod 600 backend/.env
  echo "Created backend/.env (with a generated SECRET_KEY)"
fi

if [ -f frontend/.env.local ]; then
  echo "frontend/.env.local already exists, skipping"
else
  cp frontend/env.example frontend/.env.local
  chmod 600 frontend/.env.local
  echo "Created frontend/.env.local"
fi

echo ""
echo "Next: fill in the Supabase and Gemini values in both files."
echo "Supabase credentials: https://supabase.com/dashboard -> Project Settings -> API"
