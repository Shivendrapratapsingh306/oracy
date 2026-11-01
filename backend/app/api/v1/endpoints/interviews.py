import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Answer, InterviewSession, Question, User
from app.security.auth import require_student
from app.schemas.interview_sessions import (
    AudioAnswerResponse,
    CreateSessionRequest,
    SaveAnswerRequest,
    SessionCreated,
    SessionDetail,
    SessionQuestion,
    SessionSummary,
    PersistedAnswer,
)
from app.schemas.evaluation import AnswerForEvaluation, EvaluationRequest
from app.schemas.reports import InterviewReport, ProgressAnalytics
from app.schemas.speaking_analysis import SpeakingMetrics
from app.services.answer_evaluator import evaluate_answers, evaluate_one
from app.services.report_generator import compute_progress_analytics, generate_interview_report
from app.services.speaking_analyzer import analyze_speech
from app.services.stt_service import (
    MAX_AUDIO_BYTES,
    SUPPORTED_EXTENSIONS,
    SUPPORTED_MIME_TYPES,
    STTError,
    get_configured_stt_client,
)

router = APIRouter(prefix="/interviews", tags=["interview sessions"])


def _detail(session: InterviewSession) -> SessionDetail:
    questions = sorted(session.questions, key=lambda q: q.position)
    persisted_questions = []
    scores = []
    answered = 0
    for q in questions:
        latest = q.answers[0] if q.answers else None
        answer_data = None
        if latest:
            if latest.transcript and latest.transcript.strip():
                answered += 1
            if latest.evaluation_score is not None:
                scores.append(latest.evaluation_score)
            answer_data = PersistedAnswer(
                question_id=str(q.id),
                answer=latest.transcript or "",
                evaluation_score=latest.evaluation_score,
                evaluation_feedback=latest.evaluation_feedback,
            )
        persisted_questions.append(
            SessionQuestion(
                id=str(q.id),
                category=q.category,
                text=q.text,
                position=q.position,
                rationale=q.rationale,
                answer=answer_data,
            )
        )
    return SessionDetail(
        id=str(session.id),
        target_role=session.target_role,
        experience_level=session.experience_level or "mid",
        interview_type=session.interview_type or "mixed",
        difficulty=session.difficulty or "medium",
        generation_method=session.generation_method or "rule_based_baseline",
        status=session.status,
        created_at=session.created_at,
        completed_at=session.completed_at,
        question_count=len(questions),
        answered_count=answered,
        average_score=round(sum(scores) / len(scores)) if scores else None,
        questions=persisted_questions,
    )


def _load_session(db: Session, session_id: uuid.UUID, user: User) -> InterviewSession:
    item = db.scalar(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == user.id)
        .options(selectinload(InterviewSession.questions).selectinload(Question.answers))
    )
    if not item:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return item


