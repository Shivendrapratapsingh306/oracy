"""Tests for interview reports, documented composite scoring, and progress tracking."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

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


def _student(email="student_reports@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Report Student", "email": email, "password": "StrongPass123"},
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_and_complete_session(headers, target_role="Backend Developer", include_audio=False):
    create_resp = client.post(
        "/api/v1/interviews",
        headers=headers,
        json={
            "target_role": target_role,
            "experience_level": "mid",
            "interview_type": "technical",
            "difficulty": "medium",
            "questions": [
                {
                    "id": "q1",
                    "category": "technical",
                    "text": "How do you optimize slow database queries in PostgreSQL?",
                    "rationale": "Checks database indexing, query planning, and EXPLAIN ANALYZE.",
                },
                {
                    "id": "q2",
                    "category": "technical",
                    "text": "Explain the difference between optimistic and pessimistic locking.",
                    "rationale": "Checks concurrency control understanding.",
                },
            ],
        },
    )
    assert create_resp.status_code == 201
    sess = create_resp.json()["session"]
    sess_id = sess["id"]
    q1_id = sess["questions"][0]["id"]
    q2_id = sess["questions"][1]["id"]

    # Save answer 1
    sp_metrics = None
    if include_audio:
        sp_metrics = {
            "duration_seconds": 25.0,
            "word_count": 55,
            "speaking_rate_wpm": 132.0,
            "speaking_rate_category": "optimal",
            "total_pause_duration_seconds": 3.2,
            "silence_percentage": 12.8,
            "filler_word_count": 1,
            "filler_word_frequency_per_minute": 2.4,
            "filler_words": [],
            "limitations": [],
            "overall_pacing_feedback": "Good pacing at 132 WPM.",
        }

    client.put(
        f"/api/v1/interviews/{sess_id}/answers/{q1_id}",
        headers=headers,
        json={
            "answer": "First, I run EXPLAIN ANALYZE to identify sequential scans and high-cost nodes. For example, in our production database we added B-tree composite indexes and tuned the work_mem buffer, which reduced query latency from 850ms to 45ms.",
            "speaking_metrics": sp_metrics,
        },
    )

    # Save answer 2
    client.put(
        f"/api/v1/interviews/{sess_id}/answers/{q2_id}",
        headers=headers,
        json={
            "answer": "Optimistic locking assumes conflict is rare and validates record versions using a version column before committing. Pessimistic locking acquires explicit database row locks like SELECT FOR UPDATE to block concurrent transactions.",
            "speaking_metrics": sp_metrics,
        },
    )

    # Complete session
    complete_resp = client.post(f"/api/v1/interviews/{sess_id}/complete", headers=headers)
    assert complete_resp.status_code == 200
    return sess_id


def test_user_with_no_interview_history() -> None:
    headers = _student("new_user_no_history@example.com")
    resp = client.get("/api/v1/interviews/analytics/progress", headers=headers)
    assert resp.status_code == 200
    body = resp.json()

    assert body["total_sessions"] == 0
    assert body["completed_sessions"] == 0
    assert body["in_progress_sessions"] == 0
    assert body["overall_average_score"] is None
    assert body["has_sufficient_data"] is False
    assert len(body["score_trend"]) == 0
    assert "No completed interview sessions yet" in body["data_summary_note"]


def test_user_with_one_completed_interview() -> None:
    headers = _student("one_interview_user@example.com")
    sess_id = _create_and_complete_session(headers, target_role="Backend Developer", include_audio=False)

    # 1. Verify Progress Analytics
    analytics_resp = client.get("/api/v1/interviews/analytics/progress", headers=headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()

    assert analytics["total_sessions"] == 1
    assert analytics["completed_sessions"] == 1
    assert analytics["overall_average_score"] is not None
    assert analytics["has_sufficient_data"] is False  # Requires >= 2 for trend lines
    assert "Complete a second interview to see multi-session progress trends" in analytics["data_summary_note"]
    assert len(analytics["score_trend"]) == 1

    # 2. Verify Session Report
    report_resp = client.get(f"/api/v1/interviews/{sess_id}/report", headers=headers)
    assert report_resp.status_code == 200
    report = report_resp.json()

    assert report["session_id"] == sess_id
    assert report["target_role"] == "Backend Developer"
    assert report["status"] == "completed"
    assert report["question_count"] == 2
    assert report["attempted_count"] == 2
    assert report["scoring"]["overall_score"] is not None
    assert report["scoring"]["is_incomplete"] is False
    assert "100% Content" in report["scoring"]["scoring_method"]

    # Verify unmeasured speaking metrics are clearly labeled as unmeasured, NOT score 0
    assert report["speaking"]["measured"] is False
    speaking_comp = next(c for c in report["scoring"]["components"] if c["name"] == "Communication & Speaking Delivery")
    assert speaking_comp["status"] == "unmeasured"
    assert speaking_comp["score"] is None

    # Verify 6-dimensional question feedback
    q1 = report["questions"][0]
    assert q1["relevance"] is not None
    assert q1["technical_correctness"] is not None
    assert q1["completeness"] is not None
    assert q1["clarity"] is not None
    assert q1["use_of_examples"] is not None
    assert q1["structure"] is not None


def test_user_with_multiple_completed_interviews_and_audio() -> None:
    headers = _student("multi_session_user@example.com")

    # Complete session 1 (without audio)
    _create_and_complete_session(headers, target_role="Backend Developer", include_audio=False)

    # Complete session 2 (with audio)
    sess_id_2 = _create_and_complete_session(headers, target_role="Systems Engineer", include_audio=True)

    analytics_resp = client.get("/api/v1/interviews/analytics/progress", headers=headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()

    # Progress tracking across multiple interviews
    assert analytics["total_sessions"] == 2
    assert analytics["completed_sessions"] == 2
    assert analytics["has_sufficient_data"] is True  # Trend tracking unlocked!
    assert len(analytics["score_trend"]) == 2
    assert analytics["overall_average_score"] is not None
    assert len(analytics["dimension_averages"]) > 0

    # Verify session 2 report has measured speaking metrics
    report_2 = client.get(f"/api/v1/interviews/{sess_id_2}/report", headers=headers).json()
    assert report_2["speaking"]["measured"] is True
    assert report_2["speaking"]["average_wpm"] == 132.0
    assert "70% Content + 30% Speech" in report_2["scoring"]["scoring_method"]


def test_interrupted_interview_shows_incomplete_rather_than_zero() -> None:
    headers = _student("interrupted_user@example.com")

    # Create session but DO NOT complete it
    create_resp = client.post(
        "/api/v1/interviews",
        headers=headers,
        json={
            "target_role": "DevOps Engineer",
            "questions": [
                {"id": "q1", "category": "technical", "text": "Explain Kubernetes pods and deployments."}
            ],
        },
    )
    sess_id = create_resp.json()["session"]["id"]

    report_resp = client.get(f"/api/v1/interviews/{sess_id}/report", headers=headers)
    assert report_resp.status_code == 200
    report = report_resp.json()

    assert report["status"] == "in_progress"
    assert report["scoring"]["is_incomplete"] is True
    assert report["scoring"]["overall_score"] is None
    assert "Incomplete" in report["scoring"]["scoring_method"]


def test_user_cannot_access_another_users_report() -> None:
    headers_alice = _student("alice@example.com")
    headers_bob = _student("bob@example.com")

    alice_sess = _create_and_complete_session(headers_alice, target_role="Data Engineer")

    # Bob tries to access Alice's report -> 404 Not Found
    bob_attempt = client.get(f"/api/v1/interviews/{alice_sess}/report", headers=headers_bob)
    assert bob_attempt.status_code == 404

