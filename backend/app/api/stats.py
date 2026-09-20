"""
Stats API — player statistics endpoints.

Endpoints:
  GET /stats/me            — current user's PlayerStats
  GET /stats/{user_id}     — public stats for any user
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.player_stats import PlayerStats
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["stats"])


# ── Response schema ────────────────────────────────────────────────────────────

class PlayerStatsOut(BaseModel):
    """Public player statistics."""

    id: str
    user_id: str
    games_played: int
    wins: int
    losses: int
    draws: int
    avg_accuracy: float | None
    total_blunders: int
    total_mistakes: int
    total_inaccuracies: int
    tactical_mistakes: int
    positional_mistakes: int

    model_config = {"from_attributes": True}


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/me", response_model=PlayerStatsOut)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlayerStatsOut:
    """Return the authenticated user's aggregated statistics."""
    stats = db.query(PlayerStats).filter(PlayerStats.user_id == current_user.id).first()
    if stats is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No stats found. Play and analyse some games first.",
        )
    return PlayerStatsOut.model_validate(stats)


@router.get("/{user_id}", response_model=PlayerStatsOut)
def get_user_stats(
    user_id: str,
    db: Session = Depends(get_db),
) -> PlayerStatsOut:
    """Return public statistics for any user by their UUID."""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    stats = db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
    if stats is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No stats available for this user",
        )
    return PlayerStatsOut.model_validate(stats)
