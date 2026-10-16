
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  fetchLatest,
  fetchGenres,
  fetchByGenre,
  fetchSearch,
} from '../lib/api';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import Pagination from '../components/Pagination';
import HomeTopBar from '../components/HomeTopBar';
import { Eye } from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Autoplay,
  Navigation,
  Pagination as SwiperPagination,
  EffectFade,
  Parallax,
  Keyboard,
} from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import './Explore.css';

/* ======================== UTILITIES ======================== */

const CORNERS = [
  { key: 'all', label: 'All' },
  { key: 'male', label: 'Male Corner' },
  { key: 'female', label: 'Female Corner' },
];

const THEME = {
  all: {
    accent: '#2563eb',
    dark: '#1d4ed8',
    light: '#60a5fa',
    ring: '#3b82f6',
  },
  male: {
    accent: '#4f46e5',
    dark: '#4338ca',
    light: '#818cf8',
    ring: '#6366f1',
  },
  female: {
    accent: '#c026d3',
    dark: '#a21caf',
    light: '#e879f9',
    ring: '#d946ef',
  },
};

const normalizeText = (value) =>
  String(value ?? '').trim().toLowerCase();

const getLabels = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string') return [item];

        if (item && typeof item === 'object') {
          return [item.name, item.slug, item.title].filter(Boolean);
        }

        return [];
      })
      .map(normalizeText)
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/|]+/)
      .map(normalizeText)
      .filter(Boolean);
  }

  return [];
};

const getSeriesLabels = (item) => [
  ...getLabels(item?.genres),
  ...getLabels(item?.genre),
  ...getLabels(item?.tags),
  ...getLabels(item?.categories),
  ...getLabels(item?.keywords),
  ...getLabels(item?.metadata?.genres),
];

const matchesCorner = (item, corner) => {
  if (corner === 'all') return true;

  const labels = getSeriesLabels(item);

  if (corner === 'male') {
    return labels.includes('male mc');
  }

  if (corner === 'female') {
    return labels.includes('female mc');
  }

  return true;
};

const matchesGenre = (item, genre) => {
  if (!genre) return true;

  const selected = normalizeText(genre);
  return getSeriesLabels(item).includes(selected);
};

const fmtAge = (iso) => {
  if (!iso) return '';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.floor(
    Math.max(0, Date.now() - date.getTime()) / 60000
  );

  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  return `${Math.floor(months / 12)}y`;
};

const formatCount = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}m`;
  }
  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(1)}k`;
  }

  return String(number);
};

const getViews = (item = {}) => {
  const value =
    item.stats?.views ??
    item.views ??
    item.view ??
    item.viewCount ??
    item.viewsCount ??
    item.totalViews ??
    item.popularity?.views ??
    item.metrics?.views ??
    0;

  return Number(value) || 0;
};

const extractGenres = (item) =>
  [
    ...getLabels(item?.genres),
    ...getLabels(item?.genre),
    ...getLabels(item?.tags),
    ...getLabels(item?.categories),
  ].filter((value, index, array) => array.indexOf(value) === index);

