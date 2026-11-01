import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import User
from app.security.auth import hash_password

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def database():
    Base.metadata.create_all(engine)
    app.dependency_overrides[get_db] = override_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(engine)


client = TestClient(app)


def test_student_register_login_and_me():
    registered = client.post("/api/v1/auth/register", json={"full_name": "  Test   Student ", "email": "STUDENT@example.com", "password": "StrongPass123"})
    assert registered.status_code == 201, registered.text
    body = registered.json()
    assert body["user"]["full_name"] == "Test Student"
    assert body["user"]["email"] == "student@example.com"
    assert body["user"]["role"] == "student"
    assert "password" not in body
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]

    login = client.post("/api/v1/auth/login", json={"email": "student@example.com", "password": "StrongPass123"})
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "student"


def test_student_profile_is_saved_to_account():
    registered = client.post("/api/v1/auth/register", json={"full_name": "Profile Student", "email": "profile@example.com", "password": "StrongPass123"})
    assert registered.status_code == 201
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    updated = client.patch("/api/v1/auth/me", headers=headers, json={
        "full_name": "Profile Student Updated", "college": "GLA University", "degree": "B.Tech", "grad_year": "2028",
        "target_role": "Backend Engineer", "career_goals": "Prepare for product company interviews",
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()["full_name"] == "Profile Student Updated"
    assert updated.json()["profile_data"]["college"] == "GLA University"
    fetched = client.get("/api/v1/auth/me", headers=headers)
    assert fetched.json()["profile_data"]["target_role"] == "Backend Engineer"


def test_duplicate_email_bad_password_and_role_separation():
    first = client.post("/api/v1/auth/register", json={"full_name": "Student One", "email": "same@example.com", "password": "StrongPass123"})
    assert first.status_code == 201
    duplicate = client.post("/api/v1/auth/register", json={"full_name": "Student Two", "email": "same@example.com", "password": "StrongPass123"})
    assert duplicate.status_code == 409
    bad = client.post("/api/v1/auth/login", json={"email": "same@example.com", "password": "WrongPass123"})
    assert bad.status_code == 401
    admin_login = client.post("/api/v1/auth/admin/login", json={"email": "same@example.com", "password": "StrongPass123"})
    assert admin_login.status_code == 403


def test_admin_portal_and_admin_endpoint_are_role_protected():
    db = TestSession()
    admin = User(full_name="Site Admin", email="admin@example.com", password_hash=hash_password("AdminPassword1234"), role="admin")
    db.add(admin)
    db.commit()
    db.close()

    login = client.post("/api/v1/auth/admin/login", json={"email": "admin@example.com", "password": "AdminPassword1234"})
    assert login.status_code == 200, login.text
    assert login.json()["user"]["role"] == "admin"
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    overview = client.get("/api/v1/auth/admin/overview", headers=headers)
    assert overview.status_code == 200, overview.text
    assert overview.json()["admin_count"] == 1
    admin_interview = client.post("/api/v1/interviews", headers=headers, json={"target_role": "Backend Engineer", "questions": [{"id": "q1", "category": "technical", "text": "Explain caching."}]})
    assert admin_interview.status_code == 403

    student = client.post("/api/v1/auth/register", json={"full_name": "Regular Student", "email": "regular@example.com", "password": "StrongPass123"})
    student_headers = {"Authorization": f"Bearer {student.json()['access_token']}"}
    forbidden = client.get("/api/v1/auth/admin/overview", headers=student_headers)
    assert forbidden.status_code == 403


def test_invalid_token_is_rejected():
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token"})
    assert response.status_code == 401
