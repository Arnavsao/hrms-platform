from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api import candidates, jobs, applications, screenings, digital_footprints, admin

# Setup logging
setup_logging()

# Create FastAPI application instance
app = FastAPI(
    title="AI-Powered HRMS API",
    description="Recruitment Intelligence Module - AI-powered resume parsing, matching, and screening",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(screenings.router, prefix="/api/screenings", tags=["Screenings"])
app.include_router(digital_footprints.router, prefix="/api/footprints", tags=["Digital Footprints"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI-Powered HRMS API",
        "version": "1.0.0",
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
    )

