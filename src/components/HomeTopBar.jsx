// src/components/HomeTopBar.jsx
import { Link, NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import {
  Search as SearchIcon,
  User2,
  X,
  History as HistoryIcon,
  LogOut
} from 'lucide-react';

/* ---------------- Google SVG ---------------- */
function GoogleLogo({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.602 31.91 29.223 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.31 0 6.31 1.23 8.594 3.25l5.657-5.657C34.847 3.054 29.69 1 24 1 10.745 1 0 11.745 0 25s10.745 24 24 24c12.426 0 23-9.014 23-24 0-1.6-.17-3.15-.389-4.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.42 16.221 18.846 13 24 13c3.31 0 6.31 1.23 8.594 3.25l5.657-5.657C34.847 3.054 29.69 1 24 1 14.49 1 6.408 6.392 2.651 14.003l3.655.688z"/>
      <path fill="#4CAF50" d="M24 49c5.135 0 9.79-1.78 13.351-4.797l-6.163-5.213C29.034 40.658 26.66 41.5 24 41.5c-5.186 0-9.586-3.297-11.18-7.893l-6.48 4.994C9.011 44.79 15.909 49 24 49z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.32 3.91-5.699 7-11.303 7-5.186 0-9.586-3.297-11.18-7.893l-6.48 4.994C8.989 44.79 15.909 49 24 49c12.426 0 23-9.014 23-24 0-1.6-.17-3.15-.389-4.917z"/>
    </svg>
  );
}

/* -------------- Modal via Portal -------------- */
function ModalPortal({ children }) {
  return createPortal(children, document.body);
}

function ModalShell({ open, onClose, children }) {
  if (!open) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1000]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[92vw] max-w-[480px] rounded-2xl bg-zinc-900 ring-1 ring-white/10
                     p-5 shadow-2xl"
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

/* ---------------- Modals ---------------- */
function LoginModal({ open, onClose, onGoogle }) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold">Masuk</div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800" aria-label="Tutup">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-zinc-400 mb-4">Lanjutkan dengan akun Google.</p>
      <button
        onClick={onGoogle}
        className="w-full flex items-center justify-center gap-3 rounded-xl
                   bg-white text-zinc-900 font-medium py-3 hover:brightness-95 transition"
      >
        <GoogleLogo />
        Lanjut dengan Google
      </button>
    </ModalShell>
  );
}

function ProfileModal({ open, onClose, user, onHistory, onLogout }) {
  if (!user) return null;
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const email = user?.email || '';
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-lg font-bold">Profil</div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800" aria-label="Tutup">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 aspect-square rounded-full overflow-hidden ring-1 ring-white/10 shrink-0">
          {avatar ? (
            <img src={avatar} alt={name} className="block w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center bg-zinc-800">
              <User2 className="w-6 h-6 text-zinc-300" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-semibold leading-tight">{name}</div>
          <div className="text-xs text-zinc-400 truncate">{email}</div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onHistory}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 ring-1 ring-white/10"
        >
          <HistoryIcon className="w-4 h-4" />
          <span>Riwayat Baca</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </div>
    </ModalShell>
  );
}

/* Modal input pencarian mobile */
function SearchMobileModal({ open, onClose, value, onChange, onSubmit }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold">Cari Komik</div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800" aria-label="Tutup">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit && onSubmit()}
          placeholder="Ketik min. 3 huruf..."
          className="w-full rounded-lg bg-zinc-800/70 border border-white/10 pl-4 pr-10 py-3
                     outline-none focus:ring-2 ring-brand/40 text-sm"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
            aria-label="Hapus teks"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <SearchIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </ModalShell>
  );
}

