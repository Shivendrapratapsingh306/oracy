"""Schemas for interview performance reports, composite scoring, and progress tracking."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.evaluation import EvaluationDimension
from app.schemas.speaking_analysis import SpeakingMetrics


class ScoringComponent(BaseModel):
    name: str
    score: int | None = None
    weight: float
    status: Literal["measured", "unmeasured", "incomplete"]
    explanation: str


class ScoringBreakdown(BaseModel):
    overall_score: int | None = None
    scoring_method: str
    method_documentation: str
    components: list[ScoringComponent]
    is_incomplete: bool


class SpeakingSummary(BaseModel):
    measured: bool
    average_wpm: float | None = None
    average_silence_percentage: float | None = None
    total_filler_count: int | None = None
    filler_frequency_per_minute: float | None = None
    pacing_category: str | None = None
    feedback: str | None = None
    limitations: list[str] = Field(default_factory=list)


class VisualSummary(BaseModel):
    measured: bool
    face_centering_score: float | None = None
    posture_alignment_score: float | None = None
    feedback: str | None = None
    limitations: list[str] = Field(default_factory=list)


class ReportQuestionDetail(BaseModel):
    question_id: str
    position: int
    category: str
    question_text: str
    rationale: str | None = None
    answer_text: str
    is_answered: bool
    overall_score: int | None = None
    relevance: EvaluationDimension | None = None
    technical_correctness: EvaluationDimension | None = None
    completeness: EvaluationDimension | None = None
    clarity: EvaluationDimension | None = None
    use_of_examples: EvaluationDimension | None = None
    structure: EvaluationDimension | None = None
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    missing_concepts: list[str] = Field(default_factory=list)
    better_answer_suggestion: str | None = None
    speaking_metrics: SpeakingMetrics | None = None


class InterviewReport(BaseModel):
    session_id: str
    target_role: str
    experience_level: str
    interview_type: str
    difficulty: str
    status: Literal["completed", "in_progress"]
    created_at: datetime
    completed_at: datetime | None = None
    question_count: int
    attempted_count: int
    scoring: ScoringBreakdown
    speaking: SpeakingSummary
    visual: VisualSummary
    strengths: list[str] = Field(default_factory=list)
    areas_for_improvement: list[str] = Field(default_factory=list)
    actionable_recommendations: list[str] = Field(default_factory=list)
    repeated_difficulty_areas: list[str] = Field(default_factory=list)
    questions: list[ReportQuestionDetail] = Field(default_factory=list)


class ScoreTrendPoint(BaseModel):
    session_id: str
    date: str
    target_role: str
    score: int
    question_count: int


class SpeakingTrends(BaseModel):
    measured_sessions_count: int
    wpm_trend: list[float] = Field(default_factory=list)
    filler_rate_trend: list[float] = Field(default_factory=list)
    silence_trend: list[float] = Field(default_factory=list)


class ProgressAnalytics(BaseModel):
    total_sessions: int
    completed_sessions: int
    in_progress_sessions: int
    overall_average_score: int | None = None
    has_sufficient_data: bool
    data_summary_note: str
    score_trend: list[ScoreTrendPoint] = Field(default_factory=list)
    dimension_averages: dict[str, int] = Field(default_factory=dict)
    speaking_trends: SpeakingTrends
    strongest_areas: list[str] = Field(default_factory=list)
    areas_requiring_practice: list[str] = Field(default_factory=list)
    repeated_difficulty_tags: list[str] = Field(default_factory=list)

