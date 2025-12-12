from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


class PerformanceReviewBase(BaseModel):
    """Base performance review model"""
    employee_id: str
    review_period_start: date
    review_period_end: date
    reviewed_by: Optional[str] = None


class PerformanceReviewCreate(PerformanceReviewBase):
    """Model for creating performance review"""
    pass


class PerformanceReviewUpdate(BaseModel):
    """Model for updating performance review"""
    status: Optional[str] = None
    self_review: Optional[str] = None
    manager_review: Optional[str] = None
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    teamwork_score: Optional[int] = None
    overall_score: Optional[int] = None
    feedback: Optional[str] = None
    recommendations: Optional[str] = None


class PerformanceReview(PerformanceReviewBase):
    """Complete performance review model"""
    id: str
    status: str  # draft, self-review, manager-review, completed
    self_review: Optional[str] = None
    achievements: Optional[dict] = None
    challenges: Optional[dict] = None
    goals_next_period: Optional[str] = None
    manager_review: Optional[str] = None
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    teamwork_score: Optional[int] = None
    overall_score: Optional[int] = None
    feedback: Optional[str] = None
    recommendations: Optional[str] = None
    bonus_amount: Optional[Decimal] = None
    promotion_recommendation: bool = False
    ai_summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    areas_for_improvement: Optional[List[str]] = None
    created_at: date
    updated_at: date
    
    class Config:
        from_attributes = True


class PerformanceStats(BaseModel):
    """Performance statistics model"""
    total_reviews: int
    average_score: float
    current_score: Optional[float] = None
    improvement_trend: str  # improving, declining, stable
    top_strengths: List[str]
    improvement_areas: List[str]

