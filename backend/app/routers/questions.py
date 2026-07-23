from fastapi import APIRouter

from app.services.question_bank import get_all_questions

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("/bank")
async def list_question_bank():
    return get_all_questions()
