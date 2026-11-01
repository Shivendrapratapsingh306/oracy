"""
Shared pytest configuration for ORACY backend tests.

Sets DATABASE_URL to in-memory SQLite **before** any app module is imported so
that the lru_cached SQLAlchemy engine never tries to connect to PostgreSQL,
which is unavailable in the sandbox / CI environment.

Also provides a shared `test_app_client` fixture that wires up a clean
in-memory SQLite database and tears it down after each test.
"""
import os

# -----------------------------------------------------------------------
# Must happen before ANY import of app.core.config or app.db.session.
# -----------------------------------------------------------------------
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("AUTH_SECRET", "test-secret-for-unit-tests-only-32-chars")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


def _make_sqlite_engine():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


@pytest.fixture()
def test_app_client():
    """
    Provide a TestClient backed by a fresh in-memory SQLite database.
    Suitable for tests that need auth / session / answer persistence.
    """
    from app.db.base import Base
    from app.db.session import get_db
    from app.main import app

    engine = _make_sqlite_engine()
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(engine)
    engine.dispose()
