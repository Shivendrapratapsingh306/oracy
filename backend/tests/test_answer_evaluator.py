"""Tests for answer evaluation service and /answers/evaluate endpoint."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Shared in-memory DB for module-level TestClient
_engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


def _override_db():
    db = _Session()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _setup_db():
    Base.metadata.create_all(_engine)
    app.dependency_overrides[get_db] = _override_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(_engine)


client = TestClient(app)


def test_evaluate_answers_returns_explainable_dimensions() -> None:
    response = client.post(
        "/api/v1/answers/evaluate",
        json={
            "target_role": "Backend Engineer",
            "answers": [
                {
                    "question_id": "q1",
                    "question_text": "How would you design a REST API with caching?",
                    "category": "technical",
                    "answer": "First, I would design clear REST endpoints and validate requests. For example, I would use Redis caching for frequently requested data. Then I would add tests, monitor latency, and invalidate cached values when the underlying data changes.",
                }
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["evaluation_method"] == "transparent_rule_based_estimate"
    assert body["evaluated_count"] == 1
    assert body["average_score"] > 0
    result = body["results"][0]
    assert set(["relevance", "completeness", "structure"]).issubset(result)
    assert result["improvements"]
    assert "heuristic estimates" in body["disclaimer"]


def test_empty_answer_gets_zero_score_and_actionable_feedback() -> None:
    response = client.post(
        "/api/v1/answers/evaluate",
        json={
            "target_role": "Data Analyst",
            "answers": [{"question_id": "q2", "question_text": "Explain SQL joins.", "category": "technical", "answer": "  "}],
        },
    )
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["overall_score"] == 0
    assert result["word_count"] == 0
    assert result["improvements"]


def test_evaluation_rejects_invalid_category() -> None:
    response = client.post(
        "/api/v1/answers/evaluate",
        json={"target_role": "Engineer", "answers": [{"question_id": "q1", "question_text": "Explain SQL joins.", "category": "random", "answer": "SQL joins combine rows."}]},
    )
    assert response.status_code == 422
