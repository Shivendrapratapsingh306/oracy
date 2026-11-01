from fastapi import APIRouter

from app.api.v1.endpoints import audio, auth, evaluations, health, interviews, questions, resumes

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(resumes.router)
api_router.include_router(questions.router)
api_router.include_router(evaluations.router)
api_router.include_router(interviews.router)
api_router.include_router(audio.router)
