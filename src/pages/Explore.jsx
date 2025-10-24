// src/pages/Explore.jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchLatest, fetchGenres, fetchByGenre } from '../lib/api';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import Pagination from '../components/Pagination';
import HomeTopBar from '../components/HomeTopBar';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Autoplay,
  Navigation,
  Pagination as SwiperPagination,
  EffectFade,
  Parallax,
  Keyboard
} from 'swiper/modules';

/* ───── Helpers ───── */
const fmtAge = (iso) => {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const ms = Math.max(0, now - d);
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
};

// chip warna untuk type
const TypeChip = ({ type }) => {
  const t = (type || '').toLowerCase();
  let cls = 'bg-zinc-800 text-white'; // default
  if (t === 'manga')   cls = 'bg-black text-white';
  if (t === 'manhwa')  cls = 'bg-blue-600 text-white';
  if (t === 'manhua')  cls = 'bg-red-600 text-yellow-300';
  return <span className={`text-[11px] px-2 py-0.5 rounded-md ${cls}`}>{type}</span>;
};

// Framing helper: samakan gutter/lebar seperti Home
const WRAP =
  'mx-auto w-full max-w-[1420px] [--pad:clamp(14px,3.5vw,28px)] px-[var(--pad)]';

/* ======================= PAGE ======================= */
export default function Explore() {
  const [sp, setSp] = useSearchParams();

  const urlGenre = sp.get('genre') || '';
  const urlPage  = Number(sp.get('page') || 1);
  const urlView  = sp.get('view') || 'grid';
  const urlTab   = sp.get('tab') || 'reco';

  const [genres, setGenres]   = useState([]);
  const [active, setActive]   = useState(urlGenre);
  const [page, setPage]       = useState(Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1);
  const [view, setView]       = useState(urlView === 'list' ? 'list' : 'grid'); // 'grid'|'list'
  const [tab, setTab]         = useState(urlTab === 'admin' ? 'admin' : 'reco'); // 'reco'|'admin'
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // panel genre
  const [openFilter, setOpenFilter] = useState(false);

  /* sinkron URL (back/forward) */
  useEffect(() => {
    const g = sp.get('genre') || '';
    const p = Number(sp.get('page') || 1) || 1;
    const v = sp.get('view') || 'grid';
    const t = sp.get('tab') || 'reco';
    setActive(prev => (prev !== g ? g : prev));
    setPage(prev => (prev !== p ? p : prev));
    setView(prev => (prev !== v ? (v === 'list' ? 'list' : 'grid') : prev));
    setTab(prev => (prev !== t ? (t === 'admin' ? 'admin' : 'reco') : prev));
  }, [sp]);

  /* genres */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const g = await fetchGenres();
        const names = Array.isArray(g)
          ? g.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean)
          : [];
        if (live) setGenres(names);
      } catch {
        if (live) setGenres([]);
      }
    })();
    return () => { live = false; };
  }, []);

  /* data */
  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setItems([]);

    (async () => {
      try {
        const data = active ? await fetchByGenre(active, page) : await fetchLatest(page);
        let arr = Array.isArray(data) ? data : [];
        if (tab === 'admin') {
          arr = [...arr].sort((a, b) => {
            const w = (t) => (t === 'UP' || t === 'New') ? -1 : 0;
            return w(a?.badge) - w(b?.badge);
          });
        }
        if (live) setItems(arr);
      } catch (e) {
        console.error(e);
        if (live) setError('Gagal memuat data.');
      } finally {
        if (live) setLoading(false);
      }
    })();

    const next = new URLSearchParams();
    if (active) next.set('genre', active);
    if (page > 1) next.set('page', String(page));
    if (view !== 'grid') next.set('view', view);
    if (tab !== 'reco') next.set('tab', tab);
    setSp(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, page, tab]);

  const onPickGenre = (g) => { setActive(g); setPage(1); };

  /* ───── UI ───── */

  const Tabs = () => (
    <div className="flex gap-2 sm:gap-3">
      <button
        onClick={() => setTab('reco')}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition
        ${tab==='reco'
          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
        Rekomendasi
      </button>
      <button
        onClick={() => setTab('admin')}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition
        ${tab==='admin'
          ? 'bg-zinc-700 text-white'
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
        Pilihan Admin
      </button>
    </div>
  );

  // ===== HERO SLIDER (bleed ke tepi container) =====
  const heroItems = useMemo(() => items.slice(0, 8), [items]);

  const HeroSlider = () => (
    <div
      className="
        -mx-[var(--pad)] md:mx-0
        rounded-none md:rounded-3xl
        overflow-hidden ring-0 md:ring-1 md:ring-white/10
        shadow-none md:shadow-[0_10px_30px_rgba(0,0,0,.25)]
      "
    >
      <Swiper
        key={heroItems.length}
        modules={[Autoplay, Navigation, SwiperPagination, EffectFade, Parallax, Keyboard]}
        loop
        effect="fade"
        speed={900}
        keyboard={{ enabled: true }}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        navigation
        pagination={{ clickable: true }}
        parallax
        observer
        observeParents
        watchSlidesProgress
        className="w-full h-[54vw] sm:h-[38vw] lg:h-[460px] bg-zinc-900"
      >
        {heroItems.map((it, idx) => (
          <SwiperSlide key={`hero-${idx}`}>
            <Link to={`/series/${it.slug || it.id}`} className="block relative w-full h-full">
              <img
                data-swiper-parallax="-15%"
                src={it.backdrop || it.cover}
                alt={it.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/0" />
              <div
                data-swiper-parallax="-100"
                className="absolute left-[var(--pad)] bottom-8 sm:bottom-12 max-w-[min(720px,70%)] pr-[var(--pad)]"
              >
                <h3 className="text-white font-extrabold text-2xl sm:text-4xl leading-tight drop-shadow">
                  {it.title}
                </h3>
                {it.description && (
                  <p className="mt-2 text-zinc-200/90 line-clamp-2 sm:line-clamp-3">
                    {it.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {it.type && <TypeChip type={it.type} />}
                  {it.badge && (
                    <span className="text-xs px-2 py-1 rounded-md bg-orange-500 text-white">
                      {it.badge}
                    </span>
                  )}
                  {it.updatedAt && (
                    <span className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-200">
                      {fmtAge(it.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );

  // ===== Poster list/grid (dengan chip Type) =====
  const PosterGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map(it => (
        <div key={it.slug || it.id} className="relative">
          {it.updatedAt && (
            <div className="absolute left-2 top-2 z-10 text-[11px] px-1.5 py-0.5 rounded-md bg-black/70 text-white">
              {fmtAge(it.updatedAt)}
            </div>
          )}
          {it.type && (
            <div className="absolute right-2 top-2 z-10">
              <TypeChip type={it.type} />
            </div>
          )}
          <Card item={it} />
        </div>
      ))}
    </div>
  );

  const PosterList = () => (
    <div className="space-y-3">
      {items.map(it => (
        <Link
          key={it.slug || it.id}
          to={`/series/${it.slug || it.id}`}
          className="p-3 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 flex gap-3 hover:bg-zinc-800 transition"
        >
          <div className="relative">
            <img src={it.cover} alt={it.title} className="w-20 h-28 object-cover rounded-lg" />
            {it.updatedAt && (
              <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 rounded bg-black/70 text-white">
                {fmtAge(it.updatedAt)}
              </div>
            )}
            {it.type && (
              <div className="absolute right-1 top-1">
                <TypeChip type={it.type} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold line-clamp-1">{it.title}</div>
            {it.updatedAt && (
              <div className="text-xs text-zinc-400 mt-0.5">Updated {fmtAge(it.updatedAt)} ago</div>
            )}
            {it.badge && (
              <div className="mt-1 text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/20">
                {it.badge}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );

  /* ───── Render ───── */
  return (
    <div className="space-y-8">
      {/* Top bar lokal ala Home */}
      <div className={WRAP}>
        <HomeTopBar />
      </div>

      {/* Hero slider — full bleed di mobile, rounding di ≥md */}
      <div className={WRAP}>
        {!loading && !error && <HeroSlider />}
      </div>

      {/* Konten utama */}
      <div className={WRAP}>
        {/* Header + Tabs + Controls kanan */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SectionHeader title="Explore" />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpenFilter(v => !v)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              Filter Genre
            </button>
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 rounded-lg ${view==='grid'
                  ? 'bg-violet-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
                ▦ Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-lg ${view==='list'
                  ? 'bg-violet-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
                ▤ List
              </button>
            </div>
            <Tabs />
          </div>
        </div>

        {/* Panel filter genre */}
        {openFilter && (
          <div className="mt-4 rounded-2xl ring-1 ring-white/10 bg-zinc-900/60 p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onPickGenre('')}
                className={`px-3 py-1 rounded-xl transition
                  ${!active ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
                Semua
              </button>
              {genres.map(g => (
                <button key={g}
                  onClick={() => onPickGenre(g)}
                  className={`px-3 py-1 rounded-xl transition
                    ${active===g ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        {loading && <div className="mt-6 text-zinc-400">Memuat…</div>}
        {error && <div className="mt-6 text-red-400">{error}</div>}

        {/* Isi */}
        {!loading && !error && (
          <div className="mt-6">
            {items.length
              ? (view === 'grid' ? <PosterGrid /> : <PosterList />)
              : <div className="text-zinc-400">Tidak ada data.</div>}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6">
          <Pagination page={page} setPage={(p) => setPage(Math.max(1, Number(p) || 1))} />
        </div>
      </div>
    </div>
  );
}
