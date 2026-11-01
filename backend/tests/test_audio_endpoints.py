"""Integration tests for audio answer submission, speaking metrics, and answer evaluation."""
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services import stt_service
from app.services.stt_service import AudioSegment, STTResult

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def configure_test_database():
    Base.metadata.create_all(engine)
    app.dependency_overrides[get_db] = override_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(engine)


client = TestClient(app)


def _student(email="student@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test Student", "email": email, "password": "StrongPass123"},
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_analyze_speech_endpoint() -> None:
    response = client.post(
        "/api/v1/audio/analyze-speech",
        json={
            "transcript": "Um, in my project, like, we actually deployed Redis, you know, for caching.",
            "duration_seconds": 15.0,
            "pauses_seconds": 2.5,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["word_count"] > 0
    assert body["speaking_rate_wpm"] > 0
    assert body["filler_word_count"] >= 2
    assert body["silence_percentage"] > 0
    assert "limitations" in body


def test_audio_answer_submission_and_persistence(monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _student("audio_candidate_1@example.com")

    # 1. Create Interview Session
    create_resp = client.post(
        "/api/v1/interviews",
        headers=headers,
        json={
            "target_role": "Backend Developer",
            "experience_level": "mid",
            "interview_type": "technical",
            "difficulty": "medium",
            "questions": [
                {
                    "id": "q1",
                    "category": "technical",
                    "text": "How do you handle database connections and prevent connection pool exhaustion?",
                    "rationale": "Evaluates database scalability and resource safety.",
                }
            ],
        },
    )
    assert create_resp.status_code == 201
    session_data = create_resp.json()["session"]
    session_id = session_data["id"]
    question_id = session_data["questions"][0]["id"]

    # 2. Mock STT Client transcription
    class MockSTT:
        def transcribe(self, audio_bytes, filename, content_type):
            return STTResult(
                transcript="To prevent connection pool exhaustion, we use PgBouncer for connection pooling with strict timeouts. For example, in our production cluster we set max client connections to 200 and recycle idle connections after 60 seconds.",
                duration_seconds=12.0,
                segments=[
                    AudioSegment(id=0, start=0.0, end=5.5, text="To prevent connection pool exhaustion, we use PgBouncer"),
                    AudioSegment(id=1, start=6.2, end=12.0, text="For example, in our production cluster we set max client connections to 200"),
                ],
                provider="groq:whisper-large-v3",
            )

    monkeypatch.setattr("app.api.v1.endpoints.interviews.get_configured_stt_client", lambda: MockSTT())

    # 3. Submit Audio File
    dummy_wav = b"RIFF" + b"\x00" * 400
    audio_file = io.BytesIO(dummy_wav)

    submit_resp = client.post(
        f"/api/v1/interviews/{session_id}/questions/{question_id}/audio-answer",
        headers=headers,
        files={"file": ("interview_ans.wav", audio_file, "audio/wav")},
        data={"duration_seconds": "12.0"},
    )
    assert submit_resp.status_code == 200, submit_resp.text
    ans_body = submit_resp.json()

    # Verify transcript and speaking metrics
    assert "PgBouncer" in ans_body["transcript"]
    assert ans_body["speaking_metrics"]["word_count"] > 15
    assert ans_body["speaking_metrics"]["speaking_rate_wpm"] > 0
    assert ans_body["speaking_metrics"]["silence_percentage"] >= 0

    # Verify 6-dimensional evaluation
    evaluation = ans_body["evaluation"]
    assert evaluation["overall_score"] > 0
    assert "relevance" in evaluation
    assert "technical_correctness" in evaluation
    assert "completeness" in evaluation
    assert "clarity" in evaluation
    assert "use_of_examples" in evaluation
    assert "structure" in evaluation
    assert "better_answer_suggestion" in evaluation

    # 4. Verify Database Persistence via GET session
    get_resp = client.get(f"/api/v1/interviews/{session_id}", headers=headers)
    assert get_resp.status_code == 200
    saved_session = get_resp.json()
    saved_answer = saved_session["questions"][0]["answer"]
    assert saved_answer is not None
    assert "PgBouncer" in saved_answer["answer"]
    assert saved_answer["evaluation_score"] == evaluation["overall_score"]
    assert saved_answer["evaluation_feedback"]["speaking_metrics"]["word_count"] > 15


def test_user_cannot_access_another_users_interview(monkeypatch: pytest.MonkeyPatch) -> None:
    headers_a = _student("user_a@example.com")
    headers_b = _student("user_b@example.com")

    # User A creates a session
    resp_a = client.post(
        "/api/v1/interviews",
        headers=headers_a,
        json={
            "target_role": "Data Scientist",
            "questions": [
                {
                    "id": "q1",
                    "category": "technical",
                    "text": "Explain bias-variance trade-off in machine learning.",
                }
            ],
        },
    )
    session_id = resp_a.json()["session"]["id"]
    question_id = resp_a.json()["session"]["questions"][0]["id"]

    # User B tries to view User A's session -> must be 404
    get_resp_b = client.get(
        f"/api/v1/interviews/{session_id}",
        headers=headers_b,
    )
    assert get_resp_b.status_code == 404

    # User B tries to submit answer to User A's session -> must be 404
    dummy_wav = b"RIFF" + b"\x00" * 400
    submit_resp_b = client.post(
        f"/api/v1/interviews/{session_id}/questions/{question_id}/audio-answer",
        headers=headers_b,
        files={"file": ("hack.wav", io.BytesIO(dummy_wav), "audio/wav")},
    )
    assert submit_resp_b.status_code == 404
