"""
Auth API — /auth endpoints for registration, login, and guest sessions.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import (
    create_access_token,
    create_guest_token,
    hash_password,
    verify_password,
)
from app.dependencies import get_current_user, get_db
from app.models.player_stats import PlayerStats
from app.models.user import User
from app.schemas.user import GuestOut, Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Helpers ────────────────────────────────────────────────────────────────────

_GUEST_ADJECTIVES = [
    "Swift", "Brave", "Silent", "Clever", "Bold", "Quiet", "Sharp", "Wise",
    "Dark", "Noble", "Fierce", "Calm", "Rapid", "Sly", "Royal",
]
_GUEST_NOUNS = [
    "Knight", "Bishop", "Rook", "Pawn", "King", "Queen",
    "Gambit", "Endgame", "Tactician", "Strategist",
]


def _generate_guest_name() -> str:
    import random
    adj = random.choice(_GUEST_ADJECTIVES)
    noun = random.choice(_GUEST_NOUNS)
    num = random.randint(100, 9999)
    return f"{adj}{noun}{num}"


def _create_stats(db: Session, user_id: str) -> None:
    """Initialise a PlayerStats row for a new registered user."""
    stats = PlayerStats(id=str(uuid.uuid4()), user_id=user_id)
    db.add(stats)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, db: Session = Depends(get_db)) -> Token:
    """
    Register a new user with username, email, and password.

    Returns a JWT access token on success.
    """
    # Check uniqueness
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        is_guest=False,
    )
    db.add(user)
    _create_stats(db, user_id)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(body: UserLogin, db: Session = Depends(get_db)) -> Token:
    """
    Authenticate with username and password.

    Returns a JWT access token on success.
    """
    user: User | None = db.query(User).filter(User.username == body.username).first()

    if user is None or user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Update last_seen
    from datetime import datetime, timezone
    user.last_seen = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/guest", response_model=GuestOut, status_code=status.HTTP_201_CREATED)
def create_guest(db: Session = Depends(get_db)) -> GuestOut:
    """
    Create a guest session.

    Generates a temporary user record and returns a short-lived JWT.
    """
    guest_id = str(uuid.uuid4())
    guest_name = _generate_guest_name()

    user = User(
        id=guest_id,
        username=guest_name,
        email=None,
        hashed_password=None,
        is_guest=True,
    )
    db.add(user)
    db.commit()

    token = create_guest_token(guest_id, guest_name)
    return GuestOut(guest_id=guest_id, guest_name=guest_name, access_token=token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Return the currently authenticated user's profile."""
    return UserOut.model_validate(current_user)
