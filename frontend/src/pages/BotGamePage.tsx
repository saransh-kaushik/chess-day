import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../components/board/ChessBoard';
import { MoveList } from '../components/game/MoveList';
import { GameControls } from '../components/game/GameControls';
import { Clock } from '../components/game/Clock';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useChessGame } from '../hooks/useChessGame';
import { useStockfish } from '../hooks/useStockfish';
import { useGameStore } from '../store/gameStore';
import { BOT_SKILL_LEVELS, TIME_CONTROLS } from '../config/constants';
import { PlayerColor, TimeControl } from '../types/chess';

type SetupStep = 'setup' | 'playing' | 'finished';

export const BotGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<SetupStep>('setup');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
  const [skillIndex, setSkillIndex] = useState(2); // Medium default
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl | null>(
    TIME_CONTROLS[5] // Rapid 10+0
  );
  const [isBotThinking, setIsBotThinking] = useState(false);

  const { game, gameState, legalMoves, makeMove, resetGame, resign, isGameOver } = useChessGame();
  const { isReady, getBestMove } = useStockfish();
  const { gameState: gs } = useGameStore();

  const botColor: PlayerColor = playerColor === 'white' ? 'black' : 'white';
  const skill = BOT_SKILL_LEVELS[skillIndex];

  // Computed boolean — stable derivation, no function in deps
  const currentFen = game.fen();
  const isWhiteTurn = !currentFen.includes(' b ');
  const isBotTurnNow = (botColor === 'white' && isWhiteTurn) || (botColor === 'black' && !isWhiteTurn);

  // Keep a callback for handlePlayerMove
  const isBotTurn = useCallback(() => {
    const fen = game.fen();
    const whiteTurn = !fen.includes(' b ');
    return (botColor === 'white' && whiteTurn) || (botColor === 'black' && !whiteTurn);
  }, [game, botColor]);

  // Trigger bot move whenever it's the bot's turn
  useEffect(() => {
    if (step !== 'playing' || isGameOver || !isReady || !isBotTurnNow) return;

    let cancelled = false;
    setIsBotThinking(true);

    getBestMove(currentFen, 15, skill.stockfishSkill)
      .then((uciMove) => {
        if (cancelled) return;

        const doMove = (uci: string) => {
          const ok = makeMove(uci);
          if (!ok) {
            // Stockfish returned an illegal move — fall back to first legal move
            const legalUcis = game.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
            if (legalUcis.length > 0) makeMove(legalUcis[0]);
          }
          setIsBotThinking(false);
        };

        // Small delay so the move feels natural
        setTimeout(() => {
          if (!cancelled) doMove(uciMove);
        }, 300 + Math.random() * 400);
      })
      .catch(() => {
        if (!cancelled) setIsBotThinking(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFen, step, isGameOver, isReady, skill.stockfishSkill]);

  const handleStart = () => {
    resetGame('bot', selectedTimeControl ?? undefined);
    setStep('playing');
  };

  const handlePlayerMove = (uci: string) => {
    if (isBotThinking || isBotTurn()) return;
    makeMove(uci);
  };

  const handleResign = () => {
    resign(playerColor);
    setStep('finished');
  };

  useEffect(() => {
    if (isGameOver && step === 'playing') setStep('finished');
  }, [isGameOver, step]);

  const handleReview = () => {
    navigate('/review');
  };

  // ── Setup Screen ──
  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-white text-center">Play vs Bot</h1>

          {/* Color selection */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Play as</label>
            <div className="grid grid-cols-3 gap-2">
              {(['white', 'random', 'black'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    setPlayerColor(
                      c === 'random'
                        ? Math.random() > 0.5
                          ? 'white'
                          : 'black'
                        : c
                    )
                  }
                  className={`py-2 rounded capitalize text-sm font-medium transition-colors ${
                    (c === 'random' ? false : playerColor === c)
                      ? 'bg-amber-500 text-black'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {c === 'white' ? '♔ White' : c === 'black' ? '♚ Black' : '🎲 Random'}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Difficulty:{' '}
              <span className="text-amber-400 font-semibold">{skill.label}</span>
            </label>
            <input
              type="range"
              min={0}
              max={BOT_SKILL_LEVELS.length - 1}
              value={skillIndex}
              onChange={(e) => setSkillIndex(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Beginner</span>
              <span>Master</span>
            </div>
          </div>

          {/* Time control */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Time Control</label>
            <div className="grid grid-cols-3 gap-1">
              {TIME_CONTROLS.map((tc, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setSelectedTimeControl(
                      tc.initial === 0 ? null : { initial: tc.initial, increment: tc.increment }
                    )
                  }
                  className={`py-1 px-2 rounded text-xs transition-colors ${
                    (selectedTimeControl?.initial ?? 0) === tc.initial &&
                    (selectedTimeControl?.increment ?? 0) === tc.increment
                      ? 'bg-amber-500 text-black font-semibold'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!isReady}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReady ? 'Start Game' : 'Loading engine…'}
          </button>
        </div>
      </div>
    );
  }

  // ── Finished Screen ──
  if (step === 'finished') {
    const resultText =
      gameState.result === '1-0'
        ? playerColor === 'white'
          ? 'You won! 🎉'
          : 'Bot wins'
        : gameState.result === '0-1'
        ? playerColor === 'black'
          ? 'You won! 🎉'
          : 'Bot wins'
        : 'Draw';

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-8 text-center space-y-4 w-full max-w-sm">
          <h2 className="text-3xl font-bold text-white">{resultText}</h2>
          <p className="text-gray-400">{gameState.result}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep('setup')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              New Game
            </button>
            <button
              onClick={handleReview}
              className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400"
            >
              Review Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game Screen ──
  const boardOrientation = playerColor;
  const isInteractive = !isBotThinking && !isGameOver && !isBotTurn();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Board area */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {/* Bot clock (opponent) */}
          {selectedTimeControl && (
            <Clock
              timeRemaining={gameState.blackTime ?? selectedTimeControl.initial}
              isActive={isBotTurn() && !isGameOver}
              color={botColor}
            />
          )}

          {/* Bot thinking indicator */}
          {isBotThinking && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <LoadingSpinner size="sm" />
              <span>Bot is thinking…</span>
            </div>
          )}

          <ChessBoard
            fen={game.fen()}
            orientation={boardOrientation}
            onMove={(from: string, to: string, piece: string) => {
              const promo = piece?.toLowerCase() === 'p' && (to[1] === '8' || to[1] === '1')
                ? 'q'
                : undefined;
              handlePlayerMove(from + to + (promo ?? ''));
              return true;
            }}
            legalMoves={isInteractive ? legalMoves : []}
            lastMove={
              gs.moves.length > 0
                ? {
                    from: gs.moves[gs.moves.length - 1].uci.slice(0, 2),
                    to: gs.moves[gs.moves.length - 1].uci.slice(2, 4),
                  }
                : null
            }
            isCheck={game.inCheck()}
            interactive={isInteractive}
          />

          {/* Player clock */}
          {selectedTimeControl && (
            <Clock
              timeRemaining={gameState.whiteTime ?? selectedTimeControl.initial}
              isActive={!isBotTurn() && !isGameOver}
              color={playerColor}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">
              You — {playerColor === 'white' ? '♔' : '♚'}
            </div>
            <div className="text-white font-medium">vs {skill.label} Bot</div>
          </div>

          <MoveList moves={gs.moves} currentIndex={gs.moves.length} onMoveClick={() => {}} />

          <GameControls
            onResign={handleResign}
            onOfferDraw={() => {}}
            onNewGame={() => setStep('setup')}
            gameOver={isGameOver}
          />
        </div>
      </div>
    </div>
  );
};
