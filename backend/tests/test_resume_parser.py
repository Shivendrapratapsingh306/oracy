"""Tests for resume parsing service and /resumes/parse endpoint."""
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from docx import Document

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.resume_parser import ResumeParseError, build_profile, extract_text

# Shared in-memory DB override (resumes/parse has no DB dep, but TestClient startup needs it)
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


def make_docx(text: list[str]) -> bytes:
    document = Document()
    for line in text:
        document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def test_docx_extracts_text_and_profile_mentions():
    content = make_docx([
        "Skills",
        "Python, Java, SQL, FastAPI",
        "Education",
        "B.Tech Computer Science",
        "Projects",
        "Built a resume parsing project",
    ])
    text = extract_text(
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        content,
    )
    profile = build_profile(text)
    assert {"Python", "Java", "SQL", "FastAPI"} <= set(profile["skills"])
    assert profile["education_mentions"] == ["B.Tech Computer Science"]
    assert profile["project_mentions"] == ["Built a resume parsing project"]


def test_rejects_wrong_mime_type():
    try:
        extract_text("resume.pdf", "text/plain", b"not a pdf")
    except ResumeParseError as exc:
        assert "Only valid PDF and DOCX" in str(exc)
    else:
        raise AssertionError("Expected unsupported type to be rejected")


def test_resume_parse_endpoint():
    content = make_docx(["Skills", "Python, React", "Education", "B.Tech"])
    response = client.post(
        "/api/v1/resumes/parse",
        files={
            "file": (
                "resume.docx",
                content,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "Python" in payload["skills"]
    assert payload["character_count"] > 0
    assert "raw_text" not in payload


def test_resume_parse_endpoint_rejects_bad_upload():
    response = client.post(
        "/api/v1/resumes/parse",
        files={"file": ("resume.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400
