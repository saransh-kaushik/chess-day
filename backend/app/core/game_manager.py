"""
Game Manager — in-memory WebSocket room coordination for online games.

IMPORTANT: This is ephemeral. Authoritative game state lives in the database.
The manager only tracks live WebSocket connections so we can broadcast updates
without querying all connected sockets. On process restart, rooms are empty
and clients must reconnect (which they do automatically).
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import TYPE_CHECKING

from fastapi import WebSocket

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class GameRoom:
    """
    Represents a live game room with connected WebSocket clients.

    Attributes:
        game_id: The UUID of the game this room belongs to.
        connected: Mapping from player_id → WebSocket.
        draw_offered_by: player_id of the player who offered a draw (or None).
    """

    def __init__(self, game_id: str) -> None:
        self.game_id = game_id
        self.connected: dict[str, WebSocket] = {}
        self.draw_offered_by: str | None = None

    async def add(self, player_id: str, ws: WebSocket) -> None:
        """Register *ws* as the connection for *player_id*."""
        self.connected[player_id] = ws
        logger.debug("Player %s joined room %s", player_id, self.game_id)

    def remove(self, player_id: str) -> None:
        """Unregister *player_id* from this room."""
        self.connected.pop(player_id, None)
        logger.debug("Player %s left room %s", player_id, self.game_id)

    async def broadcast(self, message: dict) -> None:
        """Send *message* to all connected players."""
        payload = json.dumps(message)
        dead: list[str] = []
        for pid, ws in self.connected.items():
            try:
                await ws.send_text(payload)
            except Exception:  # noqa: BLE001
                dead.append(pid)
        for pid in dead:
            self.remove(pid)

    async def send_to(self, player_id: str, message: dict) -> None:
        """Send *message* only to *player_id* (if connected)."""
        ws = self.connected.get(player_id)
        if ws is None:
            return
        try:
            await ws.send_text(json.dumps(message))
        except Exception:  # noqa: BLE001
            self.remove(player_id)

    @property
    def is_empty(self) -> bool:
        return len(self.connected) == 0

    @property
    def player_count(self) -> int:
        return len(self.connected)


class GameManager:
    """
    Singleton-style coordinator for all live game rooms.

    Rooms are keyed by game_id (UUID string). Rooms are created on first
    join and cleaned up when empty.
    """

    def __init__(self) -> None:
        self.rooms: dict[str, GameRoom] = {}
        self._lock = asyncio.Lock()

    async def create_room(self, game_id: str) -> GameRoom:
        """
        Ensure a GameRoom for *game_id* exists and return it.
        Idempotent — safe to call if room already exists.
        """
        async with self._lock:
            if game_id not in self.rooms:
                self.rooms[game_id] = GameRoom(game_id)
                logger.info("Created room for game %s", game_id)
            return self.rooms[game_id]

    async def join_room(
        self, game_id: str, player_id: str, ws: WebSocket
    ) -> GameRoom:
        """
        Add *player_id*/*ws* to the room for *game_id*, creating it if needed.

        Returns:
            The GameRoom that was joined.
        """
        room = await self.create_room(game_id)
        await room.add(player_id, ws)
        return room

    async def leave_room(self, game_id: str, player_id: str) -> None:
        """
        Remove *player_id* from *game_id*'s room.
        Deletes the room if it becomes empty.
        """
        async with self._lock:
            room = self.rooms.get(game_id)
            if room is None:
                return
            room.remove(player_id)
            if room.is_empty:
                del self.rooms[game_id]
                logger.info("Removed empty room for game %s", game_id)

    def get_room(self, game_id: str) -> GameRoom | None:
        """Return the live room for *game_id*, or None if not found."""
        return self.rooms.get(game_id)


# ── Module-level singleton ────────────────────────────────────────────────────
game_manager = GameManager()


# ── Matchmaking queue ─────────────────────────────────────────────────────────
class MatchmakingQueue:
    """
    Simple first-in-first-out matchmaking queue.
    Pairs the first two players that join.
    """

    def __init__(self) -> None:
        self._queue: list[tuple[str, WebSocket]] = []  # (player_id, ws)
        self._lock = asyncio.Lock()

    async def enqueue(self, player_id: str, ws: WebSocket) -> tuple[str, WebSocket] | None:
        """
        Add *player_id* to the queue. If another player is waiting, pair them.

        Returns:
            The paired (opponent_id, opponent_ws) tuple, or None if still waiting.
        """
        async with self._lock:
            # Remove stale entries first
            self._queue = [
                (pid, w) for pid, w in self._queue if pid != player_id
            ]
            if self._queue:
                opponent_id, opponent_ws = self._queue.pop(0)
                return opponent_id, opponent_ws
            self._queue.append((player_id, ws))
            return None

    async def dequeue(self, player_id: str) -> None:
        """Remove *player_id* from the queue (on disconnect)."""
        async with self._lock:
            self._queue = [
                (pid, ws) for pid, ws in self._queue if pid != player_id
            ]


matchmaking_queue = MatchmakingQueue()
