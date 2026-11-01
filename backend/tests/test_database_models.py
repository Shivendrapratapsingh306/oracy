from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import configure_mappers

from app.db.base import Base
from app.models import Answer, InterviewSession, Question, Resume, User


def test_models_register_expected_tables():
    configure_mappers()
    expected = {
        "users",
        "resumes",
        "interview_sessions",
        "questions",
        "answers",
    }
    assert expected.issubset(Base.metadata.tables.keys())


def test_schema_creates_on_sqlite_for_isolated_test():
    # SQLite keeps this test independent from a running PostgreSQL service.
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    tables = set(inspect(engine).get_table_names())
    assert {"users", "resumes", "interview_sessions", "questions", "answers"} <= tables
    engine.dispose()
