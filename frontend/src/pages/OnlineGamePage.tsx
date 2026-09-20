import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../components/board/ChessBoard';
import { MoveList } from '../components/game/MoveList';
import { GameControls } from '../components/game/GameControls';
import { Clock } from '../components/game/Clock';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { WS_BASE_URL } from '../config/constants';
import { Chess } from 'chess.js';
import { PlayerColor } from '../types/chess';

type OnlineStatus = 'auth' | 'matchmaking' | 'playing' | 'finished';

export const OnlineGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { gameState, addMove, setGameState, setResult } = useGameStore();

  const [status, setStatus] = useState<OnlineStatus>('auth');
  const [myColor, setMyColor] = useState<PlayerColor>('white');
  const [gameId, setGameId] = useState<string | null>(null);
  const [game, setGame] = useState(new Chess());
  const [opponentName, setOpponentName] = useState<string>('Opponent');

  const wsUrl = gameId
    ? `${WS_BASE_URL}/online/game/${gameId}`
    : `${WS_BASE_URL}/online/matchmaking`;

  const { sendMove, sendResign, sendDrawOffer, lastMessage, connectionError } =
    useWebSocket(status === 'matchmaking' || status === 'playing' ? wsUrl : null, token ?? undefined);

  // Handle messages from server
  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage;

    switch (msg.type) {
      case 'waiting':
        // Still in queue
        break;

      case 'matched':
        setGameId(msg.game_id);
        setMyColor(msg.color);
        setGame(new Chess());
        setGameState({ mode: 'online', status: 'active', isWhiteTurn: true, moves: [], result: null });
        setStatus('playing');
        if (msg.opponent_name) setOpponentName(msg.opponent_name);
        break;

      case 'game_state': {
        const newGame = new Chess(msg.fen);
        setGame(newGame);
        if (msg.san && msg.uci) {
          addMove({
            uci: msg.uci,
            san: msg.san,
            fenBefore: game.fen(),
            fenAfter: msg.fen,
            moveNumber: msg.move_number,
            color: msg.turn === 'white' ? 'black' : 'white', // the move was made by the opposite of current turn
            timestamp: Date.now(),
          });
        }
        setGameState({ currentFen: msg.fen, isWhiteTurn: msg.turn === 'white' });
        break;
      }

      case 'game_over':
        setResult(msg.result, 'completed');
        setStatus('finished');
        break;

      case 'draw_offered':
        // In a real app show a dialog; for now auto-show via state
        break;

      case 'opponent_disconnected':
        setStatus('finished');
        break;
    }
  }, [lastMessage]);

  const handleFindGame = () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setStatus('matchmaking');
  };

  const isMyTurn =
    (myColor === 'white' && gameState.isWhiteTurn) ||
    (myColor === 'black' && !gameState.isWhiteTurn);

  const handleMove = (from: string, to: string, piece?: string) => {
    if (!isMyTurn) return false;
    const promo =
      piece?.toLowerCase() === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
    sendMove(from + to + (promo ?? ''));
    return true;
  };

  // ── Auth gate ──
  if (status === 'auth') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Online Play</h1>
          <p className="text-gray-400 text-sm">
            Play against other people in real time. You need an account or guest session to
            find a match.
          </p>
          {user ? (
            <button
              onClick={handleFindGame}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
            >
              Find a Game
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
              >
                Login / Register
              </button>
              <button
                onClick={() => {
                  navigate('/login?guest=1');
                }}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Matchmaking ──
  if (status === 'matchmaking') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <LoadingSpinner size="lg" />
          <h2 className="text-2xl font-bold text-white">Finding an opponent…</h2>
          <p className="text-gray-400">This usually takes a few seconds</p>
          {connectionError && (
            <p className="text-red-400 text-sm">{connectionError}</p>
          )}
          <button
            onClick={() => setStatus('auth')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Finished ──
  if (status === 'finished') {
    const result = gameState.result;
    const won =
      (result === '1-0' && myColor === 'white') ||
      (result === '0-1' && myColor === 'black');
    const drew = result === '1/2-1/2';

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-8 text-center space-y-4 w-full max-w-sm">
          <h2 className="text-3xl font-bold text-white">
            {drew ? 'Draw' : won ? 'You won! 🎉' : 'You lost'}
          </h2>
          <p className="text-gray-400">{result}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setStatus('auth');
                setGameId(null);
                setGame(new Chess());
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Play Again
            </button>
            <button
              onClick={() => navigate('/review')}
              className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400"
            >
              Review Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing ──
  const legalMoves = isMyTurn
    ? game.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''))
    : [];

  const moves = gameState.moves;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Board area */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {/* Opponent clock */}
          <Clock
            timeRemaining={myColor === 'white' ? gameState.blackTime ?? 600 : gameState.whiteTime ?? 600}
            isActive={!isMyTurn && gameState.status === 'active'}
            color={myColor === 'white' ? 'black' : 'white'}
          />

          <div className="text-gray-400 text-sm">{opponentName}</div>

          <ChessBoard
            fen={game.fen()}
            orientation={myColor}
            onMove={handleMove}
            legalMoves={legalMoves}
            lastMove={
              moves.length > 0
                ? {
                    from: moves[moves.length - 1].uci.slice(0, 2),
                    to: moves[moves.length - 1].uci.slice(2, 4),
                  }
                : null
            }
            isCheck={game.inCheck()}
            interactive={isMyTurn && gameState.status === 'active'}
          />

          <div className="text-amber-400 text-sm">
            You {myColor === 'white' ? '♔' : '♚'}
          </div>

          {/* My clock */}
          <Clock
            timeRemaining={myColor === 'white' ? gameState.whiteTime ?? 600 : gameState.blackTime ?? 600}
            isActive={isMyTurn && gameState.status === 'active'}
            color={myColor}
          />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-3">
          {connectionError && (
            <div className="bg-red-900 text-red-200 text-sm px-3 py-2 rounded-lg">
              {connectionError}
            </div>
          )}

          <MoveList moves={moves} currentIndex={moves.length} onMoveClick={() => {}} />

          <GameControls
            onResign={() => { sendResign(); setStatus('finished'); }}
            onOfferDraw={sendDrawOffer}
            onNewGame={() => { setStatus('auth'); setGameId(null); }}
            gameOver={gameState.status === 'completed'}
          />
        </div>
      </div>
    </div>
  );
};
