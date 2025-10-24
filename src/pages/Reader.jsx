'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Home, Settings, Play, Pause, List,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { fetchChapterPages, fetchChapters, fetchSeries } from '../lib/api';

const SPEED_KEY = 'gv:reader:speed';

/* ======================= helpers ======================= */
function sortChapters(chs = []) {
  return [...chs].sort((a, b) => Number(a.number || 0) - Number(b.number || 0));
}
function tailNumber(s = '') {
  const m = String(s).match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : NaN;
}
/** Ambil slug & cid dari berbagai bentuk params */
function resolveRouteParams(params) {
  // Skema A (baru): /read/:slug/:cid?
  if (params.slug) {
    return { slug: params.slug, cid: params.cid || '' };
  }
  // Skema B (lama): /read/:chapterId (gabungan)
  const chapterId = params.chapterId || '';
  // tebak slug dengan memotong suffix -<angka>
  const slug = chapterId.replace(/-\d+$/, '');
  const cid = chapterId; // untuk id-first match
  return { slug, cid };
}
/** Pilih chapter: match by id dulu, lalu by number, lalu default terakhir */
function pickChapter(chapters, cid) {
  if (!Array.isArray(chapters) || chapters.length === 0) return null;
  const sorted = sortChapters(chapters);
  if (!cid) return sorted[sorted.length - 1];

  // 1) ID penuh match
  const byId = sorted.find(c => String(c.id) === String(cid));
  if (byId) return byId;

  // 2) numeric fallback
  const n = Number.isFinite(Number(cid)) ? Number(cid) : tailNumber(cid);
  if (Number.isFinite(n)) {
    const byNum = sorted.find(c => Number(c.number) === n);
    if (byNum) return byNum;
  }

  // 3) default terakhir
  return sorted[sorted.length - 1];
}

/* Tombol bulat kecil */
function Fab({ children, onClick, as: Comp, to }) {
  const Tag = Comp || 'button';
  const props = Comp ? { to } : { onClick };
  return (
    <Tag
      {...props}
      className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/90 ring-1 ring-white/10 hover:bg-zinc-800 shadow-lg"
    >
      {children}
    </Tag>
  );
}

