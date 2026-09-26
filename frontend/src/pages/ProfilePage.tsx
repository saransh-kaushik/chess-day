import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMe } from '../api/auth';
import { getMyStats, PlayerStats } from '../api/stats';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';

interface MeResponse {
  id: string;
  username: string;
  email: string | null;
  is_guest: boolean;
  created_at: string;
  last_seen: string;
}

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const [meRes, statsRes] = await Promise.all([getMe(), getMyStats()]);
        setMe(meRes);
        setStats(statsRes);
      } catch (e: any) {
        setError('Could not load profile. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, token, navigate]);

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

  if (!me) return null;

  const winRate =
    stats && stats.games_played > 0
      ? ((stats.wins / stats.games_played) * 100).toFixed(1)
      : '0.0';

  const statCard = (label: string, value: string | number, sub?: string) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
      {sub && <div className="text-gray-500 text-xs">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{me.username}</h1>
              {me.is_guest && (
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  Guest
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">Profile</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>

        {/* Profile info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Email</span>
            <span className="text-gray-200">{me.email ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Member since</span>
            <span className="text-gray-200">
              {new Date(me.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCard('Games', stats.games_played)}
              {statCard('Wins', stats.wins, `${winRate}% win rate`)}
              {statCard('Losses', stats.losses)}
              {statCard('Draws', stats.draws)}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
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
          </>
        )}
      </div>
    </div>
  );
};
