import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func, JSON, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db.base import Base


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("question_id", name="uq_answers_question_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluation_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evaluation_feedback: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    question: Mapped["Question"] = relationship(back_populates="answers")
