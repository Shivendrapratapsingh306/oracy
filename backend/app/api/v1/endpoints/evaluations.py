from fastapi import APIRouter

from app.core.config import settings
from app.schemas.evaluation import EvaluationRequest, EvaluationResponse
from app.services.answer_evaluator import evaluate_answers

router = APIRouter(prefix="/answers", tags=["answer evaluation"])


@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate_interview_answers(payload: EvaluationRequest) -> EvaluationResponse:
    """Return comprehensive multi-dimensional evaluation for submitted practice answers."""
    results = evaluate_answers(payload.answers, payload.target_role.strip())
    average_score = round(sum(result.overall_score for result in results) / len(results)) if results else 0
    method = "llm_semantic_evaluation" if settings.llm_api_key.strip() else "transparent_rule_based_estimate"
    return EvaluationResponse(
        target_role=payload.target_role.strip(),
        evaluation_method=method,
        evaluated_count=len(results),
        average_score=average_score,
        results=results,
    )
