# AI-Powered HRMS - Setup Guide

## 🎉 Project Initialization Complete!

Your AI-Powered HRMS project has been successfully initialized with the complete folder structure and all necessary configuration files.

## 📁 Project Structure

```
ai-hrms/
├── .github/
│   └── workflows/           # CI/CD pipelines
│       ├── ci.yml          # Lint and test workflow
│       ├── deploy.yml      # Production deployment
│       └── README.md       # Workflow documentation
│
├── frontend/               # Next.js application
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── recruiter/
│   │   │   └── admin/
│   │   ├── candidates/upload/
│   │   ├── jobs/[id]/apply/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/             # Shadcn UI components
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── components.json
│
├── backend/                # FastAPI microservice
│   ├── app/
│   │   ├── api/
│   │   │   ├── candidates.py
│   │   │   ├── jobs.py
│   │   │   ├── applications.py
│   │   │   └── screenings.py
│   │   ├── services/
│   │   │   ├── ai_parser.py
│   │   │   ├── ai_matching.py
│   │   │   ├── ai_screening.py
│   │   │   └── link_scraper.py
│   │   ├── models/
│   │   │   ├── candidate.py
│   │   │   ├── job.py
│   │   │   └── screening.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   └── security.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_main.py
│   ├── requirements.txt
│   ├── pytest.ini
│   └── README.md
│
├── supabase/
│   └── migrations/
│       ├── 001_init.sql    # Database schema
│       ├── 002_rls.sql     # Row Level Security
│       └── README.md
│
├── .gitignore
├── README.md
├── env.example
└── SETUP.md (this file)
```

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:
- Node.js 18+ and npm
- Python 3.11+
- Git
- Supabase account
- Gemini API key (via Google AI Studio or OpenRouter)

### Step 1: Environment Setup

1. **Copy environment files:**
   ```bash
   cp env.example .env
   cp frontend/.env.example frontend/.env.local
   cp backend/env.example backend/.env
   ```

2. **Configure environment variables:**
   - Get Supabase credentials from your project settings
   - Get Gemini API key from Google AI Studio
   - Update all .env files with your credentials

### Step 2: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000 to see the frontend.

### Step 3: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to see the API documentation.

### Step 4: Database Setup

1. **Create a Supabase project** at https://supabase.com

2. **Run migrations:**
   - Go to SQL Editor in Supabase Dashboard
   - Copy content from `supabase/migrations/001_init.sql` and run it
   - Copy content from `supabase/migrations/002_rls.sql` and run it

3. **Configure authentication:**
   - Enable Email provider in Auth settings
   - Add custom claims for user roles (admin, recruiter, candidate)

### Step 5: Install Shadcn UI Components (Optional)

```bash
cd frontend

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
# ... add more components as you build features
```

## 🔑 Getting API Keys

### Supabase
1. Go to https://supabase.com
2. Create a new project
3. Get URL and keys from Settings > API

### Gemini API
1. Go to https://ai.google.dev/
2. Get API key from Google AI Studio
3. Or use OpenRouter: https://openrouter.ai/

## 🧪 Testing

### Frontend
```bash
cd frontend
npm run lint
npm run type-check
npm run build
```

### Backend
```bash
cd backend
pytest
pytest --cov=app --cov-report=html
```

## 📦 Deployment

### Frontend to Vercel
```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Backend to Render
1. Connect GitHub repository to Render
2. Configure environment variables
3. Deploy automatically on push to main

### Database Migrations
Apply migrations via Supabase Dashboard or CLI

## 📚 Next Steps

1. **Implement Authentication:**
   - Add login/signup forms
   - Implement role-based redirects
   - Configure Supabase Auth providers

2. **Build UI Components:**
   - Add Shadcn UI components
   - Create reusable layouts
   - Design responsive interfaces

3. **Complete API Endpoints:**
   - Implement database operations
   - Add file upload handling
   - Integrate AI services

4. **Add Features:**
   - Resume upload and parsing
   - Candidate-job matching
   - AI screening interviews
   - Recruiter dashboard

5. **Testing:**
   - Write unit tests
   - Add integration tests
   - Test AI service endpoints

6. **Deployment:**
   - Configure CI/CD secrets
   - Set up production environment
   - Enable monitoring and logging

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 or 8000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

### Module Not Found
```bash
# Frontend:
cd frontend && npm install

# Backend:
cd backend && pip install -r requirements.txt
```

### Database Connection Error
- Verify Supabase URL and keys
- Check if project is paused (free tier)
- Ensure RLS policies are configured

### AI Service Errors
- Verify API keys are correct
- Check rate limits
- Ensure internet connectivity

## 📖 Documentation

- [Frontend README](frontend/README.md) - Frontend development guide
- [Backend README](backend/README.md) - Backend API documentation
- [Supabase README](supabase/README.md) - Database schema and migrations
- [GitHub Actions README](.github/workflows/README.md) - CI/CD workflows

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📝 License

This project is part of a hackathon submission.

---

**Ready to build the future of HR! 🚀**

For questions or issues, check the documentation or open an issue in the repository.

