"""Answer evaluation service assessing interview responses.

Evaluates 6 dimensions: Relevance, Technical Correctness, Completeness,
Clarity, Use of Examples, and Structure. Supports real LLM semantic evaluation
with documented transparent heuristic fallback.
"""
from __future__ import annotations

import json
import logging
import re
from collections.abc import Iterable

import httpx

from app.core.config import settings
from app.schemas.evaluation import (
    AnswerForEvaluation,
    EvaluatedAnswer,
    EvaluationDimension,
)

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in",
    "is", "it", "of", "on", "or", "the", "to", "was", "what", "when", "where", "which",
    "why", "with", "you", "your", "do", "does", "can", "could", "would", "should",
    "explain", "describe", "tell", "about", "this", "that", "have", "has", "had",
    "their", "they", "them", "we", "our", "my", "me", "if", "into", "using", "used",
    "use", "give", "example", "please", "just", "so", "than", "then", "there"
}

STRUCTURE_MARKERS = (
    "first", "second", "third", "finally", "because", "therefore", "for example",
    "however", "as a result", "in conclusion", "specifically", "additionally",
    "furthermore", "on the other hand", "to summarize"
)

EXAMPLE_MARKERS = (
    "for example", "for instance", "such as", "in my project", "we implemented",
    "specifically", "in our case", "we reduced", "we improved", "increased by",
    "decreased by", "%", "metric", "benchmark", "production"
)

# Common domain concept suggestions by category / keywords
DOMAIN_CONCEPTS: dict[str, list[str]] = {
    "database": ["indexing", "transactions / ACID", "sharding", "caching", "query optimization"],
    "api": ["error handling", "rate limiting", "status codes", "idempotency", "authentication / JWT"],
    "system": ["scalability", "load balancing", "fault tolerance", "monitoring / alerts", "bottlenecks"],
    "concurrency": ["race conditions", "thread safety", "locks / mutex", "deadlocks", "event loop"],
    "testing": ["unit tests", "integration tests", "mocking", "edge cases", "CI/CD pipelines"],
    "hr": ["STAR framework (Situation, Task, Action, Result)", "conflict resolution", "stakeholder communication", "quantified impact"],
}


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]*", text.lower())
        if len(token) > 2 and token not in STOP_WORDS
    }


def _dimension(score: int, feedback: str) -> EvaluationDimension:
    return EvaluationDimension(score=max(0, min(100, score)), feedback=feedback)


def _detect_missing_concepts(question_text: str, answer_text: str, category: str) -> list[str]:
    """Identify relevant concepts often expected for the topic that were omitted."""
    q_lower = question_text.lower()
    a_lower = answer_text.lower()
    missing: list[str] = []

    for domain_key, concepts in DOMAIN_CONCEPTS.items():
        if domain_key in q_lower or (category == "hr" and domain_key == "hr"):
            for concept in concepts:
                # If neither the concept words appear in the answer
                concept_words = [w for w in re.findall(r"\w+", concept.lower()) if len(w) > 3]
                if not any(w in a_lower for w in concept_words):
                    missing.append(concept)
    return missing[:3]


