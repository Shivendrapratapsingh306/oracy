from typing import Literal

from pydantic import BaseModel, Field, field_validator


QuestionCategory = Literal["technical", "project", "experience", "hr"]
ExperienceLevel = Literal["entry", "mid", "senior"]
InterviewType = Literal["technical", "hr", "mixed"]
DifficultyLevel = Literal["easy", "medium", "hard"]


class QuestionGenerationRequest(BaseModel):
    """Inputs used to build a tailored interview question set."""

    target_role: str = Field(min_length=2, max_length=100, examples=["Software Engineer"])
    experience_level: ExperienceLevel = Field(default="mid", description="Candidate experience level")
    interview_type: InterviewType = Field(default="mixed", description="Focus area of the interview")
    difficulty: DifficultyLevel = Field(default="medium", description="Difficulty level of questions")
    language: str = Field(default="en", description="Preferred interview language (en, hi, or te)")
    skills: list[str] = Field(default_factory=list, max_length=40)
    project_mentions: list[str] = Field(default_factory=list, max_length=10)
    experience_mentions: list[str] = Field(default_factory=list, max_length=10)
    resume_text: str | None = Field(default=None, max_length=20000, description="Optional raw or summary resume text")
    question_count: int = Field(default=8, ge=3, le=15)

    @field_validator("skills", "project_mentions", "experience_mentions")
    @classmethod
    def clean_list_items(cls, values: list[str]) -> list[str]:
        cleaned = [item.strip()[:240] for item in values if item and item.strip()]
        # Preserve order while avoiding duplicate prompts from repeated resume terms.
        return list(dict.fromkeys(cleaned))


class InterviewQuestion(BaseModel):
    id: str
    category: QuestionCategory
    text: str
    rationale: str


class QuestionGenerationResponse(BaseModel):
    target_role: str
    experience_level: ExperienceLevel = "mid"
    interview_type: InterviewType = "mixed"
    difficulty: DifficultyLevel = "medium"
    generation_method: Literal["ai_generated", "rule_based_baseline"] = "rule_based_baseline"
    model_name: str | None = None
    questions: list[InterviewQuestion]
