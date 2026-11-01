"""Speech-to-text service integrating OpenAI and Groq Whisper providers.

Handles audio formats (WebM, WAV, MP3, MP4, OGG), file size constraints,
empty recording validation, and segments extraction for pause analysis.
"""
from __future__ import annotations

import logging
from typing import Protocol, runtime_checkable

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

# Max upload limit: 25 MB (standard Whisper limit)
MAX_AUDIO_BYTES = 25 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4", ".flac"}
SUPPORTED_MIME_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/mp3",
    "audio/mpeg",
    "audio/m4a",
    "audio/mp4",
    "audio/ogg",
    "audio/x-m4a",
    "video/webm",  # Chrome sometimes sends audio recorded via MediaRecorder as video/webm
}


class STTError(RuntimeError):
    """Raised when speech-to-text transcription fails."""


class AudioSegment(BaseModel):
    id: int = 0
    start: float = 0.0
    end: float = 0.0
    text: str = ""


class STTResult(BaseModel):
    transcript: str
    duration_seconds: float = 0.0
    segments: list[AudioSegment] = Field(default_factory=list)
    language: str = "en"
    provider: str = "whisper"


@runtime_checkable
class STTClient(Protocol):
    """Abstract interface for speech transcription."""

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        content_type: str = "audio/webm",
        language: str = "en",
    ) -> STTResult:
        """Transcribe audio bytes into text with segment timings."""
        ...


class WhisperSTTClient:
    """Universal client for OpenAI-compatible audio transcription endpoints (Groq / OpenAI)."""

    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.provider = provider.lower().strip()
        self.api_key = api_key.strip()
        self.timeout_seconds = timeout_seconds

        if self.provider == "groq" or "gsk_" in self.api_key:
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = model or "whisper-large-v3"
        else:
            self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
            self.model = model or "whisper-1"

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        content_type: str = "audio/webm",
        language: str = "en",
    ) -> STTResult:
        # 1. Validate empty recording
        if not audio_bytes or len(audio_bytes) < 120:
            raise STTError("Audio recording is empty or too short to contain speech.")

        # 2. Validate max file size
        if len(audio_bytes) > MAX_AUDIO_BYTES:
            raise STTError(f"Audio file exceeds the maximum size limit of 25MB ({len(audio_bytes)} bytes).")

        # 3. Format / extension sanity
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext and ext not in SUPPORTED_EXTENSIONS and content_type not in SUPPORTED_MIME_TYPES:
            raise STTError(
                f"Unsupported audio format '{ext or content_type}'. Supported formats: WebM, WAV, MP3, M4A, OGG."
            )

        endpoint = f"{self.base_url}/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }

        # Prepare multipart form upload
        # We request verbose_json to extract segment timings for silence/pause analysis
        files = {
            "file": (filename, audio_bytes, content_type or "audio/webm"),
        }
        data = {
            "model": self.model,
            "response_format": "verbose_json",
            "temperature": "0.0",
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(endpoint, headers=headers, files=files, data=data)

                if response.status_code == 429:
                    raise STTError("Speech-to-text service rate limit exceeded. Please wait a moment and try again.")
                if response.status_code != 200:
                    err_msg = response.text[:200]
                    try:
                        err_json = response.json()
                        err_msg = err_json.get("error", {}).get("message", err_msg)
                    except Exception:
                        pass
                    raise STTError(f"Speech-to-text API error ({response.status_code}): {err_msg}")

                result_json = response.json()
        except httpx.RequestError as exc:
            raise STTError(f"Network error connecting to speech-to-text provider: {exc}") from exc
        except STTError:
            raise
        except Exception as exc:
            raise STTError(f"Unexpected error during transcription: {exc}") from exc

        raw_text = (result_json.get("text") or "").strip()
        if not raw_text:
            raise STTError("No intelligible speech could be recognized in the recording.")

        duration = float(result_json.get("duration") or 0.0)
        language = str(result_json.get("language") or "en")

        segments: list[AudioSegment] = []
        for raw_seg in result_json.get("segments") or []:
            segments.append(
                AudioSegment(
                    id=int(raw_seg.get("id", 0)),
                    start=float(raw_seg.get("start", 0.0)),
                    end=float(raw_seg.get("end", 0.0)),
                    text=str(raw_seg.get("text", "")).strip(),
                )
            )

        return STTResult(
            transcript=raw_text,
            duration_seconds=duration,
            segments=segments,
            language=language,
            provider=f"{self.provider}:{self.model}",
        )


def get_configured_stt_client() -> STTClient | None:
    """Return an active Whisper STT client if credentials are configured."""
    api_key = settings.llm_api_key.strip()
    provider = settings.llm_provider.strip().lower()

    if not api_key:
        return None

    if not provider:
        provider = "groq" if "gsk_" in api_key else "openai"

    return WhisperSTTClient(
        provider=provider,
        api_key=api_key,
        base_url=settings.llm_base_url.strip() or None,
    )

