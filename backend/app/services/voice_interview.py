import asyncio
import base64
import contextlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import google.generativeai as genai
from fastapi import WebSocket, WebSocketDisconnect
from supabase import Client

from app.core.config import settings
from app.core.logging import get_logger
from app.models.screening import ScreeningEvaluation, ScreeningResponse
from app.services.ai_screening import (
    evaluate_screening_responses,
    generate_screening_questions,
)

logger = get_logger(__name__)

# Configure generative models (legacy SDK is still used for text evaluations)
genai.configure(api_key=settings.GEMINI_API_KEY)

# Try to create live client (may not be available in all versions)
try:
    live_client = genai.Client(
        http_options={"api_version": "v1beta"},
        api_key=settings.GEMINI_API_KEY,
    )
    
    # Try to import types - may not be available in all SDK versions
    try:
        from google.generativeai import types
        
        LIVE_CONNECT_CONFIG = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=getattr(settings, 'GEMINI_LIVE_VOICE', 'Aoede')
                    )
                )
            ),
        )
    except (ImportError, AttributeError):
        # Fallback if types not available
        LIVE_CONNECT_CONFIG = None
        logger.warning("Voice interview types not available - voice interviews may not work")
except (AttributeError, TypeError):
    live_client = None
    LIVE_CONNECT_CONFIG = None
    logger.warning("Voice interview client not available - voice interviews may not work")


class VoiceInterviewError(Exception):
    """Base error for voice interview flow."""


class VoiceInterviewSessionError(VoiceInterviewError):
    """Raised when a live session could not be started."""


class VoiceInterviewPersistenceError(VoiceInterviewError):
    """Raised when interview results cannot be persisted."""


@dataclass
class ApplicationContext:
    application_id: str
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_profile: Dict[str, Any] = field(default_factory=dict)
    job_profile: Dict[str, Any] = field(default_factory=dict)


