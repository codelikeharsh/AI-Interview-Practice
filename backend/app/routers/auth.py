import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_DAYS,
    create_session_token,
    get_current_user,
    verify_google_id_token,
)
from app.db import get_db
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

# Frontend and backend live on different domains in production (e.g. Vercel +
# Render), which browsers treat as cross-site - the cookie needs
# SameSite=None + Secure there, or it's silently dropped. Locally both run on
# "localhost" so Lax + non-secure works over plain HTTP.
IS_PRODUCTION = os.getenv("ENV", "development") == "production"

COOKIE_KWARGS = dict(
    httponly=True,
    samesite="none" if IS_PRODUCTION else "lax",
    secure=IS_PRODUCTION,
    max_age=SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    path="/",
)


class GoogleLoginRequest(BaseModel):
    credential: str


def _user_out(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
    }


@router.post("/google")
async def google_login(
    payload: GoogleLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    try:
        claims = await verify_google_id_token(payload.credential)
    except ValueError as e:
        logger.warning("Google ID token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    google_sub = claims["sub"]
    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            google_sub=google_sub,
            email=claims.get("email", ""),
            name=claims.get("name", claims.get("email", "")),
            picture=claims.get("picture"),
        )
        db.add(user)
    else:
        user.email = claims.get("email", user.email)
        user.name = claims.get("name", user.name)
        user.picture = claims.get("picture", user.picture)

    await db.commit()
    await db.refresh(user)

    token = create_session_token(user.id)
    response.set_cookie(SESSION_COOKIE_NAME, token, **COOKIE_KWARGS)

    return {"user": _user_out(user)}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "logged_out"}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"user": _user_out(current_user)}


@router.delete("/me")
async def delete_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes the account and all of its interview history
    (cascades via ON DELETE CASCADE on interview_sessions/question_evaluations).
    Irreversible - the frontend must get explicit user confirmation first.
    """
    logger.warning("Deleting account user=%s email=%s", current_user.id, current_user.email)
    await db.delete(current_user)
    await db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "deleted"}
