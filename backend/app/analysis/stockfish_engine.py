"""
Stockfish Engine Wrapper — uses python-chess's chess.engine.SimpleEngine
to evaluate chess positions and full games.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import chess
import chess.engine

from app.config import settings

logger = logging.getLogger(__name__)

# Sentinel value for mate scores (in centipawns)
_MATE_SCORE_CP = 30_000


@dataclass
class PositionAnalysis:
    """
    Result of evaluating a single chess position.

    Attributes:
        score_cp: Engine score in centipawns from White's perspective.
                  Positive = White advantage. Capped at ±30 000 for mates.
        best_move: Best move UCI string, e.g. 'e2e4'. None if game over.
        principal_variation: List of UCI moves in the main line.
        mate_in: Number of moves to forced mate (positive = White mates,
                 negative = Black mates). None if no forced mate.
    """

    score_cp: float
    best_move: str | None = None
    principal_variation: list[str] = field(default_factory=list)
    mate_in: int | None = None


class StockfishEngine:
    """
    Thin wrapper around chess.engine.SimpleEngine (UCI protocol).

    Always use as a context manager to ensure the engine process is closed:

        with StockfishEngine(path, depth) as engine:
            analysis = engine.analyse_position(fen, depth)
    """

    def __init__(
        self,
        path: str = settings.STOCKFISH_PATH,
        depth: int = settings.STOCKFISH_DEPTH,
    ) -> None:
        self._path = path
        self._depth = depth
        self._engine: chess.engine.SimpleEngine | None = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def open(self) -> "StockfishEngine":
        """Open the Stockfish subprocess."""
        self._engine = chess.engine.SimpleEngine.popen_uci(self._path)
        return self

    def close(self) -> None:
        """Close the Stockfish subprocess gracefully."""
        if self._engine is not None:
            try:
                self._engine.quit()
            except Exception:  # noqa: BLE001
                pass
            finally:
                self._engine = None

    def __enter__(self) -> "StockfishEngine":
        return self.open()

    def __exit__(self, *_: Any) -> None:
        self.close()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _score_to_cp(self, score: chess.engine.Score) -> float:
        """
        Convert a python-chess Score to a float centipawn value (White POV).

        Mate scores are mapped to ±30 000.
        """
        if score.is_mate():
            mate = score.mate()
            # Positive mate = White wins; negative = Black wins
            return _MATE_SCORE_CP if (mate is not None and mate > 0) else -_MATE_SCORE_CP
        cp = score.score()
        return float(cp) if cp is not None else 0.0

    def _analyse_board(
        self, board: chess.Board, depth: int
    ) -> chess.engine.InfoDict:
        """Run engine analysis on *board* and return the info dict."""
        if self._engine is None:
            raise RuntimeError("Engine is not open. Use as context manager.")
        info = self._engine.analyse(
            board,
            chess.engine.Limit(depth=depth),
            info=chess.engine.INFO_SCORE | chess.engine.INFO_PV,
        )
        return info

    # ── Public API ────────────────────────────────────────────────────────────

    def analyse_position(self, fen: str, depth: int | None = None) -> PositionAnalysis:
        """
        Evaluate the position given by *fen*.

        Args:
            fen: Board position in FEN notation.
            depth: Search depth (defaults to instance default).

        Returns:
            PositionAnalysis with score, best move, PV, and mate information.
        """
        d = depth or self._depth
        board = chess.Board(fen)

        if board.is_game_over():
            # Return terminal score without running the engine
            outcome = board.outcome()
            if outcome and outcome.winner == chess.WHITE:
                return PositionAnalysis(score_cp=_MATE_SCORE_CP, mate_in=0)
            elif outcome and outcome.winner == chess.BLACK:
                return PositionAnalysis(score_cp=-_MATE_SCORE_CP, mate_in=0)
            return PositionAnalysis(score_cp=0.0)

        info = self._analyse_board(board, d)

        # Extract score (always relative to the side to move — we want White POV)
        raw_score = info.get("score", chess.engine.PovScore(chess.engine.Cp(0), chess.WHITE))
        white_score = raw_score.white()
        score_cp = self._score_to_cp(white_score)
        mate_in: int | None = white_score.mate() if white_score.is_mate() else None

        # Best move and principal variation
        pv: list[chess.Move] = info.get("pv", [])
        best_move = pv[0].uci() if pv else None
        pv_uci = [m.uci() for m in pv]

        return PositionAnalysis(
            score_cp=score_cp,
            best_move=best_move,
            principal_variation=pv_uci,
            mate_in=mate_in,
        )

    def analyse_game(
        self,
        moves: list[str],
        initial_fen: str = chess.STARTING_FEN,
        depth: int | None = None,
    ) -> list[PositionAnalysis]:
        """
        Evaluate every position in a game.

        Args:
            moves: Ordered list of UCI move strings.
            initial_fen: Starting FEN (defaults to standard start).
            depth: Search depth.

        Returns:
            List of PositionAnalysis, one per position *before* each move,
            plus the final position (length = len(moves) + 1).
        """
        d = depth or self._depth
        results: list[PositionAnalysis] = []
        board = chess.Board(initial_fen)

        # Evaluate initial position
        results.append(self.analyse_position(board.fen(), d))

        for uci in moves:
            move = chess.Move.from_uci(uci)
            board.push(move)
            results.append(self.analyse_position(board.fen(), d))

        return results
