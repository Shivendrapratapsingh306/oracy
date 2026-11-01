from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.resume import ResumeProfile
from app.services.resume_parser import MAX_RESUME_BYTES, ResumeParseError, build_profile, extract_text

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/parse", response_model=ResumeProfile, status_code=status.HTTP_200_OK)
async def parse_resume(file: UploadFile = File(...)) -> ResumeProfile:
    """Parse a PDF/DOCX resume in memory and return a lightweight profile.

    This endpoint does not store the uploaded file or raw resume text. Durable
    resume records will be added alongside authenticated user ownership.
    """
    filename = file.filename or ""
    content = await file.read(MAX_RESUME_BYTES + 1)
    await file.close()
    try:
        text = extract_text(filename, file.content_type or "", content)
    except ResumeParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ResumeProfile(**build_profile(text))
