"""Reusable LLM client interface for AI-powered interview question generation.

Supports Groq, OpenAI, Google Gemini (via OpenAI-compatible endpoint),
and custom OpenAI-compatible providers using HTTP requests with fallback resilience.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Protocol, runtime_checkable

import httpx

from app.core.config import settings
from app.schemas.questions import (
    DifficultyLevel,
    ExperienceLevel,
    InterviewQuestion,
    InterviewType,
    QuestionCategory,
)

logger = logging.getLogger(__name__)


class LLMError(RuntimeError):
    """Raised when an LLM provider fails to generate questions."""


@runtime_checkable
class LLMClient(Protocol):
    """Abstract interface for LLM question generation."""

    def generate_questions(
        self,
        target_role: str,
        experience_level: ExperienceLevel,
        interview_type: InterviewType,
        difficulty: DifficultyLevel,
        question_count: int,
        skills: list[str],
        project_mentions: list[str],
        experience_mentions: list[str],
        resume_text: str | None = None,
        language: str = "en",
    ) -> tuple[list[InterviewQuestion], str]:
        """Generate questions. Returns (questions, model_name)."""
        ...


class OpenAICompatibleLLMClient:
    """Universal client using standard OpenAI chat completions endpoint."""

    DEFAULT_MODELS: dict[str, str] = {
        "groq": "llama-3.3-70b-versatile",
        "openai": "gpt-4o-mini",
        "gemini": "gemini-1.5-flash",
    }

    BASE_URLS: dict[str, str] = {
        "groq": "https://api.groq.com/openai/v1",
        "openai": "https://api.openai.com/v1",
        "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
    }

    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 25.0,
    ) -> None:
        self.provider = provider.lower().strip()
        self.api_key = api_key.strip()
        self.base_url = (
            base_url
            or self.BASE_URLS.get(self.provider)
            or "https://api.openai.com/v1"
        ).rstrip("/")
        self.model = model or self.DEFAULT_MODELS.get(self.provider) or "gpt-4o-mini"
        self.timeout_seconds = timeout_seconds

    def _build_prompt(
        self,
        target_role: str,
        experience_level: ExperienceLevel,
        interview_type: InterviewType,
        difficulty: DifficultyLevel,
        question_count: int,
        skills: list[str],
        project_mentions: list[str],
        experience_mentions: list[str],
        resume_text: str | None = None,
        language: str = "en",
    ) -> str:
        type_instruction = {
            "technical": "Focus exclusively on technical concepts, system design, coding problem-solving, architecture, and project technical details. DO NOT include behavioral/HR questions.",
            "hr": "Focus exclusively on behavioral questions (STAR method), communication, conflict resolution, leadership, team dynamics, critical feedback, and motivation. DO NOT include pure technical coding/architecture questions.",
            "mixed": "Provide a balanced mix of technical knowledge/projects (~60-70%) and behavioural/HR (~30-40%) questions.",
        }.get(interview_type, "Provide a balanced interview.")

        difficulty_instruction = {
            "easy": "Target foundational concepts, basic practical usage, and standard principles.",
            "medium": "Target scenario-based challenges, real-world trade-offs, debugging, and implementation nuances.",
            "hard": "Target high scale, complex failure modes, concurrency/race conditions, and deep architecture edge cases.",
        }.get(difficulty, "Target standard industry interview expectations.")

        level_instruction = {
            "entry": "Candidate is junior / entry-level (0-2 years). Focus on fundamentals, willingness to learn, and academic or internship projects.",
            "mid": "Candidate is mid-level (3-5 years). Focus on independent ownership, practical trade-offs, and robust production designs.",
            "senior": "Candidate is senior-level (5+ years). Focus on system scalability, cross-team technical leadership, architectural decisions, and failure resilience.",
        }.get(experience_level, "")

        context_lines: list[str] = []
        if skills:
            context_lines.append(f"Candidate's known skills: {', '.join(skills[:15])}")
        if project_mentions:
            context_lines.append(f"Candidate projects: {'; '.join(project_mentions[:5])}")
        if experience_mentions:
            context_lines.append(f"Candidate background mentions: {'; '.join(experience_mentions[:5])}")
        if resume_text:
            context_lines.append(f"Resume excerpt:\n{resume_text[:2000]}")

        context_block = "\n".join(context_lines) if context_lines else "No resume context provided; tailor specifically to the target role."

        return f"""You are an expert technical interviewer preparing an interview for a candidate.