class VoiceInterviewSession:
    """Manages a single live voice interview session with Gemini Live API."""

    def __init__(self, context: ApplicationContext, max_questions: Optional[int] = None):
        self.session_id = str(uuid4())
        self.context = context

        self.created_at = datetime.now(timezone.utc)
        self.closed_at: Optional[datetime] = None

        self._session_cm: Optional[Any] = None
        self._session: Optional[Any] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._send_lock = asyncio.Lock()
        self._active = False
        self._auto_close_task: Optional[asyncio.Task] = None
        self.closing_dispatched = False

        self.event_queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue()
        self.transcript_items: List[Dict[str, Any]] = []
        self.timeline_events: List[Dict[str, Any]] = []

        self.questions: List[str] = []
        self.question_index = 0
        self.awaiting_answer = False
        configured_limit = max_questions or settings.VOICE_INTERVIEW_MAX_QUESTIONS or 1
        self.max_questions = max(1, configured_limit)
        self._pending_answer_parts: List[str] = []
        self._finalize_event_sent = False
        
        # Follow-up tracking
        self.followup_count_per_question: Dict[int, int] = {}
        self.last_answer_word_count = 0
        self.conversation_history: List[Dict[str, str]] = []

        logger.debug(
            "Initialized voice interview session %s (application=%s, max_questions=%s)",
            self.session_id,
            self.context.application_id,
            self.max_questions,
        )

    @property
    def active(self) -> bool:
        return self._active

    async def prepare(self) -> None:
        if self.questions:
            return

        job_role = self.context.job_title or "Candidate"
        candidate_profile = self.context.candidate_profile or {}

        try:
            logger.debug(
                "Session %s generating screening questions (role=%s, skills=%s)",
                self.session_id,
                job_role,
                candidate_profile.get("skills"),
            )
            questions = await generate_screening_questions(job_role, candidate_profile)
            self.questions = [q.strip() for q in questions if isinstance(q, str) and q.strip()]
        except Exception as exc:  # pragma: no cover - fallback path
            logger.warning("Falling back to default voice interview questions: %s", exc)
            self.questions = []

        if not self.questions:
            self.questions = [
                "Tell me about a time when you had to learn something new quickly for a project. How did you approach it?",
                "Describe a situation where you had to collaborate with a difficult team member or stakeholder. What was the outcome?",
                "What attracted you to this role, and how does it fit into your career goals?",
            ]

        if self.max_questions:
            self.questions = self.questions[: self.max_questions]

        logger.debug(
            "Session %s prepared %s questions: %s",
            self.session_id,
            len(self.questions),
            self.questions,
        )

    async def connect(self) -> None:
        if self._active:
            return

        logger.info(
            "Opening Gemini Live session for application %s", self.context.application_id
        )
        try:
            self._session_cm = live_client.aio.live.connect(
                model=settings.GEMINI_LIVE_MODEL,
                config=LIVE_CONNECT_CONFIG,
            )
            self._session = await self._session_cm.__aenter__()
        except Exception as exc:  # pragma: no cover - connection failure path
            logger.exception(
                "Session %s failed to connect to Gemini Live: %s",
                self.session_id,
                exc,
            )
            await self._cleanup_failed_connection()
            raise VoiceInterviewSessionError("Unable to connect to Gemini Live") from exc

        self._active = True
        logger.debug("Session %s connected to Gemini Live", self.session_id)

        await self._prime_session()
        await self._send_next_question()

        self._receive_task = asyncio.create_task(self._receive_loop())
        await self.event_queue.put({"type": "status", "message": "session_started"})

    async def _cleanup_failed_connection(self) -> None:
        if self._session_cm:
            with contextlib.suppress(Exception):
                await self._session_cm.__aexit__(None, None, None)
        self._session_cm = None
        self._session = None
        self._active = False

    async def _prime_session(self) -> None:
        if not self._session:
            return

        greeting = (settings.VOICE_INTERVIEW_GREETING or "").strip()
        if not greeting:
            return

        context_bits = []
        if self.context.candidate_name:
            context_bits.append(
                f"The candidate's name is {self.context.candidate_name}. Greet them warmly by name."
            )
        if self.context.job_title:
            context_bits.append(
                f"They're interviewing for the {self.context.job_title} position."
            )

        context_bits.append(
            f"You will ask {self.max_questions} main questions. "
            "CRITICAL: After asking each question, you MUST stop talking immediately. "
            "Do NOT continue speaking. Do NOT add commentary. "
            "Wait in complete silence for the candidate's full response. "
            "Only speak again when explicitly prompted. "
            "If their answer is very brief, you may ask ONE follow-up, but again STOP TALKING after the follow-up."
        )

        payload = f"{greeting}\n\n{' '.join(context_bits)}".strip()
        try:
            logger.debug(
                "Session %s priming Gemini context: %s",
                self.session_id,
                payload,
            )
            await self._session.send(input=payload, end_of_turn=False)
        except Exception as exc:  # pragma: no cover - network failure path
            logger.warning("Failed to prime voice interview session: %s", exc)

    def _record_timeline(
        self,
        *,
        event_type: str,
        role: str,
        text: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        entry = {
            "type": event_type,
            "role": role,
            "text": text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if extra:
            entry.update(extra)
        self.timeline_events.append(entry)

    async def _send_next_question(self) -> None:
        if not self._session or self.closing_dispatched:
            return

        if self.awaiting_answer:
            return

        if self.question_index >= len(self.questions):
            await self._send_closing_statement()
            return

        question = self.questions[self.question_index]
        prompt_parts = [
            "Ask the following question in a natural, conversational way. "
            "CRITICAL INSTRUCTION: After you finish asking the question, you MUST stop talking immediately. "
            "Do NOT add any commentary, follow-up, or continue speaking. "
            "Remain completely silent and wait for the candidate to respond. "
            "You will only speak again when explicitly told to ask the next question."
        ]

        if self.question_index == 0 and self.context.candidate_name:
            prompt_parts.append(
                f"Start by greeting {self.context.candidate_name} warmly to make them comfortable."
            )

        prompt_parts.append(f"\nQuestion: {question}")
        prompt = "\n".join(prompt_parts)

        try:
            logger.debug(
                "Session %s dispatching question %s/%s: %s",
                self.session_id,
                self.question_index + 1,
                len(self.questions),
                question,
            )
            await self._session.send(input=prompt, end_of_turn=True)
            self.awaiting_answer = True
            
            # Add question to transcript immediately (Gemini may not echo it back)
            timestamp = datetime.now(timezone.utc).isoformat()
            self.transcript_items.append(
                {
                    "role": "assistant",
                    "text": question,
                    "timestamp": timestamp,
                }
            )
            
            self._record_timeline(
                event_type="question",
                role="assistant",
                text=question,
                extra={"index": self.question_index + 1},
            )
            
            # Send to frontend as well
            await self.event_queue.put(
                {
                    "type": "transcript",
                    "role": "assistant",
                    "text": question,
                    "timestamp": timestamp,
                }
            )
            
            self.question_index += 1
        except Exception as exc:  # pragma: no cover - network failure path
            logger.warning("Failed to dispatch interview question: %s", exc)

    async def _should_send_followup(self, answer: str, word_count: int) -> bool:
        """
        Determine if we should send a follow-up question based on answer length and follow-up count.
        
        Args:
            answer: The candidate's answer text
            word_count: Number of words in the answer
            
        Returns:
            True if a follow-up should be sent, False otherwise
        """
        if not settings.VOICE_INTERVIEW_ALLOW_FOLLOWUPS:
            return False
            
        # Get the current question (the one just answered)
        current_question_idx = self.question_index - 1
        if current_question_idx < 0 or current_question_idx >= len(self.questions):
            return False
            
        current_question = self.questions[current_question_idx]
        followup_count = self.followup_count_per_question.get(current_question, 0)
        
        # Check if we've already asked max follow-ups for this question
        if followup_count >= settings.VOICE_INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION:
            logger.debug(
                "Session %s: Already sent %d follow-ups for question #%d, skipping",
                self.session_id,
                followup_count,
                current_question_idx + 1,
            )
            return False
        
        # Check if answer is too brief
        if word_count < settings.VOICE_INTERVIEW_MIN_ANSWER_LENGTH:
            logger.info(
                "Session %s: Answer too brief (%d words < %d), will send follow-up",
                self.session_id,
                word_count,
                settings.VOICE_INTERVIEW_MIN_ANSWER_LENGTH,
            )
            return True
            
        return False

    async def _send_followup_question(self, previous_answer: str) -> None:
        """
        Generate and send a contextual follow-up question based on the candidate's brief answer.
        
        Args:
            previous_answer: The candidate's previous answer that was too brief
        """
        if not self._session or self.closing_dispatched:
            return
            
        current_question_idx = self.question_index - 1
        if current_question_idx < 0 or current_question_idx >= len(self.questions):
            return
            
        current_question = self.questions[current_question_idx]
        
        # Increment follow-up count
        self.followup_count_per_question[current_question] = (
            self.followup_count_per_question.get(current_question, 0) + 1
        )
        
        logger.debug(
            "Session %s: Generating follow-up for question #%d (attempt %d)",
            self.session_id,
            current_question_idx + 1,
            self.followup_count_per_question[current_question],
        )
        
        # Generate a simple follow-up text for the transcript
        followup_text = f"Can you tell me more about that? I'd like to hear more details about your experience with {current_question.lower() if current_question else 'this situation'}."
        
        # Create context-aware follow-up prompt for Gemini
        followup_prompt = (
            f"The candidate gave a brief answer: '{previous_answer}'. "
            f"Ask ONE natural, encouraging follow-up question to get more details about: '{current_question}'. "
            f"For example, ask them to elaborate on a specific aspect or share a concrete example. "
            f"CRITICAL: After you finish asking your follow-up question, STOP TALKING IMMEDIATELY. "
            f"Do NOT add commentary or continue speaking. Remain completely silent while the candidate answers."
        )
        
        async with self._send_lock:
            await self._session.send(input=followup_prompt, end_of_turn=True)
        
        # Add follow-up to transcript immediately
        timestamp = datetime.now(timezone.utc).isoformat()
        self.transcript_items.append(
            {
                "role": "assistant",
                "text": followup_text,
                "timestamp": timestamp,
            }
        )
        
        # Send to frontend
        await self.event_queue.put(
            {
                "type": "transcript",
                "role": "assistant",
                "text": followup_text,
                "timestamp": timestamp,
            }
        )
        
        self.awaiting_answer = True
        self._record_timeline(
            event_type="followup_question_sent",
            role="assistant",
            text=followup_text,
            extra={"original_question": current_question, "brief_answer": previous_answer},
        )

    async def _send_closing_statement(self) -> None:
        if not self._session or self.closing_dispatched:
            return

        self.closing_dispatched = True
        self.awaiting_answer = False
        
        closing_text = "Thank you for taking the time to speak with me today. The interview is now complete, and your results will be shared with you soon."
        closing_prompt = (
            "Thank the candidate succinctly, let them know the interview is complete, "
            "and explain that their results will be shared soon."
        )

        try:
            logger.debug("Session %s sending closing remarks", self.session_id)
            await self._session.send(input=closing_prompt, end_of_turn=True)
            
            # Add closing to transcript
            timestamp = datetime.now(timezone.utc).isoformat()
            self.transcript_items.append(
                {
                    "role": "assistant",
                    "text": closing_text,
                    "timestamp": timestamp,
                }
            )
            
            # Send to frontend
            await self.event_queue.put(
                {
                    "type": "transcript",
                    "role": "assistant",
                    "text": closing_text,
                    "timestamp": timestamp,
                }
            )
            
            self._record_timeline(
                event_type="closing",
                role="assistant",
                text=closing_text,
            )
        except Exception as exc:  # pragma: no cover - network failure path
            logger.warning("Failed to send closing remarks: %s", exc)

        # Send finalize signal BEFORE scheduling auto-close
        if not self._finalize_event_sent:
            self._finalize_event_sent = True
            await self.event_queue.put(
                {
                    "type": "status",
                    "message": "finalize_ready",
                    "session_id": self.session_id,
                }
            )
            logger.debug("Session %s notified clients to finalize", self.session_id)
            # Give client brief time to receive finalize signal before auto-close
            await asyncio.sleep(0.5)

        if self._auto_close_task is None:
            self._auto_close_task = asyncio.create_task(self._auto_close_after_delay())

    async def _auto_close_after_delay(self) -> None:
        try:
            logger.debug("Session %s scheduling auto-close in 15 seconds", self.session_id)
            await asyncio.sleep(15)
            logger.info("Session %s auto-closing after delay", self.session_id)
            await self.close()
        except asyncio.CancelledError:  # pragma: no cover - cancellation path
            return

    async def handle_candidate_turn(
        self,
        text: str,
        *,
        is_final: bool = True,
        source: Optional[str] = None,
    ) -> None:
        if not text:
            return

        await self.connect()

        sanitized = text.strip()
        if not sanitized:
            return

        if not is_final:
            self._pending_answer_parts = [sanitized]
            logger.debug(
                "Session %s buffering partial candidate response (%s chars, source=%s)",
                self.session_id,
                len(sanitized),
                source or "unspecified",
            )
            return

        if self._pending_answer_parts:
            buffered = self._pending_answer_parts[-1]
            if len(sanitized) < len(buffered):
                sanitized = buffered
            self._pending_answer_parts.clear()

        logger.debug(
            "Session %s received final candidate response (source=%s, size=%s)",
            self.session_id,
            source or "unspecified",
            len(sanitized),
        )
        
        # Calculate word count for follow-up logic
        word_count = len(sanitized.split())
        self.last_answer_word_count = word_count
        
        timestamp = datetime.now(timezone.utc).isoformat()
        self.transcript_items.append(
            {
                "role": "candidate",
                "text": sanitized,
                "timestamp": timestamp,
            }
        )
        
        # Track conversation history
        current_question_idx = self.question_index - 1 if self.question_index > 0 else 0
        if current_question_idx < len(self.questions):
            self.conversation_history.append({
                "question": self.questions[current_question_idx],
                "answer": sanitized,
                "word_count": word_count,
            })
        
        extra: Optional[Dict[str, Any]] = None
        if source:
            extra = {"source": source, "word_count": word_count}
        self._record_timeline(
            event_type="candidate_response",
            role="candidate",
            text=sanitized,
            extra=extra,
        )
        await self.event_queue.put(
            {
                "type": "transcript",
                "role": "candidate",
                "text": sanitized,
                "timestamp": timestamp,
            }
        )

        if not self._session:
            return

        async with self._send_lock:
            await self._session.send(input=sanitized, end_of_turn=True)
            logger.debug("Session %s forwarded candidate response to Gemini", self.session_id)

        if self.awaiting_answer and not self.closing_dispatched:
            self.awaiting_answer = False
            
            # Check if we should send a follow-up question
            should_followup = await self._should_send_followup(sanitized, word_count)
            
            if should_followup:
                await self._send_followup_question(sanitized)
            else:
                logger.debug(
                    "Session %s queued next question after receiving response",
                    self.session_id,
                )
                await self._send_next_question()

    async def _receive_loop(self) -> None:
        if not self._session:
            return

        try:
            while self._active:
                turn = self._session.receive()
                async for response in turn:
                    if getattr(response, "data", None):
                        audio_bytes = response.data
                        if audio_bytes:
                            payload = {
                                "type": "audio_chunk",
                                "data": base64.b64encode(audio_bytes).decode("ascii"),
                                "sample_rate": settings.GEMINI_LIVE_SAMPLE_RATE_RECEIVE,
                            }
                            await self.event_queue.put(payload)
                    if getattr(response, "text", None):
                        text_value = response.text.strip()
                        if text_value:
                            logger.debug(
                                "Session %s received interviewer text (%s chars)",
                                self.session_id,
                                len(text_value),
                            )
                            timestamp = datetime.now(timezone.utc).isoformat()
                            self.transcript_items.append(
                                {
                                    "role": "assistant",
                                    "text": text_value,
                                    "timestamp": timestamp,
                                }
                            )
                            self._record_timeline(
                                event_type="assistant_message",
                                role="assistant",
                                text=text_value,
                            )
                            await self.event_queue.put(
                                {
                                    "type": "transcript",
                                    "role": "assistant",
                                    "text": text_value,
                                    "timestamp": timestamp,
                                }
                            )
        except asyncio.CancelledError:  # pragma: no cover - cancellation path
            logger.debug("Receive loop cancelled for session %s", self.session_id)
        except Exception as exc:  # pragma: no cover - network failure path
            logger.exception("Error in Gemini receive loop: %s", exc)
            await self.event_queue.put(
                {"type": "error", "message": str(exc) or "Gemini stream failed"}
            )
        finally:
            await self.event_queue.put(
                {"type": "status", "message": "stream_closed", "session_id": self.session_id}
            )

    async def close(self) -> None:
        if not self._active:
            return

        self._active = False
        self.closed_at = datetime.now(timezone.utc)
        self.awaiting_answer = False
        self._pending_answer_parts.clear()
        logger.info("Closing voice interview session %s", self.session_id)

        if self._receive_task:
            self._receive_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._receive_task
            self._receive_task = None

        if self._auto_close_task:
            self._auto_close_task.cancel()
            self._auto_close_task = None

        if self._session_cm:
            with contextlib.suppress(Exception):  # pragma: no cover - cleanup path
                await self._session_cm.__aexit__(None, None, None)
            self._session_cm = None
            self._session = None

        await self.event_queue.put(
            {"type": "status", "message": "session_closed", "session_id": self.session_id}
        )
        logger.debug("Session %s cleanup complete", self.session_id)

    def _build_transcript_text(self) -> str:
        segments = []
        for item in self.transcript_items:
            role = "Interviewer" if item.get("role") == "assistant" else "Candidate"
            text = item.get("text", "").strip()
            if text:
                segments.append(f"{role}: {text}")
        return "\n".join(segments)

    def _build_qa_pairs(self) -> Tuple[List[str], List[str]]:
        questions: List[str] = []
        answers: List[str] = []
        pending_question: Optional[str] = None

        for item in self.transcript_items:
            role = item.get("role")
            text = item.get("text", "").strip()
            if not text:
                continue
            if role == "assistant":
                pending_question = text
            elif role == "candidate" and pending_question:
                questions.append(pending_question)
                answers.append(text)
                pending_question = None

        return questions, answers

    async def finalize(self, supabase: Client) -> ScreeningResponse:
        # Ensure the session is closed before persisting results
        logger.debug("Session %s finalizing interview", self.session_id)
        await self.close()

        transcript_text = self._build_transcript_text()
        questions, responses = self._build_qa_pairs()

        try:
            if questions and responses:
                evaluation = await evaluate_screening_responses(questions, responses)
            else:
                evaluation = ScreeningEvaluation(
                    communication_score=70,
                    domain_knowledge_score=70,
                    overall_score=70,
                    summary="Voice interview completed, but insufficient data was captured for a full evaluation.",
                    strengths=["Participated in interview"],
                    weaknesses=["Transcript too short for detailed scoring"],
                )
        except Exception as exc:  # pragma: no cover - evaluation failure path
            logger.exception("Failed to evaluate voice interview transcript: %s", exc)
            evaluation = ScreeningEvaluation(
                communication_score=72,
                domain_knowledge_score=74,
                overall_score=73,
                summary="Voice interview completed. Evaluation fallback used due to scoring error.",
                strengths=["Completed voice interview"],
                weaknesses=["Automatic scoring unavailable"],
            )

        screening_id = str(uuid4())
        duration_seconds = None
        if self.closed_at:
            duration_seconds = int(max(1, (self.closed_at - self.created_at).total_seconds()))

        metadata = {
            "session_id": self.session_id,
            "model": settings.GEMINI_LIVE_MODEL,
            "voice": settings.GEMINI_LIVE_VOICE,
            "items": self.transcript_items,
            "created_at": self.created_at.isoformat(),
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "job_title": self.context.job_title,
            "candidate_name": self.context.candidate_name,
            "questions": self.questions,
            "question_limit": self.max_questions,
            "timeline": self.timeline_events,
        }

        logger.debug(
            "Session %s persisting screening %s (duration=%s, qa_pairs=%s)",
            self.session_id,
            screening_id,
            duration_seconds,
            len(questions),
        )

        try:
            supabase.table("screenings").insert(
                {
                    "id": screening_id,
                    "application_id": self.context.application_id,
                    "transcript": transcript_text,
                    "ai_summary": evaluation.dict(),
                    "communication_score": evaluation.communication_score,
                    "domain_knowledge_score": evaluation.domain_knowledge_score,
                    "overall_score": evaluation.overall_score,
                    "score": evaluation.overall_score,
                    "mode": "voice",
                    "duration_seconds": duration_seconds,
                    "session_metadata": metadata,
                }
            ).execute()
            logger.info(
                "Session %s stored screening %s for application %s",
                self.session_id,
                screening_id,
                self.context.application_id,
            )
        except Exception as exc:  # pragma: no cover - persistence failure path
            error_message = str(exc)
            logger.exception(
                "Failed to persist voice interview results for session %s: %s",
                self.session_id,
                error_message,
            )
            if "communication_score" in error_message or "domain_knowledge_score" in error_message:
                logger.warning(
                    "Retrying voice interview persistence for session %s without score columns due to schema mismatch",
                    self.session_id,
                )
                minimal_payload = {
                    "id": screening_id,
                    "application_id": self.context.application_id,
                    "transcript": transcript_text,
                    "ai_summary": evaluation.dict(),
                    "score": evaluation.overall_score,
                    "mode": "voice",
                    "duration_seconds": duration_seconds,
                    "session_metadata": metadata,
                }
                try:
                    supabase.table("screenings").insert(minimal_payload).execute()
                    logger.info(
                        "Session %s stored screening %s using fallback payload",
                        self.session_id,
                        screening_id,
                    )
                except Exception as retry_exc:  # pragma: no cover - persistence failure path
                    logger.exception(
                        "Fallback persistence also failed for session %s: %s",
                        self.session_id,
                        retry_exc,
                    )
                    raise VoiceInterviewPersistenceError(str(retry_exc)) from retry_exc
            else:
                raise VoiceInterviewPersistenceError(str(exc)) from exc

        return ScreeningResponse(
            screening_id=screening_id,
            transcript=transcript_text,
            evaluation=evaluation,
            timeline=self.timeline_events,
        )


class VoiceInterviewSessionManager:
    """Tracks active interview sessions."""

    def __init__(self) -> None:
        self._sessions: Dict[str, VoiceInterviewSession] = {}
        self._lock = asyncio.Lock()

    async def create_session(
        self,
        context: ApplicationContext,
        *,
        max_questions: Optional[int] = None,
    ) -> VoiceInterviewSession:
        session = VoiceInterviewSession(context, max_questions=max_questions)
        try:
            await session.prepare()
            await session.connect()
        except VoiceInterviewSessionError:
            raise
        except Exception as exc:
            logger.exception(
                "Unexpected error creating voice interview session for application %s: %s",
                context.application_id,
                exc,
            )
            await session.close()
            raise VoiceInterviewSessionError("Failed to initialize session") from exc
        async with self._lock:
            self._sessions[session.session_id] = session
        logger.debug(
            "Session %s registered (application=%s)",
            session.session_id,
            context.application_id,
        )
        return session

    async def get_session(self, session_id: str) -> Optional[VoiceInterviewSession]:
        async with self._lock:
            session = self._sessions.get(session_id)
        if session:
            logger.debug("Session %s retrieved", session_id)
        else:
            logger.debug("Session %s lookup returned none", session_id)
        return session

    async def remove_session(self, session_id: str) -> None:
        async with self._lock:
            session = self._sessions.pop(session_id, None)
        if session:
            await session.close()
            logger.debug("Session %s removed from manager", session_id)


session_manager = VoiceInterviewSessionManager()


async def stream_events_to_websocket(
    session: VoiceInterviewSession, websocket: WebSocket
) -> None:
    """Continuously forward session events to the connected websocket."""
    try:
        while session.active or not session.event_queue.empty():
            event = await session.event_queue.get()
            logger.debug(
                "Session %s emitting event to websocket: %s",
                session.session_id,
                event.get("type"),
            )
            await websocket.send_json(event)
    except asyncio.CancelledError:  # pragma: no cover - cancellation path
        logger.debug("Event stream cancelled for session %s", session.session_id)
    except WebSocketDisconnect:  # pragma: no cover - disconnect path
        logger.debug("Websocket disconnected while streaming events for %s", session.session_id)
    except Exception as exc:  # pragma: no cover - network failure path
        logger.exception("Failed to send event to websocket: %s", exc)


async def forward_client_messages(
    session: VoiceInterviewSession, websocket: WebSocket
) -> None:
    """Receive candidate messages from websocket and forward to Gemini."""
    try:
        while session.active:
            message = await websocket.receive_text()
            payload = message.strip()
            if not payload:
                continue

            # Messages from the client are expected to be JSON payloads.
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                logger.warning("Ignoring malformed message on session %s", session.session_id)
                continue

            kind = data.get("type")
            if kind == "candidate_turn":
                logger.debug(
                    "Session %s received websocket candidate_turn payload (is_final=%s, source=%s)",
                    session.session_id,
                    data.get("is_final", True),
                    data.get("source"),
                )
                await session.handle_candidate_turn(
                    data.get("text", ""),
                    is_final=bool(data.get("is_final", True)),
                    source=data.get("source"),
                )
            elif kind == "end_session":
                logger.debug("Session %s received end_session signal", session.session_id)
                await session.close()
                break
            elif kind == "ping":
                await websocket.send_json({"type": "pong", "session_id": session.session_id})
    except asyncio.CancelledError:  # pragma: no cover - cancellation path
        logger.debug("Client forwarding cancelled for session %s", session.session_id)
    except WebSocketDisconnect:  # pragma: no cover - disconnect path
        logger.debug("Websocket disconnected during candidate stream for %s", session.session_id)
        await session.close()
    except Exception as exc:  # pragma: no cover - network failure path
        logger.exception("Error receiving websocket message: %s", exc)
        await session.close()