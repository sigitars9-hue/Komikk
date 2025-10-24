// src/pages/Search.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchSeries, fetchLatest, fetchGenres } from '../lib/api';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import HomeTopBar from '../components/HomeTopBar';

// Icons (lucide-react)
import { Grid3X3, Rows, Filter, Search as SearchIcon, ChevronDown } from 'lucide-react';

/* ================= Helpers ================= */

// Full-bleed wrapper biar konten bisa melebar ke tepi kiri/kanan seperti Home
const FullBleed = ({ className = '', children }) => (
  <div className={`relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen ${className}`}>
    {children}
  </div>
);

// Top bar (sama dengan Home)
const TopBar = () => (
  <FullBleed className="backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 bg-zinc-900/90">
    <div className="max-w-7xl mx-auto px-4 py-3">
      <HomeTopBar />
    </div>
  </FullBleed>
);

// Debounce untuk input
const useDebounce = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

// Normalisasi genre dari berbagai bentuk field
function extractGenres(item) {
  const raw =
    item.genres ??
    item.genre ??
    item.tags ??
    item.categories ??
    item.metadata?.genres ??
    item.genre_string ??
    [];

  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
  } else if (typeof raw === 'string') {
    arr = raw.split(/[,/|]+/);
  }
  return arr.map(s => (s || '').toString().trim().toLowerCase()).filter(Boolean);
}

// Opsional: alias bahasa ID -> EN jika dataset bercampur
const GENRE_ALIAS = {
  aksi: 'action',
  komedi: 'comedy',
  fantasi: 'fantasy',
  petualangan: 'adventure',
  sejarah: 'historical',
  olah_raga: 'sports',
  olahraga: 'sports',
};

