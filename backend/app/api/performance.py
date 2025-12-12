from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.models.performance import (
    PerformanceReview,
    PerformanceReviewCreate,
    PerformanceReviewUpdate,
    PerformanceStats
)
from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from typing import List, Optional
from datetime import date
from decimal import Decimal

logger = get_logger(__name__)
router = APIRouter()


@router.post("/", response_model=PerformanceReview)
async def create_performance_review(
    review_data: PerformanceReviewCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new performance review"""
    try:
        review_dict = review_data.dict()
        review_dict['status'] = 'draft'

        response = supabase.table("performance_reviews").insert(review_dict).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create performance review")

        logger.info(f"Created performance review for employee: {review_data.employee_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating performance review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create performance review: {str(e)}")


@router.get("/", response_model=List[PerformanceReview])
async def list_performance_reviews(
    employee_id: Optional[str] = None,
    reviewed_by: Optional[str] = None,
    status: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """List performance reviews with optional filters"""
    try:
        query = supabase.table("performance_reviews").select("*")

        if employee_id:
            query = query.eq("employee_id", employee_id)

        if reviewed_by:
            query = query.eq("reviewed_by", reviewed_by)

        if status:
            query = query.eq("status", status)

        response = query.order("review_period_end", desc=True).execute()
        return response.data

    except Exception as e:
        logger.error(f"Error listing performance reviews: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list performance reviews: {str(e)}")


@router.get("/stats/{employee_id}", response_model=PerformanceStats)
async def get_performance_stats(
    employee_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get performance statistics for an employee"""
    try:
        # Get all completed reviews for the employee
        reviews = supabase.table("performance_reviews").select("*").eq(
            "employee_id", employee_id
        ).eq("status", "completed").order("review_period_end", desc=True).execute()

        if not reviews.data:
            return PerformanceStats(
                total_reviews=0,
                average_score=0.0,
                current_score=None,
                improvement_trend="stable",
                top_strengths=[],
                improvement_areas=[]
            )

        total_reviews = len(reviews.data)
        scores = [r['overall_score'] for r in reviews.data if r.get('overall_score')]
        average_score = sum(scores) / len(scores) if scores else 0.0
        current_score = scores[0] if scores else None

        # Determine trend
        if len(scores) >= 2:
            recent_avg = sum(scores[:2]) / 2
            older_avg = sum(scores[2:]) / len(scores[2:]) if len(scores) > 2 else recent_avg
            if recent_avg > older_avg + 0.3:
                improvement_trend = "improving"
            elif recent_avg < older_avg - 0.3:
                improvement_trend = "declining"
            else:
                improvement_trend = "stable"
        else:
            improvement_trend = "stable"

        # Collect strengths and improvement areas
        all_strengths = []
        all_improvements = []

        for review in reviews.data[:3]:  # Last 3 reviews
            if review.get('strengths'):
                all_strengths.extend(review['strengths'])
            if review.get('areas_for_improvement'):
                all_improvements.extend(review['areas_for_improvement'])

        # Get unique top strengths
        top_strengths = list(set(all_strengths))[:5]
        improvement_areas = list(set(all_improvements))[:5]

        return PerformanceStats(
            total_reviews=total_reviews,
            average_score=round(average_score, 2),
            current_score=current_score,
            improvement_trend=improvement_trend,
            top_strengths=top_strengths,
            improvement_areas=improvement_areas
        )

    except Exception as e:
        logger.error(f"Error getting performance stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance stats: {str(e)}")


@router.get("/{review_id}", response_model=PerformanceReview)
async def get_performance_review(
    review_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get performance review by ID"""
    try:
        response = supabase.table("performance_reviews").select("*").eq("id", review_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Performance review not found")

        return response.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting performance review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance review: {str(e)}")


@router.put("/{review_id}", response_model=PerformanceReview)
async def update_performance_review(
    review_id: str,
    review_data: PerformanceReviewUpdate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update performance review"""
    try:
        update_dict = review_data.dict(exclude_unset=True)

        response = supabase.table("performance_reviews").update(update_dict).eq("id", review_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Performance review not found")

        logger.info(f"Updated performance review: {review_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating performance review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update performance review: {str(e)}")


@router.post("/{review_id}/submit-self-review")
async def submit_self_review(
    review_id: str,
    self_review: str,
    achievements: Optional[dict] = None,
    challenges: Optional[dict] = None,
    goals_next_period: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Submit self-review portion"""
    try:
        update_data = {
            "self_review": self_review,
            "status": "manager-review"
        }

        if achievements:
            update_data["achievements"] = achievements

        if challenges:
            update_data["challenges"] = challenges

        if goals_next_period:
            update_data["goals_next_period"] = goals_next_period

        response = supabase.table("performance_reviews").update(update_data).eq("id", review_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Performance review not found")

        logger.info(f"Submitted self-review: {review_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting self-review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit self-review: {str(e)}")


@router.post("/{review_id}/complete")
async def complete_review(
    review_id: str,
    manager_review: str,
    technical_score: int,
    communication_score: int,
    teamwork_score: int,
    overall_score: int,
    feedback: Optional[str] = None,
    recommendations: Optional[str] = None,
    bonus_amount: Optional[Decimal] = None,
    promotion_recommendation: bool = False,
    strengths: Optional[List[str]] = None,
    areas_for_improvement: Optional[List[str]] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Complete performance review with manager input"""
    try:
        update_data = {
            "manager_review": manager_review,
            "technical_score": technical_score,
            "communication_score": communication_score,
            "teamwork_score": teamwork_score,
            "overall_score": overall_score,
            "status": "completed"
        }

        if feedback:
            update_data["feedback"] = feedback

        if recommendations:
            update_data["recommendations"] = recommendations

        if bonus_amount:
            update_data["bonus_amount"] = float(bonus_amount)

        if promotion_recommendation is not None:
            update_data["promotion_recommendation"] = promotion_recommendation

        if strengths:
            update_data["strengths"] = strengths

        if areas_for_improvement:
            update_data["areas_for_improvement"] = areas_for_improvement

        response = supabase.table("performance_reviews").update(update_data).eq("id", review_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Performance review not found")

        logger.info(f"Completed performance review: {review_id}")
        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to complete review: {str(e)}")


@router.delete("/{review_id}")
async def delete_performance_review(
    review_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete performance review (only if in draft status)"""
    try:
        # Only allow deletion of draft reviews
        review = supabase.table("performance_reviews").select("status").eq("id", review_id).single().execute()

        if not review.data:
            raise HTTPException(status_code=404, detail="Performance review not found")

        if review.data['status'] != 'draft':
            raise HTTPException(
                status_code=400,
                detail="Cannot delete non-draft performance review"
            )

        response = supabase.table("performance_reviews").delete().eq("id", review_id).execute()

        logger.info(f"Deleted performance review: {review_id}")
        return {"message": "Performance review deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting performance review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete performance review: {str(e)}")
