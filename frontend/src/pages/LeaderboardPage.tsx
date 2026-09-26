import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api/stats';
import { LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';

const PAGE_SIZE = 20;

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await getLeaderboard(page, PAGE_SIZE);
        setEntries(res.entries);
        setTotal(res.total);
      } catch (e: any) {
        setError('Could not load leaderboard. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

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
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-400 text-sm">{total} ranked players</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          {entries.length === 0 ? (
            <p className="text-gray-400 text-sm">No players ranked yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div
                  key={e.user_id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 font-bold text-sm w-6 text-right">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </span>
                    <span className="text-white text-sm font-medium">{e.username}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-400">{e.wins}W</span>
                    <span className="text-red-400">{e.losses}L</span>
                    <span className="text-gray-400">{e.draws}D</span>
                    <span className="text-gray-500">{e.games_played} games</span>
                    <span className="text-amber-400 w-14 text-right">
                      {e.avg_accuracy != null ? `${e.avg_accuracy.toFixed(1)}%` : '—'}
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