/* ---------------- Top Bar ---------------- */
export default function HomeTopBar({ searchQuery, onSearch }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const { user, loading, signInGoogle } = useAuth();

  // Internal state jika props searchQuery tidak dioper (misalnya di Explore / Search)
  const isControlled = typeof onSearch === 'function';
  const [localQuery, setLocalQuery] = useState(() => {
    if (searchQuery !== undefined) return searchQuery;
    if (loc.pathname === '/search') return sp.get('q') || '';
    return '';
  });

  // Sinkronkan local state jika props searchQuery berubah atau URL berubah
  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalQuery(searchQuery);
    } else if (loc.pathname === '/search') {
      setLocalQuery(sp.get('q') || '');
    }
  }, [searchQuery, loc.pathname, sp]);

  const currentVal = isControlled ? searchQuery : localQuery;

  const handleInputChange = (val) => {
    if (isControlled) {
      onSearch(val);
    } else {
      setLocalQuery(val);
    }
  };

  const handleClear = () => {
    if (isControlled) {
      onSearch('');
    } else {
      setLocalQuery('');
    }
  };

  const handleSearchSubmit = () => {
    const trimmed = (currentVal || '').trim();
    if (isControlled) {
      // Jika di Home dan dikontrol, biarkan Home yang memproses live
      setShowSearchMobile(false);
      return;
    }
    // Jika di halaman Explore / Search / lainnya, navigasi ke /search?q=...
    if (trimmed) {
      nav(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      nav('/search');
    }
    setShowSearchMobile(false);
  };

  const linkClass = ({ isActive }) =>
    isActive ? 'text-white' : 'text-zinc-300 hover:text-white transition-colors';

  const id0 = user?.identities?.[0]?.identity_data || {};
  const avatar =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    id0?.avatar_url ||
    id0?.picture ||
    null;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    id0?.full_name ||
    id0?.name ||
    user?.email?.split('@')[0] ||
    '';

  return (
    <header className="relative z-10 bg-transparent">
      <div className="max-w-7xl mx-auto px-0">
        <div className="h-14 flex items-center gap-4 sm:gap-6 w-full">
          <Link to="/" replace className="flex items-center gap-2">
            <img
              src="https://i.ibb.co.com/pB8Sj8VQ/20261015-213020.png"
              alt="Comicverse.id"
              className="h-12 sm:h-12 md:h-14 object-contain"
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Navigasi Utama */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/explore" className={linkClass}>Explore</NavLink>
            <NavLink to="/library" className={linkClass}>Library</NavLink>
            <NavLink to="/search" className={linkClass}>Search</NavLink>
          </nav>

          <div className="flex-1" />

          {/* Search Input Box + Auth */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {/* Desktop search */}
            <div className="relative w-full max-w-lg sm:max-w-xs hidden sm:block">
              <input
                value={currentVal || ''}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder="Cari Komik..."
                aria-label="Cari Komik"
                className="w-full rounded-lg bg-zinc-800/70 border border-white/10 pl-4 pr-10 py-2
                           outline-none focus:ring-2 ring-brand/40 text-sm placeholder-zinc-500"
              />
              {currentVal ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <SearchIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile search trigger button */}
            <button
              onClick={() => setShowSearchMobile(true)}
              className="sm:hidden w-9 h-9 rounded-md bg-zinc-800 grid place-items-center hover:bg-zinc-700 relative"
              aria-label="Buka pencarian"
              title="Cari"
            >
              <SearchIcon className="w-5 h-5 text-zinc-200" />
              {(currentVal || '').trim().length >= 3 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand ring-2 ring-zinc-900" />
              )}
            </button>

            {/* Auth */}
            {loading ? (
              <div className="h-9 w-9 rounded-full bg-zinc-800 animate-pulse" />
            ) : user ? (
              <button
                onClick={() => setShowProfile(true)}
                className="w-9 h-9 aspect-square rounded-full overflow-hidden ring-1 ring-white/10 shrink-0"
                title={displayName}
              >
                {avatar ? (
                  <img src={avatar} alt={displayName} className="block w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-zinc-800">
                    <User2 className="w-5 h-5 text-zinc-300" />
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="w-9 h-9 aspect-square rounded-full overflow-hidden ring-1 ring-white/10
                           bg-zinc-800 grid place-items-center hover:bg-zinc-700"
                title="Masuk"
                aria-label="Masuk"
              >
                <User2 className="w-5 h-5 text-zinc-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals via portal */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onGoogle={async () => { await signInGoogle(); setShowLogin(false); }}
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onHistory={() => { setShowProfile(false); nav('/library?tab=history'); }}
        onLogout={async () => {
          try {
            await supabase.auth.signOut();
          } finally {
            setShowProfile(false);
            nav(0);
          }
        }}
      />

      <SearchMobileModal
        open={showSearchMobile}
        onClose={() => setShowSearchMobile(false)}
        value={currentVal || ''}
        onChange={handleInputChange}
        onSubmit={handleSearchSubmit}
      />
    </header>
  );
}