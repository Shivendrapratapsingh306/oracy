from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import InterviewSession, User
from app.schemas.auth import AdminOverview, AuthResponse, LoginRequest, MyProfileResponse, ProfileUpdateRequest, RegisterRequest, UserPublic
from app.security.auth import create_access_token, get_current_user, hash_password, require_admin, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])


def _public(user: User) -> UserPublic:
    return UserPublic(id=str(user.id), full_name=user.full_name, email=user.email, role=user.role, created_at=user.created_at)


def _response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(user), expires_in=settings.access_token_minutes * 60, user=_public(user))


def _email(value: str) -> str:
    return value.strip().lower()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = _email(str(payload.email))
    # Public registration can never assign an admin role.
    user = User(full_name=payload.full_name, email=email, password_hash=hash_password(payload.password), role="student")
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    return _response(user)


def _login(payload: LoginRequest, db: Session, expected_role: str) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == _email(str(payload.email))))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    if user.role != expected_role:
        if expected_role == "admin":
            raise HTTPException(status_code=403, detail="This account is not an administrator. Use student sign in.")
        raise HTTPException(status_code=403, detail="Use the administrator sign-in page for this account.")
    return _response(user)


@router.post("/login", response_model=AuthResponse)
def student_login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _login(payload, db, "student")


@router.post("/admin/login", response_model=AuthResponse)
def admin_login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _login(payload, db, "admin")


@router.get("/me", response_model=MyProfileResponse)
def me(user: User = Depends(get_current_user)) -> MyProfileResponse:
    return MyProfileResponse(**_public(user).model_dump(), profile_data=user.profile_data or {})


@router.patch("/me", response_model=MyProfileResponse)
def update_me(payload: ProfileUpdateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MyProfileResponse:
    user.full_name = payload.full_name.strip()
    user.profile_data = {
        "college": payload.college.strip(),
        "degree": payload.degree.strip(),
        "grad_year": payload.grad_year.strip(),
        "target_role": payload.target_role.strip(),
        "career_goals": payload.career_goals.strip(),
    }
    db.add(user)
    db.commit()
    db.refresh(user)
    return MyProfileResponse(**_public(user).model_dump(), profile_data=user.profile_data or {})


@router.post("/logout")
def logout(user: User = Depends(get_current_user)) -> dict[str, str]:
    # Bearer tokens are stateless; the client discards the token on logout.
    return {"status": "signed_out", "user_id": str(user.id)}


@router.get("/admin/overview", response_model=AdminOverview)
def admin_overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> AdminOverview:
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    student_count = db.scalar(select(func.count()).select_from(User).where(User.role == "student")) or 0
    admin_count = db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) or 0
    interview_count = db.scalar(select(func.count()).select_from(InterviewSession)) or 0
    completed_count = db.scalar(select(func.count()).select_from(InterviewSession).where(InterviewSession.status == "completed")) or 0
    recent = db.scalars(select(User).order_by(User.created_at.desc()).limit(10)).all()
    return AdminOverview(user_count=user_count, student_count=student_count, admin_count=admin_count, interview_count=interview_count, completed_interview_count=completed_count, recent_users=[_public(item) for item in recent])
