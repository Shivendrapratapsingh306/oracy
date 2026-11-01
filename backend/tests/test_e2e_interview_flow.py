import io
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


def test_complete_interview_workflow_e2e():
    """Verify the entire user journey:

    1. Student registration & authentication
    2. Resume text parsing & skill extraction
    3. Interview configuration & role selection
    4. Question generation with resume context
    5. Session creation & persistence in database
    6. Active session detection for resumption
    7. Answering questions incrementally with safe saving
    8. Retrieving the session with persisted answers
    9. Completing the interview session
    10. History tracking verification
    """
    # 1. Register student
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Jane Developer", "email": "jane.dev@example.com", "password": "SecurePassword123"},
    )
    assert reg_res.status_code == 201, reg_res.text
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Resume parsing (DOCX in-memory)
    import docx
    doc = docx.Document()
    doc.add_heading("Jane Developer - Senior Software Engineer", level=1)
    doc.add_heading("Skills", level=2)
    doc.add_paragraph("Python, TypeScript, React, Next.js, PostgreSQL, Docker, Kubernetes, AWS")
    doc.add_heading("Projects", level=2)
    doc.add_paragraph("High-throughput telemetry collector for cloud services.")
    doc.add_heading("Experience", level=2)
    doc.add_paragraph("Staff Engineer at TechCorp leading payment platform redesign.")
    doc_bytes = io.BytesIO()
    doc.save(doc_bytes)
    doc_bytes.seek(0)

    parse_res = client.post(
        "/api/v1/resumes/parse",
        files={"file": ("jane_resume.docx", doc_bytes.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert parse_res.status_code == 200, parse_res.text
    parsed_profile = parse_res.json()
    assert "Python" in parsed_profile["skills"]
    assert "TypeScript" in parsed_profile["skills"]
    assert len(parsed_profile["project_mentions"]) > 0

    # 3 & 4. Question generation with configuration & resume context
    gen_res = client.post(
        "/api/v1/questions/generate",
        json={
            "target_role": "Full Stack Developer",
            "experience_level": "senior",
            "interview_type": "mixed",
            "difficulty": "hard",
            "question_count": 5,
            "skills": parsed_profile["skills"],
            "project_mentions": parsed_profile["project_mentions"],
            "experience_mentions": parsed_profile["experience_mentions"],
        },
    )
    assert gen_res.status_code == 200, gen_res.text
    gen_data = gen_res.json()
    assert gen_data["target_role"] == "Full Stack Developer"
    assert gen_data["experience_level"] == "senior"
    assert gen_data["difficulty"] == "hard"
    assert gen_data["interview_type"] == "mixed"
    assert gen_data["generation_method"] == "rule_based_baseline"
    assert len(gen_data["questions"]) == 5
    assert all(q["text"] and q["rationale"] for q in gen_data["questions"])

    # 5. Start interview session in database
    create_res = client.post(
        "/api/v1/interviews",
        headers=headers,
        json={
            "target_role": gen_data["target_role"],
            "experience_level": gen_data["experience_level"],
            "interview_type": gen_data["interview_type"],
            "difficulty": gen_data["difficulty"],
            "generation_method": gen_data["generation_method"],
            "questions": gen_data["questions"],
        },
    )
    assert create_res.status_code == 201, create_res.text
    session = create_res.json()["session"]
    session_id = session["id"]
    assert session["status"] == "in_progress"
    assert session["question_count"] == 5
    assert session["answered_count"] == 0

    # 6. Check active session endpoint (for interrupted session resumption)
    active_res = client.get("/api/v1/interviews/active", headers=headers)
    assert active_res.status_code == 200
    active_session = active_res.json()
    assert active_session is not None
    assert active_session["id"] == session_id
    assert active_session["status"] == "in_progress"

    # 7. Answer question 1 and question 2
    q1 = session["questions"][0]
    q2 = session["questions"][1]

    ans1_res = client.put(
        f"/api/v1/interviews/{session_id}/answers/{q1['id']}",
        headers=headers,
        json={"answer": "I would design the architecture with clean modular boundaries, strict validation, and comprehensive integration testing."},
    )
    assert ans1_res.status_code == 200, ans1_res.text
    assert ans1_res.json()["answered_count"] == 1

    ans2_res = client.put(
        f"/api/v1/interviews/{session_id}/answers/{q2['id']}",
        headers=headers,
        json={"answer": "When facing tight deadlines, I communicate trade-offs explicitly, prioritize the core user journey, and schedule technical debt cleanup."},
    )
    assert ans2_res.status_code == 200, ans2_res.text
    assert ans2_res.json()["answered_count"] == 2

    # 8. Retrieve the session by ID to verify state persistence
    retrieved_res = client.get(f"/api/v1/interviews/{session_id}", headers=headers)
    assert retrieved_res.status_code == 200
    retrieved = retrieved_res.json()
    assert retrieved["answered_count"] == 2
    assert retrieved["questions"][0]["answer"]["answer"].startswith("I would design the architecture")
    assert retrieved["questions"][1]["answer"]["answer"].startswith("When facing tight deadlines")

    # 9. Complete the interview session
    complete_res = client.post(f"/api/v1/interviews/{session_id}/complete", headers=headers)
    assert complete_res.status_code == 200, complete_res.text
    completed = complete_res.json()
    assert completed["status"] == "completed"
    assert completed["completed_at"] is not None

    # 10. Verify active session is cleared and history shows the completed session
    active_after = client.get("/api/v1/interviews/active", headers=headers)
    assert active_after.status_code == 200
    assert active_after.json() is None

    history_res = client.get("/api/v1/interviews/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 1
    assert history[0]["id"] == session_id
    assert history[0]["status"] == "completed"
    assert history[0]["answered_count"] == 2
    assert history[0]["experience_level"] == "senior"

