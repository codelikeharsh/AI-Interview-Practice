import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import get_current_user
from app.models import User
from app.services.rate_limiter import resume_limiter
from app.services.resume_service import analyze_resume, extract_resume_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview/resume", tags=["Resume"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}


@router.post("/analyze")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    resume_limiter.check(str(current_user.id))

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type - please upload a PDF, DOCX, or plain text resume.",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large - please keep it under 5MB.")

    try:
        text = extract_resume_text(file.filename, content)
        profile = analyze_resume(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return profile
