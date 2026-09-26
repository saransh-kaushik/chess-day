import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMyOpenings } from '../api/stats';
import { OpeningStat } from '../types/api';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';

export const OpeningsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [openings, setOpenings] = useState<OpeningStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const res = await getMyOpenings();
        setOpenings(res.openings);
      } catch (e: any) {
        setError('Could not load openings. Make sure the backend is running.');
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

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Opening Explorer</h1>
            <p className="text-gray-400 text-sm">Your openings from reviewed games</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          {openings.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No openings yet. Play and review some games first.
            </p>
          ) : (
            <div className="space-y-2">
              {openings.map((o, i) => (
                <div
                  key={`${o.eco ?? 'none'}-${o.name ?? 'unknown'}-${i}`}
                  className="flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <div className="text-sm">
                    <span className="text-amber-400 font-mono mr-2">{o.eco ?? '—'}</span>
                    <span className="text-gray-200">{o.name ?? 'Unknown Opening'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">{o.count} games</span>
                    <span className="text-green-400 w-14 text-right">
                      {o.win_rate.toFixed(1)}% win
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
