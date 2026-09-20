"""
Positional Heuristic Detector — deterministic detection of positional issues.

Patterns detected:
  POOR_DEVELOPMENT, REPEATED_PIECE_MOVEMENT, KING_SAFETY,
  WEAK_PAWN_STRUCTURE, POOR_EXCHANGE, UNNECESSARY_PAWN_MOVE
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import chess

logger = logging.getLogger(__name__)

# Opening phase: first N half-moves
OPENING_PLY_LIMIT = 20


@dataclass
class PositionalEvent:
    """A single detected positional issue."""

    pattern: str
    description: str
    extra: dict[str, Any] = field(default_factory=dict)


class PositionalDetector:
    """
    Conservative positional heuristic detector.

    Returns None / empty list when uncertain to avoid false positives.
    """

    def detect(
        self,
        fen_before: str,
        fen_after: str,
        played_uci: str,
        color: str,
        move_history: list[str],  # all UCI moves played so far (half-moves)
    ) -> list[PositionalEvent]:
        """
        Detect positional issues for a given move.

        Args:
            fen_before: FEN before the move.
            fen_after: FEN after the move.
            played_uci: UCI move string.
            color: 'white' or 'black'.
            move_history: All UCI moves in the game so far (including this one).

        Returns:
            List of PositionalEvent objects (may be empty).
        """
        board_before = chess.Board(fen_before)
        board_after = chess.Board(fen_after)
        mover = chess.WHITE if color == "white" else chess.BLACK
        ply = len(move_history)
        in_opening = ply <= OPENING_PLY_LIMIT

        events: list[PositionalEvent] = []

        try:
            if in_opening:
                ev = self._detect_poor_development(board_after, mover, ply)
                if ev:
                    events.append(ev)
                ev = self._detect_repeated_piece_movement(played_uci, move_history, color)
                if ev:
                    events.append(ev)
                ev = self._detect_unnecessary_pawn_move(board_before, played_uci, mover, ply)
                if ev:
                    events.append(ev)

            ev = self._detect_king_safety(board_after, mover)
            if ev:
                events.append(ev)

            ev = self._detect_weak_pawn_structure(board_before, board_after, mover)
            if ev:
                events.append(ev)

            ev = self._detect_poor_exchange(board_before, played_uci, mover)
            if ev:
                events.append(ev)

        except Exception as exc:  # noqa: BLE001
            logger.warning("Positional detection error: %s", exc)

        return events

    # ── Detectors ─────────────────────────────────────────────────────────────

    def _detect_poor_development(
        self, board: chess.Board, mover: chess.Color, ply: int
    ) -> PositionalEvent | None:
        """Detect if mover has many undeveloped pieces early in the game."""
        if ply < 6:
            return None

        back_rank = 0 if mover == chess.WHITE else 7
        undeveloped = 0
        for pt in (chess.KNIGHT, chess.BISHOP):
            for sq in board.pieces(pt, mover):
                if chess.square_rank(sq) == back_rank:
                    undeveloped += 1

        if undeveloped >= 3:
            return PositionalEvent(
                pattern="POOR_DEVELOPMENT",
                description=(
                    f"You still have {undeveloped} minor pieces undeveloped. "
                    "Prioritise development before launching an attack."
                ),
                extra={"undeveloped_count": undeveloped},
            )
        return None

    def _detect_repeated_piece_movement(
        self,
        played_uci: str,
        move_history: list[str],
        color: str,
    ) -> PositionalEvent | None:
        """Detect if the same piece was moved multiple times in the opening."""
        move = chess.Move.from_uci(played_uci)
        from_sq = move.from_square
        to_sq = move.to_square

        # Count how many times a piece arrived on *from_sq* before this move
        # (i.e. how often did a piece land on the square this piece just moved from)
        # Simple approximation: count occurrences of *_sq in move history
        # We only look at same-color moves
        color_moves = [
            m for i, m in enumerate(move_history[:-1])  # exclude current move
            if (color == "white" and i % 2 == 0) or (color == "black" and i % 2 == 1)
        ]

        # Count how many times the destination was the origin of the current piece's moves
        repeat_count = sum(1 for m in color_moves if chess.Move.from_uci(m).to_square == from_sq)

        if repeat_count >= 2:
            return PositionalEvent(
                pattern="REPEATED_PIECE_MOVEMENT",
                description=(
                    f"This is the {repeat_count + 1}th time this piece has moved in the opening. "
                    "Consider developing other pieces."
                ),
                extra={"move_count": repeat_count + 1},
            )
        return None

    def _detect_king_safety(
        self, board: chess.Board, mover: chess.Color
    ) -> PositionalEvent | None:
        """Detect if the mover's king is in a potentially unsafe position."""
        king_sq = board.king(mover)
        if king_sq is None:
            return None

        # Already castled? King on g or c file is generally safe
        king_file = chess.square_file(king_sq)
        king_rank = chess.square_rank(king_sq)
        back_rank = 0 if mover == chess.WHITE else 7

        if king_rank != back_rank:
            return None  # King has already moved off back rank — not reporting here

        # King in the centre (e or d file) — unsafe if open lines nearby
        if king_file in (3, 4):  # d or e file
            # Count open files near the king
            open_files = 0
            for f in range(max(0, king_file - 1), min(8, king_file + 2)):
                file_pawns = [
                    sq for sq in board.pieces(chess.PAWN, mover)
                    if chess.square_file(sq) == f
                ]
                if not file_pawns:
                    open_files += 1
            if open_files >= 2:
                return PositionalEvent(
                    pattern="KING_SAFETY",
                    description=(
                        "Your king is in the centre with open files nearby. "
                        "Consider castling to improve king safety."
                    ),
                    extra={"king_square": chess.square_name(king_sq), "open_files": open_files},
                )
        return None

    def _detect_weak_pawn_structure(
        self,
        board_before: chess.Board,
        board_after: chess.Board,
        mover: chess.Color,
    ) -> PositionalEvent | None:
        """Detect if the move created isolated, doubled, or backward pawns."""
        def isolated_pawns(b: chess.Board, color: chess.Color) -> int:
            count = 0
            for sq in b.pieces(chess.PAWN, color):
                f = chess.square_file(sq)
                adjacent_files = [f - 1, f + 1]
                has_neighbor = any(
                    any(chess.square_file(ps) == af for ps in b.pieces(chess.PAWN, color))
                    for af in adjacent_files if 0 <= af <= 7
                )
                if not has_neighbor:
                    count += 1
            return count

        def doubled_pawns(b: chess.Board, color: chess.Color) -> int:
            file_counts: dict[int, int] = {}
            for sq in b.pieces(chess.PAWN, color):
                f = chess.square_file(sq)
                file_counts[f] = file_counts.get(f, 0) + 1
            return sum(cnt - 1 for cnt in file_counts.values() if cnt > 1)

        before_isolated = isolated_pawns(board_before, mover)
        after_isolated = isolated_pawns(board_after, mover)
        before_doubled = doubled_pawns(board_before, mover)
        after_doubled = doubled_pawns(board_after, mover)

        if after_isolated > before_isolated:
            return PositionalEvent(
                pattern="WEAK_PAWN_STRUCTURE",
                description="This move creates an isolated pawn — a long-term structural weakness.",
                extra={"pawn_type": "isolated"},
            )
        if after_doubled > before_doubled:
            return PositionalEvent(
                pattern="WEAK_PAWN_STRUCTURE",
                description="This move creates a doubled pawn, weakening your pawn structure.",
                extra={"pawn_type": "doubled"},
            )
        return None

    def _detect_poor_exchange(
        self,
        board_before: chess.Board,
        played_uci: str,
        mover: chess.Color,
    ) -> PositionalEvent | None:
        """
        Detect an obviously poor exchange: capturing a less valuable piece
        while giving up a more valuable one.
        """
        PIECE_VALUES = {
            chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
            chess.ROOK: 500, chess.QUEEN: 900,
        }

        move = chess.Move.from_uci(played_uci)
        captured_piece = board_before.piece_at(move.to_square)
        mover_piece = board_before.piece_at(move.from_square)

        if captured_piece is None or mover_piece is None:
            return None
        if captured_piece.color == mover:
            return None  # Not a capture of opponent piece

        captured_val = PIECE_VALUES.get(captured_piece.piece_type, 0)
        mover_val = PIECE_VALUES.get(mover_piece.piece_type, 0)

        # After capturing, is the mover's piece hanging?
        test_board = board_before.copy()
        test_board.push(move)
        opponent = not mover

        if test_board.is_attacked_by(opponent, move.to_square):
            # We're capturing something of lower value without recapture compensation
            if mover_val - captured_val >= 150:  # At least 1.5 pawns lost
                return PositionalEvent(
                    pattern="POOR_EXCHANGE",
                    description=(
                        f"You traded your {self._piece_name(mover_piece.piece_type)} "
                        f"for the opponent's {self._piece_name(captured_piece.piece_type)} "
                        "without sufficient compensation."
                    ),
                    extra={
                        "lost_piece": self._piece_name(mover_piece.piece_type),
                        "gained_piece": self._piece_name(captured_piece.piece_type),
                    },
                )
        return None

    def _detect_unnecessary_pawn_move(
        self,
        board: chess.Board,
        played_uci: str,
        mover: chess.Color,
        ply: int,
    ) -> PositionalEvent | None:
        """Detect weakening pawn moves in the early opening."""
        if ply > 12:
            return None
        move = chess.Move.from_uci(played_uci)
        piece = board.piece_at(move.from_square)
        if piece is None or piece.piece_type != chess.PAWN:
            return None

        # Pawn moves on the rim (a or h file) in the opening are often unnecessary
        to_file = chess.square_file(move.to_square)
        if to_file in (0, 7):
            return PositionalEvent(
                pattern="UNNECESSARY_PAWN_MOVE",
                description=(
                    "Moving a rim pawn in the opening typically weakens your position. "
                    "Prefer central or development moves."
                ),
            )
        return None

    @staticmethod
    def _piece_name(pt: chess.PieceType) -> str:
        names = {
            chess.PAWN: "pawn", chess.KNIGHT: "knight", chess.BISHOP: "bishop",
            chess.ROOK: "rook", chess.QUEEN: "queen", chess.KING: "king",
        }
        return names.get(pt, "piece")
