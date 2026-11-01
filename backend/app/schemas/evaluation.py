"""Pydantic schemas for interview answer evaluation and feedback."""
from pydantic import BaseModel, Field, field_validator

from app.schemas.questions import QuestionCategory
from app.schemas.speaking_analysis import SpeakingMetrics


class AnswerForEvaluation(BaseModel):
    question_id: str = Field(min_length=1, max_length=100)
    question_text: str = Field(min_length=3, max_length=1000)
    category: QuestionCategory
    answer: str = Field(default="", max_length=15000)
    language: str = Field(default="en", description="Evaluation language (en, hi, or te)")
    speaking_metrics: SpeakingMetrics | None = None

    @field_validator("answer")
    @classmethod
    def trim_answer(cls, value: str) -> str:
        return value.strip()


class EvaluationDimension(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str


class EvaluatedAnswer(BaseModel):
    question_id: str
    question_text: str
    category: QuestionCategory
    word_count: int
    overall_score: int = Field(ge=0, le=100)

    # 6 core dimensions assessed
    relevance: EvaluationDimension
    technical_correctness: EvaluationDimension
    completeness: EvaluationDimension
    clarity: EvaluationDimension
    use_of_examples: EvaluationDimension
    structure: EvaluationDimension

    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    missing_concepts: list[str] = Field(default_factory=list)
    better_answer_suggestion: str = ""
    speaking_metrics: SpeakingMetrics | None = None


class EvaluationRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=100)
    answers: list[AnswerForEvaluation] = Field(min_length=1, max_length=25)


class EvaluationResponse(BaseModel):
    target_role: str
    evaluation_method: str = "transparent_rule_based_estimate"
    disclaimer: str = (
        "Practice feedback only. These model-generated heuristic estimates are designed for interview coaching "
        "and do not represent human hiring decisions."
    )
    evaluated_count: int
    average_score: int
    results: list[EvaluatedAnswer]
