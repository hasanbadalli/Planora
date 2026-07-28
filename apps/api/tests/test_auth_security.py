from uuid import uuid4

import pytest

from app.core.exceptions import AuthenticationError, SecurityConfigurationError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import LoginRequest, RegisterRequest


TEST_SECRET = "a-test-secret-that-is-longer-than-thirty-two-characters"


def test_password_is_hashed_and_verified() -> None:
    raw_password = "Planora123"

    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("incorrect", hashed) is False


def test_access_token_round_trip() -> None:
    user_id = uuid4()

    token = create_access_token(user_id, TEST_SECRET, expires_minutes=10)

    assert decode_access_token(token, TEST_SECRET) == user_id


def test_access_token_rejects_wrong_secret() -> None:
    token = create_access_token(uuid4(), TEST_SECRET, expires_minutes=10)

    with pytest.raises(AuthenticationError):
        decode_access_token(
            token,
            "another-test-secret-that-is-longer-than-thirty-two",
        )


def test_access_token_requires_safe_secret_length() -> None:
    with pytest.raises(SecurityConfigurationError):
        create_access_token(uuid4(), "too-short", expires_minutes=10)


def test_auth_schemas_normalize_identity_values() -> None:
    register = RegisterRequest(
        username="  Hasan_Dev  ",
        email="HASAN@example.com",
        password="Planora123",
    )
    login = LoginRequest(identifier="  HASAN_DEV ", password="Planora123")

    assert register.username == "hasan_dev"
    assert str(register.email) == "HASAN@example.com"
    assert login.identifier == "hasan_dev"