@router.post("", response_model=SessionCreated, status_code=201)
def create_session(
    payload: CreateSessionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> SessionCreated:
    resume_uuid: uuid.UUID | None = None
    if payload.resume_id:
        try:
            resume_uuid = uuid.UUID(payload.resume_id)
        except ValueError:
            resume_uuid = None

    session = InterviewSession(
        user_id=user.id,
        resume_id=resume_uuid,
        target_role=payload.target_role.strip(),
        experience_level=payload.experience_level or "mid",
        interview_type=payload.interview_type or "mixed",
        difficulty=payload.difficulty or "medium",
        generation_method=payload.generation_method or "rule_based_baseline",
        status="in_progress",
    )
    for position, item in enumerate(payload.questions, start=1):
        session.questions.append(
            Question(
                text=item.text.strip(),
                category=item.category,
                position=position,
                rationale=item.rationale.strip() if item.rationale else None,
            )
        )
    db.add(session)
    db.commit()
    return SessionCreated(session=_detail(_load_session(db, session.id, user)))


@router.get("/active", response_model=SessionDetail | None)
def get_active_session(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> SessionDetail | None:
    """Retrieve the most recent in-progress interview session to resume, if any."""
    item = db.scalar(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id, InterviewSession.status == "in_progress")
        .options(selectinload(InterviewSession.questions).selectinload(Question.answers))
        .order_by(InterviewSession.created_at.desc())
        .limit(1)
    )
    if not item:
        return None
    return _detail(item)


@router.put("/{session_id}/answers/{question_id}", response_model=SessionDetail)
def save_answer(
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    payload: SaveAnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> SessionDetail:
    session = _load_session(db, session_id, user)
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Completed interviews cannot be edited")
    question = next((q for q in session.questions if q.id == question_id), None)
    if question is None:
        raise HTTPException(status_code=404, detail="Question does not belong to this interview session")
    answer = question.answers[0] if question.answers else Answer(question_id=question.id)
    answer.transcript = payload.answer.strip() if payload.answer else ""
    if payload.speaking_metrics:
        existing_fb = dict(answer.evaluation_feedback or {})
        existing_fb["speaking_metrics"] = payload.speaking_metrics
        answer.evaluation_feedback = existing_fb
    if not question.answers:
        db.add(answer)
    db.commit()
    return _detail(_load_session(db, session.id, user))


@router.post("/{session_id}/questions/{question_id}/audio-answer", response_model=AudioAnswerResponse)
async def submit_audio_answer(
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    file: UploadFile = File(...),
    duration_seconds: float = Form(default=0.0),
    pauses_seconds: float | None = Form(default=None),
    client_transcript: str | None = Form(default=None),
    language: str = Form(default="en"),
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> AudioAnswerResponse:
    """Upload recorded interview audio, transcribe via Whisper, analyze speaking metrics, and evaluate."""
    session = _load_session(db, session_id, user)
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Completed interviews cannot be edited")

    question = next((q for q in session.questions if q.id == question_id), None)
    if question is None:
        raise HTTPException(status_code=404, detail="Question does not belong to this interview session")

    filename = file.filename or "recording.webm"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    content_type = file.content_type or "audio/webm"

    if ext and ext not in SUPPORTED_EXTENSIONS and content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext or content_type}'. Supported formats: WebM, WAV, MP3, M4A, OGG.",
        )

    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 120:
        raise HTTPException(status_code=400, detail="Audio recording is empty or too short to contain speech.")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25MB maximum size limit.")

    # 1. Transcribe audio using Whisper STT service (or browser/fallback transcript if provided)
    stt_client = get_configured_stt_client()
    transcript = ""
    segments: list[dict] = []
    effective_duration = duration_seconds

    if stt_client:
        try:
            try:
                stt_result = stt_client.transcribe(audio_bytes, filename=filename, content_type=content_type, language=language)
            except TypeError:
                stt_result = stt_client.transcribe(audio_bytes, filename=filename, content_type=content_type)
            transcript = stt_result.transcript
            segments = [s.model_dump() for s in stt_result.segments]
            if stt_result.duration_seconds > 0:
                effective_duration = stt_result.duration_seconds
        except STTError as exc:
            raise HTTPException(status_code=422, detail=f"Speech transcription failed: {exc}") from exc
    elif client_transcript and client_transcript.strip():
        # Fallback to assistive browser client transcript if Whisper API is not configured
        transcript = client_transcript.strip()
    else:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text service is not configured. Set LLM_API_KEY or STT_API_KEY to enable Whisper audio transcription.",
        )

    if not transcript.strip():
        raise HTTPException(status_code=422, detail="No speech could be detected in the recording.")

    # 2. Speaking Analysis (WPM, silence %, pauses, contextual fillers)
    speaking_metrics = analyze_speech(
        transcript=transcript,
        duration_seconds=effective_duration,
        segments=segments if segments else None,
        pauses_seconds=pauses_seconds,
    )

    # 3. Answer Quality Evaluation (6 dimensions)
    eval_input = AnswerForEvaluation(
        question_id=str(question.id),
        question_text=question.text,
        category=question.category or "technical",
        answer=transcript,
        speaking_metrics=speaking_metrics,
    )
    evaluated = evaluate_one(eval_input, target_role=session.target_role)

    # 4. Save to Database
    answer = question.answers[0] if question.answers else Answer(question_id=question.id)
    answer.transcript = transcript
    answer.evaluation_score = evaluated.overall_score
    answer.evaluation_feedback = evaluated.model_dump(mode="json")
    if not question.answers:
        db.add(answer)
    db.commit()

    updated_session = _detail(_load_session(db, session.id, user))
    return AudioAnswerResponse(
        question_id=str(question.id),
        transcript=transcript,
        speaking_metrics=speaking_metrics,
        evaluation=evaluated,
        session=updated_session,
    )


