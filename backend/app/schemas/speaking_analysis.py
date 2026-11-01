"""Pydantic schemas for interview speech pacing, silence, and filler-word metrics."""
from pydantic import BaseModel, Field


class FillerWordDetail(BaseModel):
    word: str
    count: int
    context_examples: list[str] = Field(default_factory=list)
    is_filler: bool = True
    explanation: str


class SpeakingMetrics(BaseModel):
    duration_seconds: float = Field(default=0.0, ge=0.0)
    word_count: int = Field(default=0, ge=0)
    speaking_rate_wpm: float = Field(default=0.0, ge=0.0)
    speaking_rate_category: str = "optimal"  # "slow", "optimal", "fast", "unmeasured"
    total_pause_duration_seconds: float = Field(default=0.0, ge=0.0)
    silence_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    filler_word_count: int = Field(default=0, ge=0)
    filler_word_frequency_per_minute: float = Field(default=0.0, ge=0.0)
    filler_words: list[FillerWordDetail] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    overall_pacing_feedback: str = ""

