import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db.base import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    resume_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("resumes.id"), nullable=True)
    target_role: Mapped[str] = mapped_column(String(160), nullable=False)
    experience_level: Mapped[str | None] = mapped_column(String(40), nullable=True, default="mid")
    interview_type: Mapped[str | None] = mapped_column(String(40), nullable=True, default="mixed")
    difficulty: Mapped[str | None] = mapped_column(String(40), nullable=True, default="medium")
    generation_method: Mapped[str | None] = mapped_column(String(60), nullable=True, default="rule_based_baseline")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="sessions")
    resume: Mapped["Resume"] = relationship(back_populates="sessions")
    questions: Mapped[list["Question"]] = relationship(back_populates="session", cascade="all, delete-orphan")
