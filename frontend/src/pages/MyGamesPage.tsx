import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { listGames, GameResponse } from '../api/games';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';

const PAGE_SIZE = 10;

export const MyGamesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [games, setGames] = useState<GameResponse[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await listGames(page, PAGE_SIZE);
        setGames(res.games);
        setTotal(res.total);
      } catch (e: any) {
        setError('Could not load games. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, token, navigate, page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const hasNext = page * PAGE_SIZE < total;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Games</h1>
            <p className="text-gray-400 text-sm">{total} total games</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          {games.length === 0 ? (
            <p className="text-gray-400 text-sm">No games yet.</p>
          ) : (
            <div className="space-y-2">
              {games.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs capitalize">{g.mode}</span>
                    <span className="text-gray-300 text-sm">
                      {g.white_guest_name ?? 'White'} vs {g.black_guest_name ?? 'Black'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.result && (
                      <span
                        className={`text-xs font-bold ${
                          g.result === '1-0'
                            ? 'text-green-400'
                            : g.result === '0-1'
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {g.result}
                      </span>
                    )}
                    <span className="text-gray-500 text-xs">
                      {new Date(g.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-gray-400 text-sm">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