Target Role: {target_role}
Experience Level: {experience_level.title()} ({level_instruction})
Interview Focus: {interview_type.upper()} ({type_instruction})
Difficulty Level: {difficulty.upper()} ({difficulty_instruction})
Required Number of Questions: {question_count}
Interview Language: {language.upper()} ("Hindi" in Devanagari script if "hi", "Telugu" in Telugu script if "te", else "English")

Candidate Context:
{context_block}

Requirements:
1. Generate exactly {question_count} questions.
2. Ensure questions are deeply relevant to {target_role} and the candidate's actual skills/projects when available.
3. Every question must include a short 'rationale' explaining why this question is asked and what it evaluates.
4. Valid categories are: 'technical', 'project', 'experience', or 'hr'.
5. Return ONLY a valid JSON array of objects with no extraneous markdown or conversational text.
Format:
[
  {{
    "id": "q1",
    "category": "technical",
    "text": "The full question text here...",
    "rationale": "Checks understanding of..."
  }}
]"""

    def generate_questions(
        self,
        target_role: str,
        experience_level: ExperienceLevel,
        interview_type: InterviewType,
        difficulty: DifficultyLevel,
        question_count: int,
        skills: list[str],
        project_mentions: list[str],
        experience_mentions: list[str],
        resume_text: str | None = None,
        language: str = "en",
    ) -> tuple[list[InterviewQuestion], str]:
        prompt = self._build_prompt(
            target_role=target_role,
            experience_level=experience_level,
            interview_type=interview_type,
            difficulty=difficulty,
            question_count=question_count,
            skills=skills,
            project_mentions=project_mentions,
            experience_mentions=experience_mentions,
            resume_text=resume_text,
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional hiring manager and technical interviewer. Always output valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.5,
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if response.status_code == 429:
                    raise LLMError("LLM provider rate limit exceeded")
                if response.status_code != 200:
                    raise LLMError(f"LLM API returned status {response.status_code}: {response.text[:200]}")

                data = response.json()
                raw_content = data["choices"][0]["message"]["content"]
        except httpx.RequestError as exc:
            raise LLMError(f"Network error connecting to LLM provider: {exc}") from exc
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            raise LLMError(f"Unexpected response format from LLM provider: {exc}") from exc

        # Clean JSON markdown if wrapped in ```json ... ```
        cleaned = raw_content.strip()
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if match:
                cleaned = match.group(1).strip()

        try:
            parsed = json.loads(cleaned)
            if not isinstance(parsed, list):
                raise ValueError("Expected a JSON array of questions")

            valid_categories = {"technical", "project", "experience", "hr"}
            questions: list[InterviewQuestion] = []
            for idx, item in enumerate(parsed[:question_count], start=1):
                category = item.get("category", "technical")
                if category not in valid_categories:
                    category = "technical"
                questions.append(
                    InterviewQuestion(
                        id=f"q{idx}",
                        category=category,
                        text=str(item.get("text", "")).strip(),
                        rationale=str(item.get("rationale", "")).strip()
                        or f"Evaluates {category} readiness for {target_role}.",
                    )
                )

            if len(questions) < 3:
                raise ValueError("Too few valid questions returned by LLM")

            return questions, f"{self.provider}:{self.model}"
        except Exception as exc:
            raise LLMError(f"Failed to parse LLM question output: {exc}") from exc


def get_configured_llm_client() -> LLMClient | None:
    """Return an active LLM client if API credentials are configured, else None."""
    api_key = settings.llm_api_key.strip()
    provider = settings.llm_provider.strip().lower()

    if not api_key:
        return None

    if not provider:
        provider = "groq" if "gsk_" in api_key else "openai"

    return OpenAICompatibleLLMClient(
        provider=provider,
        api_key=api_key,
        model=settings.llm_model.strip() or None,
        base_url=settings.llm_base_url.strip() or None,
    )

