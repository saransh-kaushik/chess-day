# Chess Play & Review System

## 1. Project Goal

Build a free, web-based chess application where users can:

1. Play chess locally against another player.
2. Play against a chess bot.
3. Play against other online players.
4. Review completed games.
5. Get instant, client-side chess analysis.
6. Optionally request deeper server-side analysis.
7. Understand mistakes through deterministic chess explanations — **no LLMs and no paid AI APIs**.

The application should prioritize:

- Low infrastructure cost
- Fast UI
- Client-side computation where possible
- Clean architecture
- Easy future expansion
- Reliable chess analysis

---

# 2. Core Architecture

```text
                         WEB CLIENT
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          Chess UI       chess.js    Stockfish WASM
              │             │             │
              └─────────────┼─────────────┘
                            │
                     Game State / PGN
                            │
                    ┌───────┴───────┐
                    │               │
              Local Review      FastAPI Cloud
                    │               │
              High-level       Online Games
              analysis         Deep Analysis
                                    │
                               PostgreSQL
                                    │
                               Stockfish
```

The frontend should be capable of running a complete local chess game and basic review **without requiring the backend**.

---

# 3. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- chess.js
- Chessboard component/library
- Web Workers
- Stockfish WebAssembly
- CSS/Tailwind/etc. as appropriate

## Backend

- Python
- FastAPI
- FastAPI Cloud
- PostgreSQL
- python-chess
- Stockfish

## Infrastructure

Initial target:

- FastAPI Cloud free/serverless deployment
- PostgreSQL free/low-cost tier
- No dedicated GPU
- No LLM API
- No Redis unless later proven necessary

Expected maximum concurrent users initially:

**~10 players**

---

# 4. Chess Game Modes

The game system must treat the opponent as an abstraction.

There should conceptually be three player types:

```text
HumanPlayer
BotPlayer
RemotePlayer
```

The game itself should not care which type is playing.

Conceptually:

```text
Game
 ├── White Player
 ├── Black Player
 ├── Board State
 ├── Move History
 └── Clock
```

An opponent simply provides a move.

---

## 4.1 Local Player vs Player

Two humans use the same browser/device.

Requirements:

- Legal moves
- Move history
- Chess clocks
- Resign
- Draw
- Check/checkmate
- Promotion
- PGN generation

No backend required.

---

## 4.2 Player vs Bot

The bot should initially use Stockfish.

```text
User
 ↓
Frontend
 ↓
Game state
 ↓
Stockfish WASM
 ↓
Bot move
```

Bot difficulty can eventually be controlled through:

- Search depth
- Search nodes
- Time limit
- Stockfish skill settings

Do not implement artificial random blunders initially.

---

## 4.3 Online Player vs Player

Use WebSockets.

```text
Player A
   │
   ▼
FastAPI WebSocket
   │
   ▼
Authoritative Game State
   │
   ▼
FastAPI WebSocket
   │
   ▼
Player B
```

The server must validate moves.

Never trust the client to determine whether a move is legal.

Client:

```text
e2 → e4
```

Server:

```text
validate move
↓
update authoritative board
↓
broadcast new state
```

The client-side engine is only for analysis/bot functionality and must not be treated as authoritative game logic.

---

# 5. Game State

The canonical board representation should be FEN.

Store:

- Current FEN
- Move history
- SAN moves
- PGN
- Player colors
- Game mode
- Game status
- Clock state
- Result
- Timestamps

Example:

```text
Game
 ├── id
 ├── white_player
 ├── black_player
 ├── mode
 ├── initial_fen
 ├── current_fen
 ├── moves[]
 ├── pgn
 ├── result
 ├── status
 ├── time_control
 ├── created_at
 └── completed_at
```

---

# 6. Chess Engine

Use **Stockfish**.

Do not build a chess engine.

Stockfish will provide:

- Position evaluation
- Best move
- Principal variation
- Search depth
- Mate detection
- Alternative moves

---

# 7. Two-Level Analysis System

Analysis should intentionally have two levels.

## Level 1 — Client Analysis

Runs completely in the browser.

```text
Completed Game
      ↓
Stockfish WASM
      ↓
High-level analysis
```

Purpose:

- Immediate feedback
- Free
- No backend dependency
- No server CPU consumption

Should provide:

- Evaluation graph
- Best move
- Move classification
- Accuracy
- Blunders
- Mistakes
- Inaccuracies
- Key moments
- Basic opening information