@router.post("/{session_id}/complete", response_model=SessionDetail)
def complete_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> SessionDetail:
    session = _load_session(db, session_id, user)
    if session.status != "completed":
        answers = []
        for q in sorted(session.questions, key=lambda item: item.position):
            answer = q.answers[0] if q.answers else None
            if answer and (answer.transcript or "").strip():
                # If existing feedback has speaking metrics, attach them
                metrics_data = (answer.evaluation_feedback or {}).get("speaking_metrics")
                parsed_metrics = SpeakingMetrics(**metrics_data) if metrics_data else None
                answers.append(
                    AnswerForEvaluation(
                        question_id=str(q.id),
                        question_text=q.text,
                        category=q.category or "technical",
                        answer=answer.transcript or "",
                        speaking_metrics=parsed_metrics,
                    )
                )
        if answers:
            evaluated = evaluate_answers(answers, target_role=session.target_role)
            by_id = {item.question_id: item for item in evaluated}
            for q in session.questions:
                if q.answers and str(q.id) in by_id:
                    result = by_id[str(q.id)]
                    existing_fb = q.answers[0].evaluation_feedback or {}
                    dumped = result.model_dump(mode="json")
                    if "speaking_metrics" in existing_fb and not dumped.get("speaking_metrics"):
                        dumped["speaking_metrics"] = existing_fb["speaking_metrics"]
                    q.answers[0].evaluation_score = result.overall_score
                    q.answers[0].evaluation_feedback = dumped
        session.status = "completed"
        session.completed_at = datetime.now(timezone.utc)
        db.commit()
    return _detail(_load_session(db, session.id, user))


@router.get("/history", response_model=list[SessionSummary])
def get_history(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> list[SessionSummary]:
    items = db.scalars(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .options(selectinload(InterviewSession.questions).selectinload(Question.answers))
        .order_by(InterviewSession.created_at.desc())
    ).all()
    return [
        SessionSummary.model_validate(
            _detail(item).model_dump(
                include={
                    "id",
                    "target_role",
                    "experience_level",
                    "interview_type",
                    "difficulty",
                    "generation_method",
                    "status",
                    "created_at",
                    "completed_at",
                    "question_count",
                    "answered_count",
                    "average_score",
                }
            )
        )
        for item in items
    ]


@router.get("/analytics/progress", response_model=ProgressAnalytics)
def get_user_progress_analytics(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> ProgressAnalytics:
    """Retrieve longitudinal progress analytics, score trends, and difficulty areas for authenticated student."""
    sessions = db.scalars(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .options(selectinload(InterviewSession.questions).selectinload(Question.answers))
        .order_by(InterviewSession.created_at.asc())
    ).all()
    return compute_progress_analytics(list(sessions))


@router.get("/{session_id}/report", response_model=InterviewReport)
def get_session_report(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> InterviewReport:
    """Generate or retrieve a detailed multi-dimensional performance report for a specific interview."""
    session = _load_session(db, session_id, user)
    return generate_interview_report(session)


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> SessionDetail:
    return _detail(_load_session(db, session_id, user))
