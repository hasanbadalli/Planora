from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from pwdlib import PasswordHash

from app.core.exceptions import AuthenticationError, SecurityConfigurationError


JWT_ALGORITHM = "HS256"
JWT_ISSUER = "planora-api"
password_hash = PasswordHash.recommended()
dummy_password_hash = password_hash.hash("not-a-real-planora-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def verify_password_against_dummy(password: str) -> None:
    """Reduce timing differences when an account does not exist."""
    password_hash.verify(password, dummy_password_hash)


def create_access_token(
    user_id: UUID,
    secret_key: str,
    expires_minutes: int,
) -> str:
    if len(secret_key) < 32:
        raise SecurityConfigurationError(
            "JWT_SECRET_KEY must contain at least 32 characters."
        )

    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iss": JWT_ISSUER,
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=expires_minutes),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, secret_key: str) -> UUID:
    if len(secret_key) < 32:
        raise SecurityConfigurationError(
            "JWT_SECRET_KEY must contain at least 32 characters."
        )

    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["sub", "type", "iss", "iat", "exp"]},
        )
        if payload.get("type") != "access":
            raise AuthenticationError("Invalid token type.")
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise AuthenticationError("Invalid or expired access token.") from exc