Analysis depth should be configurable but optimized for browser performance.

Use a Web Worker so Stockfish does not block the UI.

---

# 8. Level 2 — Deep Server Analysis

Optional.

User explicitly requests:

**Deep Analysis**

Then:

```text
Frontend
 ↓
FastAPI
 ↓
Stockfish
 ↓
Detailed analysis
 ↓
Return structured results
```

Server analysis can use:

- Higher depth
- More thinking time
- Multiple variations
- More extensive position analysis

The server should not analyze every game deeply by default.

This keeps infrastructure requirements low.

---

# 9. Review System

The review system must NOT rely on an LLM.

Use:

```text
Stockfish
+
chess.js/python-chess
+
deterministic chess heuristics
+
predefined explanation templates
```

Pipeline:

```text
Game
 ↓
Analyze every relevant position
 ↓
Calculate evaluation loss
 ↓
Identify important moves
 ↓
Run chess heuristics
 ↓
Classify the event
 ↓
Select explanation template
 ↓
Fill template with position-specific information
```

---

# 10. Move Classification

Every significant move can be assigned a classification.

Initial categories:

```text
BEST
GOOD
INACCURACY
MISTAKE
BLUNDER
```

Classification should primarily use evaluation loss.

Do not hard-code a single simplistic threshold without considering:

- Evaluation before move
- Evaluation after move
- Best engine move
- Material change
- Forced tactical sequences
- Checkmate situations

Thresholds should be configurable.

Example configuration:

```text
inaccuracy_threshold
mistake_threshold
blunder_threshold
```

These values should live in a configuration module rather than being scattered through the code.

---

# 11. Tactical Detection

Build deterministic detectors for common tactical events.

Initial targets:

```text
Hanging Piece
Missed Capture
Fork
Pin
Skewer
Discovered Attack
Double Attack
Back Rank Threat
Mate Threat
Missed Check
Missed Tactical Sequence
```

Do not attempt to implement every chess tactic in v1.

The detector should provide structured output such as:

```json
{
  "type": "HANGING_PIECE",
  "piece": "knight",
  "square": "f3",
  "severity": "mistake"
}
```

---

# 12. Positional Detection

Add basic heuristic detectors.

Potential categories:

```text
Poor Development
Repeated Piece Movement
King Safety
Weak Pawn Structure
Poor Exchange
Weak Piece
Loss of Space
Unnecessary Pawn Move
```

These detectors should be conservative.

If the system cannot confidently identify the reason, it should simply report the engine evaluation rather than invent an explanation.

---

# 13. Endgame Detection

Detect when the game enters an endgame based on material/board state.

Potential analysis:

```text
King Activity
Passed Pawns
Pawn Promotion
Opposition
Rook Activity
Piece Exchanges
Promotion Race
```

Keep this heuristic-based.

---

# 14. Natural-Language Review Without AI

Use predefined templates.

Example:

```text
Classification:
HANGING_PIECE
```

Template:

> You left your {piece} undefended, allowing your opponent to win material.

Example:

```text
Classification:
MISSED_FORK
```

Template:

> You missed an opportunity to attack both the {piece1} and {piece2} at the same time.

Example:

```text
Classification:
POOR_DEVELOPMENT
```

Template:

> This move spends another tempo on a piece that has already moved while some of your other pieces remain undeveloped.

Templates should be stored separately from analysis logic.

---

# 15. Review Data Model

A review should contain structured information.

Example:

```json
{
  "game_id": "...",
  "accuracy": {
    "white": 87,
    "black": 82
  },
  "moves": [
    {
      "move_number": 18,
      "san": "Qxd4?",
      "classification": "MISTAKE",
      "eval_before": -0.2,
      "eval_after": 2.4,
      "best_move": "Nxd4",
      "principal_variation": ["Nxd4", "Bxd4", "Qxd4"],
      "reason": {
        "type": "TACTICAL_MISTAKE",
        "subtype": "MISSED_RECAPTURE"
      },
      "explanation": "..."
    }
  ]
}
```

The frontend should consume structured review data rather than parsing natural-language output.

---

# 16. Accuracy

Create a custom accuracy metric.

Do not simply calculate:

```text
100 - average centipawn loss
```

Centipawn loss is not perceptually linear.

Use a configurable nonlinear mapping from evaluation loss to move accuracy.

The metric should be documented as:

**Application-defined chess accuracy**

It should not be presented as an official rating.

---

