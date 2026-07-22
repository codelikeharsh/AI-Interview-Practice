import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt as pyjwt
import pytest

from app.auth import (
    SESSION_SECRET,
    create_session_token,
    decode_session_token,
    verify_google_id_token,
)


def test_session_token_round_trip():
    user_id = uuid.uuid4()
    token = create_session_token(user_id)
    assert decode_session_token(token) == user_id


def test_decode_rejects_garbage():
    assert decode_session_token("not-a-jwt") is None


def test_decode_rejects_expired_token():
    user_id = uuid.uuid4()
    expired_payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) - timedelta(days=1),
    }
    token = pyjwt.encode(expired_payload, SESSION_SECRET, algorithm="HS256")
    assert decode_session_token(token) is None


async def test_verify_google_id_token_propagates_invalid_token_error():
    with patch("app.auth.google_id_token.verify_oauth2_token", side_effect=ValueError("bad token")):
        with pytest.raises(ValueError):
            await verify_google_id_token("fake-credential")


async def test_verify_google_id_token_returns_claims_on_success():
    fake_claims = {"sub": "12345", "email": "a@b.com", "name": "A B"}
    with patch("app.auth.google_id_token.verify_oauth2_token", return_value=fake_claims):
        claims = await verify_google_id_token("fake-credential")
        assert claims["sub"] == "12345"
