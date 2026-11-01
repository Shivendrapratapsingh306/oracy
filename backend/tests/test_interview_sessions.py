import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Answer, InterviewSession, Question, Resume, User

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
    response = client.post("/api/v1/auth/register", json={"full_name": "Test Student", "email": email, "password": "StrongPass123"})
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _new_session(headers):
    response = client.post(
        "/api/v1/interviews",
        headers=headers,
        json={
            "target_role": "Backend Engineer",
            "experience_level": "senior",
            "interview_type": "mixed",
            "difficulty": "hard",
            "questions": [
                {"id": "q1", "category": "technical", "text": "Explain Redis caching.", "rationale": "Checks caching concepts."},
                {"id": "q2", "category": "hr", "text": "Tell me about a team challenge.", "rationale": "Checks conflict resolution."},
            ],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["session"]


def test_create_session_persists_questions_and_returns_uuid_ids():
    headers = _student()
    session = _new_session(headers)
    assert session["target_role"] == "Backend Engineer"
    assert session["status"] == "in_progress"
    assert session["experience_level"] == "senior"
    assert session["interview_type"] == "mixed"
    assert session["difficulty"] == "hard"
    assert session["question_count"] == 2
    assert len(session["questions"]) == 2
    assert uuid.UUID(session["id"])
    assert uuid.UUID(session["questions"][0]["id"])
    assert session["questions"][0]["rationale"] == "Checks caching concepts."


def test_save_answer_and_retrieve_session():
    headers = _student()
    session = _new_session(headers)
    question_id = session["questions"][0]["id"]
    saved = client.put(
        f"/api/v1/interviews/{session['id']}/answers/{question_id}",
        headers=headers,
        json={"answer": "Redis stores frequently used values in memory."},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["answered_count"] == 1
    retrieved = client.get(f"/api/v1/interviews/{session['id']}", headers=headers)
    assert retrieved.status_code == 200
    assert retrieved.json()["questions"][0]["answer"]["answer"].startswith("Redis stores")


def test_complete_session_persists_evaluation_and_blocks_edits():
    headers = _student()
    session = _new_session(headers)
    for question in session["questions"]:
        response = client.put(
            f"/api/v1/interviews/{session['id']}/answers/{question['id']}",
            headers=headers,
            json={"answer": "I would explain the problem, describe my approach, and share the result with the team."},
        )
        assert response.status_code == 200, response.text
    completed = client.post(f"/api/v1/interviews/{session['id']}/complete", headers=headers)
    assert completed.status_code == 200, completed.text
    body = completed.json()
    assert body["status"] == "completed"
    assert body["completed_at"] is not None
    assert all(q["answer"]["evaluation_score"] is not None for q in body["questions"])
    blocked = client.put(
        f"/api/v1/interviews/{session['id']}/answers/{session['questions'][0]['id']}",
        headers=headers,
        json={"answer": "try edit"},
    )
    assert blocked.status_code == 409


def test_unknown_session_returns_404_and_history_is_account_scoped():
    headers = _student("first@example.com")
    missing = client.get(f"/api/v1/interviews/{uuid.uuid4()}", headers=headers)
    assert missing.status_code == 404
    session = _new_session(headers)
    history = client.get("/api/v1/interviews/history", headers=headers)
    assert history.status_code == 200
    assert len(history.json()) == 1
    assert history.json()[0]["id"] == session["id"]

    other_headers = _student("other@example.com")
    other_history = client.get("/api/v1/interviews/history", headers=other_headers)
    assert other_history.status_code == 200
    assert other_history.json() == []
    forbidden = client.get(f"/api/v1/interviews/{session['id']}", headers=other_headers)
    assert forbidden.status_code == 404


def test_interview_endpoints_require_authentication():
    response = client.get("/api/v1/interviews/history")
    assert response.status_code == 401


def test_active_session_retrieval_and_resume():
    headers = _student("resume@example.com")
    # Initially no active session
    active_res = client.get("/api/v1/interviews/active", headers=headers)
    assert active_res.status_code == 200
    assert active_res.json() is None

    # Create session
    session = _new_session(headers)
    # Save first answer
    client.put(
        f"/api/v1/interviews/{session['id']}/answers/{session['questions'][0]['id']}",
        headers=headers,
        json={"answer": "Draft answer for question 1"},
    )

    # Active session is returned
    active_res = client.get("/api/v1/interviews/active", headers=headers)
    assert active_res.status_code == 200
    active = active_res.json()
    assert active is not None
    assert active["id"] == session["id"]
    assert active["status"] == "in_progress"
    assert active["answered_count"] == 1
    assert active["questions"][0]["answer"]["answer"] == "Draft answer for question 1"

    # Complete session
    client.post(f"/api/v1/interviews/{session['id']}/complete", headers=headers)

    # After completion, no active session remains
    active_after = client.get("/api/v1/interviews/active", headers=headers)
    assert active_after.status_code == 200
    assert active_after.json() is None


def test_save_empty_answer_draft():
    headers = _student("draft@example.com")
    session = _new_session(headers)
    question_id = session["questions"][0]["id"]
    saved = client.put(
        f"/api/v1/interviews/{session['id']}/answers/{question_id}",
        headers=headers,
        json={"answer": ""},
    )
    assert saved.status_code == 200
    assert saved.json()["answered_count"] == 0
