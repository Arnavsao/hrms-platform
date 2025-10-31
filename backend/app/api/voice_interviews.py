import asyncio
import contextlib
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi import status as http_status
from pydantic import BaseModel
from supabase import Client

from app.core.logging import get_logger
from app.core.supabase_client import get_supabase_client
from app.models.screening import ScreeningResponse
from app.services.voice_interview import (
    ApplicationContext,
    forward_client_messages,
    session_manager,
    stream_events_to_websocket,
    VoiceInterviewSessionError,
    VoiceInterviewPersistenceError,
)

logger = get_logger(__name__)
router = APIRouter()


class VoiceInterviewSessionRequest(BaseModel):
    application_id: str
    question_count: Optional[int] = None


class VoiceInterviewSessionResponse(BaseModel):
    session_id: str


class VoiceInterviewFinalizeResponse(ScreeningResponse):
    session_id: str


def _build_application_context(application: Dict[str, Any]) -> ApplicationContext:
    logger.debug("Building application context for voice interview: %s", application.get("id"))
    candidate: Optional[Dict[str, Any]] = None
    job: Optional[Dict[str, Any]] = None

    # Supabase can alias joined data as 'candidates'/'jobs' or 'candidate'/'job'
    if isinstance(application.get("candidates"), dict):
        candidate = application.get("candidates")
    elif isinstance(application.get("candidate"), dict):
        candidate = application.get("candidate")

    if isinstance(application.get("jobs"), dict):
        job = application.get("jobs")
    elif isinstance(application.get("job"), dict):
        job = application.get("job")

    candidate_profile = {}
    if candidate:
        parsed = candidate.get("parsed_data") or {}
        candidate_profile = {
            "name": candidate.get("name"),
            "email": candidate.get("email"),
            "skills": parsed.get("skills") or [],
            "experience": parsed.get("experience") or [],
            "education": parsed.get("education") or [],
        }

    job_profile = {}
    if job:
        job_profile = {
            "title": job.get("title"),
            "description": job.get("description"),
            "requirements": job.get("requirements"),
        }

    return ApplicationContext(
        application_id=application.get("id"),
        job_title=(job or {}).get("title"),
        job_description=(job or {}).get("description"),
        candidate_name=(candidate or {}).get("name"),
        candidate_email=(candidate or {}).get("email"),
        candidate_profile=candidate_profile,
        job_profile=job_profile,
    )


@router.post("/sessions", response_model=VoiceInterviewSessionResponse)
async def create_voice_interview_session(
    request: VoiceInterviewSessionRequest,
    supabase: Client = Depends(get_supabase_client),
):
    logger.debug(
        "Creating voice interview session for application %s (question_count=%s)",
        request.application_id,
        request.question_count,
    )

    try:
        response = (
            supabase.table("applications")
            .select("*, candidates(*), jobs(*)")
            .eq("id", request.application_id)
            .single()
            .execute()
        )
    except Exception as exc:  # pragma: no cover - database failure path
        logger.exception("Failed to read application %s: %s", request.application_id, exc)
        raise HTTPException(status_code=500, detail="Failed to load application")

    if not response.data:
        raise HTTPException(status_code=404, detail="Application not found")

    context = _build_application_context(response.data)

    question_limit = request.question_count
    if question_limit is not None and question_limit <= 0:
        raise HTTPException(status_code=400, detail="question_count must be greater than zero")

    try:
        session = await session_manager.create_session(context, max_questions=question_limit)
    except VoiceInterviewSessionError as exc:
        logger.exception(
            "Failed to create voice interview session for application %s: %s",
            request.application_id,
            exc,
        )
        raise HTTPException(
            status_code=503,
            detail="Unable to start voice interview at the moment. Please try again shortly.",
        ) from exc

    logger.info(
        "Created voice interview session %s for application %s",
        session.session_id,
        request.application_id,
    )
    return VoiceInterviewSessionResponse(session_id=session.session_id)


@router.websocket("/ws/{session_id}")
async def voice_interview_websocket(websocket: WebSocket, session_id: str) -> None:
    session = await session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=http_status.WS_1008_POLICY_VIOLATION, reason="Invalid session")
        return

    await websocket.accept()
    await websocket.send_json({"type": "status", "message": "connected", "session_id": session_id})

    sender = asyncio.create_task(stream_events_to_websocket(session, websocket))
    receiver = asyncio.create_task(forward_client_messages(session, websocket))

    _done, pending = await asyncio.wait(
        {sender, receiver}, return_when=asyncio.FIRST_COMPLETED
    )

    for task in pending:
        task.cancel()
        with contextlib.suppress(Exception):
            await task

    # Ensure session stopped when websocket ends
    await session.close()
    with contextlib.suppress(Exception):
        await websocket.close(code=http_status.WS_1000_NORMAL_CLOSURE)


@router.post("/sessions/{session_id}/finalize", response_model=VoiceInterviewFinalizeResponse)
async def finalize_voice_interview_session(
    session_id: str,
    supabase: Client = Depends(get_supabase_client),
):
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already finalized")

    try:
        logger.debug("Finalizing voice interview session %s", session_id)
        result = await session.finalize(supabase)
    except VoiceInterviewPersistenceError as exc:
        logger.exception("Finalize failed for session %s: %s", session_id, exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to save voice interview results. Ensure database migrations are up to date and try again.",
        ) from exc
    await session_manager.remove_session(session_id)

    logger.info("Finalized voice interview session %s", session_id)
    return VoiceInterviewFinalizeResponse(
        session_id=session_id,
        screening_id=result.screening_id,
        transcript=result.transcript,
        evaluation=result.evaluation,
        timeline=result.timeline,
    )
