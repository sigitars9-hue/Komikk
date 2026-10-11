// src/pages/Search.jsx
import { useEffect, useState } from 'react';
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

const useDebounce = (value, ms = 350) => {
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
  const currentGenre = sp.get('genre') || '';

  // UI state
  const [view, setView] = useState(sp.get('view') === 'list' ? 'list' : 'grid');
  const [sort, setSort] = useState(sp.get('sort') || 'latest');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState('genre');

  // Input & Debounce
  const [input, setInput] = useState(qParam);
  const debouncedInput = useDebounce(input, 350);

  // Data & Status
  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* 1. Ambil list genre */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const g = await fetchGenres();
        const names = Array.isArray(g)
          ? g.map(x => (typeof x === 'string' ? x : x?.name || x?.title)).filter(Boolean)
          : [];
        if (alive) setGenres(names);
      } catch {
        if (alive) setGenres([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* 2. Sinkronkan input ke URL saat >= 3 huruf */
  useEffect(() => {
    const trimmed = debouncedInput.trim();
    const currQ = sp.get('q') || '';

    if (trimmed.length >= 3) {
      if (currQ !== trimmed) {
        const next = new URLSearchParams(sp);
        next.set('q', trimmed);
        setSp(next, { replace: true });
      }
    } else if (trimmed.length === 0 && currQ !== '') {
      const next = new URLSearchParams(sp);
      next.delete('q');
      setSp(next, { replace: true });
    }
  }, [debouncedInput, sp, setSp]);

  /* 3. Fetch data komik */
  useEffect(() => {
    let alive = true;
    const q = (sp.get('q') || '').trim();
    const genre = (sp.get('genre') || '').trim();

    setLoading(true);
    setError('');

    (async () => {
      try {
        let result = [];
        if (q.length >= 3) {
          result = await searchSeries(q);
        } else if (genre) {
          result = await fetchByGenre(genre, 1, 30);
        } else {
          result = await fetchLatest(1, 24);
        }

        result = Array.isArray(result) ? [...result] : [];

        if (sort === 'az') {
          result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sort === 'za') {
          result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        } else if (sort === 'updated') {
          result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        }

        if (alive) setItems(result);
      } catch (err) {
        console.error(err);
        if (alive) setError('Gagal memuat daftar komik.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [sp, sort]);

  const selectGenre = (genreName) => {
    const nextParams = new URLSearchParams(sp);
    if (currentGenre.toLowerCase() === genreName.toLowerCase()) {
      nextParams.delete('genre');
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

  const handleClear = () => {
    setInput('');
    const next = new URLSearchParams(sp);
    next.delete('q');
    setSp(next, { replace: true });
  };

  const GenreFilter = () => (
    <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10">
      <button
        type="button"
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
                  type="button"
                  onClick={() => selectGenre(g)}
                  className={`px-3 py-1 rounded-xl text-xs md:text-sm transition ${
                    active
                      ? 'bg-blue-600 text-white font-medium ring-1 ring-blue-400'
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
              <span className="text-xs text-blue-400">
                Genre: <strong>{currentGenre}</strong>
              </span>
              <button
                type="button"
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
      {/* TopBar bersih, tanpa bungkus ekstra yang aneh */}
      <HomeTopBar searchQuery={input} onSearch={setInput} />

      {/* Konten Halaman Search */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <SectionHeader
              title={
                input.trim().length >= 3
                  ? `Hasil Pencarian: "${input.trim()}"`
                  : currentGenre
                  ? `Genre: ${currentGenre}`
                  : "Pencarian"
              }
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="sm:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                <Filter className="w-4 h-4" /> Filter Genre
              </button>

              {/* Input Box Utama di Halaman */}
              <div className="relative flex-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-800 ring-1 ring-white/10">
                  <SearchIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ketik judul komik (min. 3 huruf)…"
                    className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500 text-sm md:text-base"
                  />
                  {input && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-zinc-400 hover:text-zinc-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* View & Sort */}
              <div className="hidden sm:flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`px-3 py-2 rounded-xl transition ${
                    view === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                  title="Grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`px-3 py-2 rounded-xl transition ${
                    view === 'list'
                      ? 'bg-blue-600 text-white'
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

      {/* Hasil Data Komik */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-[260px_minmax(0,1fr)] gap-6">
            <aside className="hidden sm:block">
              <div className="sticky top-20 space-y-4">
                <GenreFilter />
              </div>
            </aside>

            <section className="min-w-0">
              {loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-zinc-900/80 ring-1 ring-white/10 aspect-[130/200]" />
                  ))}
                </div>
              )}
              {error && <div className="text-red-400 py-6">{error}</div>}
              {!loading && !error && items.length === 0 && (
                <div className="text-zinc-400 py-16 text-center bg-zinc-900/40 rounded-2xl ring-1 ring-white/5">
                  Tidak ada komik yang ditemukan.
                </div>
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
                            <div className="text-xs text-blue-400 mt-1">{it.badge}</div>
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
                type="button"
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