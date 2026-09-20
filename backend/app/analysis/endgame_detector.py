"""
Endgame Detector — heuristic detection of endgame phase and themes.

Patterns detected: PASSED_PAWN, KING_ACTIVITY, PROMOTION_RACE, ROOK_ACTIVITY
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import chess

logger = logging.getLogger(__name__)

# Material threshold (in centipawns, excluding kings and pawns) to consider endgame
ENDGAME_MATERIAL_THRESHOLD = 1300  # roughly: rook + minor piece each side

PIECE_VALUES: dict[chess.PieceType, int] = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
}


@dataclass
class EndgameEvent:
    """A detected endgame theme."""

    pattern: str
    description: str
    square: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


def _material_value(board: chess.Board, color: chess.Color) -> int:
    """Sum material value (excluding king) for *color*."""
    total = 0
    for pt, val in PIECE_VALUES.items():
        total += len(board.pieces(pt, color)) * val
    return total


def _is_endgame(board: chess.Board) -> bool:
    """
    Heuristic: the position is an endgame when:
    - Queens are gone for both sides, OR
    - Total non-pawn material for each side is ≤ threshold
    """
    no_white_queen = len(board.pieces(chess.QUEEN, chess.WHITE)) == 0
    no_black_queen = len(board.pieces(chess.QUEEN, chess.BLACK)) == 0
    if no_white_queen and no_black_queen:
        return True
    white_material = _material_value(chess.Board(board.fen()), chess.WHITE) - (
        len(board.pieces(chess.PAWN, chess.WHITE)) * PIECE_VALUES[chess.PAWN]
    )
    black_material = _material_value(chess.Board(board.fen()), chess.BLACK) - (
        len(board.pieces(chess.PAWN, chess.BLACK)) * PIECE_VALUES[chess.PAWN]
    )
    return white_material <= ENDGAME_MATERIAL_THRESHOLD and black_material <= ENDGAME_MATERIAL_THRESHOLD


class EndgameDetector:
    """
    Detects endgame phase and thematic patterns.

    Usage:
        detector = EndgameDetector()
        events = detector.detect(fen_before, fen_after, played_uci, color)
    """

    def is_endgame(self, fen: str) -> bool:
        """Return True if the position is in the endgame phase."""
        return _is_endgame(chess.Board(fen))

    def detect(
        self,
        fen_before: str,
        fen_after: str,
        played_uci: str,
        color: str,
    ) -> list[EndgameEvent]:
        """
        Detect endgame themes in the position after a move.

        Args:
            fen_before: Board before the move.
            fen_after: Board after the move.
            played_uci: UCI move string.
            color: 'white' or 'black'.

        Returns:
            List of EndgameEvent objects (empty if not in endgame or none detected).
        """
        board = chess.Board(fen_after)
        if not _is_endgame(board):
            return []

        mover = chess.WHITE if color == "white" else chess.BLACK
        events: list[EndgameEvent] = []

        try:
            events.extend(self._detect_passed_pawn(board, mover))
            events.extend(self._detect_king_activity(board, mover, fen_before, played_uci))
            events.extend(self._detect_promotion_race(board))
            events.extend(self._detect_rook_activity(board, mover))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Endgame detection error: %s", exc)

        return events

    # ── Detectors ─────────────────────────────────────────────────────────────

    def _detect_passed_pawn(
        self, board: chess.Board, mover: chess.Color
    ) -> list[EndgameEvent]:
        """Detect passed pawns for the mover."""
        events = []
        opponent = not mover

        for sq in board.pieces(chess.PAWN, mover):
            f = chess.square_file(sq)
            r = chess.square_rank(sq)
            direction = 1 if mover == chess.WHITE else -1

            # A pawn is passed if no opponent pawns are on the same or adjacent files
            # ahead of it
            is_passed = True
            ahead_ranks = range(r + direction, 8 if mover == chess.WHITE else -1, direction)
            for ar in ahead_ranks:
                if ar < 0 or ar > 7:
                    break
                for af in range(max(0, f - 1), min(8, f + 2)):
                    check_sq = chess.square(af, ar)
                    opp_pawn = board.piece_at(check_sq)
                    if opp_pawn and opp_pawn.piece_type == chess.PAWN and opp_pawn.color == opponent:
                        is_passed = False
                        break
                if not is_passed:
                    break

            if is_passed:
                sq_name = chess.square_name(sq)
                events.append(EndgameEvent(
                    pattern="PASSED_PAWN",
                    description=f"You have a passed pawn on {sq_name} — advance it!",
                    square=sq_name,
                ))
                break  # Report one per move to avoid flooding

        return events

    def _detect_king_activity(
        self,
        board: chess.Board,
        mover: chess.Color,
        fen_before: str,
        played_uci: str,
    ) -> list[EndgameEvent]:
        """Detect if the mover activated their king towards the centre."""
        move = chess.Move.from_uci(played_uci)
        board_before = chess.Board(fen_before)

        moved_piece = board_before.piece_at(move.from_square)
        if moved_piece is None or moved_piece.piece_type != chess.KING:
            return []

        # Centre squares
        centre = {chess.E4, chess.D4, chess.E5, chess.D5,
                  chess.C3, chess.D3, chess.E3, chess.F3,
                  chess.C4, chess.F4, chess.C5, chess.F5,
                  chess.C6, chess.D6, chess.E6, chess.F6}

        before_dist = min(
            abs(chess.square_file(move.from_square) - 3) + abs(chess.square_rank(move.from_square) - 3),
            abs(chess.square_file(move.from_square) - 4) + abs(chess.square_rank(move.from_square) - 4),
        )
        after_dist = min(
            abs(chess.square_file(move.to_square) - 3) + abs(chess.square_rank(move.to_square) - 3),
            abs(chess.square_file(move.to_square) - 4) + abs(chess.square_rank(move.to_square) - 4),
        )

        if after_dist < before_dist and move.to_square in centre:
            return [EndgameEvent(
                pattern="KING_ACTIVITY",
                description="Good king activation — centralising the king is crucial in endgames.",
                square=chess.square_name(move.to_square),
            )]
        return []

    def _detect_promotion_race(self, board: chess.Board) -> list[EndgameEvent]:
        """Detect if both sides have passed pawns racing to promote."""
        white_passed = self._count_passed_pawns(board, chess.WHITE)
        black_passed = self._count_passed_pawns(board, chess.BLACK)
        if white_passed >= 1 and black_passed >= 1:
            return [EndgameEvent(
                pattern="PROMOTION_RACE",
                description="Both sides are racing to promote — accurate calculation is critical.",
            )]
        return []

    def _detect_rook_activity(
        self, board: chess.Board, mover: chess.Color
    ) -> list[EndgameEvent]:
        """Detect if mover's rook is on an open file or 7th rank (good activity)."""
        events = []
        opponent = not mover
        seventh_rank = 6 if mover == chess.WHITE else 1

        for sq in board.pieces(chess.ROOK, mover):
            f = chess.square_file(sq)
            r = chess.square_rank(sq)

            # Rook on 7th rank
            if r == seventh_rank:
                events.append(EndgameEvent(
                    pattern="ROOK_ACTIVITY",
                    description=f"Rook on the 7th rank ({chess.square_name(sq)}) — excellent activity.",
                    square=chess.square_name(sq),
                ))
                break

            # Rook on open file (no pawns of either color)
            file_pawns = [
                sq2 for sq2 in board.pieces(chess.PAWN, chess.WHITE) | board.pieces(chess.PAWN, chess.BLACK)
                if chess.square_file(sq2) == f
            ]
            if not file_pawns:
                events.append(EndgameEvent(
                    pattern="ROOK_ACTIVITY",
                    description=f"Rook on open file ({chess.square_name(sq)}) — maximise this advantage.",
                    square=chess.square_name(sq),
                ))
                break

        return events

    @staticmethod
    def _count_passed_pawns(board: chess.Board, color: chess.Color) -> int:
        """Count passed pawns for *color*."""
        opponent = not color
        count = 0
        for sq in board.pieces(chess.PAWN, color):
            f = chess.square_file(sq)
            r = chess.square_rank(sq)
            direction = 1 if color == chess.WHITE else -1
            is_passed = True
            for ar in range(r + direction, 8 if color == chess.WHITE else -1, direction):
                if ar < 0 or ar > 7:
                    break
                for af in range(max(0, f - 1), min(8, f + 2)):
                    check_sq = chess.square(af, ar)
                    opp_pawn = board.piece_at(check_sq)
                    if opp_pawn and opp_pawn.piece_type == chess.PAWN and opp_pawn.color == opponent:
                        is_passed = False
                        break
                if not is_passed:
                    break
            if is_passed:
                count += 1
        return count