# 17. Review UI

Primary review screen:

```text
┌──────────────────────────────────────────────┐
│                 GAME REVIEW                  │
├───────────────────────┬──────────────────────┤
│                       │ Accuracy: 87          │
│                       │                      │
│     CHESS BOARD       │ 3 Mistakes           │
│                       │ 1 Blunder            │
│                       │ 4 Inaccuracies       │
│                       │                      │
│                       │ ───────────────────  │
│                       │ Move 18...Qxd4?      │
│                       │                      │
│                       │ Better: Nxd4         │
│                       │                      │
│                       │ [Explanation]         │
├───────────────────────┴──────────────────────┤
│ Evaluation Graph                             │
├──────────────────────────────────────────────┤
│ ← Previous                         Next →     │
└──────────────────────────────────────────────┘
```

Clicking a move or graph point should jump the board to that position.

---

# 18. Player Statistics

Once multiple games exist, aggregate reviews.

Track:

```text
Games
Wins
Losses
Draws

Accuracy
Blunders
Mistakes
Inaccuracies

Opening performance
Tactical mistakes
Positional mistakes
Endgame performance
Time management
```

Eventually identify recurring patterns.

Example:

```text
Recurring Patterns

• Frequently misses tactical threats
• Makes repeated piece movements during development
• Stronger performance in endgames
```

These should be derived from actual stored review data.

Do not use an LLM.

---

# 19. Opening Detection

Use an opening database/ECO mapping.

Do not ask Stockfish or an LLM to identify openings.

Input:

```text
PGN / move sequence
```

Output:

```text
Opening
ECO
Variation
```

The opening system should be independent of the engine review system.

---

# 20. Backend Responsibilities

FastAPI should handle:

```text
Authentication
Game creation
Online matchmaking/rooms
WebSocket connections
Authoritative online game state
Game persistence
PGN persistence
Deep analysis requests
Review persistence
Player statistics
```

Avoid putting unnecessary computation on the backend.

---

# 21. Server Constraints

Initial target:

```text
~10 concurrent players
```

Expected initial server:

```text
2 vCPU
4 GB RAM
40–60 GB storage
```

This should be sufficient if normal gameplay and high-level analysis primarily happen client-side.

If server-side Stockfish becomes CPU-heavy, analysis should be moved into an independent worker architecture later.

---

# 22. FastAPI Cloud Constraint

The application is intended to run on the FastAPI Cloud free/serverless environment.

Therefore:

- Do not rely on persistent in-memory game state.
- Do not assume a long-running background process.
- Do not assume local filesystem persistence.
- Keep API instances stateless.
- Persist important state in PostgreSQL.
- Treat deep analysis as a potentially separate operation.
- Avoid Redis initially.

WebSocket support and execution limits must be validated against the current FastAPI Cloud deployment environment before relying heavily on them.

---

# 23. Important Architectural Rule

Separate these systems:

```text
GAME ENGINE
    ↓
Legal chess state

STOCKFISH
    ↓
Objective chess evaluation

REVIEW HEURISTICS
    ↓
Determine what happened

TEMPLATES
    ↓
Explain what happened

FRONTEND
    ↓
Present everything to the player
```

Do not combine all of this into one giant review function.

---

# 24. Development Order

Build in this order:

### Phase 1

Playable local chess.

### Phase 2

Stockfish WASM bot.

### Phase 3

Client-side analysis.

### Phase 4

Review UI.

### Phase 5

Deterministic mistake/tactical detection.

### Phase 6

Online multiplayer.

### Phase 7

Server-side deep analysis.

### Phase 8

Persistent player statistics and recurring-pattern analysis.

---

# 25. Initial Non-Goals

Do NOT implement initially:

- Tournaments
- Leaderboards
- Social/friends system
- Chat
- Chess puzzles
- Courses
- AI/LLM coaching
- Voice coaching
- Mobile apps
- Custom chess engine
- Machine-learning chess model

The architecture should allow these later without requiring a rewrite, but they are outside the initial scope.

---

# 26. Core Product Principle

The application should remain useful even if the backend is unavailable.

A user should be able to:

```text
Open website
 ↓
Play chess
 ↓
Play against bot
 ↓
Analyze game
 ↓
Review mistakes
```

using primarily browser-side computation.

The backend adds:

```text
Online multiplayer
+
Persistence
+
Deep analysis
+
Long-term player statistics
```

rather than being required for basic chess functionality.