def _evaluate_rubric(item: AnswerForEvaluation, target_role: str) -> EvaluatedAnswer:
    """Deterministic, transparent rubric evaluating observable signals."""
    answer = item.answer.strip()
    words = re.findall(r"\b[\w+#.-]+\b", answer)
    word_count = len(words)
    raw_sentences = [part.strip() for part in re.split(r"[.!?]+", answer) if part.strip()]
    sentence_count = len(raw_sentences)

    answer_tokens = _tokens(answer)
    question_tokens = _tokens(item.question_text)
    overlap = len(answer_tokens & question_tokens) / max(1, len(question_tokens))

    if not answer:
        zero_dim = _dimension(0, "No answer was provided.")
        return EvaluatedAnswer(
            question_id=item.question_id,
            question_text=item.question_text,
            category=item.category,
            word_count=0,
            overall_score=0,
            relevance=zero_dim,
            technical_correctness=zero_dim,
            completeness=zero_dim,
            clarity=zero_dim,
            use_of_examples=zero_dim,
            structure=zero_dim,
            strengths=[],
            improvements=[
                "Provide an answer detailing your approach and technical rationale.",
                "Structure your answer with clear points, rationale, and examples.",
            ],
            missing_concepts=["Core approach explanation", "Implementation steps"],
            better_answer_suggestion="Begin with a direct definition or solution summary, explain trade-offs and edge cases, and conclude with a practical example.",
            speaking_metrics=item.speaking_metrics,
        )

    # 1. Relevance (0-100)
    relevance_score = min(100, round(40 + overlap * 60))
    relevance_feedback = (
        "Shares strong topical overlap with the question's core concepts."
        if overlap >= 0.3
        else "Addresses the general area; ensure you directly answer the specific scenario or constraint asked."
    )

    # 2. Completeness (0-100)
    if word_count < 20:
        completeness_score = 30 + round(word_count * 1.5)
        completeness_feedback = "Very brief. Elaborate on your approach, design decisions, and trade-offs."
    elif word_count < 60:
        completeness_score = 60 + round((word_count - 20) * 0.5)
        completeness_feedback = "Good foundation, but expand on alternative approaches or failure modes."
    elif word_count <= 250:
        completeness_score = min(98, 80 + round((word_count - 60) * 0.1))
        completeness_feedback = "Comprehensive response covering key technical aspects."
    else:
        completeness_score = max(75, 95 - round((word_count - 250) * 0.05))
        completeness_feedback = "Detailed answer; consider being more concise to keep interviewer engagement high."

    # 3. Technical Correctness (0-100)
    # Checks presence of technical terminology and category consistency
    tech_terms_count = sum(1 for tok in answer_tokens if len(tok) >= 5)
    tech_ratio = tech_terms_count / max(1, len(answer_tokens))
    tech_score = min(100, round(50 + tech_ratio * 70 + overlap * 20))
    tech_feedback = (
        "Demonstrates solid role-appropriate technical terminology and concepts."
        if tech_score >= 70
        else "Foundational terminology used; include more specific architecture, data structures, or API contracts."
    )

    # 4. Clarity (0-100)
    # Check sentence length: 12-28 words per sentence is ideal. Penalize excessive run-ons (>40 words)
    avg_sentence_len = word_count / max(1, sentence_count)
    if 10 <= avg_sentence_len <= 30:
        clarity_score = min(95, 75 + sentence_count * 4)
        clarity_feedback = "Well-articulated with balanced sentence length and clear expression."
    elif avg_sentence_len > 40:
        clarity_score = 60
        clarity_feedback = "Sentences are lengthy and dense; break complex thoughts into separate, clear statements."
    else:
        clarity_score = 65
        clarity_feedback = "Clear, though short sentences make the explanation feel somewhat fragmented."

    # 5. Use of Examples (0-100)
    example_hits = sum(1 for marker in EXAMPLE_MARKERS if marker in answer.lower())
    has_numbers = bool(re.search(r"\b\d+(?:%|ms|s|gb|mb|k|x)?\b", answer))
    example_score = min(100, 40 + example_hits * 18 + (15 if has_numbers else 0))
    example_feedback = (
        "Includes concrete examples, real-world context, or quantified metrics."
        if example_score >= 70
        else "Lacks concrete real-world examples or quantifiable metrics. Reference a specific project or benchmark."
    )

    # 6. Structure (0-100)
    structure_hits = sum(1 for marker in STRUCTURE_MARKERS if marker in answer.lower())
    capitalized = 5 if answer[0].isupper() else 0
    structure_score = min(100, 40 + min(4, sentence_count - 1) * 8 + structure_hits * 10 + capitalized)
    structure_feedback = (
        "Organized with clear logical progression and transition markers."
        if structure_score >= 70
        else "Use structured signposting: state the main conclusion first, followed by rationale, and final impact."
    )

    # Weighted Overall Score
    overall = round(
        relevance_score * 0.25
        + tech_score * 0.25
        + completeness_score * 0.20
        + clarity_score * 0.10
        + example_score * 0.10
        + structure_score * 0.10
    )

    # Strengths and improvements
    strengths: list[str] = []
    if relevance_score >= 75:
        strengths.append("Directly targets the core concepts requested by the interviewer.")
    if tech_score >= 75:
        strengths.append(f"Uses sound technical terminology relevant to {target_role}.")
    if completeness_score >= 80:
        strengths.append("Provides a thorough explanation rather than just high-level statements.")
    if example_score >= 70:
        strengths.append("Reinforces theoretical concepts with practical implementation details or metrics.")
    if structure_score >= 70:
        strengths.append("Follows a coherent logical sequence with clear connecting thoughts.")

    improvements: list[str] = []
    if example_score < 70:
        improvements.append("Anchor your explanation with a specific project example or production case study.")
    if completeness_score < 70:
        improvements.append("Elaborate on edge cases, trade-offs, and failure recovery mechanisms.")
    if structure_score < 70:
        improvements.append("Structure your answer using a clear framework (e.g. Problem → Approach → Trade-offs → Outcome).")
    if tech_score < 70:
        improvements.append(f"Incorporate deeper technical terms and architecture principles expected for {target_role}.")

    missing_concepts = _detect_missing_concepts(item.question_text, answer, item.category)

    better_suggestion = (
        f"A top-tier answer for {target_role} should open with a direct architectural or conceptual answer, "
        f"contrast the trade-offs (e.g. latency vs consistency, complexity vs maintainability), "
        f"and illustrate with a concrete experience or metric from your previous projects."
    )

    return EvaluatedAnswer(
        question_id=item.question_id,
        question_text=item.question_text,
        category=item.category,
        word_count=word_count,
        overall_score=overall,
        relevance=_dimension(relevance_score, relevance_feedback),
        technical_correctness=_dimension(tech_score, tech_feedback),
        completeness=_dimension(completeness_score, completeness_feedback),
        clarity=_dimension(clarity_score, clarity_feedback),
        use_of_examples=_dimension(example_score, example_feedback),
        structure=_dimension(structure_score, structure_feedback),
        strengths=strengths or ["Answer is recorded and available for review."],
        improvements=improvements or ["Continually practice concise delivery and quantifying business impact."],
        missing_concepts=missing_concepts,
        better_answer_suggestion=better_suggestion,
        speaking_metrics=item.speaking_metrics,
    )


