"""Tests for Speech-to-Text service and Whisper integration."""
import pytest
from app.services.stt_service import (
    STTError,
    WhisperSTTClient,
    get_configured_stt_client,
)


def test_empty_audio_raises_error() -> None:
    client = WhisperSTTClient(provider="groq", api_key="gsk_mock_test_key_123")
    with pytest.raises(STTError, match="empty or too short"):
        client.transcribe(b"", filename="recording.webm")

    with pytest.raises(STTError, match="empty or too short"):
        client.transcribe(b"too_short", filename="recording.webm")


def test_unsupported_audio_format_raises_error() -> None:
    client = WhisperSTTClient(provider="groq", api_key="gsk_mock_test_key_123")
    dummy_bytes = b"x" * 200
    with pytest.raises(STTError, match="Unsupported audio format"):
        client.transcribe(dummy_bytes, filename="document.pdf", content_type="application/pdf")


def test_exceeded_file_size_raises_error() -> None:
    client = WhisperSTTClient(provider="groq", api_key="gsk_mock_test_key_123")
    # 26 MB exceeds 25 MB limit
    huge_bytes = b"x" * (26 * 1024 * 1024)
    with pytest.raises(STTError, match="exceeds the maximum size limit of 25MB"):
        client.transcribe(huge_bytes, filename="long_audio.wav")


def test_whisper_parses_verbose_json(monkeypatch: pytest.MonkeyPatch) -> None:
    client = WhisperSTTClient(provider="groq", api_key="gsk_mock_test_key_123")
    dummy_audio = b"RIFF" + b"\x00" * 300

    class MockResponse:
        status_code = 200

        def json(self) -> dict:
            return {
                "text": "I scaled our microservices by adding Redis caching and read replicas.",
                "duration": 6.5,
                "language": "english",
                "segments": [
                    {
                        "id": 0,
                        "start": 0.0,
                        "end": 3.2,
                        "text": "I scaled our microservices",
                    },
                    {
                        "id": 1,
                        "start": 3.8,
                        "end": 6.5,
                        "text": "by adding Redis caching and read replicas.",
                    },
                ],
            }

    # Mock httpx.Client.post
    import httpx

    def mock_post(self, *args, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    result = client.transcribe(dummy_audio, filename="answer.wav", content_type="audio/wav")
    assert "Redis caching" in result.transcript
    assert result.duration_seconds == 6.5
    assert len(result.segments) == 2
    assert result.segments[1].start == 3.8


def test_whisper_handles_network_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    client = WhisperSTTClient(provider="groq", api_key="gsk_mock_test_key_123")
    dummy_audio = b"RIFF" + b"\x00" * 300

    import httpx

    def mock_post(self, *args, **kwargs):
        raise httpx.RequestError("Connection timed out", request=None)

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    with pytest.raises(STTError, match="Network error connecting to speech-to-text provider"):
        client.transcribe(dummy_audio, filename="answer.wav", content_type="audio/wav")

