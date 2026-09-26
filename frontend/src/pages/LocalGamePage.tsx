import { useEffect, useRef, useState } from 'react';
import { useChessGame } from '../hooks/useChessGame';
import ChessBoardWrapper from '../components/board/ChessBoard';
import { GameInfo } from '../components/game/GameInfo';
import { MoveList } from '../components/game/MoveList';
import { GameControls } from '../components/game/GameControls';
import { Clock } from '../components/game/Clock';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useGameReview } from '../hooks/useGameReview';
import { useChessSound } from '../hooks/useChessSound';
import { useClock } from '../hooks/useClock';
import { useStockfish } from '../hooks/useStockfish';
import { TIME_CONTROLS } from '../config/constants';
import { TimeControl } from '../types/chess';

export const LocalGamePage = () => {
  const { gameState, makeMove, undo, resetGame, resign, offerDraw, isGameOver, legalMoves } =
    useChessGame();
  const navigate = useNavigate();
  const { isAnalyzing } = useGameReview();
  const { playSound } = useChessSound();
  const { getBestMove } = useStockfish();
  const prevMoveCountRef = useRef(gameState.moves.length);
  const [flipped, setFlipped] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null);
  const [isHinting, setIsHinting] = useState(false);

  // Time control selection (only shown before first move)
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl | null>(
    TIME_CONTROLS[3], // Blitz 5+0 default
  );
  const [gameStarted, setGameStarted] = useState(false);

  const clockInitial = selectedTimeControl?.initial ?? 0;
  const clockIncrement = selectedTimeControl?.increment ?? 0;
  const hasTimeControl = clockInitial > 0;

  const { whiteTime, blackTime, applyIncrement, resetClocks } = useClock({
    whiteInitial: clockInitial,
    blackInitial: clockInitial,
    activeColor:
      gameStarted && !isGameOver
        ? gameState.isWhiteTurn
          ? 'white'
          : 'black'
        : null,
    gameOver: isGameOver,
    increment: clockIncrement,
    onTimeout: hasTimeControl
      ? (color) => resign(color)
      : undefined,
  });

  // Play sound + apply increment on each new move
  useEffect(() => {
    const moves = gameState.moves;
    if (moves.length === prevMoveCountRef.current) return;
    prevMoveCountRef.current = moves.length;
    const lastMove = moves[moves.length - 1];
    if (!lastMove) return;

    const san = lastMove.san ?? '';
    if (san.includes('#') || san.includes('+')) playSound('check');
    else if (san.includes('x')) playSound('capture');
    else playSound('move');

    applyIncrement(lastMove.color);
    setHintMove(null);

    if (!gameStarted) setGameStarted(true);
  }, [gameState.moves, playSound, applyIncrement, gameStarted]);

  const handleHint = async () => {
    if (isHinting) return;
    setIsHinting(true);
    try {
      const uci = await getBestMove(gameState.currentFen, 15, 20);
      if (uci && uci.length >= 4) {
        setHintMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      }
    } finally {
      setIsHinting(false);
    }
  };

  const handleReview = () => navigate('/review');

  const handleReset = () => {
    resetGame('local');
    resetClocks(clockInitial, clockInitial);
    setGameStarted(false);
  };

  const lastMove =
    gameState.moves.length > 0
      ? {
          from: gameState.moves[gameState.moves.length - 1].uci.slice(0, 2),
          to: gameState.moves[gameState.moves.length - 1].uci.slice(2, 4),
        }
      : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto h-full">
      <div className="flex flex-col items-center gap-3 flex-grow">
        {/* Top clock (Black) */}
        {hasTimeControl && (
          <Clock
            timeRemaining={blackTime}
            isActive={!gameState.isWhiteTurn && !isGameOver && gameStarted}
            color="black"
          />
        )}

        {/* Time control selector — only before game starts */}
        {!gameStarted && (
          <div className="flex flex-wrap gap-1 justify-center">
            {TIME_CONTROLS.filter((tc) => tc.initial > 0).map((tc, i) => (
              <button
                key={i}
                onClick={() =>
                  setSelectedTimeControl({ initial: tc.initial, increment: tc.increment })
                }
                className={`py-1 px-2.5 rounded text-xs transition-colors ${
                  selectedTimeControl?.initial === tc.initial &&
                  selectedTimeControl?.increment === tc.increment
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tc.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedTimeControl(null)}
              className={`py-1 px-2.5 rounded text-xs transition-colors ${
                selectedTimeControl === null
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Unlimited
            </button>
          </div>
        )}

        <ChessBoardWrapper
          fen={gameState.currentFen}
          orientation={flipped ? 'black' : 'white'}
          onMove={(source, target, piece) => makeMove(source + target + piece)}
          legalMoves={legalMoves}
          lastMove={lastMove}
          hintMove={hintMove}
          interactive={!isGameOver}
        />

        {/* Bottom clock (White) */}
        {hasTimeControl && (
          <Clock
            timeRemaining={whiteTime}
            isActive={gameState.isWhiteTurn && !isGameOver && gameStarted}
            color="white"
          />
        )}
      </div>

      <div className="w-full lg:w-96 flex flex-col">
        <GameInfo />
        <MoveList
          moves={gameState.moves}
          currentIndex={gameState.moves.length}
          onMoveClick={() => {}}
        />
        <div className="mt-4 flex flex-col gap-2">
          {!isGameOver ? (
            <>
              <GameControls
                onResign={() => resign(gameState.isWhiteTurn ? 'white' : 'black')}
                onOfferDraw={offerDraw}
                onFlip={() => setFlipped((f) => !f)}
                onUndo={gameState.moves.length > 0 ? undo : undefined}
                gameOver={isGameOver}
              />
              <Button variant="secondary" onClick={handleHint} disabled={isHinting}>
                {isHinting ? 'Thinking…' : 'Hint'}
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={handleReset}>Rematch</Button>
              <Button variant="secondary" onClick={handleReview} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Game Review'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
