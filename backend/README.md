# Chess Day — Backend

A clean, modular FastAPI backend for the Chess Day platform. Supports local, bot, and online chess games with Stockfish-powered deep analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.115+ |
| ORM | SQLAlchemy 2.0 (sync) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Chess Logic | python-chess |
| Analysis | Stockfish via `chess.engine.SimpleEngine` |
| Database | SQLite (dev) / PostgreSQL (prod) |

---

## Setup

### 1. Install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Install Stockfish

Stockfish is the chess engine used for both bot play (via the frontend WASM build) and server-side deep analysis. The **backend** needs a native Stockfish binary; the **frontend** uses its own WebAssembly build bundled separately.

> **Recommended version:** Stockfish 16 or 17 (latest stable). Older versions work but may lack some evaluation features.

---

#### Ubuntu / Debian

```bash
# Option A — apt (may be an older version, e.g. SF 14)
sudo apt-get update && sudo apt-get install -y stockfish
which stockfish        # typically /usr/games/stockfish

# Option B — download latest binary (recommended)
wget https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar
tar -xf stockfish-ubuntu-x86-64-avx2.tar
sudo mv stockfish/stockfish-ubuntu-x86-64-avx2 /usr/local/bin/stockfish
sudo chmod +x /usr/local/bin/stockfish
which stockfish        # /usr/local/bin/stockfish
```

> If your CPU doesn't support AVX2, use the `bmi2` or `x86-64` variant from the releases page.

---

#### macOS (Homebrew)

```bash
brew install stockfish
which stockfish        # /usr/local/bin/stockfish  or  /opt/homebrew/bin/stockfish
```

For Apple Silicon (M1/M2/M3):
```bash
brew install stockfish
# Homebrew on Apple Silicon installs to /opt/homebrew/bin/stockfish
# Update your .env: STOCKFISH_PATH=/opt/homebrew/bin/stockfish
```

---

#### Windows

1. Download the latest `.exe` from https://stockfishchess.org/download/
2. Extract to a folder, e.g. `C:\stockfish\stockfish.exe`
3. Set in `.env`:
   ```
   STOCKFISH_PATH=C:\stockfish\stockfish.exe
   ```

---

#### Docker / CI

```dockerfile
# In your Dockerfile
RUN apt-get update && apt-get install -y stockfish
```

Or download the binary directly:
```dockerfile
RUN wget -q https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar \
    && tar -xf stockfish-ubuntu-x86-64-avx2.tar \
    && mv stockfish/stockfish-ubuntu-x86-64-avx2 /usr/local/bin/stockfish \
    && chmod +x /usr/local/bin/stockfish \
    && rm -rf stockfish stockfish-ubuntu-x86-64-avx2.tar
```

---

#### Verify installation

```bash
stockfish
# Should print: Stockfish 17 by T. Romstad, M. Costalba, J. Kiiski, G. Linscott
# Type: quit   to exit
```

Or verify from Python:
```python
import chess.engine
engine = chess.engine.SimpleEngine.popen_uci("/usr/local/bin/stockfish")
print(engine.id)   # {'name': 'Stockfish 17 ...', 'author': '...'}
engine.quit()
```

---

#### Configure the path in `.env`

```bash
# After installing, update your .env:
STOCKFISH_PATH=/usr/local/bin/stockfish    # Linux (manual install)
# STOCKFISH_PATH=/usr/games/stockfish      # Linux (apt)
# STOCKFISH_PATH=/opt/homebrew/bin/stockfish  # macOS Apple Silicon
# STOCKFISH_PATH=C:\stockfish\stockfish.exe   # Windows
```

