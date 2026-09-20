"""
Online API — WebSocket endpoints for matchmaking and active online games.

WebSocket message protocol:

Client → Server:
    {"type": "move", "uci": "e2e4"}
    {"type": "resign"}
    {"type": "draw_offer"}
    {"type": "draw_accept"}
    {"type": "draw_decline"}

Server → Client:
    {"type": "game_state", "fen": "...", "san": "e4", "move_number": 1, "turn": "black"}
    {"type": "game_over", "result": "1-0", "reason": "checkmate"}
    {"type": "draw_offered", "by": "white"}
    {"type": "error", "message": "Illegal move"}
    {"type": "opponent_disconnected"}
    {"type": "matched", "game_id": "...", "color": "white"}
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.auth import decode_access_token
from app.core.chess_validator import ChessValidator
from app.core.game_manager import game_manager, matchmaking_queue
from app.database import SessionLocal
from app.models.game import Game, STANDARD_FEN
from app.models.move import Move
from app.models.user import User

router = APIRouter(prefix="/online", tags=["online"])
logger = logging.getLogger(__name__)

validator = ChessValidator()


# ── Auth helper for WebSocket ─────────────────────────────────────────────────

def _get_user_from_token(token: str, db: Session) -> User | None:
    """Decode a JWT and return the corresponding User, or None."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None


# ── Matchmaking WebSocket ─────────────────────────────────────────────────────

