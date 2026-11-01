from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.schemas.questions import InterviewQuestion, QuestionGenerationRequest
from app.services.llm_client import LLMError
from app.services.question_generator import generate_questions, generate_questions_with_metadata

client = TestClient(app)


def test_generates_role_aware_questions_with_resume_context() -> None:
    response = client.post(
        "/api/v1/questions/generate",
        json={
            "target_role": "Backend Engineer",
            "skills": ["Python", "Redis"],
            "project_mentions": ["PrepMate interview coach"],
            "experience_mentions": ["Internship at a startup"],
            "question_count": 8,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["target_role"] == "Backend Engineer"
    assert body["generation_method"] == "rule_based_baseline"
    assert len(body["questions"]) == 8
    assert any("REST API" in question["text"] for question in body["questions"])
    assert any("PrepMate interview coach" in question["text"] for question in body["questions"])
    assert any(question["category"] == "hr" for question in body["questions"])
    assert all(question["id"] for question in body["questions"])
    assert all(question.get("rationale") for question in body["questions"])


def test_question_count_validation() -> None:
    with pytest.raises(ValueError):
        QuestionGenerationRequest(target_role="QA", question_count=2)
    with pytest.raises(ValueError):
        QuestionGenerationRequest(target_role="QA", question_count=16)


def test_question_count_is_respected_without_profile() -> None:
    payload = QuestionGenerationRequest(target_role="Data Analyst", question_count=5)
    questions = generate_questions(payload)
    assert len(questions) == 5
    assert all(question.category in {"technical", "project", "experience", "hr"} for question in questions)


def test_rejects_missing_role() -> None:
    response = client.post("/api/v1/questions/generate", json={"question_count": 5})
    assert response.status_code == 422


def test_technical_only_interview_excludes_hr_questions() -> None:
    response = client.post(
        "/api/v1/questions/generate",
        json={
            "target_role": "Software Engineer",
            "interview_type": "technical",
            "question_count": 6,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["interview_type"] == "technical"
    assert len(body["questions"]) == 6
    assert not any(q["category"] == "hr" for q in body["questions"])


def test_hr_only_interview_contains_only_hr_questions() -> None:
    response = client.post(
        "/api/v1/questions/generate",
        json={
            "target_role": "Full Stack Developer",
            "interview_type": "hr",
            "question_count": 5,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["interview_type"] == "hr"
    assert len(body["questions"]) == 5
    assert all(q["category"] == "hr" for q in body["questions"])


def test_experience_level_and_difficulty_configuration() -> None:
    response = client.post(
        "/api/v1/questions/generate",
        json={
            "target_role": "DevOps Engineer",
            "experience_level": "senior",
            "difficulty": "hard",
            "interview_type": "mixed",
            "question_count": 5,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["experience_level"] == "senior"
    assert body["difficulty"] == "hard"
    assert len(body["questions"]) == 5


def test_llm_generation_success() -> None:
    mock_client = MagicMock()
    mock_questions = [
        InterviewQuestion(id="q1", category="technical", text="Explain event driven architecture.", rationale="Checks distributed design."),
        InterviewQuestion(id="q2", category="project", text="Walk through your Redis project.", rationale="Checks caching experience."),
        InterviewQuestion(id="q3", category="hr", text="Tell me about a team conflict.", rationale="Checks conflict resolution."),
    ]
    mock_client.generate_questions.return_value = (mock_questions, "groq:llama-3.3-70b-versatile")

    with patch("app.services.question_generator.get_configured_llm_client", return_value=mock_client):
        payload = QuestionGenerationRequest(target_role="Backend Engineer", question_count=3)
        questions, method, model = generate_questions_with_metadata(payload)
        assert method == "ai_generated"
        assert model == "groq:llama-3.3-70b-versatile"
        assert len(questions) == 3
        assert questions[0].text == "Explain event driven architecture."


def test_llm_failure_gracefully_falls_back_to_template() -> None:
    mock_client = MagicMock()
    mock_client.generate_questions.side_effect = LLMError("Rate limit 429")

    with patch("app.services.question_generator.get_configured_llm_client", return_value=mock_client):
        payload = QuestionGenerationRequest(target_role="Frontend Developer", question_count=4)
        questions, method, model = generate_questions_with_metadata(payload)
        assert method == "rule_based_baseline"
        assert model is None
        assert len(questions) == 4
