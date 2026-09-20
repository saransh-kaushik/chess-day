/**
 * Stockfish Web Worker
 *
 * Loads the single-threaded Stockfish WASM build from /public/stockfish.js.
 * UCI protocol is used for all communication.
 */

/* eslint-disable no-restricted-globals */

let stockfish: Worker | null = null;
let pendingBestMoveResolve: ((move: string) => void) | null = null;
let pendingEvalResolve: ((result: {
  fen: string; score: number; bestMove: string; pv: string[]; depth: number;
}) => void) | null = null;
let pendingGameFens: string[] = [];
let pendingGameResults: Array<{ fen: string; score: number; bestMove: string; pv: string[]; depth: number }> = [];
let pendingGameResolve: ((results: typeof pendingGameResults) => void) | null = null;
let currentGameFenIndex = 0;
let currentAnalysisDepth = 18;

// Latest info line values — updated as Stockfish streams info
let latestScore = 0;
let latestBestMove = '';
let latestPv: string[] = [];
let latestDepth = 0;
let currentFen = '';

function sendUCI(cmd: string) {
  stockfish?.postMessage(cmd);
}

function initStockfish() {
  // Load single-threaded build that works in Web Workers without SharedArrayBuffer.
  // Must use the original filename so the companion .wasm is resolved correctly.
  stockfish = new Worker('/stockfish-nnue-16-single.js');

  stockfish.onmessage = (e: MessageEvent<string>) => {
    const line: string = typeof e.data === 'string' ? e.data : '';
    handleLine(line);
  };

  stockfish.onerror = (err) => {
    self.postMessage({ type: 'error', message: String(err) });
  };

  sendUCI('uci');
}

function handleLine(line: string) {
  if (line === 'uciok') {
    sendUCI('isready');
    return;
  }

  if (line === 'readyok') {
    self.postMessage({ type: 'ready' });
    return;
  }

  // Parse info lines: info depth 12 seldepth 18 score cp 34 ... pv e2e4 ...
  if (line.startsWith('info') && line.includes('score')) {
    // Depth
    const depthMatch = line.match(/\bdepth (\d+)/);
    if (depthMatch) latestDepth = parseInt(depthMatch[1], 10);

    // Score (centipawns or mate)
    const cpMatch = line.match(/\bscore cp (-?\d+)/);
    const mateMatch = line.match(/\bscore mate (-?\d+)/);
    if (cpMatch) {
      latestScore = parseInt(cpMatch[1], 10);
    } else if (mateMatch) {
      const mateIn = parseInt(mateMatch[1], 10);
      latestScore = mateIn > 0 ? 30000 : -30000;
    }

    // Principal variation
    const pvMatch = line.match(/\bpv (.+)/);
    if (pvMatch) {
      latestPv = pvMatch[1].trim().split(' ');
      if (latestPv.length > 0) latestBestMove = latestPv[0];
    }
    return;
  }

  // bestmove e2e4 ponder e7e5
  if (line.startsWith('bestmove')) {
    const parts = line.split(' ');
    const bm = parts[1] ?? '';
    latestBestMove = bm !== '(none)' ? bm : (latestPv[0] ?? '');

    if (pendingBestMoveResolve) {
      const resolve = pendingBestMoveResolve;
      pendingBestMoveResolve = null;
      resolve(latestBestMove);
      return;
    }

    if (pendingEvalResolve) {
      const resolve = pendingEvalResolve;
      pendingEvalResolve = null;
      resolve({
        fen: currentFen,
        score: latestScore,
        bestMove: latestBestMove,
        pv: latestPv,
        depth: latestDepth,
      });
      return;
    }

    // Game analysis mode: advance to next position
    if (pendingGameResolve) {
      pendingGameResults.push({
        fen: pendingGameFens[currentGameFenIndex] ?? '',
        score: latestScore,
        bestMove: latestBestMove,
        pv: latestPv,
        depth: latestDepth,
      });
      currentGameFenIndex++;

      if (currentGameFenIndex < pendingGameFens.length) {
        // Analyse next position
        analyzeNextGamePosition();
      } else {
        // All done
        const resolve = pendingGameResolve;
        const results = [...pendingGameResults];
        pendingGameResolve = null;
        pendingGameFens = [];
        pendingGameResults = [];
        currentGameFenIndex = 0;
        resolve(results);
      }
    }
  }
}

function resetLatest() {
  latestScore = 0;
  latestBestMove = '';
  latestPv = [];
  latestDepth = 0;
}

function analyzeNextGamePosition() {
  const fen = pendingGameFens[currentGameFenIndex];
  if (!fen) return;
  resetLatest();
  currentFen = fen;
  sendUCI('stop');
  sendUCI(`position fen ${fen}`);
  sendUCI(`go depth ${currentAnalysisDepth}`);
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const { type, fen, depth, skillLevel, fens } = e.data;

  if (type === 'init') {
    initStockfish();
    return;
  }

  if (!stockfish) return;

  if (type === 'getBestMove') {
    resetLatest();
    currentFen = fen ?? '';
    const skill = skillLevel ?? 20;
    sendUCI('stop');
    sendUCI(`setoption name Skill Level value ${skill}`);
    sendUCI(`position fen ${fen}`);
    // Use movetime scaled to skill level so weaker bots respond faster
    const thinkMs = 50 + skill * 30;
    pendingBestMoveResolve = null;
    pendingEvalResolve = null;
    // Register resolve before sending go
    pendingBestMoveResolve = (move: string) => {
      self.postMessage({ type: 'bestMove', move });
    };
    sendUCI(`go depth ${Math.max(1, Math.min(depth ?? 15, skill + 2))} movetime ${thinkMs}`);
    return;
  }

  if (type === 'analyzePosition') {
    resetLatest();
    currentFen = fen ?? '';
    sendUCI('stop');
    sendUCI(`setoption name Skill Level value 20`);
    sendUCI(`position fen ${fen}`);
    pendingEvalResolve = (result) => {
      self.postMessage({ type: 'evaluation', ...result });
    };
    sendUCI(`go depth ${depth ?? 18}`);
    return;
  }

  if (type === 'analyzeGame') {
    if (!fens || fens.length === 0) {
      self.postMessage({ type: 'gameAnalysis', results: [] });
      return;
    }
    currentAnalysisDepth = depth ?? 18;
    pendingGameFens = fens;
    pendingGameResults = [];
    currentGameFenIndex = 0;
    pendingGameResolve = (results) => {
      self.postMessage({ type: 'gameAnalysis', results });
    };
    sendUCI('setoption name Skill Level value 20');
    analyzeNextGamePosition();
    return;
  }

  if (type === 'stop') {
    sendUCI('stop');
    return;
  }

  if (type === 'quit') {
    sendUCI('quit');
    stockfish?.terminate();
    stockfish = null;
    self.close();
  }
};
