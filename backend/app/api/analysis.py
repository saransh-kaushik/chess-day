"""
Analysis API — deep game review endpoints.

Endpoints:
  POST  /analysis/{game_id}   — trigger analysis, returns ReviewResult
  GET   /analysis/{game_id}   — retrieve existing review
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.analysis.review_engine import ReviewEngine
from app.dependencies import get_current_user, get_db, get_optional_user
from app.models.game import Game, STANDARD_FEN
from app.models.move import Move
from app.models.player_stats import PlayerStats
from app.models.review import Review
from app.models.user import User
from app.schemas.analysis import OpeningInfo, PlayerReviewSummary, ReviewResult
from app.schemas.review import ReviewOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalyzeGameRequest(BaseModel):
    game_id: str | None = None
    pgn: str | None = None
    moves: list[str] | None = None
    initial_fen: str | None = None
    depth: int | None = None
    mode: str = "local"


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

@router.post("", response_model=ReviewResult)
def trigger_analysis_generic(
    body: AnalyzeGameRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ReviewResult:
    """
    Trigger game review either by game_id or by PGN.
    If PGN is provided and no game exists, a Game is created and saved.
    """
    game = None
    if body.game_id:
        game = db.query(Game).filter(Game.id == body.game_id).first()

    if game is None and (body.pgn or body.moves):
        game_id = body.game_id or str(uuid.uuid4())
        initial_fen = body.initial_fen or STANDARD_FEN
        game = Game(
            id=game_id,
            white_player_id=current_user.id if current_user else None,
            mode=body.mode,
            status="completed",
            initial_fen=initial_fen,
            current_fen=initial_fen,
            pgn=body.pgn or "",
            completed_at=datetime.now(timezone.utc),
        )
        db.add(game)
        db.commit()
    elif game is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either an existing game_id, pgn, or moves must be provided",
        )
    elif body.pgn:
        game.pgn = body.pgn
        game.status = "completed"
        db.commit()

    # If explicit moves list is provided, populate Move table directly
    if body.moves and game:
        import chess
        existing_moves = db.query(Move).filter(Move.game_id == game.id).all()
        if not existing_moves:
            board = chess.Board(game.initial_fen or STANDARD_FEN)
            for ply, mv_str in enumerate(body.moves):
                try:
                    move_obj = board.parse_san(mv_str)
                except ValueError:
                    try:
                        move_obj = chess.Move.from_uci(mv_str)
                    except ValueError:
                        continue
                fen_before = board.fen()
                san = board.san(move_obj)
                uci = move_obj.uci()
                color = "white" if board.turn == chess.WHITE else "black"
                board.push(move_obj)
                fen_after = board.fen()
                m = Move(
                    id=str(uuid.uuid4()),
                    game_id=game.id,
                    move_number=ply,
                    color=color,
                    uci=uci,
                    san=san,
                    fen_before=fen_before,
                    fen_after=fen_after,
                )
                db.add(m)
            game.current_fen = board.fen()
            db.commit()

    return trigger_analysis(game_id=game.id, depth=body.depth, db=db, current_user=current_user)


@router.post("/{game_id}", response_model=ReviewResult)
def trigger_analysis(
    game_id: str,
    depth: int | None = Query(None),
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
        result = engine.analyse_game(game_id, db, depth=depth)
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

    # Format and log the review that is being given
    move_lines = []
    for m in result.moves:
        eval_str = f"{m.eval_after/100:+.2f}" if m.eval_after is not None else "0.00"
        tag = f" [{m.tactical_events[0].pattern}]" if m.tactical_events else ""
        move_lines.append(
            f"  {m.move_number}{'...' if m.color == 'black' else '. '} {m.san:<6} "
            f"[{m.classification:<10}] eval:{eval_str:>6}{tag} -> {m.explanation or ''}"
        )
    moves_log_text = "\n".join(move_lines)

    logger.info(
        "\n========================= GAME REVIEW GENERATED =========================\n"
        "Game ID:         %s\n"
        "Opening:         %s%s\n"
        "Analysis Depth:  %d\n"
        "White Summary:   Accuracy: %s%% | Blunders: %d | Mistakes: %d | Inaccuracies: %d\n"
        "Black Summary:   Accuracy: %s%% | Blunders: %d | Mistakes: %d | Inaccuracies: %d\n"
        "Total Moves:     %d\n"
        "Move Breakdown:\n"
        "%s\n"
        "=========================================================================",
        game_id,
        result.opening.name if result.opening else "Unknown",
        f" ({result.opening.eco})" if result.opening and result.opening.eco else "",
        result.analysis_depth,
        f"{result.white.accuracy:.1f}" if result.white.accuracy is not None else "N/A",
        result.white.blunders,
        result.white.mistakes,
        result.white.inaccuracies,
        f"{result.black.accuracy:.1f}" if result.black.accuracy is not None else "N/A",
        result.black.blunders,
        result.black.mistakes,
        result.black.inaccuracies,
        len(result.moves),
        moves_log_text if moves_log_text else "  (No moves)",
    )

    return result


@router.get("/{game_id}", response_model=ReviewResult)
def get_review(
    game_id: str,
    db: Session = Depends(get_db),
) -> ReviewResult:
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

    logger.info(
        "Serving review for Game %s: Opening=%s (%s), White Acc=%s%%, Black Acc=%s%%, Total Moves=%d",
        game_id,
        review.opening_name or "Unknown",
        review.opening_eco or "N/A",
        f"{review.accuracy_white:.1f}" if review.accuracy_white is not None else "N/A",
        f"{review.accuracy_black:.1f}" if review.accuracy_black is not None else "N/A",
        len(review.moves_analysis or []),
    )

    return ReviewResult(
        game_id=review.game_id,
        opening=OpeningInfo(name=review.opening_name, eco=review.opening_eco or "") if review.opening_name else None,
        analysis_depth=review.analysis_depth,
        white=PlayerReviewSummary(
            color="white",
            accuracy=review.accuracy_white,
            blunders=review.blunders_white,
            mistakes=review.mistakes_white,
            inaccuracies=review.inaccuracies_white,
        ),
        black=PlayerReviewSummary(
            color="black",
            accuracy=review.accuracy_black,
            blunders=review.blunders_black,
            mistakes=review.mistakes_black,
            inaccuracies=review.inaccuracies_black,
        ),
        moves=review.moves_analysis or [],
    )
