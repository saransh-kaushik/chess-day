import { useNavigate } from 'react-router-dom';

const playOptions = [
  { to: '/bot', icon: '♞', title: 'Play the bot', description: 'A focused game against a perfectly patient sparring partner.', cta: 'Choose opponent', accent: 'from-amber-300 to-orange-500', tag: 'Most popular' },
  { to: '/online', icon: '◉', title: 'Play online', description: 'Join the queue and find your next worthy rival.', cta: 'Find a match', accent: 'from-sky-300 to-indigo-500', tag: 'Live' },
  { to: '/local', icon: '♜', title: 'Play together', description: 'Pass-and-play chess for two people at one board.', cta: 'Start local game', accent: 'from-emerald-300 to-teal-500', tag: 'Over the board' },
];

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-4 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-amber-200/10 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 px-6 py-10 shadow-2xl shadow-black/20 sm:px-10 sm:py-14">
        <div className="absolute -right-10 -top-24 select-none text-[19rem] leading-none text-amber-300/[.045]">♞</div>
        <div className="relative max-w-2xl">
          <p className="eyebrow mb-4">Your daily game, elevated</p>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Make your next move <span className="text-amber-300">count.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Play, study, and improve in a quiet space designed to keep the board—and your best ideas—front and center.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => navigate('/bot')} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 active:scale-[.98]">Play a bot game</button>
            <button onClick={() => navigate('/puzzles')} className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10 active:scale-[.98]">Solve a puzzle</button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><p className="eyebrow">Start a game</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Choose your arena</h2></div>
          <button onClick={() => navigate('/pgn')} className="hidden text-sm font-semibold text-amber-300 hover:text-amber-200 sm:block">Review a PGN →</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {playOptions.map((option) => (
            <button key={option.to} onClick={() => navigate(option.to)} className="group app-panel relative overflow-hidden p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-slate-800/90">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${option.accent}`} />
              <div className="mb-6 flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-3xl">{option.icon}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{option.tag}</span></div>
              <h3 className="text-xl font-bold text-white">{option.title}</h3>
              <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">{option.description}</p>
              <span className="mt-6 inline-block text-sm font-bold text-amber-300 group-hover:text-amber-200">{option.cta} <span className="ml-1 transition-transform group-hover:translate-x-1 inline-block">→</span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <button onClick={() => navigate('/puzzles')} className="app-panel flex items-center gap-4 p-5 text-left transition hover:border-amber-300/30 hover:bg-slate-800/80"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-2xl">♟</span><span><span className="block font-bold">Daily tactical workout</span><span className="mt-1 block text-sm text-slate-400">Sharpen your pattern recognition with a fresh position.</span></span><span className="ml-auto text-amber-300">→</span></button>
        <button onClick={() => navigate('/pgn')} className="app-panel flex items-center gap-4 p-5 text-left transition hover:border-sky-300/30 hover:bg-slate-800/80"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-2xl">⌁</span><span><span className="block font-bold">Analyze a game</span><span className="mt-1 block text-sm text-slate-400">Bring in a PGN and discover the moments that mattered.</span></span><span className="ml-auto text-sky-300">→</span></button>
      </section>
    </div>
  );
};
