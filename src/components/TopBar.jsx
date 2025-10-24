import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import UserMenu from './UserMenu';

export default function TopBar() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const { user, loading, signInGoogle } = useAuth();

  const isReader = loc.pathname.startsWith('/read/');

  // Prefill input HANYA kalau bukan di reader
  useEffect(() => {
    if (isReader) return;
    if (loc.pathname === '/search') {
      setQ(sp.get('q') || '');
    } else {
      setQ('');
    }
  }, [isReader, loc.pathname, sp]);

  const goSearch = () => {
    const s = q.trim();
    if (!s) {
      nav('/search');
      return;
    }
    const next = new URLSearchParams();
    next.set('q', s);
    nav({ pathname: '/search', search: `?${next.toString()}` });
  };

  const linkClass = ({ isActive }) =>
    (isActive ? 'text-white' : 'text-zinc-300 hover:text-white transition-colors');

  const avatar =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '';

  return (
    // Tetap render, tapi sembunyikan saat di reader:
  <header
    className="sticky top-0 z-50 backdrop-blur bg-zinc-900/70 border-b border-white/5 hidden md:block"
    data-reader-hide
    hidden={isReader}
    aria-hidden={isReader ? 'true' : 'false'}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo langsung ke Home */}
        <Link to="/" replace className="font-extrabold text-xl text-white">
          GV<span className="text-brand">Comics</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/explore" className={linkClass}>Explore</NavLink>
          <NavLink to="/library" className={linkClass}>Library</NavLink>
          <NavLink to="/search" className={linkClass}>Search</NavLink>
        </nav>

        {/* Search + Auth */}
        <div className="ml-auto flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full max-w-lg sm:max-w-xs">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goSearch()}
              placeholder="Cari Komik"
              className="w-full rounded-2xl bg-zinc-800/70 border border-white/10 px-4 py-2 outline-none focus:ring-2 ring-brand/40"
              aria-label="Cari Komik"
              disabled={isReader} // hindari fokus/efek di reader
            />
            <button
              onClick={goSearch}
              className="absolute right-2 top-1.5 px-3 py-1 text-xs bg-zinc-700 rounded"
              disabled={isReader}
            >
              Cari
            </button>
          </div>

          {loading ? (
            <div className="h-8 w-20 rounded bg-zinc-800 animate-pulse" />
          ) : user ? (
            <UserMenu avatar={avatar} displayName={displayName} />
          ) : (
            <button
              onClick={signInGoogle}
              className="text-xs bg-brand hover:brightness-110 rounded px-3 py-1 text-white"
              title="Login dengan Google"
              disabled={isReader}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
