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
  Search,
  ArrowUpDown,
} from 'lucide-react';

// Skeleton loading untuk halaman Series
function SeriesLoading() {
  return (
<div className="space-y-6 md:space-y-8">
   {/* Hero skeleton (full bleed, rapi) */}
  <div
    className="
      relative w-screen max-w-none
      ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]
      h-[220px] sm:h-[280px] md:h-[360px]
      bg-zinc-950
    "
  >
    {/* blur + gradient cuma di area hero */}
    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-950 to-black" />

    <div className="relative z-10 h-full p-4 sm:p-5 md:p-8 max-w-6xl mx-auto flex gap-4 md:gap-6 items-center animate-pulse">
      {/* Cover */}
      <div className="w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-48 rounded-xl md:rounded-2xl bg-zinc-800/70 ring-2 ring-white/10 shadow-lg" />

      {/* Text block */}
      <div className="flex-1 space-y-3 sm:space-y-4">
        <div className="h-6 sm:h-8 md:h-10 bg-zinc-800/80 rounded-lg w-3/4" />
        <div className="h-3 bg-zinc-800/60 rounded w-1/2" />

        <div className="flex flex-wrap gap-3 mt-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-4 w-20 sm:w-24 bg-zinc-800/60 rounded-full"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-9 sm:h-10 rounded-xl bg-zinc-800/80"
            />
          ))}
        </div>
      </div>
    </div>
  </div>



      {/* Body: deskripsi & chapters & sidebar skeleton */}
      <div className="grid md:grid-cols-[1fr_320px] gap-6 md:gap-8">
        {/* Left */}
        <div className="space-y-4 animate-pulse">
          {/* Deskripsi skeleton */}
          <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 p-4 md:p-5 space-y-2">
            <div className="h-3 bg-zinc-800/70 rounded w-5/6" />
            <div className="h-3 bg-zinc-800/60 rounded w-4/5" />
            <div className="h-3 bg-zinc-800/50 rounded w-3/5" />
          </div>

          {/* Chapters skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-zinc-800/70 rounded" />
              <div className="h-3 w-24 bg-zinc-800/50 rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 flex gap-3 items-center"
                >
                  <div className="w-24 h-16 rounded-lg bg-zinc-800/70 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-zinc-800/70 rounded w-5/6" />
                    <div className="h-3 bg-zinc-800/50 rounded w-1/3" />
                  </div>
                  <div className="w-4 h-4 bg-zinc-800/60 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 space-y-2"
            >
              <div className="h-3 w-16 bg-zinc-800/60 rounded" />
              <div className="h-4 w-32 bg-zinc-800/80 rounded" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function relativeTime(d) {
  if (!d) return '';
  const now = dayjs();
  const t = dayjs(d);

  const mins = now.diff(t, 'minute');
  if (mins < 60) return `${mins} mnt lalu`;

  const hours = now.diff(t, 'hour');
  if (hours < 24) return `${hours} jam lalu`;

  const days = now.diff(t, 'day');
  if (days < 30) return `${days} hari lalu`;

  const months = now.diff(t, 'month');
  if (months < 12) return `${months} bln lalu`;

  const years = now.diff(t, 'year');
  return `${years} th lalu`;
}

function isNewChapter(ch, index) {
  // dianggap "UP" kalau 3 hari terakhir atau dia chapter pertama di list
  if (!ch?.createdAt) return index === 0;
  const days = dayjs().diff(dayjs(ch.createdAt), 'day');
  return days <= 3 || index === 0;
}


export default function Series() {
  const { slug } = useParams();
  const nav = useNavigate();

  // data
  const [detail, setDetail] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readChapters, setReadChapters] = useState({});

  // state tombol
  const [inBookmark, setInBookmark] = useState(false);
  const [inFav, setInFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandDesc, setExpandDesc] = useState(false);

    // NEW: search & sort chapter
  const [chapterQuery, setChapterQuery] = useState('');
  const [chapterSort, setChapterSort] = useState('desc'); // 'asc' | 'desc'

  // helper: minta login kalau belum (toast)
  const ensure = useRequireAuth();

  const HISTORY_KEY = 'gv:chapter-history:v1';

  const markChapterRead = (chapterId) => {
    if (!chapterId) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const all = raw ? JSON.parse(raw) : {};

      const seriesHist = all[slug] || {};
      seriesHist[chapterId] = new Date().toISOString(); // bisa dipakai nanti kalau mau "lanjut baca"

      all[slug] = seriesHist;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(all));

      // update state biar warna langsung berubah
      setReadChapters(seriesHist);
    } catch {
      // abaikan error localStorage
    }
  };

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


  // load history baca dari localStorage untuk series ini
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) {
        setReadChapters({});
        return;
      }
      const all = JSON.parse(raw);
      // simpan sebagai map { [chapterId]: lastReadISO }
      setReadChapters(all[slug] || {});
    } catch {
      setReadChapters({});
    }
  }, [slug]);

// cek apakah series ini memang novel (berdasarkan format/tags)
const isNovelSeries = useMemo(() => {
  if (!detail) return false;

  const fmt  = (detail.format || detail.type || "").toLowerCase();
  const tags = Array.isArray(detail.tags)
    ? detail.tags.map((t) => String(t).toLowerCase())
    : [];

  // format "Light Novel" akan masuk sini karena ada kata "novel"
  return (
    fmt.includes("novel") ||
    tags.includes("novel") ||
    tags.includes("light novel")
  );
}, [detail]);

// helper: benar2 tentukan "chapter ini novel atau bukan"
const isNovelChapter = (ch) => {
  if (!ch) return isNovelSeries;

  if (typeof ch.type === "string") {
    if (ch.type.toLowerCase() === "novel") return true;
  }

  if (typeof ch.mode === "string") {
    if (ch.mode.toLowerCase() === "novel") return true;
  }

  // fallback: pakai info series
  return isNovelSeries;
};


  // NEW: daftar chapter untuk ditampilkan (sort + search)
  const displayChapters = useMemo(() => {
    const arr = [...(chapters || [])];

    // sort berdasarkan nomor chapter
    arr.sort((a, b) => {
      const na = Number(a.number || 0);
      const nb = Number(b.number || 0);
      return chapterSort === 'asc' ? na - nb : nb - na;
    });

    if (!chapterQuery.trim()) return arr;

    const q = chapterQuery.trim().toLowerCase();
    return arr.filter((ch) => {
      const num = String(ch.number ?? '').toLowerCase();
      const title = (ch.title || '').toLowerCase();
      return num.includes(q) || title.includes(q);
    });
  }, [chapters, chapterSort, chapterQuery]);


if (loading) return <SeriesLoading />;
if (!detail) return <div className="p-4">Tidak ditemukan.</div>;

  // ====== Handlers ======
const handleReadFirst = () => {
  if (!latestChapter?.id) return;

  if (isNovelChapter(latestChapter)) {
    nav(`/novel/${latestChapter.id}`);   // novel => NovelReader
  } else {
    nav(`/read/${latestChapter.id}`);    // komik => reader gambar
  }
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

    // tandai sebagai sudah dibaca
    markChapterRead(String(ch.id));

    if (isNovelChapter(ch)) {
      nav(`/novel/${ch.id}`);
    } else {
      nav(`/read/${ch.id}`);
    }
  };



  const goGenre = (g) => nav(`/explore?genre=${encodeURIComponent(g)}`);

  // ====== UI ======
return (
  <div className="space-y-6 md:space-y-8">
{/* Hero (full bleed, tinggi ikut konten) */}
<div
  className="
    relative w-screen max-w-none
    ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]
    min-h-[220px] sm:min-h-[260px] md:min-h-[320px]
    pb-6 sm:pb-8
    mt-[-24px] sm:mt-[-28px] md:mt-[-32px]
  "