const TypeChip = ({ type }) => {
  const normalized = normalizeText(type);

  const className =
    normalized === 'manga'
      ? 'bg-black text-white'
      : normalized === 'manhwa'
        ? 'bg-blue-600 text-white'
        : normalized === 'manhua'
          ? 'bg-red-600 text-yellow-300'
          : 'bg-zinc-800 text-white';

  if (!type) return null;

  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] ${className}`}>
      {type}
    </span>
  );
};

const WRAP =
  'mx-auto w-full max-w-[1420px] [--pad:clamp(14px,3.5vw,28px)] px-[var(--pad)]';

/* ======================== EXPLORE ======================== */

export default function Explore() {
  const [sp, setSp] = useSearchParams();

  const initialCorner = normalizeText(sp.get('corner'));
  const initialView = sp.get('view') || 'grid';
  const initialPage = Number(sp.get('page') || 1);

  const [corner, setCorner] = useState(
    CORNERS.some((item) => item.key === initialCorner)
      ? initialCorner
      : 'all'
  );

  const [genres, setGenres] = useState([]);
  const [active, setActive] = useState(sp.get('genre') || '');
  const [page, setPage] = useState(
    Number.isFinite(initialPage) && initialPage > 0
      ? initialPage
      : 1
  );
  const [view, setView] = useState(
    initialView === 'list' ? 'list' : 'grid'
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openFilter, setOpenFilter] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const theme = THEME[corner] || THEME.all;

  const themeStyle = {
    '--explore-accent': theme.accent,
    '--explore-dark': theme.dark,
    '--explore-light': theme.light,
    '--explore-ring': theme.ring,
  };

  /* ======================== URL SYNC ======================== */

  // Mendukung tombol Back/Forward browser.
  useEffect(() => {
    const urlCorner = normalizeText(sp.get('corner'));
    const urlPage = Number(sp.get('page') || 1);
    const urlView = sp.get('view') || 'grid';
    const urlGenre = sp.get('genre') || '';

    setCorner(
      CORNERS.some((item) => item.key === urlCorner)
        ? urlCorner
        : 'all'
    );

    setActive(urlGenre);
    setPage(
      Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1
    );
    setView(urlView === 'list' ? 'list' : 'grid');
  }, [sp]);

  // Perbarui URL saat pilihan pengguna berubah.
  useEffect(() => {
    const next = new URLSearchParams();

    if (corner !== 'all') next.set('corner', corner);
    if (active) next.set('genre', active);
    if (page > 1) next.set('page', String(page));
    if (view !== 'grid') next.set('view', view);

    const currentString = sp.toString();
    const nextString = next.toString();

    if (currentString !== nextString) {
      setSp(next, { replace: true });
    }
  }, [corner, active, page, view, sp, setSp]);

  /* ======================== GENRES ======================== */

  useEffect(() => {
    let alive = true;

    async function loadGenres() {
      try {
        const result = await fetchGenres();

        const names = Array.isArray(result)
          ? result
              .map((item) =>
                typeof item === 'string'
                  ? item
                  : item?.name
              )
              .filter(Boolean)
          : [];

        if (alive) setGenres(names);
      } catch (err) {
        console.error('Gagal memuat genre:', err);

        if (alive) setGenres([]);
      }
    }

    loadGenres();

    return () => {
      alive = false;
    };
  }, []);

  /* ======================== SERIES DATA ======================== */

  useEffect(() => {
    let alive = true;

    async function loadSeries() {
      setLoading(true);
      setError('');
      setItems([]);

      try {
        const result = active
          ? await fetchByGenre(active, page, 100)
          : await fetchLatest(page, 100);

        if (!alive) return;

        const list = Array.isArray(result) ? result : [];

        const filtered = list.filter(
          (item) =>
            matchesCorner(item, corner) &&
            matchesGenre(item, active)
        );

        setItems(filtered);
      } catch (err) {
        console.error('Gagal memuat Explore:', err);

        if (alive) {
          setError('Gagal memuat data. Periksa koneksi API.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadSeries();

    return () => {
      alive = false;
    };
  }, [corner, active, page]);

  /* ======================== LIVE SEARCH ======================== */

  useEffect(() => {
    const term = searchQuery.trim();

    if (term.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let alive = true;

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const result = await fetchSearch(term);

        if (alive) {
          const list = Array.isArray(result) ? result : [];

          setSearchResults(
            list.filter((item) => matchesCorner(item, corner))
          );
        }
      } catch (err) {
        console.error('Gagal mencari komik:', err);

        if (alive) setSearchResults([]);
      } finally {
        if (alive) setIsSearching(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [searchQuery, corner]);

  /* ======================== DERIVED DATA ======================== */

  const heroItems = useMemo(
    () => items.slice(0, 8),
    [items]
  );

  const isSearchActive = searchQuery.trim().length >= 3;

  const selectCorner = (key) => {
    setCorner(key);
    setPage(1);
    setSearchResults([]);
  };

  const selectGenre = (genre) => {
    setActive(genre);
    setPage(1);
  };

  /* ======================== RENDER ======================== */

  return (
    <div
      className="explore-theme space-y-8"
      data-explore-theme={corner}
      style={themeStyle}
    >
      {/* SEARCH TOP BAR */}
      <div className={WRAP}>
        <HomeTopBar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
        />
      </div>

      
{/* THREE CATEGORY TABS */}
<div className="flex justify-center px-3 sm:px-4">
  <div
    className="
      inline-flex max-w-full items-center gap-0.5 sm:gap-2
      rounded-[10px] sm:rounded-[16px]
      border sm:border-[3px] border-[#625b69]
      bg-[#09090B] p-1 sm:p-2
    "
    role="tablist"
    aria-label="Kategori Explore"
  >
    {CORNERS.map((item) => {
      const selected = corner === item.key;

      return (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => selectCorner(item.key)}
          className={`
            shrink-0 whitespace-nowrap rounded-md sm:rounded-[8px]
            px-2 py-1.5
            sm:px-5 sm:py-3
            text-xs sm:text-base font-semibold
            transition-all duration-200
            ${
              selected
                ? item.key === 'female'
                  ? 'bg-fuchsia-600 text-white'
                  : item.key === 'male'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-blue-600 text-white'
                : 'bg-transparent text-white hover:bg-white/10'
            }
          `}
        >
          {item.label}
        </button>
      );
    })}
  </div>
</div>


      {/* SEARCH RESULTS */}
      {isSearchActive ? (
        <div className={WRAP}>
          <div className="min-h-[50vh] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader
                title={`Hasil Pencarian: "${searchQuery}"`}
              />

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="shrink-0 text-xs font-medium
                           text-[var(--explore-accent)]
                           hover:underline"
              >
                Tutup Pencarian
              </button>
            </div>

            {isSearching ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3
                              md:grid-cols-4 lg:grid-cols-6 animate-pulse">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl
                               bg-zinc-900 ring-1 ring-white/10"
                  >
                    <div className="aspect-[130/200] bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3
                              md:grid-cols-4 lg:grid-cols-6">
                {searchResults.map((item, index) => (
                  <Card
                    key={item.id || item.slug || index}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-zinc-900/40 py-16
                              text-center text-zinc-400
                              ring-1 ring-white/5">
                Tidak ada komik yang cocok dengan kata kunci
                {' '}"{searchQuery}".
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* HERO SLIDER */}
          <div className={WRAP}>
            {loading ? (
              <div className="animate-pulse overflow-hidden
                              rounded-2xl bg-zinc-900">
                <div className="h-[54vw] bg-zinc-800
                                sm:h-[38vw] lg:h-[460px]" />
              </div>
            ) : !error && heroItems.length > 0 ? (
              <div className="overflow-hidden rounded-none
                              ring-0 md:rounded-3xl md:ring-1
                              md:ring-white/10">
                <Swiper
                  key={`${corner}-${heroItems.length}`}
                  modules={[
                    Autoplay,
                    Navigation,
                    SwiperPagination,
                    EffectFade,
                    Parallax,
                    Keyboard,
                  ]}
                  loop={heroItems.length > 1}
                  effect="fade"
                  speed={900}
                  keyboard={{ enabled: true }}
                  autoplay={{
                    delay: 3500,
                    disableOnInteraction: false,
                  }}
                  navigation
                  pagination={{ clickable: true }}
                  parallax
                  observer
                  observeParents
                  watchSlidesProgress
                  className="h-[54vw] w-full bg-zinc-900
                             sm:h-[38vw] lg:h-[460px]"
                >
                  {heroItems.map((item, index) => (
                    <SwiperSlide key={item.slug || item.id || index}>
                      <Link
                        to={`/series/${item.slug || item.id}`}
                        className="relative block h-full w-full"
                      >
                        <img
                          data-swiper-parallax="-15%"
                          src={
                            item.backdrop ||
                            item.banner ||
                            item.cover ||
                            ''
                          }
                          alt={item.title || 'Cover komik'}
                          className="absolute inset-0 h-full w-full
                                     object-cover"
                          loading="lazy"
                        />

                        <div className="absolute inset-0
                                        bg-gradient-to-r
                                        from-black/80 via-black/40
                                        to-transparent" />

                        <div
                          data-swiper-parallax="-100"
                          className="absolute bottom-8 left-[var(--pad)]
                                     max-w-[min(720px,80%)]
                                     pr-[var(--pad)] sm:bottom-12"
                        >
                          <h3 className="text-2xl font-extrabold
                                         leading-tight text-white
                                         drop-shadow sm:text-4xl">
                            {item.title}
                          </h3>

                          {(item.description || item.desc) && (
                            <p className="mt-2 line-clamp-2
                                          text-zinc-200/90 sm:line-clamp-3">
                              {item.description || item.desc}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap
                                          items-center gap-2">
                            <TypeChip type={item.type} />

                            {item.badge && (
                              <span
                                className="rounded-md px-2 py-1
                                           text-xs text-white"
                                style={{
                                  backgroundColor: 'var(--explore-accent)',
                                }}
                              >
                                {item.badge}
                              </span>
                            )}

                            {item.updatedAt && (
                              <span className="rounded-md
                                               bg-zinc-800/90 px-2 py-1
                                               text-xs text-zinc-200">
                                {fmtAge(item.updatedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            ) : null}
          </div>

          {/* EXPLORE CONTROLS */}
          <div className={WRAP}>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SectionHeader
                title={
                  corner === 'male'
                    ? 'Male Corner'
                    : corner === 'female'
                      ? 'Female Corner'
                      : 'Explore'
                }
              />

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenFilter((value) => !value)}
                  aria-expanded={openFilter}
                  className="rounded-md bg-zinc-800 px-3 py-2
                             text-sm text-zinc-100 transition
                             hover:bg-zinc-700"
                >
                  {openFilter ? 'Tutup Genre' : 'Filter Genre'}
                </button>

                <button
                  type="button"
                  onClick={() => setView('grid')}
                  aria-pressed={view === 'grid'}
                  className={`explore-view-btn ${
                    view === 'grid' ? 'explore-view-btn-active' : ''
                  }`}
                >
                  ▦ Grid
                </button>

                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  className={`explore-view-btn ${
                    view === 'list' ? 'explore-view-btn-active' : ''
                  }`}
                >
                  ▤ List
                </button>
              </div>
            </div>

            {/* GENRE FILTER */}
            {openFilter && (
              <div className="mt-4 rounded-md bg-zinc-900/60
                              p-3 ring-1 ring-white/10 sm:p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectGenre('')}
                    className={`explore-genre-chip ${
                      !active ? 'explore-genre-chip-active' : ''
                    }`}
                  >
                    Semua
                  </button>

                  {genres.map((genre) => (
                    <button
                      type="button"
                      key={genre}
                      onClick={() => selectGenre(genre)}
                      className={`explore-genre-chip ${
                        normalizeText(active) === normalizeText(genre)
                          ? 'explore-genre-chip-active'
                          : ''
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SERIES LIST */}
            {loading ? (
              <div className="mt-6 grid grid-cols-2 gap-3
                              animate-pulse sm:grid-cols-3
                              md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-md
                               bg-zinc-900 ring-1 ring-white/10"
                  >
                    <div className="aspect-[130/200] bg-zinc-800" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-4/5 rounded bg-zinc-800" />
                      <div className="h-3 w-2/3 rounded bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="mt-6 text-red-400">{error}</div>
            ) : items.length > 0 ? (
              <div className="mt-6">
                {view === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3
                                  sm:grid-cols-3 sm:gap-4
                                  md:grid-cols-4 lg:grid-cols-5
                                  xl:grid-cols-6">
                    {items.map((item, index) => (
                      <div
                        key={item.slug || item.id || index}
                        className="relative min-w-0"
                      >
                        {item.updatedAt && (
                          <div className="absolute left-2 top-2 z-10
                                          rounded-md bg-black/70
                                          px-1.5 py-0.5 text-[11px]
                                          text-white">
                            {fmtAge(item.updatedAt)}
                          </div>
                        )}

                        {item.type && (
                          <div className="absolute right-2 top-2 z-10">
                            <TypeChip type={item.type} />
                          </div>
                        )}

                        <Card item={item} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => {
                      const itemGenres = extractGenres(item).slice(0, 3);

                      return (
                        <Link
                          key={item.slug || item.id || index}
                          to={`/series/${item.slug || item.id}`}
                          className="flex gap-3 rounded-2xl
                                     bg-zinc-800/60 p-3
                                     ring-1 ring-white/10 transition
                                     hover:bg-zinc-800"
                        >
                          <img
                            src={
                              item.cover ||
                              item.thumbnail ||
                              item.image ||
                              ''
                            }
                            alt={item.title || 'Cover komik'}
                            loading="lazy"
                            className="h-28 w-20 shrink-0
                                       rounded-lg object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-1 font-semibold">
                              {item.title}
                            </div>

                            <div className="mt-1 flex flex-wrap
                                            items-center gap-3
                                            text-[11px] text-zinc-400">
                          

                              {item.updatedAt && (
                                <span>
                                  Updated {fmtAge(item.updatedAt)} ago
                                </span>
                              )}
                            </div>

                            {itemGenres.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {itemGenres.map((genre) => (
                                  <span
                                    key={genre}
                                    className="rounded-md bg-zinc-700/60
                                               px-2 py-0.5 text-[11px]
                                               capitalize text-zinc-200"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-zinc-900/40
                              px-4 py-12 text-center
                              text-zinc-400 ring-1 ring-white/5">
                {corner === 'male'
                  ? 'Belum ada komik dengan tag Male MC pada data yang dimuat.'
                  : corner === 'female'
                    ? 'Belum ada komik dengan tag Female MC pada data yang dimuat.'
                    : active
                      ? `Belum ada komik dengan genre ${active}.`
                      : 'Tidak ada data.'}
              </div>
            )}

            {/* PAGINATION */}
            <div className="mt-6">
              <Pagination
                page={page}
                setPage={(value) =>
                  setPage(Math.max(1, Number(value) || 1))
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
