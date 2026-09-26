"""
Stats API — player statistics endpoints.

Endpoints:
  GET /stats/me            — current user's PlayerStats
  GET /stats/leaderboard   — public ranked leaderboard
  GET /stats/openings      — current user's opening breakdown
  GET /stats/{user_id}     — public stats for any user
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.game import Game
from app.models.player_stats import PlayerStats
from app.models.review import Review
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


class LeaderboardEntry(BaseModel):
    """One row of the public leaderboard."""

    user_id: str
    username: str
    wins: int
    losses: int
    draws: int
    games_played: int
    avg_accuracy: float | None


class LeaderboardOut(BaseModel):
    """Paginated leaderboard response."""

    entries: list[LeaderboardEntry]
    total: int
    page: int
    page_size: int


class OpeningStat(BaseModel):
    """Aggregated win-rate stats for one opening, for the current user."""

    eco: str | None
    name: str | None
    count: int
    win_rate: float


class OpeningStatsOut(BaseModel):
    """Response for GET /stats/openings."""

    openings: list[OpeningStat]
    total: int


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


@router.get("/leaderboard", response_model=LeaderboardOut)
def get_leaderboard(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> LeaderboardOut:
    """
    Return a public, paginated leaderboard of players ranked by wins.

    NOTE: this route is registered before `/{user_id}` so "leaderboard" is
    not swallowed as a user_id path parameter.
    """
    base_q = db.query(PlayerStats, User).join(User, PlayerStats.user_id == User.id)
    total = base_q.count()
    rows = (
        base_q.order_by(PlayerStats.wins.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    entries = [
        LeaderboardEntry(
            user_id=user.id,
            username=user.username,
            wins=stats.wins,
            losses=stats.losses,
            draws=stats.draws,
            games_played=stats.games_played,
            avg_accuracy=stats.avg_accuracy,
        )
        for stats, user in rows
    ]
    return LeaderboardOut(entries=entries, total=total, page=page, page_size=page_size)


@router.get("/openings", response_model=OpeningStatsOut)
def get_my_openings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OpeningStatsOut:
    """
    Return the current user's opening breakdown: for each opening they've
    played (via reviewed games), how many games and their win rate.

    NOTE: this route is registered before `/{user_id}` so "openings" is not
    swallowed as a user_id path parameter.
    """
    rows = (
        db.query(Review, Game)
        .join(Game, Review.game_id == Game.id)
        .filter(
            (Game.white_player_id == current_user.id)
            | (Game.black_player_id == current_user.id)
        )
        .all()
    )

    groups: dict[tuple[str | None, str | None], dict[str, int]] = {}
    for review, game in rows:
        key = (review.opening_eco, review.opening_name)
        bucket = groups.setdefault(key, {"count": 0, "wins": 0})
        bucket["count"] += 1

        color = "white" if game.white_player_id == current_user.id else "black"
        won = (game.result == "1-0" and color == "white") or (
            game.result == "0-1" and color == "black"
        )
        if won:
            bucket["wins"] += 1

    openings = [
        OpeningStat(
            eco=eco,
            name=name,
            count=bucket["count"],
            win_rate=(bucket["wins"] / bucket["count"] * 100) if bucket["count"] else 0.0,
        )
        for (eco, name), bucket in groups.items()
    ]
    openings.sort(key=lambda o: o.count, reverse=True)

    return OpeningStatsOut(openings=openings, total=len(openings))


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
