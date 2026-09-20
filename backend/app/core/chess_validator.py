"""
Chess Validator — thin wrapper around python-chess for move validation,
application, and game-over detection.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field

import chess
import chess.pgn


@dataclass
class ValidationResult:
    """Result of validating a single move."""

    legal: bool
    reason: str = ""  # empty when legal


@dataclass
class GameOverResult:
    """Returned when the game has ended."""

    is_over: bool
    result: str  # '1-0' | '0-1' | '1/2-1/2'
    reason: str  # checkmate | stalemate | insufficient_material | ...


class ChessValidator:
    """
    Stateless helper using python-chess for all board-level operations.
    Each method reconstructs the board from FEN — no mutable state is kept.
    """

    # ── Move validation ───────────────────────────────────────────────────────

    def validate_move(self, fen: str, uci_move: str) -> ValidationResult:
        """
        Check whether *uci_move* is a legal move from position *fen*.

        Args:
            fen: Current board position in FEN notation.
            uci_move: Move in UCI format (e.g. 'e2e4', 'e7e8q').

        Returns:
            ValidationResult with ``legal=True`` if the move is valid.
        """
        try:
            board = chess.Board(fen)
            move = chess.Move.from_uci(uci_move)
        except (ValueError, chess.InvalidMoveError) as exc:
            return ValidationResult(legal=False, reason=str(exc))

        if move in board.legal_moves:
            return ValidationResult(legal=True)
        return ValidationResult(legal=False, reason="Illegal move in current position")

    # ── Legal moves ───────────────────────────────────────────────────────────

    def get_legal_moves(self, fen: str) -> list[str]:
        """
        Return all legal UCI moves from *fen*.

        Returns:
            List of UCI move strings (e.g. ['e2e4', 'e2e3', ...]).
        """
        board = chess.Board(fen)
        return [m.uci() for m in board.legal_moves]

    # ── Apply move ────────────────────────────────────────────────────────────

    def apply_move(self, fen: str, uci_move: str) -> tuple[str, str]:
        """
        Apply *uci_move* to the board at *fen* and return the resulting state.

        Args:
            fen: Current board FEN.
            uci_move: Legal UCI move string.

        Returns:
            Tuple of (new_fen, san) — new position and standard algebraic notation.

        Raises:
            ValueError: if the move is not legal.
        """
        board = chess.Board(fen)
        move = chess.Move.from_uci(uci_move)
        if move not in board.legal_moves:
            raise ValueError(f"Illegal move {uci_move!r} in position {fen!r}")
        san = board.san(move)
        board.push(move)
        return board.fen(), san

    # ── Game-over detection ───────────────────────────────────────────────────

    def is_game_over(self, fen: str) -> GameOverResult | None:
        """
        Check whether the game is over in the given *fen*.

        Returns:
            GameOverResult if the game has ended, else None.
        """
        board = chess.Board(fen)
        if not board.is_game_over():
            return None

        outcome = board.outcome()
        if outcome is None:
            return None

        # Map python-chess termination → human reason string
        reason_map = {
            chess.Termination.CHECKMATE: "checkmate",
            chess.Termination.STALEMATE: "stalemate",
            chess.Termination.INSUFFICIENT_MATERIAL: "insufficient_material",
            chess.Termination.SEVENTYFIVE_MOVES: "seventy_five_moves",
            chess.Termination.FIVEFOLD_REPETITION: "fivefold_repetition",
            chess.Termination.FIFTY_MOVES: "fifty_moves",
            chess.Termination.THREEFOLD_REPETITION: "threefold_repetition",
        }
        reason = reason_map.get(outcome.termination, "unknown")

        # python-chess result() returns '1-0', '0-1', or '1/2-1/2'
        return GameOverResult(is_over=True, result=outcome.result(), reason=reason)

    # ── PGN generation ────────────────────────────────────────────────────────

    def get_pgn(self, moves: list) -> str:
        """
        Build a PGN string from a list of Move ORM objects.

        Args:
            moves: Ordered list of Move ORM objects with .uci and .fen_before.

        Returns:
            PGN string.
        """
        if not moves:
            return ""

        game = chess.pgn.Game()
        node = game

        board = chess.Board(moves[0].fen_before)
        game.setup(board)

        for m in moves:
            move = chess.Move.from_uci(m.uci)
            node = node.add_variation(move)

        exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
        return game.accept(exporter)

    # ── Utility ───────────────────────────────────────────────────────────────

    @staticmethod
    def board_from_fen(fen: str) -> chess.Board:
        """Return a python-chess Board object for *fen*."""
        return chess.Board(fen)
