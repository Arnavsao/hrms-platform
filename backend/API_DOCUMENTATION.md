# AI-Powered HRMS API Documentation

## Base URL

Development: `http://localhost:8000`
Production: `https://your-api-domain.com`

## Interactive Documentation

Visit `/docs` for Swagger UI or `/redoc` for ReDoc documentation.

```bash
http://localhost:8000/docs
```

## Authentication

Currently using Supabase Auth. Include access token in headers:

```http
Authorization: Bearer <token>
```

## Endpoints Overview

### Health & Info

#### GET `/`
Get API status and version information.

**Response:**
```json
{
  "status": "healthy",
  "service": "AI-Powered HRMS API",
  "version": "1.0.0"
}
```

#### GET `/health`
Detailed health check.

**Response:**
```json
{
  "status": "healthy",
  "environment": "development"
}
```

---

## Candidates API

### Upload and Parse Resume

**POST** `/api/candidates/parse`

Upload a resume file and parse it with AI to extract structured data.

**Request:**
- `file`: PDF or DOCX file (multipart/form-data)
- Max size: 10MB

**Response:**
```json
{
  "candidate_id": "uuid",
  "message": "Resume parsed successfully",
  "parsed_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["Python", "FastAPI", "React"],
    "education": [...],
    "experience": [...],
    "links": {
      "github": "https://github.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe"
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/candidates/parse \
  -F "file=@resume.pdf"
```

---

### Get Candidate Details

**GET** `/api/candidates/{candidate_id}`

Get candidate details including digital footprint.

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "resume_url": "https://...",
  "parsed_data": {...},
  "digital_footprints": {
    "github_data": {...},
    "linkedin_data": {...}
  }
}
```

---

### List Candidates

**GET** `/api/candidates/`

List all candidates with pagination.

**Query Parameters:**
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset

---

## Applications API

### Match Candidate to Job

**POST** `/api/applications/match`

Use AI to match a candidate against a job description.

**Request:**
```json
{
  "candidate_id": "uuid",
  "job_id": "uuid"
}
```

**Response:**
```json
{
  "fit_score": 85,
  "highlights": {
    "strengths": [
      "Strong Python experience",
      "FastAPI expertise"
    ],
    "weaknesses": [
      "Limited team leadership"
    ],
    "recommendations": [
      "Good match for role"
    ]
  }
}
```

---

### Get Application

**GET** `/api/applications/{application_id}`

Get application details.

**Response:**
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "job_id": "uuid",
  "fit_score": 85,
  "highlights": {...},
  "status": "pending",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### List Applications

**GET** `/api/applications/`

List all applications, optionally filtered by job.

**Query Parameters:**
- `job_id`: Filter by job ID

---

## Screenings API

### Start Screening

**POST** `/api/screenings/start`

Start an AI-powered conversational screening.

**Request:**
```json
{
  "application_id": "uuid",
  "mode": "text"  // or "voice"
}
```

**Response:**
```json
{
  "screening_id": "uuid",
  "transcript": "Q: What is your experience?\nA: I have 5 years...",
  "evaluation": {
    "communication_score": 85,
    "domain_knowledge_score": 90,
    "overall_score": 87,
    "summary": "Excellent candidate with strong technical skills",
    "strengths": ["Clear communication", "Strong technical knowledge"],
    "weaknesses": []
  }
}
```

---

### Get Screening

**GET** `/api/screenings/{screening_id}`

Get screening details and evaluation.

---

### Get Screenings for Application

**GET** `/api/screenings/application/{application_id}`

Get all screenings for a specific application.

---

## Digital Footprints API

### Get Digital Footprint

**GET** `/api/footprints/{candidate_id}`

Get digital footprint data (GitHub, LinkedIn, portfolio).

**Response:**
```json
{
  "candidate_id": "uuid",
  "github_data": {
    "url": "https://github.com/user",
    "scraped": true,
    "repositories": [...],
    "contributions": 150
  },
  "linkedin_data": {...},
  "portfolio_data": {...},
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### Refresh Digital Footprint

**POST** `/api/footprints/{candidate_id}/refresh`

Re-scrape and refresh digital footprint data.

---

## Jobs API

### Create Job

**POST** `/api/jobs/`

Create a new job posting.

**Request:**
```json
{
  "title": "Senior Software Engineer",
  "description": "We are looking for...",
  "requirements": "5+ years Python, FastAPI, React"
}
```

---

### Get Job

**GET** `/api/jobs/{job_id}`

Get job details.

---

### List Jobs

**GET** `/api/jobs/`

List all job postings.

---

### Update Job

**PUT** `/api/jobs/{job_id}`

Update job posting.

---

### Delete Job

**DELETE** `/api/jobs/{job_id}`

Delete job posting.

---

## Error Responses

All endpoints may return errors in this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

---

## Rate Limiting

Current rate limits:
- 100 requests per minute per IP
- AI endpoints: 10 requests per minute (to manage API costs)

---

## WebSocket Support

Future: Real-time updates for candidate status changes.

---

## Testing

Test the API using the test client or curl:

```bash
# Start the server
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# In another terminal, test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs  # View interactive docs
```

---

## Examples

### Complete Workflow

1. **Upload Resume:**
```bash
curl -X POST http://localhost:8000/api/candidates/parse \
  -F "file=@resume.pdf"
```

2. **Create Job:**
```bash
curl -X POST http://localhost:8000/api/jobs/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Software Engineer",
    "description": "...",
    "requirements": "..."
  }'
```

3. **Match Candidate:**
```bash
curl -X POST http://localhost:8000/api/applications/match \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": "uuid",
    "job_id": "uuid"
  }'
```

4. **Start Screening:**
```bash
curl -X POST http://localhost:8000/api/screenings/start \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "uuid",
    "mode": "text"
  }'
```

---

## Support

For issues or questions:
1. Check `/docs` for interactive documentation
2. Review backend logs
3. Check Supabase connection
4. Verify API keys in `.env`

