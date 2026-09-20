"""
Games API — CRUD endpoints for chess games.

Endpoints:
  POST   /games                          — create game
  GET    /games                          — list user's games (paginated)
  GET    /games/{game_id}                — get game state
  POST   /games/{game_id}/resign         — resign
  POST   /games/{game_id}/draw-offer     — offer draw
  POST   /games/{game_id}/draw-accept    — accept draw
  POST   /games/{game_id}/complete       — mark game complete (local/bot)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, get_optional_user
from app.models.game import Game, STANDARD_FEN
from app.models.move import Move
from app.models.user import User
from app.schemas.game import GameCompleteRequest, GameCreate, GameListOut, GameOut

router = APIRouter(prefix="/games", tags=["games"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_game_or_404(game_id: str, db: Session) -> Game:
    game = db.query(Game).filter(Game.id == game_id).first()
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


def _assert_participant(game: Game, user: User) -> None:
    """Raise 403 if *user* is not a participant in *game*."""
    if user.id not in (game.white_player_id, game.black_player_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this game",
        )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
def create_game(
    body: GameCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> GameOut:
    """
    Create a new chess game.

    Works for authenticated users and guests alike.
    For 'online' mode, the game status starts as 'waiting' until matched.
    """
    game_id = str(uuid.uuid4())
    initial_fen = body.initial_fen or STANDARD_FEN

    # Determine players
    white_id: str | None = None
    black_id: str | None = None
    white_guest: str | None = body.white_guest_name
    black_guest: str | None = body.black_guest_name

    if current_user:
        white_id = current_user.id

    initial_status = "waiting" if body.mode == "online" else "active"

    game = Game(
        id=game_id,
        white_player_id=white_id,
        black_player_id=black_id,
        white_guest_name=white_guest,
        black_guest_name=black_guest,
        mode=body.mode,
        status=initial_status,
        initial_fen=initial_fen,
        current_fen=initial_fen,
        pgn="",
        time_control=body.time_control.model_dump() if body.time_control else None,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return GameOut.model_validate(game)


@router.get("", response_model=GameListOut)
def list_games(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameListOut:
    """
    List all games for the current user (as either player), paginated.
    """
    base_q = db.query(Game).filter(
        (Game.white_player_id == current_user.id) | (Game.black_player_id == current_user.id)
    )
    total = base_q.count()
    games = (
        base_q
        .order_by(Game.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return GameListOut(
        games=[GameOut.model_validate(g) for g in games],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{game_id}", response_model=GameOut)
def get_game(
    game_id: str,
    db: Session = Depends(get_db),
) -> GameOut:
    """Return the current state of a game by ID (public)."""
    game = _get_game_or_404(game_id, db)
    return GameOut.model_validate(game)


@router.post("/{game_id}/resign", response_model=GameOut)
def resign(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameOut:
    """
    Resign from a game.

    The opponent wins.
    """
    game = _get_game_or_404(game_id, db)
    _assert_participant(game, current_user)

    if game.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is not active",
        )

    # Determine result based on who resigned
    if current_user.id == game.white_player_id:
        result = "0-1"  # Black wins
    else:
        result = "1-0"  # White wins

    game.status = "completed"
    game.result = result
    game.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(game)
    return GameOut.model_validate(game)


@router.post("/{game_id}/draw-offer", response_model=dict)
def draw_offer(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Offer a draw. The opponent must accept via /draw-accept.

    Returns a simple acknowledgement; the offer is communicated via WebSocket
    for online games and tracked client-side for local games.
    """
    game = _get_game_or_404(game_id, db)
    _assert_participant(game, current_user)

    if game.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is not active",
        )

    return {"message": "Draw offered", "game_id": game_id}


@router.post("/{game_id}/draw-accept", response_model=GameOut)
def draw_accept(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GameOut:
    """
    Accept a draw offer. Marks the game as drawn.
    """
    game = _get_game_or_404(game_id, db)
    _assert_participant(game, current_user)

    if game.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is not active",
        )

    game.status = "completed"
    game.result = "1/2-1/2"
    game.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(game)
    return GameOut.model_validate(game)


@router.post("/{game_id}/complete", response_model=GameOut)
def complete_game(
    game_id: str,
    body: GameCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> GameOut:
    """
    Mark a local or bot game as completed, supplying the final PGN and result.

    This endpoint is called by the frontend at the end of local/bot games
    to persist the final state.
    """
    game = _get_game_or_404(game_id, db)

    if game.mode not in ("local", "bot"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the WebSocket endpoint to complete online games",
        )

    if game.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Game is already completed",
        )

    game.pgn = body.pgn
    game.result = body.result
    game.status = "completed"
    game.completed_at = datetime.now(timezone.utc)
    if body.current_fen:
        game.current_fen = body.current_fen

    # If PGN is provided and no individual moves are stored yet, populate moves table
    if body.pgn and not game.moves:
        import io
        import chess
        import chess.pgn

        try:
            parsed = chess.pgn.read_game(io.StringIO(body.pgn))
            if parsed:
                board = parsed.board()
                ply = 0
                for node in parsed.mainline():
                    fen_before = board.fen()
                    move_obj = node.move
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
                    ply += 1
                if not body.current_fen:
                    game.current_fen = board.fen()
        except Exception as exc:  # noqa: BLE001
            pass

    db.commit()
    db.refresh(game)
    return GameOut.model_validate(game)
