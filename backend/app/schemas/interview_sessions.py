from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.questions import QuestionCategory
from app.schemas.evaluation import EvaluatedAnswer
from app.schemas.speaking_analysis import SpeakingMetrics


class SessionQuestionInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    category: QuestionCategory
    text: str = Field(min_length=3, max_length=2000)
    rationale: str | None = None


class CreateSessionRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=160)
    experience_level: str | None = Field(default="mid", max_length=40)
    interview_type: str | None = Field(default="mixed", max_length=40)
    difficulty: str | None = Field(default="medium", max_length=40)
    generation_method: str | None = Field(default="rule_based_baseline", max_length=60)
    resume_id: str | None = None
    questions: list[SessionQuestionInput] = Field(min_length=1, max_length=15)


class SaveAnswerRequest(BaseModel):
    answer: str = Field(default="", max_length=15000)
    speaking_metrics: dict | None = None


class PersistedAnswer(BaseModel):
    question_id: str
    answer: str
    evaluation_score: int | None = None
    evaluation_feedback: dict | None = None


class SessionQuestion(BaseModel):
    id: str
    category: str | None
    text: str
    position: int
    rationale: str | None = None
    answer: PersistedAnswer | None = None


class SessionSummary(BaseModel):
    id: str
    target_role: str
    experience_level: str | None = "mid"
    interview_type: str | None = "mixed"
    difficulty: str | None = "medium"
    generation_method: str | None = "rule_based_baseline"
    status: Literal["in_progress", "completed"]
    created_at: datetime
    completed_at: datetime | None = None
    question_count: int
    answered_count: int
    average_score: int | None = None


class SessionDetail(SessionSummary):
    questions: list[SessionQuestion]


class SessionCreated(BaseModel):
    session: SessionDetail


class AudioAnswerResponse(BaseModel):
    question_id: str
    transcript: str
    speaking_metrics: SpeakingMetrics
    evaluation: EvaluatedAnswer
    session: SessionDetail
