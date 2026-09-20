"""
FastAPI dependency providers.

Centralised here so routers import from a single location.
"""

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.auth import decode_access_token
from app.database import SessionLocal
from app.models.user import User

# ── DB session ─────────────────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session and close it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Auth ───────────────────────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


def _extract_user(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
    require: bool,
) -> User | None:
    """
    Shared logic for optional and required auth extraction.

    Args:
        credentials: Raw bearer credentials from the request.
        db: Active DB session.
        require: If True, raise 401 when credentials are missing/invalid.

    Returns:
        User ORM object or None (when require=False and no creds).
    """
    if credentials is None:
        if require:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        if require:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

    user_id: str | None = payload.get("sub")
    if user_id is None:
        if require:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token"
            )
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None and require:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that requires a valid JWT and returns the authenticated User.

    Raises:
        HTTPException 401: if the token is missing, invalid, or expired.
    """
    user = _extract_user(credentials, db, require=True)
    assert user is not None  # guaranteed by require=True
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Dependency that returns the authenticated User or None for unauthenticated
    requests. Works for both registered users and guest JWTs.
    """
    return _extract_user(credentials, db, require=False)
