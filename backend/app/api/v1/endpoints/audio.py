"""Audio transcription and speech analysis API endpoints."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.schemas.speaking_analysis import SpeakingMetrics
from app.services.speaking_analyzer import analyze_speech
from app.services.stt_service import (
    MAX_AUDIO_BYTES,
    SUPPORTED_EXTENSIONS,
    SUPPORTED_MIME_TYPES,
    STTError,
    STTResult,
    get_configured_stt_client,
)

router = APIRouter(prefix="/audio", tags=["speech and audio"])


class TranscribeAudioResponse(BaseModel):
    stt: STTResult
    speaking_metrics: SpeakingMetrics


class AnalyzeSpeechRequest(BaseModel):
    transcript: str
    duration_seconds: float = 0.0
    pauses_seconds: float | None = None


@router.post("/transcribe", response_model=TranscribeAudioResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    duration_seconds: float = Form(default=0.0),
    language: str = Form(default="en"),
) -> TranscribeAudioResponse:
    """Transcribe an audio file using configured Whisper STT and analyze delivery metrics."""
    stt_client = get_configured_stt_client()
    if not stt_client:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text service is not configured. Set LLM_API_KEY or STT_API_KEY in backend environment.",
        )

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
        raise HTTPException(status_code=400, detail="Audio recording is empty or too short.")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds the 25MB maximum size limit.")

    try:
        try:
            stt_result = stt_client.transcribe(
                audio_bytes=audio_bytes,
                filename=filename,
                content_type=content_type,
                language=language,
            )
        except TypeError:
            stt_result = stt_client.transcribe(
                audio_bytes=audio_bytes,
                filename=filename,
                content_type=content_type,
            )
    except STTError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    effective_duration = stt_result.duration_seconds if stt_result.duration_seconds > 0 else duration_seconds
    segment_dicts = [s.model_dump() for s in stt_result.segments]
    metrics = analyze_speech(
        transcript=stt_result.transcript,
        duration_seconds=effective_duration,
        segments=segment_dicts,
        language=language,
    )

    return TranscribeAudioResponse(
        stt=stt_result,
        speaking_metrics=metrics,
    )


@router.post("/analyze-speech", response_model=SpeakingMetrics)
def analyze_speech_endpoint(payload: AnalyzeSpeechRequest) -> SpeakingMetrics:
    """Analyze speaking rate, pauses, approximate silence percentage, and contextual filler words."""
    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty for speaking analysis.")

    return analyze_speech(
        transcript=payload.transcript,
        duration_seconds=payload.duration_seconds,
        pauses_seconds=payload.pauses_seconds,
    )