>
  {/* Backdrop blur: cuma area atas + fade ke hitam sebelum deskripsi */}
  <div
    className="
      absolute top-0 left-0 w-full
      h-[210px] sm:h-[230px] md:h-[250px] lg:h-[270px]
      overflow-hidden pointer-events-none
    "
  >
    <img
      src={detail.banner || detail.cover}
      alt={detail.title}
      className="w-full h-full object-cover scale-105 blur-md"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />
  </div>

  {/* Nav buttons: absolute, jarak dari pinggir layar pakai px-4/6/10 */}
  <div
  className="
    absolute inset-x-0
    top-6 sm:top-7 md:top-8
    flex justify-between
    px-8 sm:px-12 md:px-16
    z-20
  "
>

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

  {/* Foreground content (tanpa nav buttons lagi) */}
  <div
    className="
      relative z-10 h-full
      pt-12 sm:pt-14 md:pt-16
      pb-4 sm:pb-6 md:pb-8
      px-4 sm:px-5 md:px-8
      max-w-6xl mx-auto
    "
  >
    <div className="mt-2 md:mt-1 flex flex-col sm:flex-row items-center sm:items-center gap-4 md:gap-6">
      {/* Cover */}
      {detail.cover && (
        <img
          src={detail.cover}
          className="
            w-28 h-40
            sm:w-32 sm:h-48
            md:w-40 md:h-60
            lg:w-48 lg:h-72
            object-cover rounded-xl md:rounded-2xl
            ring-2 ring-white/20 shadow-lg flex-shrink-0
            mx-auto sm:mx-0
          "
          alt={detail.title}
        />
      )}

      {/* Title + meta + buttons + genres */}
      <div className="min-w-0 flex-1 text-center sm:text-left">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          {detail.title}
        </h1>
        {detail.altTitle && (
          <div className="text-zinc-300/90 mt-1">{detail.altTitle}</div>
        )}

        {/* Stats */}
        <div className="mt-3 md:mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm">
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
              <Award className="w-4 h-4 text-brand" />
              {detail.stats.score}
            </span>
          )}
        </div>

        {/* Primary actions */}
        <div className="mt-4 max-w-xl mx-auto sm:mx-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={handleReadFirst}
              disabled={!latestChapter || busy}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5
                         rounded-xl font-semibold bg-gradient-to-r from-brand-dark via-brand to-brand-light
                         text-white hover:brightness-110 disabled:opacity-60"
            >
              <Play className="w-5 h-5" />
              Baca
            </button>

            <button
              onClick={handleBookmark}
              disabled={busy}
              className={clsx(
                'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ' +
                  'ring-1 ring-white/10 hover:bg-zinc-800',
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
                'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ' +
                  'ring-1 ring-white/10 hover:bg-zinc-800',
                inFav ? 'bg-zinc-800' : 'bg-zinc-900/60'
              )}
              title="Tambah ke Readlist"
            >
              <ListPlus className="w-5 h-5" />
              {inFav ? 'Di Readlist' : 'Tambah ke Readlist'}
            </button>
          </div>
        </div>

        {/* Genre chips */}
        {(detail.genres?.length ? detail.genres : []).length > 0 && (
          <div className="mt-4 pb-2 md:pb-0">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
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
                className="mt-2 text-sm text-brand hover:underline"
              >
                {expandDesc ? 'Read Less' : 'Read More'}
              </button>
            </div>
          )}

          {/* Chapters */}
          <div className="mt-5 md:mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <h2 className="text-lg md:text-xl font-semibold">Chapters</h2>

              <div className="flex-1 sm:flex-none flex items-center gap-2">
                {/* Search bar */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={chapterQuery}
                    onChange={(e) => setChapterQuery(e.target.value)}
                    placeholder="Cari Chapter, contoh: 69 atau 76"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/70 ring-1 ring-white/10
                               text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-brand"
                  />
                </div>

                {/* Sort tombol kecil */}
                <button
                  type="button"
                  onClick={() =>
                    setChapterSort((s) => (s === 'desc' ? 'asc' : 'desc'))
                  }
                  className="flex items-center justify-center w-10 h-10 rounded-xl
                             bg-zinc-900/80 ring-1 ring-white/10 hover:bg-zinc-800"
                  title={
                    chapterSort === 'desc'
                      ? 'Urutkan naik (Chapter 1 → 100)'
                      : 'Urutkan turun (Chapter 100 → 1)'
                  }
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {detail.updatedAt && (
              <div className="mb-2 text-xs text-zinc-500">
                Update terakhir: {safeDate(detail.updatedAt)}
              </div>
            )}

            {displayChapters?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
{displayChapters.map((ch, idx) => {
  const isNew = isNewChapter(ch, idx);
  const created = ch.createdAt ? relativeTime(ch.createdAt) : '';

  // 👉 sudah dibaca?
  const isRead = !!readChapters[String(ch.id)];

  return (
    <button
      key={ch.id}
      onClick={() => handleOpenChapter(ch)}
      className={clsx(
        'group flex gap-3 bg-zinc-900/60 hover:bg-zinc-900',
        'ring-1 ring-white/10 overflow-hidden text-left'
      )}
    >
      {/* Thumbnail */}
      {ch.thumbnail && (
        <div className="relative w-[120px] h-[82px] sm:w-[140px] sm:h-[90px] flex-shrink-0">
          <img
            src={ch.thumbnail}
            alt={ch.title || `Chapter ${ch.number}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Detail */}
      <div className="flex-1 min-w-0 py-2 pr-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'font-semibold text-sm sm:text-base truncate',
              isRead ? 'text-zinc-400' : 'text-white'
            )}
          >
            Chapter {ch.number}
          </div>
          {isNew && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-600 text-white font-semibold">
              UP
            </span>
          )}
        </div>

        {ch.title && (
          <div
            className={clsx(
              'text-xs line-clamp-1',
              isRead ? 'text-zinc-500' : 'text-zinc-300'
            )}
          >
            {ch.title}
          </div>
        )}

        <div
          className={clsx(
            'mt-1 text-[11px]',
            isRead ? 'text-zinc-500' : 'text-zinc-400'
          )}
        >
          {created}
        </div>
      </div>

      <ChevronRight
        className={clsx(
          'w-4 h-4 mr-3',
          isRead
            ? 'text-zinc-600 group-hover:text-zinc-400'
            : 'text-zinc-500 group-hover:text-zinc-300'
        )}
      />
    </button>
  );
})}

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
          <InfoCard label="Format" value={detail.format || detail.type} />
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
