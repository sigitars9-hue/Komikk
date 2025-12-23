'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CommentsSection from "../components/CommentsSection";
import { MessageSquare } from 'lucide-react';

import {
  ChevronLeft, ChevronRight, Home, Settings, Play, Pause, List,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { fetchChapters, fetchSeries } from '../lib/api';

const SPEED_KEY = 'gv:novelreader:speed';
const TIP_KEY = 'gv:novelreader:tip:v1';

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
  // 1) Route baru: /novel/:slug/:cid  → kalau dua segmen ada
  if (params.slug && params.cid) {
    return {
      slug: params.slug,
      cid: params.cid,
    };
  }

  // 2) Route sekarang: /novel/:chapterId  (contoh: aku-dan-4-beban-tim-001)
  //    atau legacy: /novel-read/:chapterId
  const chapterId = params.slug || params.chapterId || "";
  const slug = chapterId.replace(/-\d+$/, ""); // potong -001
  const cid = chapterId;

  return { slug, cid };
}


/** Pilih chapter: match by id dulu, lalu by number, lalu default terakhir */
function pickChapter(chapters, cid) {
  if (!Array.isArray(chapters) || chapters.length === 0) return null;
  const sorted = sortChapters(chapters);
  if (!cid) return sorted[sorted.length - 1];

  const byId = sorted.find(c => String(c.id) === String(cid));
  if (byId) return byId;

  const n = Number.isFinite(Number(cid)) ? Number(cid) : tailNumber(cid);
  if (Number.isFinite(n)) {
    const byNum = sorted.find(c => Number(c.number) === n);
    if (byNum) return byNum;
  }

  return sorted[sorted.length - 1];
}

/* Tombol bulat kecil */
function Fab({ children, onClick, as: Comp, to }) {
  const Tag = Comp || 'button';
  const props = Comp ? { to } : { onClick };
  return (
    <Tag
      {...props}
      className="
        inline-flex items-center justify-center
        w-11 h-11 sm:w-12 sm:h-12
        rounded-full bg-zinc-900/90 ring-1 ring-white/10 hover:bg-zinc-800 shadow-lg
      "
    >
      {children}
    </Tag>
  );
}

