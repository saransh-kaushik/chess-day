import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { register, login, createGuestSession } from '../api/auth';

type Tab = 'login' | 'register' | 'guest';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  const defaultTab: Tab = searchParams.get('guest') === '1' ? 'guest' : 'login';
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ username, password });
      setAuth(res.user as any, res.access_token, false);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !email || !password) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await register({ username, email, password });
      setAuth(res.user as any, res.access_token, false);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = guestName.trim() || `Guest${Math.floor(Math.random() * 9999)}`;
    setLoading(true);
    try {
      const res = await createGuestSession({ name });
      setAuth(res.user as any, res.access_token, true);
      navigate(searchParams.get('redirect') ?? '/online');
    } catch (err: any) {
      // If backend not available, create a local guest session
      const guestId = crypto.randomUUID();
      setAuth(
        { id: guestId, username: name, email: null, is_guest: true, created_at: new Date().toISOString() } as any,
        'guest-local-token',
        true
      );
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (t: Tab) =>
    `flex-1 py-2 text-sm font-medium rounded-t transition-colors ${
      tab === t
        ? 'bg-gray-700 text-white border-b-2 border-amber-500'
        : 'text-gray-400 hover:text-white'
    }`;

  const inputClass =
    'w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors';
  const labelClass = 'block text-gray-400 text-xs mb-1';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-bold text-white text-center mb-4">Chess Day</h1>
          {/* Tabs */}
          <div className="flex gap-0.5 bg-gray-900 rounded-t p-1">
            <button className={tabClass('login')} onClick={() => setTab('login')}>
              Login
            </button>
            <button className={tabClass('register')} onClick={() => setTab('register')}>
              Register
            </button>
            <button className={tabClass('guest')} onClick={() => setTab('guest')}>
              Guest
            </button>
          </div>
        </div>

        <div className="p-6 pt-4">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* ── Login ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>
          )}

          {/* ── Register ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          {/* ── Guest ── */}
          {tab === 'guest' && (
            <form onSubmit={handleGuest} className="space-y-4">
              <p className="text-gray-400 text-sm">
                Play without an account. Your games won't be saved permanently, but you can still
                play locally, vs the bot, and review games in this session.
              </p>
              <div>
                <label className={labelClass}>Display name (optional)</label>
                <input
                  type="text"
                  className={inputClass}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. GuestKnight"
                  maxLength={30}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting…' : 'Continue as Guest'}
              </button>
              <p className="text-gray-500 text-xs text-center">
                Online multiplayer requires an account for persistence.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
