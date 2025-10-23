# GitHub Actions Workflows

This directory contains CI/CD workflows for the AI-Powered HRMS project.

## Workflows

### ci.yml - Continuous Integration
Runs on every push and pull request to main/develop branches.

**Frontend CI:**
- Install dependencies
- Run ESLint
- Type checking with TypeScript
- Build Next.js application

**Backend CI:**
- Install Python dependencies
- Run flake8 linter
- Type checking with mypy
- Run pytest tests with coverage

### deploy.yml - Continuous Deployment
Runs on push to main branch (production deployment).

**Deployment Steps:**
1. Deploy frontend to Vercel
2. Deploy backend to Render
3. Run database migrations (manual step)
4. Report deployment status

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Frontend (Vercel)
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Backend (Render)
- `RENDER_DEPLOY_HOOK_URL` - Render deploy hook URL

### Database (Supabase)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string

### AI Services
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENROUTER_API_KEY` - OpenRouter API key (if using)

## Setup Instructions

### 1. Vercel Setup

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `cd frontend && vercel link`
4. Get tokens:
   ```bash
   vercel token create
   ```
5. Get org and project IDs from `.vercel/project.json`

### 2. Render Setup

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Copy the Deploy Hook URL from Settings

### 3. Supabase Setup

1. Create a project on Supabase
2. Get API keys from Settings > API
3. Get database URL from Settings > Database

### 4. Add Secrets to GitHub

1. Go to repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add all required secrets listed above

## Manual Deployment

### Deploy Frontend
```bash
cd frontend
vercel --prod
```

### Deploy Backend
```bash
# Push to main branch or trigger via Render dashboard
git push origin main
```

### Run Migrations
```bash
# Via Supabase dashboard
# Or using psql:
psql $DATABASE_URL -f supabase/migrations/001_init.sql
psql $DATABASE_URL -f supabase/migrations/002_rls.sql
```

## Testing Workflows

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI workflow
act pull_request -W .github/workflows/ci.yml

# Run deployment workflow (dry run)
act push -W .github/workflows/deploy.yml --dry-run
```

## Troubleshooting

### CI Fails
- Check linter errors in workflow logs
- Run linting locally: `npm run lint` or `flake8 app`
- Ensure all tests pass: `pytest` or `npm test`

### Deployment Fails
- Verify all secrets are configured correctly
- Check Vercel/Render dashboard for detailed logs
- Ensure environment variables are set

### Database Issues
- Verify connection string is correct
- Check RLS policies are not blocking operations
- Review migration logs in Supabase dashboard