/* ======================= Novel Reader ======================= */
export default function NovelReader() {
  const params = useParams();
  const navigate = useNavigate();
  const { slug, cid } = resolveRouteParams(params);

  const [series, setSeries] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [blocks, setBlocks] = useState([]); // blok teks/paragraf

  const [hudVisible, setHudVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => {
    try {
      return Number(localStorage.getItem(SPEED_KEY)) || 160;
    } catch {
      return 160;
    }
  });
  const [openSettings, setOpenSettings] = useState(false);
  const [openList, setOpenList] = useState(false);

  const [hint, setHint] = useState({ show: false, text: '' });
  const hintTimer = useRef(0);
  function showHint(text) {
    setHint({ show: true, text });
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(
      () => setHint({ show: false, text: '' }),
      1200
    );
  }

  const [showTip, setShowTip] = useState(false);
  const [nextPending, setNextPending] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(0);
  const nextTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const pageRefs = useRef([]);
  const endRef = useRef(null);

  // tampilkan popup tip sekali
  useEffect(() => {
    try {
      if (!localStorage.getItem(TIP_KEY)) setShowTip(true);
    } catch {}
  }, []);

  function closeTip(permanen = true) {
    setShowTip(false);
    if (permanen) {
      try {
        localStorage.setItem(TIP_KEY, '1');
      } catch {}
    }
  }

  // load detail + chapters + content text
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchSeries(slug).catch(() => null);
        const c = d?.chapters?.length ? d.chapters : await fetchChapters(slug).catch(() => []);
        if (!alive) return;

        setSeries(d);
        setChapters(c);

        const current = pickChapter(c, cid);

        let contentBlocks = [];

        // 1. kalau backend sudah kirim array blok (disarankan untuk novel)
        if (Array.isArray(current?.content_blocks) && current.content_blocks.length > 0) {
          contentBlocks = current.content_blocks;
        }
        // 2. fallback: content satu string panjang, di-split per paragraf
        else if (typeof current?.content === 'string') {
          contentBlocks = current.content
            .split(/\n{2,}/)
            .map(p => p.trim())
            .filter(Boolean);
        }

        setBlocks(contentBlocks.map((text, i) => ({ index: i, text })));

        window.scrollTo({ top: 0 });
        setHudVisible(true);
        setIsPlaying(false);
      } catch {
        if (alive) {
          setSeries(null);
          setChapters([]);
          setBlocks([]);
        }
      }
    })();
    return () => { alive = false; };
  }, [slug, cid]);

  // Simpan kecepatan auto-scroll
  useEffect(() => {
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
    } catch {}
  }, [speed]);

  // Tekan lama untuk fullscreen
  const pressTimer = useRef(null);
  const onPointerDown = () => (pressTimer.current = setTimeout(toggleFullscreen, 600));
  const clearPress = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        showHint('Fullscreen aktif');
      } else {
        await document.exitFullscreen?.();
        showHint('Keluar fullscreen');
      }
    } catch {}
  };

  // Tap = toggle HUD
  const onTap = () => {
    if (pressTimer.current) return;
    setHudVisible(v => !v);
  };

  // Auto scroll
  const raf = useRef(0);
  const last = useRef(0);

  const step = (ts) => {
    if (!isPlaying) return;
    const dt = (ts - (last.current || ts)) / 1000;
    last.current = ts;
    window.scrollBy(0, dt * speed);

    const atBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 1;

    if (atBottom) {
      setIsPlaying(false);
    } else {
      raf.current = requestAnimationFrame(step);
    }
  };

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (isPlaying) raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [isPlaying, speed]);

  // Scroll per blok teks (mirip per page)
  const scrollNextPage = () => {
    const refs = pageRefs.current || [];
    const y = window.scrollY;
    let targetIndex = -1;

    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const top = el.offsetTop;
      if (top > y + 10) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) targetIndex = refs.length - 1;
    const target = refs[targetIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollPrevPage = () => {
    const refs = pageRefs.current || [];
    const y = window.scrollY;
    let targetIndex = 0;

    for (let i = refs.length - 1; i >= 0; i--) {
      const el = refs[i];
      if (!el) continue;
      const top = el.offsetTop;
      if (top < y - 10) {
        targetIndex = i;
        break;
      }
    }

    const target = refs[targetIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // data turunan
  const sorted = useMemo(() => sortChapters(chapters), [chapters]);
  const current = useMemo(() => pickChapter(sorted, cid), [sorted, cid]);
  const idx = useMemo(
    () => sorted.findIndex(ch => String(ch.id) === String(current?.id)),
    [sorted, current]
  );
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const title = series?.title || current?.title || slug || cid;

  const chapterKey = useMemo(() => {
    if (!current) return null;
    const base = series?.slug || slug || 'series';
    const numOrId = current.number ?? current.id ?? cid;
    return `${base}-ch-${numOrId}`;
  }, [series, slug, cid, current]);

  const toChapterHref = (ch) => {
    const baseSlug = series?.slug || slug;
    const idOrNum = String(ch.id || ch.number || '');
    const fullId = idOrNum.startsWith(baseSlug)
      ? idOrNum
      : `${baseSlug}-${idOrNum}`;
    // sesuaikan dengan route yang kamu pakai untuk novel
    return `/novel/${fullId}`;
  };

  // Auto next ketika tahan di bawah
  const AUTO_NEXT_DELAY = 2000;

  function cancelNextDelay() {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextPending(false);
    setNextCountdown(0);
  }

  function armNextWithDelay(targetChapter) {
    if (!targetChapter) return;
    cancelNextDelay();

    setNextPending(true);

    let remaining = AUTO_NEXT_DELAY / 1000;
    setNextCountdown(remaining);

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setNextCountdown(Math.max(remaining, 0));
    }, 1000);

    nextTimerRef.current = setTimeout(() => {
      nextTimerRef.current = null;
      setNextPending(false);
      setNextCountdown(0);
      showHint(`Lanjut ke Chapter ${targetChapter.number}`);
      navigate(toChapterHref(targetChapter));
    }, AUTO_NEXT_DELAY);
  }

  useEffect(() => {
    if (!next) return;

    const handleScroll = () => {
      const vh = window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      const y = window.scrollY;

      const distanceFromBottom = fullH - (y + vh);

      const shouldArm = distanceFromBottom <= 24;
      const shouldCancel = distanceFromBottom >= 80;

      if (shouldArm) {
        armNextWithDelay(next);
      } else if (shouldCancel) {
        cancelNextDelay();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelNextDelay();
    };
  }, [next, slug, cid]);

  // reset timer auto-next kalau ganti chapter
  useEffect(() => {
    cancelNextDelay();
  }, [slug, cid]);

return (
  <div className="min-h-screen bg-zinc-950">

      {/* === Novel Reader === */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
        onPointerLeave={clearPress}
        onClick={onTap}
        className="

    w-full max-w-[680px] mx-auto
    px-3 sm:px-4 md:px-5
    pt-16 pb-28 md:pb-40
  "
>


        {/* Header di dalam konten (judul chapter, dsb) */}
        <header className="mb-6 sm:mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">
            {series?.title || 'Novel'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50">
            {current?.title || `Chapter ${current?.number ?? ''}`}
          </h1>
          {current?.number != null && (
            <p className="mt-1 text-sm text-zinc-400">
              Chapter {current.number}
            </p>
          )}
        </header>

        {/* Isi novel */}
        <article
  className="
    space-y-3 sm:space-y-4 md:space-y-5
    text-[15px] sm:text-[16px]
    leading-7 sm:leading-8
    text-zinc-100
  "
>

          {blocks.length === 0 && (
            <p className="text-sm text-zinc-400">Belum ada konten untuk chapter ini.</p>
          )}

          {blocks.map((b, i) => (
           <p
  key={i}
  ref={el => { pageRefs.current[i] = el; }}
  className="
    whitespace-pre-wrap
    text-left sm:text-justify
    tracking-[0.01em]
  "
>
  {b.text}
</p>

          ))}

          {/* sentinel auto-next */}
          <div ref={endRef} className="h-[1px]" />
        </article>

        {hint.show && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50
                          px-3 py-1.5 rounded-md bg-zinc-900/90 ring-1 ring-white/10
                          text-xs">
            {hint.text}
          </div>
        )}
      </div>

      {/* === HUD (Top & Bottom Controls) === */}
      <>
      {/* Top bar */}
      <div
        className={`
          fixed inset-x-0 z-40
          transition-all duration-300 ease-out
          ${hudVisible
            ? 'top-2 sm:top-4 opacity-100 translate-y-0 pointer-events-auto'
            : 'top-0 sm:top-1 opacity-0 -translate-y-3 pointer-events-none'}
        `}
      >
        {/* wrapper biar sejajar dengan kolom baca */}
        <div className="max-w-[900px] mx-auto px-3 sm:px-4">
          <div
            className="
              bg-zinc-900/90 ring-1 ring-white/10 rounded-2xl
              px-2.5 py-2 sm:px-4 sm:py-3
              shadow-lg flex items-center gap-2 sm:gap-3
            "
          >
            {/* tombol back */}
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-lg bg-zinc-800 w-9 h-9 sm:w-10 sm:h-10 grid place-items-center hover:bg-zinc-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* judul + badge chapter */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold truncate">
                  {title}
                </div>
                {current?.number != null && (
                  <span
                    className="
                      shrink-0 text-[11px] sm:text-xs px-1.5 py-0.5
                      rounded-md bg-brand/20 text-brand ring-1 ring-brand/30
                    "
                    title={`Chapter ${current.number}`}
                  >
                    Ch {current.number}
                  </span>
                )}
              </div>
            </div>

            {/* tombol Home di kanan, masih satu baris */}
            <Link
              to="/"
              className="shrink-0 rounded-lg bg-zinc-800 w-9 h-9 sm:w-10 sm:h-10 grid place-items-center hover:bg-zinc-700"
            >
              <Home className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>


        {/* Buttons center bottom */}
        <div
          className="fixed inset-x-0 z-40 pointer-events-none"
          style={{
            bottom: 'calc(max(24px, env(safe-area-inset-bottom, 0)) + 10px)',
          }}
        >
                    <div
            className={`
              mx-auto w-full max-w-[720px] md:max-w-[740px] px-3

              flex items-center justify-center gap-2 sm:gap-3
              transition-all duration-300 ease-out
              ${hudVisible
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-3 pointer-events-none'}
            `}
          >
            {prev ? (
              <Fab as={Link} to={toChapterHref(prev)}>
                <ChevronLeft />
              </Fab>
            ) : (
              <Fab onClick={() => navigate(-1)}>
                <ChevronLeft />
              </Fab>
            )}

            <Fab onClick={() => setOpenSettings(true)}>
              <Settings />
            </Fab>

            {isPlaying ? (
              <Fab onClick={() => setIsPlaying(false)}>
                <Pause />
              </Fab>
            ) : (
              <Fab onClick={() => setIsPlaying(true)}>
                <Play />
              </Fab>
            )}

            <Fab onClick={() => setOpenList(true)}>
              <List />
            </Fab>

            {next && (
              <Fab as={Link} to={toChapterHref(next)}>
                <ChevronRight />
              </Fab>
            )}

            <Fab as={Link} to="/">
              <Home />
            </Fab>
          </div>
        </div>

        {/* Scroll Up/Down + banner auto next */}
        <div
          className={`
            fixed z-40 flex flex-col gap-2 sm:gap-3
            transition-all duration-300 ease-out
            ${hudVisible
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-3 pointer-events-none'}
          `}
          style={{
            right: 'max(calc((100vw - 720px) / 2 + 8px), 12px)',
            bottom: 'calc(max(24px, env(safe-area-inset-bottom, 0)) + 96px)',
          }}
        >

        
          {nextPending && (
            <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-3">
              <div className="
                rounded-2xl bg-zinc-900/95 backdrop-blur
                border border-emerald-400/40 
                px-4 py-3 sm:px-6 sm:py-4 
                shadow-lg flex flex-col items-center gap-1
                w-[90%] max-w-[380px] text-center
              ">
                <div className="text-xs sm:text-sm text-emerald-300 font-medium">
                  Tahan posisi ini untuk lanjut chapter selanjutnya…
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold tracking-wide text-emerald-400">
                  {nextCountdown.toFixed(0)}
                </div>

                <div className="h-1.5 w-[60%] rounded-full overflow-hidden bg-zinc-800 mt-1">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-1000"
                    style={{
                      width: `${(nextCountdown / (AUTO_NEXT_DELAY / 1000)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <Fab onClick={scrollPrevPage}>
            <ChevronUp />
          </Fab>
          <Fab onClick={scrollNextPage}>
            <ChevronDown />
          </Fab>
        </div>
      </>

      {/* === Settings Modal === */}
      {openSettings && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenSettings(false)}
          />
          <div className="relative z-10 mx-auto mt-[15vh] w-[90%] max-w-md bg-zinc-900 rounded-2xl ring-1 ring-white/10 p-5">
            <div className="font-semibold text-lg mb-3">Pengaturan Pembaca</div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Kecepatan Auto Scroll</div>
              <input
                type="range"
                min={60}
                max={500}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="mt-1 text-xs text-zinc-300">
                Kecepatan: <b>{speed} px/s</b>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setOpenSettings(false)}
                className="bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700 text-sm"
              >
                Tutup
              </button>
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
              <button
                onClick={() => setOpenList(false)}
                className="ml-auto bg-zinc-800 px-3 py-1 rounded-lg hover:bg-zinc-700"
              >
                Tutup
              </button>
            </div>
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {sorted.map((ch) => (
                <button
                  key={ch.id || `ch-${ch.number}`}
                  onClick={() => {
                    setOpenList(false);
                    navigate(toChapterHref(ch));
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl mb-2 ring-1 ring-white/10 ${
                    String(ch.id) === String(current?.id)
                      ? 'bg-gradient-to-r from-brand-dark via-brand to-brand-light/30 ring-brand'
                      : 'bg-zinc-900/40 hover:bg-zinc-900'
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

      {/* ── Popup Tip Fullscreen (once) ── */}
      {showTip && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => closeTip(true)}
          />
          <div
            className="relative z-10 mx-auto mt-[20vh] w-[92%] max-w-md
                        rounded-2xl bg-zinc-900 ring-1 ring-white/10 p-5"
          >
            <div className="text-base font-semibold">Tips Pembaca</div>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              Tahan di layar selama <b>±0.6 detik</b> untuk masuk ke{" "}
              <b>mode full baca</b> (fullscreen).<br />
              Tahan lagi untuk <b>keluar</b> dari mode baca.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => closeTip(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700"
              >
                Nanti Saja
              </button>
              <button
                onClick={() => closeTip(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl
                           bg-gradient-to-r from-brand-dark via-brand to-brand-light text-white
                           hover:brightness-110"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Komentar per chapter ── */}
      {chapterKey && (
        <div className="mt-6 px-4 sm:px-6 md:px-8 pb-10">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/40">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <MessageSquare className="h-4 w-4" />
              <div className="text-sm font-semibold">Komentar</div>
            </div>

            <div className="p-4">
              <CommentsSection
                chapterId={String(current?.id || current?.number || `${slug}-${cid}`)}
                isAuthor={false}
              />

              {/* Rules komentar sama seperti komik */}
              <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-lg">
                    ⚠️
                  </span>
                  <h2 className="text-base sm:text-lg font-semibold">
                    Aturan Berkomentar di GVComics
                  </h2>
                </div>

                <ul className="space-y-2 text-sm sm:text-[15px] leading-relaxed">
                  <li>
                    🚫 <span className="font-semibold text-red-300">Tidak diperkenankan bersikap kasar, menghina, atau memancing konflik.</span>{" "}
                    Jika melihat keributan, cukup laporkan ke Admin — tidak perlu dibalas.
                  </li>
                  <li>
                    🖼️ Dilarang mengirim foto / gif vulgar, ofensif, atau yang melanggar norma.
                  </li>
                  <li>
                    🗳️ <span className="font-semibold text-red-300">Hindari pembahasan politik.</span> Fokus ke diskusi cerita / chapter.
                  </li>
                  <li>
                    🎭 <span className="font-semibold text-red-300">Spoiler berat sangat tidak dianjurkan.</span>{" "}
                    Bila perlu spoiler, batasi 1–2 chapter ke depan dan sertakan penanda <span className="font-mono">[SPOILER]</span>.
                  </li>
                  <li>
                    💬 <span className="font-semibold text-red-300">Tidak diperbolehkan spam komentar untuk leveling.</span>{" "}
                    Komentar harus tetap relevan — bukan hanya emoji berulang.
                  </li>
                </ul>

                <div className="mt-4 border-t border-white/10 pt-3 text-[11px] sm:text-xs text-zinc-400">
                  Pelanggaran berat dapat berakibat komentar dihapus, dan akun/IP dapat dikenakan{" "}
                  <span className="font-semibold text-red-300">banned permanen</span> tanpa pemberitahuan.
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
