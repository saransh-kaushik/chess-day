"""
Core auth utilities: password hashing and JWT creation/verification.
"""

from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

import bcrypt
from jose import JWTError, jwt

from app.config import settings


# ── Password helpers ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    """Return bcrypt hash of *password*."""
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────────────────────
def _make_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    """Encode a JWT with an expiry claim."""
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token for a registered user."""
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _make_token(data, delta)


def create_guest_token(guest_id: str, guest_name: str) -> str:
    """Create a short-lived JWT for a guest session (24 hours)."""
    return _make_token(
        {"sub": guest_id, "guest_name": guest_name, "is_guest": True},
        timedelta(hours=24),
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.

    Raises:
        JWTError: if the token is invalid or expired.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