@router.websocket("/matchmaking")
async def matchmaking(ws: WebSocket) -> None:
    """
    WebSocket endpoint for the matchmaking queue.

    Protocol:
        Client sends first message: {"token": "<JWT>"}
        Server responds with:
            {"type": "waiting"}   — if in queue
            {"type": "matched", "game_id": "...", "color": "white|black"}
    """
    await ws.accept()
    db = SessionLocal()
    player_id: str | None = None

    try:
        # First message must carry the auth token
        raw = await ws.receive_text()
        data = json.loads(raw)
        token = data.get("token", "")

        user = _get_user_from_token(token, db)
        if user is None:
            # Allow guests by generating ephemeral ID from token payload
            try:
                payload = decode_access_token(token)
                player_id = payload.get("sub", str(uuid.uuid4()))
            except JWTError:
                player_id = str(uuid.uuid4())
        else:
            player_id = user.id

        await ws.send_text(json.dumps({"type": "waiting"}))

        # Try to match with another player
        opponent = await matchmaking_queue.enqueue(player_id, ws)

        if opponent is None:
            # Waiting for an opponent — keep the connection alive
            # The opponent's enqueue will call our WebSocket when matched
            # We just wait here; the matchmaking callback sends "matched"
            try:
                while True:
                    msg = await ws.receive_text()
                    # Ignore any messages while waiting
            except WebSocketDisconnect:
                await matchmaking_queue.dequeue(player_id)
        else:
            # Matched! Create a game and notify both players
            opponent_id, opponent_ws = opponent
            game_id = str(uuid.uuid4())

            # Persist the game
            game = Game(
                id=game_id,
                white_player_id=player_id,
                black_player_id=opponent_id,
                mode="online",
                status="active",
                initial_fen=STANDARD_FEN,
                current_fen=STANDARD_FEN,
            )
            db.add(game)
            db.commit()

            # Create game room
            await game_manager.create_room(game_id)

            # Notify both players
            await ws.send_text(json.dumps({
                "type": "matched",
                "game_id": game_id,
                "color": "white",
            }))
            await opponent_ws.send_text(json.dumps({
                "type": "matched",
                "game_id": game_id,
                "color": "black",
            }))

    except WebSocketDisconnect:
        if player_id:
            await matchmaking_queue.dequeue(player_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Matchmaking error: %s", exc)
    finally:
        db.close()


# ── Game WebSocket ────────────────────────────────────────────────────────────

@router.websocket("/game/{game_id}")
async def game_ws(game_id: str, ws: WebSocket) -> None:
    """
    WebSocket endpoint for an active online game.

    Connection flow:
        1. Client connects and sends: {"token": "<JWT>"}
        2. Server validates token and joins the room
        3. Server sends current game state
        4. Both players exchange moves via the protocol defined in the docstring
    """
    await ws.accept()
    db = SessionLocal()
    player_id: str | None = None
    player_color: str | None = None

    try:
        # Authenticate
        raw = await ws.receive_text()
        data = json.loads(raw)
        token = data.get("token", "")

        user = _get_user_from_token(token, db)
        if user is None:
            try:
                payload = decode_access_token(token)
                player_id = payload.get("sub")
            except JWTError:
                await ws.send_text(json.dumps({"type": "error", "message": "Unauthorized"}))
                await ws.close()
                return
        else:
            player_id = user.id

        # Load game
        game = db.query(Game).filter(Game.id == game_id).first()
        if game is None:
            await ws.send_text(json.dumps({"type": "error", "message": "Game not found"}))
            await ws.close()
            return

        # Determine player color
        if player_id == game.white_player_id:
            player_color = "white"
        elif player_id == game.black_player_id:
            player_color = "black"
        else:
            await ws.send_text(json.dumps({"type": "error", "message": "Not a participant"}))
            await ws.close()
            return

        # Join room
        room = await game_manager.join_room(game_id, player_id, ws)

        # Send current game state to the joining player
        board = validator.board_from_fen(game.current_fen)
        await ws.send_text(json.dumps({
            "type": "game_state",
            "fen": game.current_fen,
            "turn": "white" if board.turn else "black",
            "move_number": board.fullmove_number,
        }))

        # Message loop
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await room.send_to(player_id, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            # ── Move ──────────────────────────────────────────────────────────
            if msg_type == "move":
                await _handle_move(msg, game_id, player_id, player_color, db, room)

            # ── Resign ────────────────────────────────────────────────────────
            elif msg_type == "resign":
                result = "0-1" if player_color == "white" else "1-0"
                await _end_game(game_id, result, "resignation", db, room)
                break

            # ── Draw offer ────────────────────────────────────────────────────
            elif msg_type == "draw_offer":
                game_obj = db.query(Game).filter(Game.id == game_id).first()
                if game_obj:
                    room.draw_offered_by = player_id
                await room.broadcast({"type": "draw_offered", "by": player_color})

            # ── Draw accept ───────────────────────────────────────────────────
            elif msg_type == "draw_accept":
                if room.draw_offered_by and room.draw_offered_by != player_id:
                    await _end_game(game_id, "1/2-1/2", "agreement", db, room)
                    break
                else:
                    await room.send_to(player_id, {
                        "type": "error", "message": "No draw offer to accept"
                    })

            # ── Draw decline ──────────────────────────────────────────────────
            elif msg_type == "draw_decline":
                room.draw_offered_by = None
                await room.broadcast({"type": "draw_declined", "by": player_color})

            else:
                await room.send_to(player_id, {
                    "type": "error", "message": f"Unknown message type: {msg_type!r}"
                })

    except WebSocketDisconnect:
        if player_id and game_id:
            await game_manager.leave_room(game_id, player_id)
            room = game_manager.get_room(game_id)
            if room:
                await room.broadcast({"type": "opponent_disconnected"})
    except Exception as exc:  # noqa: BLE001
        logger.exception("WebSocket error: %s", exc)
    finally:
        db.close()


# ── Move handler ──────────────────────────────────────────────────────────────

async def _handle_move(
    msg: dict,
    game_id: str,
    player_id: str,
    player_color: str,
    db: Session,
    room,  # GameRoom
) -> None:
    """
    Validate and apply a player's move.

    Flow:
        1. Load authoritative FEN from DB
        2. Verify it is the player's turn
        3. Validate the move with ChessValidator
        4. Apply the move, persist to DB
        5. Broadcast new state
        6. Check for game over
    """
    uci = msg.get("uci", "")
    if not uci:
        await room.send_to(player_id, {"type": "error", "message": "Missing 'uci' field"})
        return

    # Reload from DB (authoritative source)
    game = db.query(Game).filter(Game.id == game_id).first()
    if game is None or game.status != "active":
        await room.send_to(player_id, {"type": "error", "message": "Game is not active"})
        return

    board = validator.board_from_fen(game.current_fen)
    current_turn = "white" if board.turn else "black"
    if current_turn != player_color:
        await room.send_to(player_id, {"type": "error", "message": "Not your turn"})
        return

    # Validate
    result = validator.validate_move(game.current_fen, uci)
    if not result.legal:
        await room.send_to(player_id, {"type": "error", "message": f"Illegal move: {result.reason}"})
        return

    # Apply
    fen_before = game.current_fen
    new_fen, san = validator.apply_move(fen_before, uci)

    # Count existing moves to get move_number (ply index)
    move_count = db.query(Move).filter(Move.game_id == game_id).count()

    # Persist move
    move = Move(
        id=str(uuid.uuid4()),
        game_id=game_id,
        move_number=move_count,
        color=player_color,
        uci=uci,
        san=san,
        fen_before=fen_before,
        fen_after=new_fen,
    )
    db.add(move)

    # Update game FEN
    game.current_fen = new_fen
    db.commit()

    new_board = validator.board_from_fen(new_fen)
    turn_after = "white" if new_board.turn else "black"

    # Broadcast new state
    await room.broadcast({
        "type": "game_state",
        "fen": new_fen,
        "san": san,
        "uci": uci,
        "move_number": move_count + 1,
        "turn": turn_after,
        "color": player_color,
    })

    # Check game over
    game_over = validator.is_game_over(new_fen)
    if game_over:
        await _end_game(game_id, game_over.result, game_over.reason, db, room)


async def _end_game(
    game_id: str,
    result: str,
    reason: str,
    db: Session,
    room,  # GameRoom
) -> None:
    """Persist game result and broadcast game_over message."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game is None:
        return

    game.status = "completed"
    game.result = result
    game.completed_at = datetime.now(timezone.utc)
    db.commit()

    await room.broadcast({
        "type": "game_over",
        "result": result,
        "reason": reason,
    })
