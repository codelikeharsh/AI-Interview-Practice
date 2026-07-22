import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User

logger = logging.getLogger(__name__)

SESSION_SECRET = os.getenv("SESSION_SECRET", "change-me-in-production")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
SESSION_COOKIE_NAME = "session"
SESSION_MAX_AGE_DAYS = 7


def create_session_token(user_id: uuid.UUID) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_MAX_AGE_DAYS),
    }
    return jwt.encode(payload, SESSION_SECRET, algorithm="HS256")


def decode_session_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(token, SESSION_SECRET, algorithms=["HS256"])
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        return None


async def verify_google_id_token(credential: str) -> dict:
    """
    Verifies a Google Identity Services ID token and returns its claims
    (sub, email, name, picture). Raises ValueError if invalid/expired.
    Runs off the event loop since it makes a blocking HTTP call to
    fetch/cache Google's public certs.
    """

    def _verify():
        return google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), audience=GOOGLE_CLIENT_ID
        )

    return await asyncio.to_thread(_verify)


async def get_user_by_session_token(db: AsyncSession, token: str | None) -> User | None:
    if not token:
        return None
    user_id = decode_session_token(token)
    if not user_id:
        return None
    return await db.get(User, user_id)


async def get_current_user(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user_by_session_token(db, session)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
