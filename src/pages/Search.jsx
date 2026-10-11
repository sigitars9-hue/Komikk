// src/pages/Search.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchSeries, fetchLatest, fetchGenres, fetchByGenre } from '../lib/api';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import HomeTopBar from '../components/HomeTopBar';

// Icons (lucide-react)
import { Grid3X3, Rows, Filter, Search as SearchIcon, ChevronDown, X } from 'lucide-react';

/* ================= Helpers ================= */

const FullBleed = ({ className = '', children }) => (
  <div className={`relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen ${className}`}>
    {children}
  </div>
);

const TopBar = () => (
  <FullBleed className="backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 bg-zinc-900/90">
    <div className="max-w-7xl mx-auto px-4 py-3">
      <HomeTopBar />
    </div>
  </FullBleed>
);

const useDebounce = (value, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

/* ================= Page ================= */
export default function Search() {
  const [sp, setSp] = useSearchParams();

  // URL state
  const qParam = sp.get('q') || '';
  const currentGenre = sp.get('genre') || ''; // single genre filter server-side

  // UI state
  const [view, setView] = useState(sp.get('view') === 'list' ? 'list' : 'grid');
  const [sort, setSort] = useState(sp.get('sort') || 'latest');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState('genre');

  // Input & Debounce
  const [input, setInput] = useState(qParam);
  const debouncedInput = useDebounce(input, 300);

  // Suggestions & Data
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sugBoxRef = useRef(null);

  /* ----- 1. Load list genre dari API ----- */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const g = await fetchGenres();
        const names = Array.isArray(g)
          ? g.map(x => (typeof x === 'string' ? x : x?.name || x?.title)).filter(Boolean)
          : [];
        if (live) setGenres(names);
      } catch {
        if (live) setGenres([]);
      }
    })();
    return () => { live = false; };
  }, []);

  /* ----- 2. Sinkronkan input (minimal 3 huruf) ke URL ----- */
  useEffect(() => {
    const trimmed = debouncedInput.trim();
    const currentQ = sp.get('q') || '';

    if (trimmed.length >= 3) {
      if (currentQ !== trimmed) {
        const nextParams = new URLSearchParams(sp);
        nextParams.set('q', trimmed);
        setSp(nextParams, { replace: true });
      }
    } else if (trimmed.length === 0 && currentQ !== '') {
      const nextParams = new URLSearchParams(sp);
      nextParams.delete('q');
      setSp(nextParams, { replace: true });
    }
  }, [debouncedInput, sp, setSp]);

  /* ----- 3. Live Suggestions Box (3+ huruf) ----- */
  useEffect(() => {
    let live = true;
    const term = debouncedInput.trim();

    if (term.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    (async () => {
      try {
        const pool = await searchSeries(term);
        if (!live) return;
        const s = term.toLowerCase();
        const list = (pool || [])
          .map(it => ({ title: it.title, slug: it.slug || it.id }))
          .filter(x => (x.title || '').toLowerCase().includes(s))
          .slice(0, 8);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        if (live) setSuggestions([]);
      }
    })();

    return () => { live = false; };
  }, [debouncedInput]);

  /* ----- 4. Fetch Results Utama (Sesuai Genre API atau Search) ----- */
  useEffect(() => {
    let live = true;
    const q = (sp.get('q') || '').trim();
    const genre = (sp.get('genre') || '').trim();

    setLoading(true);
    setError('');

    (async () => {
      try {
        let result = [];

        if (genre && !q) {
          // Cari berdasarkan GENRE langsung lewat server API
          result = await fetchByGenre(genre, 1, 30);
        } else if (q.length >= 3) {
          // Cari berdasarkan JUDUL
          result = await searchSeries(q);
        } else if (genre && q.length > 0 && q.length < 3) {
          // Jika ada genre tapi input baru 1-2 huruf, tetap ambil genre dulu
          result = await fetchByGenre(genre, 1, 30);
        } else {
          // Default: Ambil komik terbaru
          result = await fetchLatest(1, 24);
        }

        result = Array.isArray(result) ? [...result] : [];

        // Sorting
        if (sort === 'az') {
          result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sort === 'za') {
          result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        } else if (sort === 'updated') {
          result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        }

        if (live) setItems(result);
      } catch (err) {
        console.error(err);
        if (live) setError('Gagal memuat daftar komik.');
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => { live = false; };
  }, [sp, sort]);

  /* ----- Handler Pilih Genre ----- */
  const selectGenre = (genreName) => {
    const nextParams = new URLSearchParams(sp);
    if (currentGenre.toLowerCase() === genreName.toLowerCase()) {
      nextParams.delete('genre'); // batalkan pilihan jika diklik ulang
    } else {
      nextParams.set('genre', genreName);
    }
    setSp(nextParams, { replace: true });
    setDrawerOpen(false);
  };

  const clearGenre = () => {
    const nextParams = new URLSearchParams(sp);
    nextParams.delete('genre');
    setSp(nextParams, { replace: true });
  };

  const submitSearchImmediate = (title) => {
    const target = (title ?? input).trim();
    setInput(target);
    setShowSuggestions(false);
    const nextParams = new URLSearchParams(sp);
    if (target.length >= 3) {
      nextParams.set('q', target);
    } else if (target.length === 0) {
      nextParams.delete('q');
    }
    setSp(nextParams, { replace: true });
  };

  /* ----- Komponen Filter Genre ----- */
  const GenreFilter = () => (
    <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10">
      <button
        onClick={() => setOpenSection(prev => (prev === 'genre' ? '' : 'genre'))}
        className="w-full flex items-center justify-between px-3 py-2 font-semibold text-zinc-200"
      >
        <span>Pilih Genre</span>
        <ChevronDown className={`w-4 h-4 transition ${openSection === 'genre' ? 'rotate-180' : ''}`} />
      </button>

      {openSection === 'genre' && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-2 max-h-[360px] overflow-y-auto pr-1">
            {genres.map(g => {
              const active = currentGenre.toLowerCase() === g.toLowerCase();
              return (
                <button
                  key={g}
                  onClick={() => selectGenre(g)}
                  className={`px-3 py-1 rounded-xl text-xs md:text-sm transition ${
                    active
                      ? 'bg-violet-600 text-white font-medium ring-1 ring-violet-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {currentGenre && (
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs text-violet-400">
                Genre: <strong>{currentGenre}</strong>
              </span>
              <button
                onClick={clearGenre}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <TopBar />

      {/* Header + Search Bar */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <SectionHeader title={currentGenre ? `Genre: ${currentGenre}` : "Pencarian"} />

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="sm:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                <Filter className="w-4 h-4" /> Filter Genre
              </button>

              {/* Input Box */}
              <div className="relative flex-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-800 ring-1 ring-white/10">
                  <SearchIcon className="w-4 h-4 text-zinc-400" />
                  <input
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitSearchImmediate();
                    }}
                    placeholder="Cari komik (min. 3 huruf)…"
                    className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500 text-sm md:text-base"
                  />
                  {input && (
                    <button
                      onClick={() => {
                        setInput('');
                        submitSearchImmediate('');
                      }}
                      className="text-zinc-400 hover:text-zinc-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => submitSearchImmediate()}
                    className="px-3 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm transition shrink-0"
                  >
                    Cari
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={sugBoxRef}
                    className="absolute z-30 mt-2 w-full rounded-2xl overflow-hidden ring-1 ring-white/10 bg-zinc-900/95 backdrop-blur shadow-xl"
                  >
                    {suggestions.map(s => (
                      <button
                        key={s.slug || s.title}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          submitSearchImmediate(s.title);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-zinc-200 text-sm transition"
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View & Sort */}
              <div className="hidden sm:flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-2 rounded-xl transition ${
                    view === 'grid'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                  title="Grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-2 rounded-xl transition ${
                    view === 'list'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                  title="List"
                >
                  <Rows className="w-4 h-4" />
                </button>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-200 ring-1 ring-white/5 outline-none text-sm cursor-pointer"
                >
                  <option value="latest">Terbaru</option>
                  <option value="updated">Update Terakhir</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </FullBleed>

      {/* Main Content */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-[260px_minmax(0,1fr)] gap-6">
            {/* Sidebar Desktop */}
            <aside className="hidden sm:block">
              <div className="sticky top-20 space-y-4">
                <GenreFilter />
              </div>
            </aside>

            {/* Area Hasil */}
            <section className="min-w-0">
              {loading && <div className="text-zinc-400 py-6">Memuat komik…</div>}
              {error && <div className="text-red-400 py-6">{error}</div>}
              {!loading && !error && items.length === 0 && (
                <div className="text-zinc-400 py-6">Tidak ada komik yang ditemukan.</div>
              )}

              {!loading && items.length > 0 && (
                view === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(it => (
                      <Card key={it.slug || it.id} item={it} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map(it => (
                      <Link
                        key={it.slug || it.id}
                        to={`/series/${it.slug || it.id}`}
                        className="p-3 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 flex gap-4 hover:bg-zinc-800 transition"
                      >
                        <img
                          src={it.cover || it.thumbnail}
                          alt={it.title}
                          className="w-16 h-24 md:w-20 md:h-28 object-cover rounded-xl bg-zinc-900 shrink-0"
                        />
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="font-semibold text-zinc-100 line-clamp-1 text-sm md:text-base">
                            {it.title}
                          </div>
                          {it.badge && (
                            <div className="text-xs text-violet-400 mt-1">
                              {it.badge}
                            </div>
                          )}
                          {it.updatedAt && (
                            <div className="text-xs text-zinc-400 mt-1">{it.updatedAt}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              )}
            </section>
          </div>
        </div>
      </FullBleed>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] bg-zinc-900 ring-1 ring-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-bold text-zinc-100">Filter Genre</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-sm"
              >
                Tutup
              </button>
            </div>
            <GenreFilter />
          </div>
        </div>
      )}
    </div>
  );
}