# AI-Powered HRMS Backend

FastAPI microservice for AI-powered recruitment intelligence.

## Features

- Resume parsing with AI
- Digital footprint scraping (GitHub, LinkedIn, Portfolio)
- Candidate-JD matching with scoring
- Conversational AI screening

## Setup

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run development server**
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

Run tests with pytest:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── api/              # API endpoints
│   ├── services/         # Business logic
│   ├── models/           # Data models
│   └── core/             # Configuration
└── tests/                # Test files
```

