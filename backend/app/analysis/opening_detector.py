"""
ECO Opening Detector — deterministic, no Stockfish or LLM required.

Matches a game's SAN move sequence against a bundled opening database
and returns the deepest matching opening.

The ECO_DATABASE maps SAN move sequences (space-separated) to opening info.
"""

from __future__ import annotations

from dataclasses import dataclass

import chess
import chess.pgn


@dataclass
class OpeningInfo:
    """Result of an opening lookup."""

    name: str
    eco: str
    variation: str | None = None


# ── ECO Database ──────────────────────────────────────────────────────────────
# Keys: SAN moves joined by spaces (from the starting position).
# Values: dict with 'name', 'eco', and optional 'variation'.
#
# Coverage: ~100+ most important openings and variations.
ECO_DATABASE: dict[str, dict[str, str]] = {
    # ── King's Pawn (e4) ──────────────────────────────────────────────────────
    "e4": {"eco": "B00", "name": "King's Pawn Opening"},
    "e4 e5": {"eco": "C20", "name": "Open Game"},
    "e4 e5 Nf3": {"eco": "C40", "name": "King's Knight Opening"},
    "e4 e5 Nf3 Nc6": {"eco": "C44", "name": "King's Knight, Normal Variation"},
    "e4 e5 Nf3 Nc6 Bc4": {"eco": "C50", "name": "Italian Game"},
    "e4 e5 Nf3 Nc6 Bc4 Bc5": {"eco": "C50", "name": "Italian Game", "variation": "Giuoco Piano"},
    "e4 e5 Nf3 Nc6 Bc4 Bc5 c3": {"eco": "C54", "name": "Italian Game", "variation": "Giuoco Piano, Main Line"},
    "e4 e5 Nf3 Nc6 Bc4 Nf6": {"eco": "C55", "name": "Two Knights Defense"},
    "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5": {"eco": "C57", "name": "Two Knights Defense", "variation": "Ng5 Attack"},
    "e4 e5 Nf3 Nc6 Bb5": {"eco": "C60", "name": "Ruy Lopez"},
    "e4 e5 Nf3 Nc6 Bb5 a6": {"eco": "C60", "name": "Ruy Lopez", "variation": "Morphy Defense"},
    "e4 e5 Nf3 Nc6 Bb5 a6 Ba4": {"eco": "C68", "name": "Ruy Lopez", "variation": "Morphy Defense"},
    "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6": {"eco": "C80", "name": "Ruy Lopez", "variation": "Open Defense"},
    "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O": {"eco": "C84", "name": "Ruy Lopez", "variation": "Closed"},
    "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7": {"eco": "C88", "name": "Ruy Lopez", "variation": "Closed"},
    "e4 e5 Nf3 Nc6 Bb5 Nf6": {"eco": "C67", "name": "Ruy Lopez", "variation": "Berlin Defense"},
    "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4": {"eco": "C67", "name": "Ruy Lopez", "variation": "Berlin, Rio de Janeiro Variation"},
    "e4 e5 Nf3 Nc6 d4": {"eco": "C44", "name": "Scotch Game"},
    "e4 e5 Nf3 Nc6 d4 exd4": {"eco": "C44", "name": "Scotch Game"},
    "e4 e5 Nf3 Nc6 d4 exd4 Nxd4": {"eco": "C45", "name": "Scotch Game", "variation": "Main Line"},
    "e4 e5 Nf3 Nc6 Nf3 Nf6": {"eco": "C47", "name": "Four Knights Game"},
    "e4 e5 Nf3 Nf6": {"eco": "C42", "name": "Petrov's Defense"},
    "e4 e5 Nf3 Nf6 Nxe5": {"eco": "C42", "name": "Petrov's Defense"},
    "e4 e5 Nf3 f5": {"eco": "C40", "name": "Latvian Gambit"},
    "e4 e5 f4": {"eco": "C33", "name": "King's Gambit"},
    "e4 e5 f4 exf4": {"eco": "C33", "name": "King's Gambit Accepted"},
    "e4 e5 f4 exf4 Nf3": {"eco": "C37", "name": "King's Gambit Accepted", "variation": "King's Knight Gambit"},
    "e4 e5 f4 Bc5": {"eco": "C30", "name": "King's Gambit Declined"},
    "e4 e5 Bc4": {"eco": "C23", "name": "Bishop's Opening"},
    # ── Sicilian Defense ──────────────────────────────────────────────────────
    "e4 c5": {"eco": "B20", "name": "Sicilian Defense"},
    "e4 c5 Nf3": {"eco": "B40", "name": "Sicilian Defense", "variation": "Open"},
    "e4 c5 Nf3 d6": {"eco": "B50", "name": "Sicilian Defense"},
    "e4 c5 Nf3 d6 d4": {"eco": "B50", "name": "Sicilian Defense", "variation": "Open"},
    "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": {"eco": "B90", "name": "Sicilian Defense", "variation": "Najdorf"},
    "e4 c5 Nf3 Nc6": {"eco": "B40", "name": "Sicilian Defense"},
    "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3": {"eco": "B40", "name": "Sicilian Defense", "variation": "Classical"},
    "e4 c5 Nf3 e6": {"eco": "B40", "name": "Sicilian Defense"},
    "e4 c5 c3": {"eco": "B22", "name": "Sicilian Defense", "variation": "Alapin"},
    "e4 c5 Nc3": {"eco": "B25", "name": "Sicilian Defense", "variation": "Closed"},
    "e4 c5 f4": {"eco": "B21", "name": "Sicilian Defense", "variation": "Grand Prix Attack"},
    # ── French Defense ─────────────────────────────────────────────────────────
    "e4 e6": {"eco": "C00", "name": "French Defense"},
    "e4 e6 d4": {"eco": "C00", "name": "French Defense", "variation": "Main Line"},
    "e4 e6 d4 d5": {"eco": "C00", "name": "French Defense"},
    "e4 e6 d4 d5 e5": {"eco": "C02", "name": "French Defense", "variation": "Advance Variation"},
    "e4 e6 d4 d5 exd5": {"eco": "C01", "name": "French Defense", "variation": "Exchange Variation"},
    "e4 e6 d4 d5 Nc3": {"eco": "C10", "name": "French Defense", "variation": "Classical"},
    "e4 e6 d4 d5 Nd2": {"eco": "C05", "name": "French Defense", "variation": "Tarrasch"},
    # ── Caro-Kann ─────────────────────────────────────────────────────────────
    "e4 c6": {"eco": "B10", "name": "Caro-Kann Defense"},
    "e4 c6 d4 d5": {"eco": "B13", "name": "Caro-Kann Defense"},
    "e4 c6 d4 d5 exd5": {"eco": "B13", "name": "Caro-Kann Defense", "variation": "Exchange"},
    "e4 c6 d4 d5 e5": {"eco": "B12", "name": "Caro-Kann Defense", "variation": "Advance"},
    "e4 c6 d4 d5 Nc3": {"eco": "B15", "name": "Caro-Kann Defense", "variation": "Classical"},
    # ── Pirc / Modern ─────────────────────────────────────────────────────────
    "e4 d6": {"eco": "B07", "name": "Pirc Defense"},
    "e4 d6 d4 Nf6": {"eco": "B07", "name": "Pirc Defense"},
    "e4 d6 d4 Nf6 Nc3 g6": {"eco": "B07", "name": "Pirc Defense", "variation": "Main Line"},
    "e4 g6": {"eco": "B06", "name": "Modern Defense"},
    "e4 g6 d4 Bg7": {"eco": "B06", "name": "Modern Defense"},
    # ── Queen's Pawn (d4) ─────────────────────────────────────────────────────
    "d4": {"eco": "A40", "name": "Queen's Pawn Opening"},
    "d4 d5": {"eco": "D00", "name": "Queen's Pawn Game"},
    "d4 d5 c4": {"eco": "D06", "name": "Queen's Gambit"},
    "d4 d5 c4 e6": {"eco": "D30", "name": "Queen's Gambit Declined"},
    "d4 d5 c4 e6 Nc3 Nf6 Bg5": {"eco": "D55", "name": "Queen's Gambit Declined", "variation": "Main Line"},
    "d4 d5 c4 dxc4": {"eco": "D20", "name": "Queen's Gambit Accepted"},
    "d4 d5 c4 dxc4 Nf3 Nf6": {"eco": "D20", "name": "Queen's Gambit Accepted", "variation": "Classical"},
    "d4 d5 c4 c6": {"eco": "D10", "name": "Slav Defense"},
    "d4 d5 c4 c6 Nf3 Nf6 Nc3": {"eco": "D46", "name": "Semi-Slav Defense"},
    "d4 Nf6": {"eco": "A45", "name": "Indian Defense"},
    "d4 Nf6 c4": {"eco": "E00", "name": "Queen's Indian / Nimzo-Indian"},
    "d4 Nf6 c4 e6": {"eco": "E10", "name": "Queen's Indian Defense"},
    "d4 Nf6 c4 e6 Nc3 Bb4": {"eco": "E20", "name": "Nimzo-Indian Defense"},
    "d4 Nf6 c4 e6 Nc3 Bb4 e3": {"eco": "E40", "name": "Nimzo-Indian Defense", "variation": "Rubinstein"},
    "d4 Nf6 c4 e6 Nf3 b6": {"eco": "E10", "name": "Queen's Indian Defense"},
    "d4 Nf6 c4 g6": {"eco": "E60", "name": "King's Indian Defense"},
    "d4 Nf6 c4 g6 Nc3 Bg7": {"eco": "E60", "name": "King's Indian Defense"},
    "d4 Nf6 c4 g6 Nc3 Bg7 e4": {"eco": "E70", "name": "King's Indian Defense", "variation": "Main Line"},
    "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6": {"eco": "E70", "name": "King's Indian Defense", "variation": "Orthodox"},
    "d4 Nf6 c4 c5": {"eco": "A56", "name": "Benoni Defense"},
    "d4 Nf6 c4 c5 d5": {"eco": "A56", "name": "Modern Benoni"},
    "d4 f5": {"eco": "A80", "name": "Dutch Defense"},
    "d4 f5 c4": {"eco": "A85", "name": "Dutch Defense", "variation": "Classical"},
    "d4 d6": {"eco": "A41", "name": "Old Indian Defense"},
    # ── English Opening ───────────────────────────────────────────────────────
    "c4": {"eco": "A10", "name": "English Opening"},
    "c4 e5": {"eco": "A20", "name": "English Opening", "variation": "King's English"},
    "c4 e5 Nc3": {"eco": "A25", "name": "English Opening", "variation": "King's English"},
    "c4 Nf6": {"eco": "A15", "name": "English Opening", "variation": "Anglo-Indian"},
    "c4 c5": {"eco": "A30", "name": "English Opening", "variation": "Symmetrical"},
    "c4 c6": {"eco": "A11", "name": "English Opening", "variation": "Caro-Kann Defensive System"},
    # ── Réti / Flank Openings ─────────────────────────────────────────────────
    "Nf3": {"eco": "A04", "name": "Réti Opening"},
    "Nf3 d5": {"eco": "A06", "name": "Réti Opening"},
    "Nf3 d5 g3": {"eco": "A07", "name": "Réti Opening", "variation": "King's Indian Attack"},
    "Nf3 Nf6": {"eco": "A04", "name": "Réti Opening"},
    "Nf3 c5": {"eco": "A04", "name": "Réti Opening"},
    # ── Bird's Opening ────────────────────────────────────────────────────────
    "f4": {"eco": "A02", "name": "Bird's Opening"},
    "f4 d5": {"eco": "A03", "name": "Bird's Opening", "variation": "Dutch Variation"},
    # ── Grünfeld ──────────────────────────────────────────────────────────────
    "d4 Nf6 c4 g6 Nc3 d5": {"eco": "D80", "name": "Grünfeld Defense"},
    "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7": {"eco": "D85", "name": "Grünfeld Defense", "variation": "Exchange"},
    # ── London System ─────────────────────────────────────────────────────────
    "d4 d5 Nf3 Nf6 Bf4": {"eco": "D02", "name": "London System"},
    "d4 Nf6 Nf3 d5 Bf4": {"eco": "D02", "name": "London System"},
    # ── Catalan ───────────────────────────────────────────────────────────────
    "d4 Nf6 c4 e6 Nf3 d5 g3": {"eco": "E01", "name": "Catalan Opening"},
}


def detect_opening(san_moves: list[str]) -> OpeningInfo | None:
    """
    Match the game's opening moves against the ECO database.

    Performs a longest-prefix match: the deepest matching entry wins.

    Args:
        san_moves: Ordered list of SAN move strings from the start of the game.

    Returns:
        OpeningInfo for the best match, or None if no match found.
    """
    if not san_moves:
        return None

    best_match: OpeningInfo | None = None

    # Build progressively longer key strings and check for matches
    for depth in range(1, min(len(san_moves) + 1, 15)):  # max 14 ply lookup
        key = " ".join(san_moves[:depth])
        entry = ECO_DATABASE.get(key)
        if entry:
            best_match = OpeningInfo(
                name=entry["name"],
                eco=entry["eco"],
                variation=entry.get("variation"),
            )

    return best_match
