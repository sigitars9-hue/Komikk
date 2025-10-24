// src/pages/Series.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import clsx from 'clsx';

import { fetchSeries, fetchChapters } from '../lib/api';
import useRequireAuth from '../hooks/useRequireAuth';
import { isInLibrary, toggleLibrary } from '../lib/library';

import {
  ArrowLeft,
  Home,
  Play,
  Bookmark,
  ListPlus,
  Star,
  Eye,
  Award,
  ChevronRight,
} from 'lucide-react';

export default function Series() {
  const { slug } = useParams();
  const nav = useNavigate();

  // data
  const [detail, setDetail] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  // state tombol
  const [inBookmark, setInBookmark] = useState(false);
  const [inFav, setInFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandDesc, setExpandDesc] = useState(false);

  // helper: minta login kalau belum (toast)
  const ensure = useRequireAuth();

  useEffect(() => {
    let live = true;
    setLoading(true);
    setInBookmark(false);
    setInFav(false);

    (async () => {
      try {
        const d = await fetchSeries(slug);
        if (!live) return;
        setDetail(d);

        const ch = await fetchChapters(slug);
        if (!live) return;
        setChapters(ch || []);

        // status awal library
        try {
          const b = await isInLibrary('bookmarks', d.slug);
          const f = await isInLibrary('favorites', d.slug);
          if (live) {
            setInBookmark(b);
            setInFav(f);
          }
        } catch {}
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => { live = false; };
  }, [slug]);

  const latestChapter = useMemo(() => chapters?.[0] || null, [chapters]);

  if (loading) return <div className="p-4 text-zinc-400">Memuat detail…</div>;
  if (!detail) return <div className="p-4">Tidak ditemukan.</div>;

  // ====== Handlers ======
  const handleReadFirst = () => {
    if (!latestChapter?.id) return;
    nav(`/read/${latestChapter.id}`);
  };

  const handleBookmark = async () => {
    if (!ensure()) return;
    try {
      setBusy(true);
      const res = await toggleLibrary('bookmarks', {
        slug: detail.slug,
        title: detail.title,
        cover: detail.cover,
      });
      setInBookmark(res.added);
      toast.success(res.added ? 'Ditambahkan ke Bookmark' : 'Dihapus dari Bookmark');
    } catch (e) {
      console.error(e);
      toast.error('Gagal memproses Bookmark');
    } finally {
      setBusy(false);
    }
  };

  const handleFavorite = async () => {
    if (!ensure()) return;
    try {
      setBusy(true);
      const res = await toggleLibrary('favorites', {
        slug: detail.slug,
        title: detail.title,
        cover: detail.cover,
      });
      setInFav(res.added);
      toast.success(res.added ? 'Ditambahkan ke Readlist' : 'Dihapus dari Readlist');
    } catch (e) {
      console.error(e);
      toast.error('Gagal memproses Readlist');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChapter = (ch) => {
    if (!ch?.id) return;
    nav(`/read/${ch.id}`);
  };

  const goGenre = (g) => nav(`/explore?genre=${encodeURIComponent(g)}`);

  // ====== UI ======
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden ring-1 ring-white/10">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={detail.banner || detail.cover}
            alt={detail.title}
            className="w-full h-[220px] sm:h-[280px] md:h-[360px] object-cover scale-105 blur-md"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black" />
        </div>

        {/* Foreground content */}
        <div className="relative z-10 p-4 sm:p-5 md:p-8">
          <div className="flex items-start justify-between">
            <button
              onClick={() => nav(-1)}
              className="inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/60 ring-1 ring-white/10 hover:bg-black/70"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/60 ring-1 ring-white/10 hover:bg-black/70"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </Link>
          </div>

          <div className="mt-4 md:mt-3 flex gap-4 md:gap-6">
            {/* Cover */}
            {detail.cover && (
              <img
                src={detail.cover}
                className="w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-48 object-cover rounded-xl md:rounded-2xl ring-2 ring-white/20 shadow-lg flex-shrink-0"
                alt={detail.title}
              />
            )}

            {/* Title + meta */}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                {detail.title}
              </h1>
              {detail.altTitle && (
                <div className="text-zinc-300/90 mt-1">{detail.altTitle}</div>
              )}

              {/* Stats */}
              <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400" />
                  {detail.stats?.rating ?? '—'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-sky-400" />
                  {formatCount(detail.stats?.bookmarks)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-400" />
                  {formatCount(detail.stats?.views)}
                </span>
                {detail.stats?.score && (
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-violet-400" />
                    {detail.stats.score}
                  </span>
                )}
              </div>

              {/* Primary actions */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 max-w-xl">
                <button
                  onClick={handleReadFirst}
                  disabled={!latestChapter || busy}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60"
                >
                  <Play className="w-5 h-5" />
                  Baca
                </button>

                <button
                  onClick={handleBookmark}
                  disabled={busy}
                  className={clsx(
                    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ring-1 ring-white/10 hover:bg-zinc-800',
                    inBookmark ? 'bg-zinc-800' : 'bg-zinc-900/60'
                  )}
                  title="Bookmark"
                >
                  <Bookmark className={clsx('w-5 h-5', inBookmark && 'fill-white')} />
                  {inBookmark ? 'Di Bookmark' : 'Bookmark'}
                </button>

                <button
                  onClick={handleFavorite}
                  disabled={busy}
                  className={clsx(
                    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ring-1 ring-white/10 hover:bg-zinc-800',
                    inFav ? 'bg-zinc-800' : 'bg-zinc-900/60'
                  )}
                  title="Tambah ke Readlist"
                >
                  <ListPlus className="w-5 h-5" />
                  {inFav ? 'Di Readlist' : 'Tambah ke Readlist'}
                </button>
              </div>

              {/* Genre chips (scroll-x on mobile) */}
              {(detail.genres?.length ? detail.genres : []).length > 0 && (
                <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-thin md:overflow-visible md:mx-0 md:px-0">
                  <div className="flex gap-2 w-max md:w-auto">
                    {detail.genres.map((g) => (
                      <button
                        key={g}
                        onClick={() => goGenre(g)}
                        className="px-3 py-1 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 ring-1 ring-white/10 text-sm whitespace-nowrap"
                        title={`Lihat genre ${g}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body: Deskripsi + Chapters + Sidebar Info */}
      <div className="grid md:grid-cols-[1fr_320px] gap-6 md:gap-8">
        {/* Left column */}
        <div>
          {/* Deskripsi */}
          {detail.desc && (
            <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/10 p-4 md:p-5">
              <p
                className={clsx(
                  'text-white/90 leading-relaxed',
                  !expandDesc && 'line-clamp-4 md:line-clamp-3'
                )}
              >
                {detail.desc}
              </p>
              <button
                onClick={() => setExpandDesc((v) => !v)}
                className="mt-2 text-sm text-violet-300 hover:underline"
              >
                {expandDesc ? 'Read Less' : 'Read More'}
              </button>
            </div>
          )}

          {/* Chapters */}
          <div className="mt-5 md:mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-semibold">Chapters</h2>
              {detail.updatedAt && (
                <div className="text-xs text-zinc-400">
                  Update: {safeDate(detail.updatedAt)}
                </div>
              )}
            </div>

            {chapters?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => handleOpenChapter(ch)}
                    className="text-left group p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 ring-1 ring-white/10 flex gap-3 items-center"
                  >
                    {ch.thumbnail && (
                      <img
                        src={ch.thumbnail}
                        className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                        alt={ch.title || `Chapter ${ch.number}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-sm sm:text-base">
                        Chapter {ch.number}{ch.title ? ` — ${ch.title}` : ''}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {ch.createdAt ? safeDate(ch.createdAt) : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-zinc-400">Belum ada chapter.</div>
            )}
          </div>
        </div>

        {/* Sidebar (stack di mobile) */}
        <aside className="space-y-3">
          <InfoCard label="Author" value={detail.author} />
          <InfoCard label="Artist" value={detail.artist} />
          <InfoCard label="Format" value={detail.type || detail.format} />
          <InfoCard label="Status" value={detail.status} />
        </aside>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function InfoCard({ label, value }) {
  if (!value) return null;
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/50 ring-1 ring-white/10">
      <div className="text-xs md:text-sm text-zinc-400">{label}</div>
      <div className="font-semibold text-sm md:text-base">{value}</div>
    </div>
  );
}

function formatCount(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function safeDate(d) {
  try { return dayjs(d).format('YYYY-MM-DD'); }
  catch { return d || ''; }
}
