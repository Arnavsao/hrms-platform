# 🚀 AI-Powered HRMS - Recruitment Intelligence Module

An intelligent HR Management System with AI-powered resume parsing, candidate matching, and conversational screening capabilities.

## 📋 Overview

This project is a modern HRMS platform built for the future of recruitment. It uses cutting-edge AI technology to:

- **Parse resumes** and extract structured candidate data
- **Scrape digital footprints** from GitHub, LinkedIn, and portfolios
- **Match candidates** against job descriptions with intelligent scoring
- **Screen candidates** through conversational AI (text/voice)
- **Provide insights** to recruiters through an intuitive dashboard

## 🏗️ Architecture

The project follows a microservices architecture:

- **Frontend**: Next.js 14 (React) with TailwindCSS and Shadcn UI
- **Backend**: FastAPI (Python) for AI services
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI Engine**: Gemini via OpenRouter API

## 📂 Project Structure

```
ai-hrms/
├── frontend/           # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # Reusable UI components
│   └── lib/          # Utilities and API clients
│
├── backend/           # FastAPI microservice
│   └── app/
│       ├── api/      # API endpoints
│       ├── services/ # Business logic and AI
│       ├── models/   # Data models
│       └── core/     # Configuration
│
├── supabase/         # Database migrations
└── .github/          # CI/CD workflows
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- Git
- Supabase account
- OpenRouter API key (for Gemini)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-hrms
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Configure .env file**
   - Add your Supabase credentials
   - Add your OpenRouter/Gemini API key
   - Update other configuration as needed

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Database Setup

1. Create a new Supabase project
2. Run migrations from `supabase/migrations/`
3. Configure Row Level Security policies

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
pytest
```

## 📦 Deployment

### Frontend (Vercel)
- Connect your GitHub repository to Vercel
- Configure environment variables
- Deploy automatically on push to main

### Backend (Render)
- Connect your GitHub repository to Render
- Configure environment variables
- Deploy automatically on push to main

### Database (Supabase)
- Already hosted on Supabase cloud
- Migrations run automatically

## 🔑 Key Features

### For Candidates
- Upload resume (PDF/DOC)
- Apply to job openings
- Participate in AI screening interviews

### For Recruiters
- Post job descriptions
- View ranked candidates with AI scores
- Review candidate digital footprints
- Conduct conversational AI screenings
- Access detailed evaluation reports

### For Admins
- View system-wide statistics
- Monitor recruitment metrics
- Manage users and roles

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: FastAPI, Python 3.11, Pydantic
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RBAC
- **Storage**: Supabase Storage
- **AI**: Gemini (via OpenRouter API)
- **Testing**: PyTest, Jest
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel (Frontend), Render (Backend)

## 📊 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is part of a hackathon submission.

## 🎯 Future Roadmap

- [ ] Add payroll management module
- [ ] Integrate attendance tracking
- [ ] Implement performance management
- [ ] Add multi-language support
- [ ] Enterprise integrations (ERP, ATS)
- [ ] Advanced analytics dashboard
- [ ] Calendar integration for interview scheduling
- [ ] Attrition prediction models

## 📧 Support

For support and queries, please open an issue in the repository.

---

Built with ❤️ for the Future of Work Challenge Hackathon