/* ================= Page ================= */
export default function Search() {
  const [sp, setSp] = useSearchParams();

  // URL params
  const qParam = (sp.get('q') || '').trim();
  const urlGenres = (sp.get('genres') || '').split(',').filter(Boolean);

  // UI state
  const [view, setView] = useState(sp.get('view') === 'list' ? 'list' : 'grid'); // grid|list
  const [sort, setSort] = useState(sp.get('sort') || 'latest'); // latest|updated|az|za
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState('genre'); // single-open

  // Search box + suggestions
  const [input, setInput] = useState(qParam);
  const debounced = useDebounce(input, 250);
  const [suggestions, setSuggestions] = useState([]);
  const sugBoxRef = useRef(null);

  // Data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Genre options + picked (pakai value lowercase untuk konsistensi)
  const [genres, setGenres] = useState([]); // [{label, value}]
  const [pickedGenres, setPickedGenres] = useState(urlGenres.map(x => x.toLowerCase().trim()));

  /* ----- Load genres sekali ----- */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const g = await fetchGenres();
        const names = Array.isArray(g)
          ? g.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean)
          : [];
        const mapped = names.map(n => ({ label: n, value: n.toLowerCase().trim() }));
        live && setGenres(mapped);
      } catch {
        live && setGenres([]);
      }
    })();
    return () => { live = false; };
  }, []);

  /* ----- Suggestions (judul saja) ----- */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!debounced) { live && setSuggestions([]); return; }
        // Coba dari API pencarian; fallback ke latest
        let pool = await searchSeries(debounced);
        if (!pool || pool.length === 0) pool = await fetchLatest(1);
        const s = debounced.toLowerCase();
        const names = (pool || [])
          .map(it => ({ title: it.title, slug: it.slug }))
          .filter(x => (x.title || '').toLowerCase().includes(s))
          .slice(0, 8);
        live && setSuggestions(names);
      } catch {
        live && setSuggestions([]);
      }
    })();
    return () => { live = false; };
  }, [debounced]);

  /* ----- Fetch results (nama + genre) ----- */
  useEffect(() => {
    let live = true;

    const q = (sp.get('q') || '').trim();
    const g = (sp.get('genres') || '')
      .split(',')
      .filter(Boolean)
      .map(x => (GENRE_ALIAS[x.toLowerCase().trim()] ?? x.toLowerCase().trim()));

    setLoading(true); setError(''); setItems([]);

    (async () => {
      try {
        let r = [];
        if (q) r = await searchSeries(q);
        else r = await fetchLatest(1);
        r = Array.isArray(r) ? r : [];

        if (g.length) {
          r = r.filter(it => {
            const have = new Set(extractGenres(it)); // lowercase normalized
            return g.some(w => have.has(w));
          });
        }

        // Sort
        if (sort === 'az') r.sort((a,b) => (a.title||'').localeCompare(b.title||''));
        else if (sort === 'za') r.sort((a,b) => (b.title||'').localeCompare(a.title||''));
        else if (sort === 'updated') r.sort((a,b) => (new Date(b.updatedAt||0)) - (new Date(a.updatedAt||0)));

        live && setItems(r);
      } catch (e) {
        console.error(e);
        live && setError('Gagal memuat hasil.');
      } finally {
        live && setLoading(false);
      }
    })();

    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, sort]);

  /* ----- Sync URL saat view/sort/genres berubah ----- */
  useEffect(() => {
    const params = new URLSearchParams(sp);
    view !== 'grid' ? params.set('view', view) : params.delete('view');
    sort !== 'latest' ? params.set('sort', sort) : params.delete('sort');
    pickedGenres.length ? params.set('genres', pickedGenres.join(',')) : params.delete('genres');
    setSp(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sort, pickedGenres]);

  const submitSearch = (name) => {
    const val = (name ?? input ?? '').trim();
    const params = new URLSearchParams(sp);
    val ? params.set('q', val) : params.delete('q');
    setSp(params, { replace: true });
    setSuggestions([]);
  };

  /* ----- Sidebar (single-open) ----- */
  const Section = ({ id, title, children }) => (
    <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10">
      <button
        onClick={() => setOpenSection(prev => (prev === id ? '' : id))}
        className="w-full flex items-center justify-between px-3 py-2 font-semibold"
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition ${openSection === id ? 'rotate-180' : ''}`} />
      </button>
      {openSection === id && <div className="px-3 pb-3">{children}</div>}
    </div>
  );

  const GenreFilter = () => (
    <Section id="genre" title="Genre">
      <div className="flex flex-wrap gap-2">
        {genres.map(g => {
          const active = pickedGenres.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() =>
                setPickedGenres(prev =>
                  active ? prev.filter(x => x !== g.value) : [...prev, g.value]
                )
              }
              className={`px-3 py-1 rounded-xl text-sm transition ${
                active ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      {!!pickedGenres.length && (
        <div className="mt-3">
          <button
            onClick={() => setPickedGenres([])}
            className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Hapus semua
          </button>
        </div>
      )}
    </Section>
  );

  /* ================= Render ================= */
  return (
    <div className="space-y-6">
      <TopBar />

      {/* Header + Search (full-bleed) */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <SectionHeader title="Pencarian" />

            <div className="mt-3 flex items-center gap-2">
              {/* Mobile: tombol filter */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="sm:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700"
              >
                <Filter className="w-4 h-4" /> Filter
              </button>

              {/* Kolom cari + saran */}
              <div className="relative flex-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-800 ring-1 ring-white/10">
                  <SearchIcon className="w-4 h-4 text-zinc-400" />
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                    placeholder="Cari judul komik…"
                    className="w-full bg-transparent outline-none"
                  />
                  <button
                    onClick={() => submitSearch()}
                    className="px-3 py-1 rounded-xl bg-violet-500 text-white text-sm"
                  >
                    Cari
                  </button>
                </div>

                {suggestions.length > 0 && (
                  <div
                    ref={sugBoxRef}
                    className="absolute z-30 mt-2 w-full rounded-2xl overflow-hidden ring-1 ring-white/10 bg-zinc-900/95 backdrop-blur"
                  >
                    {suggestions.map(s => (
                      <button
                        key={s.slug || s.title}
                        onMouseDown={(e) => { e.preventDefault(); submitSearch(s.title); }}
                        className="w-full text-left px-4 py-2 hover:bg-zinc-800"
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View & Sort (desktop) */}
              <div className="hidden sm:flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-2 rounded-xl ${view==='grid' ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
                  title="Tampilan grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-2 rounded-xl ${view==='list' ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
                  title="Tampilan list"
                >
                  <Rows className="w-4 h-4" />
                </button>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-100 outline-none"
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

      {/* Layout: Sidebar + Results (full-bleed & responsif) */}
      <FullBleed>
        <div className="px-4 sm:px-6 lg:px-10 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
          <div className="grid grid-cols-1 sm:grid-cols-[280px_minmax(0,1fr)] gap-4">
            {/* Sidebar (desktop) */}
            <aside className="hidden sm:block">
              <div className="sticky top-20 space-y-3">
                <GenreFilter />
              </div>
            </aside>

            {/* Results */}
            <section>
              {loading && <div className="text-zinc-400">Mencari…</div>}
              {error && <div className="text-red-400">{error}</div>}
              {!loading && !error && items.length === 0 && (
                <div className="text-zinc-400">Tidak ada hasil.</div>
              )}

              {view === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
                  {items.map(it => <Card key={it.slug || it.id} item={it} />)}
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {items.map(it => (
                    <Link
                      key={it.slug || it.id}
                      to={`/series/${it.slug || it.id}`}
                      className="p-2 md:p-3 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 flex gap-2 md:gap-3 hover:bg-zinc-800 transition"
                    >
                      <img
                        src={it.cover}
                        alt={it.title}
                        className="w-16 h-22 md:w-20 md:h-28 object-cover rounded-lg"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold line-clamp-1 text-sm md:text-base">{it.title}</div>
                        {it.updatedAt && <div className="text-[11px] md:text-xs text-zinc-400 mt-0.5">{it.updatedAt}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </FullBleed>

      {/* Drawer filter (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-zinc-900 ring-1 ring-white/10 p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-extrabold">Filter</div>
              <button onClick={() => setDrawerOpen(false)} className="px-2 py-1 rounded bg-zinc-800">Tutup</button>
            </div>
            <GenreFilter />
          </div>
        </div>
      )}
    </div>
  );
}
