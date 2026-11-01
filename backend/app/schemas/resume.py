from pydantic import BaseModel, Field


class ResumeProfile(BaseModel):
    """Small, explainable profile extracted from resume text."""

    skills: list[str] = Field(default_factory=list)
    education_mentions: list[str] = Field(default_factory=list)
    experience_mentions: list[str] = Field(default_factory=list)
    project_mentions: list[str] = Field(default_factory=list)
    character_count: int
