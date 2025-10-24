// src/pages/Library.jsx
import { useEffect, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import Card from '../components/Card';
import HomeTopBar from '../components/HomeTopBar';
import { useAuth } from '../providers/AuthProvider';
import { getLibraryAll, removeFromLibrary, clearSection } from '../lib/library';
import { supabase } from '../lib/supabaseClient';

/* ===== Helpers ===== */
const TABS = [
  { key: 'bookmarks', label: 'Bookmark' },
  { key: 'favorites', label: 'Readlist' },
  { key: 'history',   label: 'History' },
];

// full-bleed wrapper (melebar sampai tepi viewport)
const FullBleed = ({ className = '', children }) => (
  <div className={`relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen ${className}`}>
    {children}
  </div>
);

// topbar persis seperti Home (full-bleed + blur)
const TopBar = () => (
  <FullBleed className="backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 bg-zinc-900/90">
    <div className="max-w-7xl mx-auto px-4 py-3">
      <HomeTopBar />
    </div>
  </FullBleed>
);

export default function Library() {
  const { user, loading, signInGoogle } = useAuth();
  const [tab, setTab] = useState('bookmarks');
  const [data, setData] = useState({ favorites: [], bookmarks: [], history: [] });
  const [busy, setBusy] = useState(false);

  // load awal
  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      setBusy(true);
      try {
        const all = await getLibraryAll();
        if (alive) setData(all);
      } finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [user]);

  // realtime
  useEffect(() => {
    if (!user || !supabase) return;
    const ch = supabase
      .channel('library-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'library_items', filter: `user_id=eq.${user.id}` },
        async () => {
          try { setData(await getLibraryAll()); } catch (e) { console.error('reload gagal', e); }
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user]);

  const reload = async () => {
    if (!user) return;
    setBusy(true);
    try { setData(await getLibraryAll()); } finally { setBusy(false); }
  };

  const list = data[tab] || [];

  /* ===== Render ===== */
  if (loading) {
    return (
      <div className="text-zinc-400 max-w-7xl mx-auto px-4">Memuat…</div>
    );
  }

  if (!user) {
    // Empty login state – responsif & center
    return (
      <div className="space-y-6">
        <TopBar />
        <FullBleed>
          <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 pb-[calc(56px+env(safe-area-inset-bottom,0))]">
            <img
              src="https://i.ibb.co.com/ZR4g84zj/yuracry.png"
              alt=""
              className="w-28 h-28 sm:w-40 sm:h-40 object-contain mb-5 opacity-90"
            />
            <h1 className="text-xl sm:text-2xl font-extrabold">Harus Login Nih Kak~</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-zinc-300 text-center">
              Login dulu yuk untuk melihat bookmark kamu
            </p>
            <button
              onClick={signInGoogle}
              className="mt-5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-brand text-white font-semibold shadow hover:opacity-95"
            >
              Login
            </button>
          </div>
        </FullBleed>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TopBar />

      {/* Header + Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3">
          <SectionHeader title="Library" />
        </div>

        {/* Tabs: scrollable di mobile */}
        <div className="mt-3 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-xl text-sm font-medium shrink-0 transition
                  ${tab === t.key
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={reload}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Konten: full-bleed supaya bebas kiri-kanan; ada padding bawah untuk BottomBar */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
          {busy ? (
            <div className="text-zinc-400">Memuat…</div>
          ) : list.length === 0 ? (
            <EmptyState tab={tab} />
          ) : tab !== 'history' ? (
            // GRID RESPONSIF
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {list.map((it) => (
                <div key={it.slug} className="group relative">
                  <Card item={it} />
                  <button
                    onClick={async () => { await removeFromLibrary(tab, it.slug); await reload(); }}
                    className="absolute top-2 right-2 text-xs bg-zinc-900/80 border border-white/10 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // LIST RESPONSIF (lebih ringkas di mobile)
            <div className="space-y-2 sm:space-y-3">
              {list.map((it) => (
                <div
                  key={it.slug}
                  className="p-2 sm:p-3 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 flex gap-2 sm:gap-3"
                >
                  <img
                    src={it.cover}
                    alt={it.title}
                    className="w-16 h-22 sm:w-20 sm:h-28 object-cover rounded-lg"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold line-clamp-1 text-sm sm:text-base">{it.title}</div>
                    {it.updatedAt && (
                      <div className="text-[11px] sm:text-xs text-zinc-400">{it.updatedAt}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => { await removeFromLibrary('history', it.slug); await reload(); }}
                    className="ml-auto text-[11px] sm:text-xs bg-zinc-700 rounded px-2 py-1 h-fit self-center"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {list.length > 0 && (
            <div className="pt-3">
              <button
                onClick={async () => { await clearSection(tab); await reload(); }}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded px-3 py-1"
              >
                Bersihkan {TABS.find((t) => t.key === tab)?.label}
              </button>
            </div>
          )}
        </div>
      </FullBleed>
    </div>
  );
}

/* ===== Empty states ===== */
function EmptyState({ tab }) {
  const map = {
    favorites: 'Belum ada di Readlist.',
    bookmarks: 'Belum ada Bookmark.',
    history:   'Belum ada riwayat baca.',
  };
  return (
    <div className="min-h-[32vh] rounded-2xl bg-zinc-900/50 border border-white/10 p-6 sm:p-8 text-zinc-300
                    flex flex-col items-center justify-center text-center">
      <img
        src="https://i.ibb.co.com/ZR4g84zj/yuracry.png"
        alt=""
        className="w-20 h-20 sm:w-28 sm:h-28 object-contain mb-4 opacity-90"
      />
      <div className="text-sm sm:text-base">{map[tab] || 'Kosong.'}</div>
    </div>
  );
}
