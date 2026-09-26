"""
Seed data for the Puzzles feature.

All positions below are single-move tactical/mating puzzles. Each FEN and its
solution UCI move were verified programmatically with python-chess (the move
is legal, and playing it results in checkmate) before being hardcoded here —
see the plan for the verification approach.
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.puzzle import Puzzle

PUZZLES: list[dict] = [
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "solution_uci": ["h5f7"], "rating": 700},
    {"fen": "rnb1k1nr/pppp1ppp/8/2b1p3/4P2q/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 4 4", "solution_uci": ["h4f2"], "rating": 700},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2", "solution_uci": ["d8h4"], "rating": 600},
    {"fen": "rnbqkbnr/ppppp2p/5p2/6p1/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "solution_uci": ["d1h5"], "rating": 600},
    {"fen": "rn1q1bnr/ppp1kB1p/3p2p1/4N3/4P3/2N5/PPPP1PPP/R1BbK2R w KQ - 1 7", "solution_uci": ["c3d5"], "rating": 900},
    {"fen": "r1bBk2r/pppp1ppp/2n5/4p3/4n3/3P2P1/PPP1Kb1P/RN1Q1BNR b kq - 1 7", "solution_uci": ["c6d4"], "rating": 900},
    {"fen": "rnbqk2r/pppp1ppp/5n2/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "solution_uci": ["h5f7"], "rating": 700},
    {"fen": "rnb1k1nr/pppp1ppp/8/2b1p3/2B1P2q/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4", "solution_uci": ["h4f2"], "rating": 700},
    {"fen": "rnbqkbn1/ppppp3/8/6pr/3P1p2/3BP1B1/PPP2PPP/RN2K1NR w KQq - 0 8", "solution_uci": ["d3g6"], "rating": 1000},
    {"fen": "rn2k1nr/ppp2ppp/3bp1b1/3p1P2/6PR/8/PPPPP3/RNBQKBN1 b Qkq - 0 8", "solution_uci": ["d6g3"], "rating": 1000},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p2Q/2B1P3/2N5/PPPP1PPP/R1B1K1NR w KQkq - 6 5", "solution_uci": ["h5f7"], "rating": 750},
    {"fen": "r1b1k1nr/pppp1ppp/2n5/2b1p3/2B1P2q/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 6 5", "solution_uci": ["h4f2"], "rating": 750},
    {"fen": "rn1qkb1r/p1ppp2P/1p6/7n/3P4/3B4/PPP2PbP/RNB1K1NR w KQkq - 0 8", "solution_uci": ["d3g6"], "rating": 1050},
    {"fen": "rnb1k1nr/ppp2pBp/3b4/3p4/7N/1P6/P1PPP2p/RN1QKB1R b KQkq - 0 8", "solution_uci": ["d6g3"], "rating": 1050},
    {"fen": "rnbqkbnr/ppppp2p/8/5pp1/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3", "solution_uci": ["d1h5"], "rating": 650},
    {"fen": "r1bqkbnr/pppp1ppp/2n5/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq - 0 3", "solution_uci": ["d8h4"], "rating": 650},
    {"fen": "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1", "solution_uci": ["e1e8"], "rating": 900},
    {"fen": "4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 1", "solution_uci": ["e8e1"], "rating": 900},
    {"fen": "7k/1R6/8/8/8/8/8/R5K1 w - - 0 1", "solution_uci": ["a1a8"], "rating": 850},
    {"fen": "r5k1/8/8/8/8/8/1r6/7K b - - 0 1", "solution_uci": ["a8a1"], "rating": 850},
    {"fen": "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", "solution_uci": ["g5f7"], "rating": 1400},
    {"fen": "6k1/8/8/8/6n1/8/6PP/6RK b - - 0 1", "solution_uci": ["g4f2"], "rating": 1400},
    {"fen": "6k1/5p1p/4N3/8/8/2Q5/8/K7 w - - 0 1", "solution_uci": ["c3g7"], "rating": 1100},
    {"fen": "k7/8/2q5/8/8/4n3/5P1P/6K1 b - - 0 1", "solution_uci": ["c6g2"], "rating": 1100},
    {"fen": "7k/8/4N3/8/6Q1/8/8/6K1 w - - 0 1", "solution_uci": ["g4g7"], "rating": 1050},
    {"fen": "6k1/8/8/6q1/8/4n3/8/7K b - - 0 1", "solution_uci": ["g5g2"], "rating": 1050},
    {"fen": "7k/6p1/5N2/8/8/8/8/R5K1 w - - 0 1", "solution_uci": ["a1a8"], "rating": 1200},
    {"fen": "r5k1/8/8/8/8/5n2/6P1/7K b - - 0 1", "solution_uci": ["a8a1"], "rating": 1200},
]


def seed_puzzles_if_empty(db: Session) -> None:
    """Insert the hardcoded puzzle set only if the table is currently empty."""
    if db.query(Puzzle).count() > 0:
        return

    for entry in PUZZLES:
        db.add(
            Puzzle(
                id=str(uuid.uuid4()),
                fen=entry["fen"],
                solution_uci=entry["solution_uci"],
                rating=entry["rating"],
                source="seed",
            )
        )
    db.commit()