> **Note:** If Stockfish is not found or fails to start, the backend will gracefully degrade — analysis endpoints will return an error, but all other game functionality (auth, matchmaking, game CRUD) will continue working normally.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./chess.db` | SQLAlchemy connection string |
| `SECRET_KEY` | — | JWT signing secret (change in production!) |
| `STOCKFISH_PATH` | `/usr/local/bin/stockfish` | Path to Stockfish binary |
| `STOCKFISH_DEPTH` | `20` | Default engine search depth |
| `STOCKFISH_ANALYSIS_DEPTH` | `25` | Search depth for game reviews |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | JWT expiry (7 days) |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed frontend origins |

---

## Running the Dev Server

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

---

## Database Migrations

### Apply migrations

```bash
cd backend
alembic upgrade head
```

### Create a new migration (after changing models)

```bash
alembic revision --autogenerate -m "describe_your_change"
alembic upgrade head
```

### Rollback one step

```bash
alembic downgrade -1
```

---

## API Endpoints Summary

### Auth — `/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with username + email + password |
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/guest` | Create guest session, returns guest JWT |
| `GET` | `/auth/me` | Current user profile |

### Games — `/games`

| Method | Path | Description |
|---|---|---|
| `POST` | `/games` | Create a new game (local/bot/online) |
| `GET` | `/games` | List current user's games (paginated) |
| `GET` | `/games/{game_id}` | Get game state |
| `POST` | `/games/{game_id}/resign` | Resign |
| `POST` | `/games/{game_id}/draw-offer` | Offer a draw |
| `POST` | `/games/{game_id}/draw-accept` | Accept draw offer |
| `POST` | `/games/{game_id}/complete` | Complete a local/bot game |

### Online — `/online` (WebSocket)

| Protocol | Path | Description |
|---|---|---|
| `WS` | `/online/matchmaking` | Matchmaking queue |
| `WS` | `/online/game/{game_id}` | Live game moves |

### Analysis — `/analysis`

| Method | Path | Description |
|---|---|---|
| `POST` | `/analysis/{game_id}` | Trigger Stockfish analysis |
| `GET` | `/analysis/{game_id}` | Get existing review |

### Stats — `/stats`

| Method | Path | Description |
|---|---|---|
| `GET` | `/stats/me` | My player statistics |
| `GET` | `/stats/{user_id}` | Any user's statistics |

### Meta

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/` | API info |

---

## WebSocket Message Protocol

### Client → Server

```json
{"token": "<JWT>"}                    // First message: authentication
{"type": "move", "uci": "e2e4"}       // Make a move
{"type": "resign"}                    // Resign
{"type": "draw_offer"}                // Offer draw
{"type": "draw_accept"}               // Accept draw
{"type": "draw_decline"}              // Decline draw
```

### Server → Client

```json
{"type": "game_state", "fen": "...", "san": "e4", "move_number": 1, "turn": "black"}
{"type": "game_over", "result": "1-0", "reason": "checkmate"}
{"type": "draw_offered", "by": "white"}
{"type": "error", "message": "Illegal move"}
{"type": "opponent_disconnected"}
{"type": "matched", "game_id": "...", "color": "white"}
{"type": "waiting"}
```

---

## Architecture Notes

- **Stateless API**: All authoritative game state lives in the database. The `GameManager` only holds transient WebSocket references for broadcast routing.
- **Server-side move validation**: All moves in online games are validated by `ChessValidator` (python-chess) before being applied. Clients cannot forge moves.
- **No LLMs**: All analysis (tactical, positional, endgame, opening) is deterministic Python code.
- **Stockfish fallback**: If Stockfish is unavailable, the review engine returns zero-evaluation results rather than crashing.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI app
│   ├── config.py             # Settings (pydantic-settings)
│   ├── database.py           # Engine + session
│   ├── dependencies.py       # get_db, get_current_user
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response models
│   ├── api/                  # Router modules
│   ├── core/                 # Auth, chess validator, game manager
│   ├── analysis/             # Stockfish + heuristic analysis pipeline
│   └── templates/            # Explanation text templates
├── alembic/                  # Migrations
├── requirements.txt
├── .env.example
└── README.md
```
