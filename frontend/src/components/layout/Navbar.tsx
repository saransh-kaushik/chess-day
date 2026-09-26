import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { muted, toggleMuted } = useSettingsStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#090d18]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-xl text-slate-950 shadow-lg shadow-amber-500/20">♞</span>
          <span className="hidden text-lg sm:block">Chess<span className="text-amber-300">Day</span></span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm">
          {[
            ['/', 'Play'], ['/puzzles', 'Puzzles'], ['/stats', 'Stats'], ['/mygames', 'Games'],
            ['/leaderboard', 'Rankings'], ['/openings', 'Openings']
          ].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
              `rounded-lg px-2.5 py-2 font-medium transition-colors ${isActive ? 'bg-white/10 text-amber-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`
            }>{label}</NavLink>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={toggleMuted} className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white" title={muted ? 'Enable sound' : 'Mute sound'} aria-label={muted ? 'Enable sound' : 'Mute sound'}>
            {muted ? '🔇' : '🔊'}
          </button>
          {user ? (
            <>
              <NavLink to="/profile" className="hidden max-w-28 truncate rounded-lg px-2 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white md:block">{user.username}</NavLink>
              <button onClick={handleLogout} className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white">Log out</button>
            </>
          ) : (
            <Link to="/login" className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-300">Sign in</Link>
          )}
        </div>
      </div>
    </nav>
  );
};