/* ======================= Reader ======================= */
export default function Reader() {
  const params = useParams();
  const navigate = useNavigate();
  const { slug, cid } = resolveRouteParams(params);

  const [series, setSeries] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [pages, setPages] = useState([]);

  const [hudVisible, setHudVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem(SPEED_KEY)) || 160);
  const [openSettings, setOpenSettings] = useState(false);
  const [openList, setOpenList] = useState(false);

  // sembunyikan elemen bertanda data-reader-hide
  useEffect(() => {
    const hideTargets = document.querySelectorAll('[data-reader-hide]');
    const backups = [...hideTargets].map((el) => [el, el.style.display]);
    hideTargets.forEach((el) => (el.style.display = 'none'));
    return () => backups.forEach(([el, prev]) => (el.style.display = prev));
  }, []);

  // load detail + chapters + pages
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchSeries(slug).catch(() => null);
        const c = d?.chapters?.length ? d.chapters : await fetchChapters(slug).catch(() => []);
        if (!alive) return;

        setSeries(d);
        setChapters(c);

        // pilih chapter yang tepat
        const current = pickChapter(c, cid);
        // prefer pages/images lokal dari detail
        const local = Array.isArray(current?.images) && current.images.length > 0
          ? current.images
          : (Array.isArray(current?.pages) ? current.pages : []);

        if (local.length > 0) {
          setPages(local.map((url, i) => ({ index: i, imageUrl: String(url) })));
        } else if (current) {
          const items = await fetchChapterPages(current.id || current.number).catch(() => []);
          if (!alive) return;
          setPages(items);
        } else {
          setPages([]);
        }

        window.scrollTo({ top: 0 });
        setHudVisible(true);
        setIsPlaying(false);
      } catch {
        if (alive) {
          setSeries(null);
          setChapters([]);
          setPages([]);
        }
      }
    })();
    return () => { alive = false; };
  }, [slug, cid]);

  // Simpan kecepatan auto-scroll
  useEffect(() => {
    localStorage.setItem(SPEED_KEY, String(speed));
  }, [speed]);

  // Tekan lama untuk fullscreen
  const pressTimer = useRef(null);
  const onPointerDown = () => (pressTimer.current = setTimeout(toggleFullscreen, 600));
  const clearPress = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  // Tap = toggle HUD
  const onTap = () => {
    if (pressTimer.current) return;
    setHudVisible((v) => !v);
  };

  // Auto scroll
  const raf = useRef(0);
  const last = useRef(0);
  const step = (ts) => {
    if (!isPlaying) return;
    const dt = (ts - (last.current || ts)) / 1000;
    last.current = ts;
    window.scrollBy(0, dt * speed);
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 1)
      setIsPlaying(false);
    else raf.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (isPlaying) raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [isPlaying, speed]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollBottom = () =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  // data turunan
  const sorted = useMemo(() => sortChapters(chapters), [chapters]);
  const current = useMemo(() => pickChapter(sorted, cid), [sorted, cid]);
  const idx = useMemo(
    () => sorted.findIndex(ch => String(ch.id) === String(current?.id)),
    [sorted, current]
  );
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  // judul
  const title = series?.title || current?.title || slug || cid;

  // navigate helper (gunakan route baru bila memungkinkan)
  const toChapterHref = (ch) =>
    `/read/${series?.slug || slug}/${ch.id || ch.number}`;

  return (
    <div className="bg-black">
      {/* === Image Reader === */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
        onPointerLeave={clearPress}
        onClick={onTap}
        className="
          text-[0] leading-none
          w-full
          md:mx-auto md:max-w-[1100px]
          ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]
        "
      >
        {pages?.map((p, i) => (
          <img
            key={i}
            src={p.imageUrl || p.url || p}
            alt={`Page ${i + 1}`}
            loading="lazy"
            className="block w-[100vw] max-w-none md:w-full select-none"
            style={{ margin: 0, padding: 0, border: 0 }}
            onError={(e) => { e.currentTarget.classList.add('opacity-30'); }}
          />
        ))}
      </div>

      {/* === HUD (Top & Bottom Controls) === */}
      {hudVisible && (
        <>
          {/* Top bar */}
          <div className="fixed top-4 left-4 right-4 z-40">
            <div className="bg-zinc-900/90 ring-1 ring-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
              <button
                onClick={() => navigate(-1)}
                className="rounded-lg bg-zinc-800 px-2 py-1 hover:bg-zinc-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="font-semibold truncate">{title}</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
              {current?.number != null && (
                <div className="text-violet-300">Ch {current.number}</div>
              )}
              <Link
                to="/"
                className="ml-auto rounded-lg bg-zinc-800 px-2 py-1 hover:bg-zinc-700"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Buttons center bottom */}
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40">
            <div className="flex items-center gap-4">
              {prev ? (
                <Fab as={Link} to={toChapterHref(prev)}><ChevronLeft /></Fab>
              ) : (
                <Fab onClick={() => navigate(-1)}><ChevronLeft /></Fab>
              )}
              <Fab onClick={() => setOpenSettings(true)}><Settings /></Fab>
              {isPlaying ? (
                <Fab onClick={() => setIsPlaying(false)}><Pause /></Fab>
              ) : (
                <Fab onClick={() => setIsPlaying(true)}><Play /></Fab>
              )}
              <Fab onClick={() => setOpenList(true)}><List /></Fab>
              <Fab as={Link} to="/"><Home /></Fab>
            </div>
          </div>

          {/* Scroll Up/Down */}
          <div className="fixed right-4 md:right-6 bottom-28 z-40 flex flex-col gap-3">
            <Fab onClick={scrollTop}><ChevronUp /></Fab>
            <Fab onClick={scrollBottom}><ChevronDown /></Fab>
          </div>
        </>
      )}

      {/* === Settings Modal === */}
      {openSettings && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenSettings(false)}
          />
          <div className="relative z-10 mx-auto mt-[15vh] w-[90%] max-w-md bg-zinc-900 rounded-2xl ring-1 ring-white/10 p-5">
            <div className="font-semibold text-lg mb-2">Kecepatan Auto Scroll</div>
            <input
              type="range"
              min={60}
              max={500}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
            <div className="mt-2 text-sm">Kecepatan: <b>{speed} px/s</b></div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpenSettings(false)} className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* === Chapter List Drawer === */}
      {openList && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpenList(false)} />
          <div
            className="
              absolute inset-x-0 bottom-0 bg-zinc-950 ring-1 ring-white/10 rounded-t-2xl
              md:inset-y-0 md:right-0 md:left-auto md:w-[380px] md:rounded-none
            "
            style={{ maxHeight: '80vh' }}
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <div className="font-semibold truncate">{series?.title || 'Daftar Chapter'}</div>
              <button onClick={() => setOpenList(false)} className="ml-auto bg-zinc-800 px-3 py-1 rounded-lg hover:bg-zinc-700">Tutup</button>
            </div>
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {sorted.map((ch) => (
                <button
                  key={ch.id || `ch-${ch.number}`}
                  onClick={() => {
                    setOpenList(false);
                    // arahkan ke route baru agar konsisten
                    navigate(toChapterHref(ch));
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl mb-2 ring-1 ring-white/10 ${
                    String(ch.id) === String(current?.id) ? 'bg-violet-600/20 ring-violet-500' : 'bg-zinc-900/40 hover:bg-zinc-900'
                  }`}
                >
                  <div className="font-semibold">Chapter {ch.number}</div>
                  {ch.title && <div className="text-xs text-zinc-400">{ch.title}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
