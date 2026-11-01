from fastapi import APIRouter

from app.schemas.questions import QuestionGenerationRequest, QuestionGenerationResponse
from app.services.question_generator import generate_questions_with_metadata

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/generate", response_model=QuestionGenerationResponse)
def generate_interview_questions(payload: QuestionGenerationRequest) -> QuestionGenerationResponse:
    """Generate a tailored interview question set from target role, configuration, and resume profile."""
    questions, method, model_name = generate_questions_with_metadata(payload)
    return QuestionGenerationResponse(
        target_role=payload.target_role.strip(),
        experience_level=payload.experience_level,
        interview_type=payload.interview_type,
        difficulty=payload.difficulty,
        generation_method=method,
        model_name=model_name,
        questions=questions,
    )