def _evaluate_llm(item: AnswerForEvaluation, target_role: str) -> EvaluatedAnswer | None:
    """Invoke configured LLM provider for deep semantic evaluation."""
    api_key = settings.llm_api_key.strip()
    if not api_key:
        return None

    provider = settings.llm_provider.strip().lower() or ("groq" if "gsk_" in api_key else "openai")
    base_url = (
        settings.llm_base_url.strip()
        or ("https://api.groq.com/openai/v1" if provider == "groq" else "https://api.openai.com/v1")
    )
    model = settings.llm_model.strip() or ("llama-3.3-70b-versatile" if provider == "groq" else "gpt-4o-mini")

    lang = getattr(item, "language", "en")
    lang_inst = "\nLanguage Requirement: Provide feedback, strengths, improvements, and better_answer in natural Hindi (Devanagari script), keeping technical terms in English.\n" if lang == "hi" else ("\nLanguage Requirement: Provide feedback, strengths, improvements, and better_answer in natural Telugu (Telugu script), keeping technical terms in English.\n" if lang == "te" else "")
    prompt = f"""You are an expert hiring manager and technical interviewer evaluating an interview practice answer.

Target Role: {target_role}{lang_inst}
Question ({item.category}): {item.question_text}
Candidate's Answer: {item.answer}

Evaluate the candidate's answer across these 6 specific dimensions (0-100 score + 1-2 sentence constructive feedback for each):
1. relevance (Does it directly address what was asked?)
2. technical_correctness (Are technical facts, frameworks, algorithms accurate?)
3. completeness (Does it address core asks, trade-offs, constraints?)
4. clarity (Is the answer articulate, understandable, concise?)
5. use_of_examples (Does the candidate cite concrete projects, metrics, or scenarios?)
6. structure (Is there a clear opening, logical flow, and conclusion?)

Also provide:
- overall_score (0-100 weighted estimate)
- strengths (list of 2-3 specific positive points)
- improvements (list of 2-3 actionable areas to improve)
- missing_concepts (list of 1-3 specific concepts or edge cases that should have been mentioned)
- better_answer_suggestion (a 2-3 sentence outline of what an exemplary answer would look like)

Output ONLY valid JSON matching this exact structure:
{{
  "overall_score": 85,
  "relevance": {{"score": 90, "feedback": "..."}},
  "technical_correctness": {{"score": 85, "feedback": "..."}},
  "completeness": {{"score": 80, "feedback": "..."}},
  "clarity": {{"score": 85, "feedback": "..."}},
  "use_of_examples": {{"score": 75, "feedback": "..."}},
  "structure": {{"score": 85, "feedback": "..."}},
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "missing_concepts": ["...", "..."],
  "better_answer_suggestion": "..."
}}"""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a professional hiring evaluator. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }

    try:
        with httpx.Client(timeout=25.0) as client:
            resp = client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code != 200:
                logger.warning("LLM evaluation failed status=%s text=%s", resp.status_code, resp.text[:200])
                return None
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"].strip()

        # Clean markdown codeblocks
        if "```" in raw_text:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
            if match:
                raw_text = match.group(1).strip()

        parsed = json.loads(raw_text)

        words = re.findall(r"\b[\w+#.-]+\b", item.answer)
        return EvaluatedAnswer(
            question_id=item.question_id,
            question_text=item.question_text,
            category=item.category,
            word_count=len(words),
            overall_score=int(parsed.get("overall_score", 70)),
            relevance=EvaluationDimension(**parsed["relevance"]),
            technical_correctness=EvaluationDimension(**parsed["technical_correctness"]),
            completeness=EvaluationDimension(**parsed["completeness"]),
            clarity=EvaluationDimension(**parsed["clarity"]),
            use_of_examples=EvaluationDimension(**parsed["use_of_examples"]),
            structure=EvaluationDimension(**parsed["structure"]),
            strengths=list(parsed.get("strengths", [])),
            improvements=list(parsed.get("improvements", [])),
            missing_concepts=list(parsed.get("missing_concepts", [])),
            better_answer_suggestion=str(parsed.get("better_answer_suggestion", "")),
            speaking_metrics=item.speaking_metrics,
        )
    except Exception as exc:
        logger.warning("LLM evaluation fallback due to error: %s", exc)
        return None


def evaluate_one(item: AnswerForEvaluation, target_role: str = "Candidate") -> EvaluatedAnswer:
    """Evaluate a single interview answer using LLM when available, falling back to rubric."""
    if settings.llm_api_key.strip():
        llm_result = _evaluate_llm(item, target_role)
        if llm_result:
            return llm_result
    return _evaluate_rubric(item, target_role)


def evaluate_answers(
    items: Iterable[AnswerForEvaluation], target_role: str = "Candidate"
) -> list[EvaluatedAnswer]:
    """Evaluate multiple interview answers against target role context."""
    return [evaluate_one(item, target_role) for item in items]
