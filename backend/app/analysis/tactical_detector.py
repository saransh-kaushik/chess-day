"""
Tactical Pattern Detector — deterministic detection using python-chess.

All detectors are board-level heuristics. No Stockfish needed.
Patterns detected:
  HANGING_PIECE, MISSED_CAPTURE, FORK, PIN, SKEWER,
  DISCOVERED_ATTACK, BACK_RANK_THREAT, MATE_THREAT, MISSED_CHECK
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import chess

logger = logging.getLogger(__name__)

# Piece value table (centipawns) for material comparisons
PIECE_VALUES: dict[chess.PieceType, int] = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20_000,
}

PIECE_NAMES: dict[chess.PieceType, str] = {
    chess.PAWN: "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK: "rook",
    chess.QUEEN: "queen",
    chess.KING: "king",
}


@dataclass
class TacticalEvent:
    """A single detected tactical pattern."""

    pattern: str
    description: str
    square: str | None = None
    piece: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


def _sq(square: chess.Square) -> str:
    """Return algebraic square name (e.g. 'e4')."""
    return chess.square_name(square)


def _piece_name(pt: chess.PieceType) -> str:
    return PIECE_NAMES.get(pt, "piece")


def _piece_value(pt: chess.PieceType) -> int:
    return PIECE_VALUES.get(pt, 0)


def _is_hanging(board: chess.Board, square: chess.Square, color: chess.Color) -> bool:
    """
    Return True if *color*'s piece on *square* is undefended and attacked by the opponent.
    """
    piece = board.piece_at(square)
    if piece is None or piece.color != color:
        return False
    opponent = not color
    # Attacked by opponent
    if not board.is_attacked_by(opponent, square):
        return False
    # Defended by own side
    if board.is_attacked_by(color, square):
        return False
    return True


class TacticalDetector:
    """
    Detects tactical patterns on a position *before* and *after* a move.

    Usage:
        detector = TacticalDetector()
        events = detector.detect(fen_before, fen_after, played_uci, color)
    """

    def detect(
        self,
        fen_before: str,
        fen_after: str,
        played_uci: str,
        color: str,  # 'white' | 'black'
    ) -> list[TacticalEvent]:
        """
        Run all tactical detectors and return a list of events.

        Args:
            fen_before: Board before the move was played.
            fen_after: Board after the move was played.
            played_uci: The move that was played.
            color: Side that moved ('white' or 'black').

        Returns:
            List of TacticalEvent objects (may be empty).
        """
        board_before = chess.Board(fen_before)
        board_after = chess.Board(fen_after)
        mover = chess.WHITE if color == "white" else chess.BLACK
        opponent = not mover

        events: list[TacticalEvent] = []

        try:
            events.extend(self._detect_hanging_piece(board_after, mover, opponent))
            events.extend(self._detect_missed_capture(board_before, mover, opponent))
            events.extend(self._detect_fork(board_after, played_uci, mover, opponent))
            events.extend(self._detect_pin(board_after, mover, opponent))
            events.extend(self._detect_skewer(board_after, mover, opponent))
            events.extend(self._detect_discovered_attack(board_before, board_after, played_uci, mover, opponent))
            events.extend(self._detect_back_rank_threat(board_after, mover, opponent))
            events.extend(self._detect_mate_threat(board_after, mover))
            events.extend(self._detect_missed_check(board_before, mover, opponent))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Tactical detection error: %s", exc)

        return events

    # ── Individual detectors ──────────────────────────────────────────────────

    def _detect_hanging_piece(
        self, board: chess.Board, mover: chess.Color, opponent: chess.Color
    ) -> list[TacticalEvent]:
        """Detect if any of the mover's pieces are now hanging after the move."""
        events = []
        for square in chess.SQUARES:
            if _is_hanging(board, square, mover):
                piece = board.piece_at(square)
                if piece and piece.piece_type != chess.PAWN:  # skip trivial pawn hangs
                    events.append(TacticalEvent(
                        pattern="HANGING_PIECE",
                        description=f"Your {_piece_name(piece.piece_type)} on {_sq(square)} is undefended.",
                        square=_sq(square),
                        piece=_piece_name(piece.piece_type),
                    ))
        return events

    def _detect_missed_capture(
        self, board: chess.Board, mover: chess.Color, opponent: chess.Color
    ) -> list[TacticalEvent]:
        """Detect hanging opponent pieces that the mover did not capture."""
        events = []
        for square in chess.SQUARES:
            if _is_hanging(board, square, opponent):
                piece = board.piece_at(square)
                if piece and piece.piece_type != chess.PAWN:
                    events.append(TacticalEvent(
                        pattern="MISSED_CAPTURE",
                        description=f"You could capture the opponent's free {_piece_name(piece.piece_type)} on {_sq(square)}.",
                        square=_sq(square),
                        piece=_piece_name(piece.piece_type),
                    ))
        return events

    def _detect_fork(
        self,
        board: chess.Board,
        played_uci: str,
        mover: chess.Color,
        opponent: chess.Color,
    ) -> list[TacticalEvent]:
        """Detect if the played move creates a fork (one piece attacks 2+ valuable pieces)."""
        events = []
        move = chess.Move.from_uci(played_uci)
        to_sq = move.to_square
        moved_piece = board.piece_at(to_sq)
        if moved_piece is None or moved_piece.color != mover:
            return events

        # Find opponent pieces attacked by the moved piece
        attacked_valuable = []
        for sq in chess.SQUARES:
            opp_piece = board.piece_at(sq)
            if opp_piece and opp_piece.color == opponent:
                if board.is_attacked_by(mover, sq) and _piece_value(opp_piece.piece_type) >= _piece_value(chess.KNIGHT):
                    attacked_valuable.append((sq, opp_piece))

        if len(attacked_valuable) >= 2:
            targets = " and ".join(
                f"{_piece_name(p.piece_type)} on {_sq(sq)}" for sq, p in attacked_valuable[:2]
            )
            events.append(TacticalEvent(
                pattern="FORK",
                description=f"Your {_piece_name(moved_piece.piece_type)} forks the {targets}.",
                square=_sq(to_sq),
                piece=_piece_name(moved_piece.piece_type),
                extra={"targets": [{"square": _sq(sq), "piece": _piece_name(p.piece_type)} for sq, p in attacked_valuable]},
            ))
        return events

    def _detect_pin(
        self, board: chess.Board, mover: chess.Color, opponent: chess.Color
    ) -> list[TacticalEvent]:
        """Detect opponent pieces that are pinned to a more valuable piece behind them."""
        events = []
        # Check each of opponent's sliding pieces for pin potential
        for attacker_sq in board.pieces(chess.BISHOP, mover) | board.pieces(chess.ROOK, mover) | board.pieces(chess.QUEEN, mover):
            attacker = board.piece_at(attacker_sq)
            if attacker is None:
                continue
            # python-chess has is_pinned built-in
            for target_sq in chess.SQUARES:
                target_piece = board.piece_at(target_sq)
                if target_piece is None or target_piece.color != opponent:
                    continue
                if board.is_pinned(opponent, target_sq):
                    pin_dir = board.pin(opponent, target_sq)
                    events.append(TacticalEvent(
                        pattern="PIN",
                        description=f"Opponent's {_piece_name(target_piece.piece_type)} on {_sq(target_sq)} is pinned.",
                        square=_sq(target_sq),
                        piece=_piece_name(target_piece.piece_type),
                    ))
            break  # Limit to one detection per call to avoid duplicates
        return events

    def _detect_skewer(
        self, board: chess.Board, mover: chess.Color, opponent: chess.Color
    ) -> list[TacticalEvent]:
        """
        Detect a skewer: a high-value opponent piece is attacked and behind it
        sits a lower-value piece that will be exposed when the high-value piece moves.
        """
        events = []
        # Look at each sliding piece of the mover
        sliders = (
            board.pieces(chess.BISHOP, mover)
            | board.pieces(chess.ROOK, mover)
            | board.pieces(chess.QUEEN, mover)
        )
        for attacker_sq in sliders:
            attacker = board.piece_at(attacker_sq)
            if attacker is None:
                continue
            # Check squares attacked by this piece
            for target_sq in board.attacks(attacker_sq):
                target_piece = board.piece_at(target_sq)
                if target_piece is None or target_piece.color != opponent:
                    continue
                if _piece_value(target_piece.piece_type) < _piece_value(chess.ROOK):
                    continue  # Only skewer high-value pieces
                # Look for a piece behind the target along the same ray
                direction = chess.square_file(target_sq) - chess.square_file(attacker_sq)
                rank_dir = chess.square_rank(target_sq) - chess.square_rank(attacker_sq)
                # Normalise
                if direction != 0:
                    direction = direction // abs(direction)
                if rank_dir != 0:
                    rank_dir = rank_dir // abs(rank_dir)
                next_file = chess.square_file(target_sq) + direction
                next_rank = chess.square_rank(target_sq) + rank_dir
                if 0 <= next_file <= 7 and 0 <= next_rank <= 7:
                    behind_sq = chess.square(next_file, next_rank)
                    behind_piece = board.piece_at(behind_sq)
                    if behind_piece and behind_piece.color == opponent:
                        if _piece_value(behind_piece.piece_type) < _piece_value(target_piece.piece_type):
                            events.append(TacticalEvent(
                                pattern="SKEWER",
                                description=(
                                    f"Skewer: {_piece_name(target_piece.piece_type)} on {_sq(target_sq)} "
                                    f"is attacked; behind it is {_piece_name(behind_piece.piece_type)} on {_sq(behind_sq)}."
                                ),
                                square=_sq(target_sq),
                                piece=_piece_name(target_piece.piece_type),
                                extra={"behind_piece": _piece_name(behind_piece.piece_type), "behind_square": _sq(behind_sq)},
                            ))
        return events

    def _detect_discovered_attack(
        self,
        board_before: chess.Board,
        board_after: chess.Board,
        played_uci: str,
        mover: chess.Color,
        opponent: chess.Color,
    ) -> list[TacticalEvent]:
        """
        Detect a discovered attack: moving one piece reveals an attack by another.
        """
        events = []
        move = chess.Move.from_uci(played_uci)
        from_sq = move.from_square
        # Find sliders of mover that now attack something they didn't before
        sliders_after = (
            board_after.pieces(chess.BISHOP, mover)
            | board_after.pieces(chess.ROOK, mover)
            | board_after.pieces(chess.QUEEN, mover)
        )
        for slider_sq in sliders_after:
            if slider_sq == move.to_square:
                continue  # Skip the piece that actually moved
            new_attacks = board_after.attacks(slider_sq)
            old_attacks = board_before.attacks(slider_sq)
            newly_attacked = new_attacks - old_attacks
            for sq in newly_attacked:
                target = board_after.piece_at(sq)
                if target and target.color == opponent and _piece_value(target.piece_type) >= _piece_value(chess.KNIGHT):
                    slider_piece = board_after.piece_at(slider_sq)
                    events.append(TacticalEvent(
                        pattern="DISCOVERED_ATTACK",
                        description=(
                            f"Moving this piece reveals an attack from your "
                            f"{_piece_name(slider_piece.piece_type) if slider_piece else 'piece'} "
                            f"on {_sq(sq)}."
                        ),
                        square=_sq(sq),
                        piece=_piece_name(slider_piece.piece_type) if slider_piece else None,
                    ))
        return events[:1]  # Limit to one to avoid noise

    def _detect_back_rank_threat(
        self, board: chess.Board, mover: chess.Color, opponent: chess.Color
    ) -> list[TacticalEvent]:
        """Detect a back-rank checkmate threat against the opponent."""
        events = []
        # Find opponent king
        king_sq = board.king(opponent)
        if king_sq is None:
            return events
        king_rank = chess.square_rank(king_sq)
        expected_back_rank = 7 if opponent == chess.WHITE else 0
        if king_rank != expected_back_rank:
            return events

        # Check if the back rank is blocked by own pawns with no escape
        escape_squares = list(board.attacks(king_sq))
        safe_escapes = [
            sq for sq in escape_squares
            if board.piece_at(sq) is None or board.piece_at(sq).color == mover  # type: ignore[union-attr]
        ]
        if safe_escapes:
            return events  # King has escape

        # Check if mover has a rook or queen on the same rank or can reach it
        for sq in board.pieces(chess.ROOK, mover) | board.pieces(chess.QUEEN, mover):
            if chess.square_rank(sq) == expected_back_rank or board.is_attacked_by(mover, king_sq):
                events.append(TacticalEvent(
                    pattern="BACK_RANK_THREAT",
                    description="The opponent's back rank is vulnerable to a checkmate threat.",
                    square=_sq(king_sq),
                ))
                break
        return events

    def _detect_mate_threat(
        self, board: chess.Board, mover: chess.Color
    ) -> list[TacticalEvent]:
        """Detect if the position after the move contains a checkmate threat."""
        events = []
        opponent = not mover
        # Check all mover's moves — if any leads to checkmate in 1
        for move in list(board.legal_moves)[:30]:  # Limit for performance
            test_board = board.copy()
            test_board.push(move)
            if test_board.is_checkmate():
                events.append(TacticalEvent(
                    pattern="MATE_THREAT",
                    description="This creates a checkmate threat your opponent must address.",
                ))
                break
        return events

    def _detect_missed_check(
        self, board: chess.Board, mover: chess.Color, opponent: chess.Color
    ) -> list[TacticalEvent]:
        """Detect if the mover could have given check but didn't."""
        events = []
        checking_moves = [m for m in board.legal_moves if board.gives_check(m)]
        if checking_moves:
            move = checking_moves[0]
            piece = board.piece_at(move.from_square)
            events.append(TacticalEvent(
                pattern="MISSED_CHECK",
                description=(
                    f"You could have given check with {_piece_name(piece.piece_type) if piece else 'a piece'} "
                    f"to {_sq(move.to_square)}, gaining tempo."
                ),
                square=_sq(move.to_square),
                piece=_piece_name(piece.piece_type) if piece else None,
            ))
        return events
