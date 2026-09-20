import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMyStats, PlayerStats } from '../api/stats';
import { listGames, GameResponse } from '../api/games';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const [s, g] = await Promise.all([getMyStats(), listGames(1, 10)]);
        setStats(s);
        setRecentGames(g);
      } catch (e: any) {
        setError('Could not load stats. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
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

  if (!stats) return null;

  const winRate =
    stats.games_played > 0
      ? ((stats.wins / stats.games_played) * 100).toFixed(1)
      : '0.0';

  const statCard = (label: string, value: string | number, sub?: string) => (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
      {sub && <div className="text-gray-500 text-xs">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.username}</h1>
            <p className="text-gray-400 text-sm">Player Statistics</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCard('Games', stats.games_played)}
          {statCard('Wins', stats.wins, `${winRate}% win rate`)}
          {statCard('Losses', stats.losses)}
          {statCard('Draws', stats.draws)}
        </div>

        {/* Accuracy */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-white font-semibold mb-4">Performance</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">
                {stats.avg_accuracy != null ? `${stats.avg_accuracy.toFixed(1)}%` : '—'}
              </div>
              <div className="text-gray-400 text-sm">Avg. Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{stats.total_blunders}</div>
              <div className="text-gray-400 text-sm">Total Blunders</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">{stats.total_mistakes}</div>
              <div className="text-gray-400 text-sm">Total Mistakes</div>
            </div>
          </div>
        </div>

        {/* Mistake breakdown */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-white font-semibold mb-4">Mistake Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Blunders', value: stats.total_blunders, color: 'bg-red-500' },
              { label: 'Mistakes', value: stats.total_mistakes, color: 'bg-orange-500' },
              { label: 'Inaccuracies', value: stats.total_inaccuracies, color: 'bg-yellow-500' },
              { label: 'Tactical Mistakes', value: stats.tactical_mistakes, color: 'bg-purple-500' },
              { label: 'Positional Mistakes', value: stats.positional_mistakes, color: 'bg-blue-500' },
            ].map(({ label, value, color }) => {
              const total = stats.total_blunders + stats.total_mistakes + stats.total_inaccuracies;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{label}</span>
                    <span className="text-gray-400">{value}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`${color} h-1.5 rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent games */}
        {recentGames.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-white font-semibold mb-4">Recent Games</h2>
            <div className="space-y-2">
              {recentGames.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg"
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
          </div>
        )}
      </div>
    </div>
  );
};
