"""
Analysis API — deep game review endpoints.

Endpoints:
  POST  /analysis/{game_id}   — trigger analysis, returns ReviewResult
  GET   /analysis/{game_id}   — retrieve existing review
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.analysis.review_engine import ReviewEngine
from app.dependencies import get_current_user, get_db, get_optional_user
from app.models.game import Game
from app.models.player_stats import PlayerStats
from app.models.review import Review
from app.models.user import User
from app.schemas.analysis import ReviewResult
from app.schemas.review import ReviewOut

router = APIRouter(prefix="/analysis", tags=["analysis"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_game_or_404(game_id: str, db: Session) -> Game:
    game = db.query(Game).filter(Game.id == game_id).first()
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


def _update_player_stats(user_id: str, review_result: ReviewResult, db: Session, color: str) -> None:
    """
    Update PlayerStats for *user_id* based on a completed review.
    """
    stats = db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
    if stats is None:
        return  # Guests have no stats

    summary = review_result.white if color == "white" else review_result.black

    # Update error counts
    stats.total_blunders += summary.blunders
    stats.total_mistakes += summary.mistakes
    stats.total_inaccuracies += summary.inaccuracies

    # Count tactical and positional mistakes from move-level data
    for move in review_result.moves:
        if move.color != color:
            continue
        if move.tactical_events:
            stats.tactical_mistakes += 1
        if move.positional_events:
            stats.positional_mistakes += 1

    # Rolling average accuracy
    if summary.accuracy is not None:
        if stats.avg_accuracy is None:
            stats.avg_accuracy = summary.accuracy
        else:
            # Weighted rolling average
            total_games = stats.games_played or 1
            stats.avg_accuracy = (
                (stats.avg_accuracy * total_games + summary.accuracy) / (total_games + 1)
            )

    stats.updated_at = datetime.now(timezone.utc)
    db.add(stats)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/{game_id}", response_model=ReviewResult)
def trigger_analysis(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ReviewResult:
    """
    Trigger a full Stockfish analysis of a completed game.

    Persists the Review to the database and updates PlayerStats for both players.
    If a review already exists, it is replaced.
    """
    game = _get_game_or_404(game_id, db)

    if game.status not in ("completed", "active"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed or active games can be analysed",
        )

    # Run the full review pipeline
    engine = ReviewEngine()
    try:
        result = engine.analyse_game(game_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # Persist review — replace existing if present
    existing = db.query(Review).filter(Review.game_id == game_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    review = Review(
        id=str(uuid.uuid4()),
        game_id=game_id,
        accuracy_white=result.white.accuracy,
        accuracy_black=result.black.accuracy,
        blunders_white=result.white.blunders,
        mistakes_white=result.white.mistakes,
        inaccuracies_white=result.white.inaccuracies,
        blunders_black=result.black.blunders,
        mistakes_black=result.black.mistakes,
        inaccuracies_black=result.black.inaccuracies,
        moves_analysis=[m.model_dump() for m in result.moves],
        opening_name=result.opening.name if result.opening else None,
        opening_eco=result.opening.eco if result.opening else None,
        analysis_depth=result.analysis_depth,
    )
    db.add(review)

    # Update PlayerStats for both players
    if game.white_player_id:
        _update_player_stats(game.white_player_id, result, db, "white")
    if game.black_player_id:
        _update_player_stats(game.black_player_id, result, db, "black")

    db.commit()
    return result


@router.get("/{game_id}", response_model=ReviewOut)
def get_review(
    game_id: str,
    db: Session = Depends(get_db),
) -> ReviewOut:
    """
    Retrieve the existing review for a game.

    Returns 404 if no review has been generated yet.
    """
    _get_game_or_404(game_id, db)

    review = db.query(Review).filter(Review.game_id == game_id).first()
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No review found. POST /analysis/{game_id} to generate one.",
        )
    return ReviewOut.model_validate(review)
