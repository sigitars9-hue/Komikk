'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CommentsSection from "../components/CommentsSection";
import {MessageSquare } from 'lucide-react';


import {
  ChevronLeft, ChevronRight, Home, Settings, Play, Pause, List,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { fetchChapterPages, fetchChapters, fetchSeries } from '../lib/api';

const SPEED_KEY = 'gv:reader:speed';
const TIP_KEY = 'gv:reader:tip:v1'; // versi tip
const LAZY_KEY = 'gv:reader:lazy';  // ⬅️ baru


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


/* ====== helper dedupe ====== */
function normalizeUrl(u = '') {
  try {
    const url = new URL(String(u), window.location.origin);
    // fokus ke path+filename (abaikan protokol/host/query/hash)
    return `${url.pathname}`.replace(/\/+/g, '/').trim();
  } catch {
    return String(u).trim();
  }
}

function dedupePages(list = []) {
  const seen = new Set();
  const out = [];
  for (const it of list) {
    const url = typeof it === 'string' ? it : (it.imageUrl || it.url || '');
    const norm = normalizeUrl(url)
      // OPSIONAL: satukan pola -part1,-part2,… jadi satu kunci (hapus baris ini jika tiap part harus tampil)
      .replace(/-part\d+(?=\.\w+$)/i, '');
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(typeof it === 'string' ? { imageUrl: it } : { ...it, imageUrl: url });
    }
  }
  return out;
}
function PageImage({ src, alt, index, innerRef, lazy }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  return (
    <div
      ref={innerRef}
      className="relative w-full"
    >
      {/* Skeleton saat loading */}
      {!loaded && !failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
          <div className="w-10/12 max-w-[900px] h-[60vh] max-h-[520px] rounded-2xl bg-zinc-800/80 animate-pulse" />
          <div className="mt-3 px-3 py-1.5 rounded-full bg-zinc-900/90 ring-1 ring-white/10 text-[11px] text-zinc-300">
            Memuat gambar {index + 1}…
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="px-3 py-2 rounded-lg bg-rose-900/40 ring-1 ring-rose-500/40 text-xs text-rose-200">
            Gagal memuat gambar
          </div>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}   // ⬅️ pakai state lazy
        className={`
          block w-full select-none    
          transition-opacity duration-300
          ${loaded && !failed ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          margin: 0,
          padding: 0,
          border: 0,
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setFailed(true);
          setLoaded(false);
          e.currentTarget.classList.add('opacity-30');
        }}
      />
    </div>
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


const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const update = () => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 640); // < 640px = mobile
    }
  };
  update(); // cek pertama kali
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, []);


  
  const [showTip, setShowTip] = useState(false);
  const [nextPending, setNextPending] = useState(false);
  useEffect(() => {
  cancelNextDelay();
}, [slug, cid]);

  const [nextCountdown, setNextCountdown] = useState(0);
  const nextTimerRef = useRef(null);
  const countdownRef = useRef(null);
  // ⬇️ state baru untuk Lazy Load
  const [lazyLoad, setLazyLoad] = useState(() => {
    try {
      const saved = localStorage.getItem(LAZY_KEY);
      // default: ON kalau belum pernah di-set
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LAZY_KEY, lazyLoad ? '1' : '0');
    } catch {}
  }, [lazyLoad]);

const pageRefs = useRef([]);
const wrapperRef = useRef(null);
const endRef = useRef(null);
const lastScrollYRef = useRef(0); 
const armedAtYRef = useRef(null); 

  // tampilkan popup tip sekali untuk perangkat ini
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





  // sembunyikan elemen bertanda data-reader-hide
  useEffect(() => {
    const hideTargets = document.querySelectorAll('[data-reader-hide]');
    const backups = [...hideTargets].map((el) => [el, el.style.display]);
    hideTargets.forEach((el) => (el.style.display = 'none'));
    return () => backups.forEach(([el, prev]) => (el.style.display = prev));
  }, []);

  // load detail + chapters + pages (SATU jalur setPages + dedupe)
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
          setPages(dedupePages(local));
        } else if (current) {
          const items = await fetchChapterPages(current.id || current.number).catch(() => []);
          if (!alive) return;
          setPages(dedupePages(items));
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

  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent, { capture: true });
    document.addEventListener('selectstart', prevent, { capture: true });
    document.addEventListener('dragstart', prevent, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', prevent, { capture: true });
      document.removeEventListener('selectstart', prevent, { capture: true });
      document.removeEventListener('dragstart', prevent, { capture: true });
    };
  }, []);

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

  const atBottom =
    window.innerHeight + window.scrollY >= document.body.scrollHeight - 1;

  if (atBottom) {
    setIsPlaying(false);
    // kalau mau reset flag di sini boleh, atau hapus saja
  } else {
    raf.current = requestAnimationFrame(step);
  }
};
 const AUTO_NEXT_DELAY = 5000; // 2 detik

function cancelNextDelay() {
  if (nextTimerRef.current) {
    clearTimeout(nextTimerRef.current);
    nextTimerRef.current = null;
  }
  if (countdownRef.current) {
    clearInterval(countdownRef.current);
    countdownRef.current = null;
  }

  armedAtYRef.current = null;   // reset posisi arm
  setNextPending(false);
  setNextCountdown(0);
}

function armNextWithDelay(targetChapter, fromY) {
  if (!targetChapter) return;

  // pastikan bersih dulu
  cancelNextDelay();

  // simpan posisi saat di-arm (buat deteksi scroll naik)
  const yNow =
    typeof fromY === "number"
      ? fromY
      : (window.scrollY || window.pageYOffset || 0);

  armedAtYRef.current = yNow;
  setNextPending(true);

  let remaining = AUTO_NEXT_DELAY / 1000;
  setNextCountdown(remaining);

  // countdown tampilan
  countdownRef.current = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextCountdown(Math.max(remaining, 0));
  }, 1000);

  // timer pindah chapter
  nextTimerRef.current = setTimeout(() => {
    nextTimerRef.current = null;
    setNextPending(false);
    setNextCountdown(0);
    armedAtYRef.current = null;

    showHint(`Lanjut ke Chapter ${targetChapter.number}`);
    navigate(toChapterHref(targetChapter));
  }, AUTO_NEXT_DELAY);
}




useEffect(() => {
  cancelAnimationFrame(raf.current);
  if (isPlaying) raf.current = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf.current);
}, [isPlaying, speed]);


// HAPUS / GANTI YANG LAMA:
// const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
// const scrollBottom = () =>
//   window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

// Scroll ke page berikutnya
const scrollNextPage = () => {
  const refs = pageRefs.current || [];
  const y = window.scrollY;
  let targetIndex = -1;

  for (let i = 0; i < refs.length; i++) {
    const el = refs[i];
    if (!el) continue;
    const top = el.offsetTop;
    if (top > y + 10) {        // sedikit di bawah posisi sekarang
      targetIndex = i;
      break;
    }
  }

  if (targetIndex === -1) targetIndex = refs.length - 1; // kalau sudah mentok, ke terakhir

  const target = refs[targetIndex];
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Scroll ke page sebelumnya
const scrollPrevPage = () => {
  const refs = pageRefs.current || [];
  const y = window.scrollY;
  let targetIndex = 0;

  for (let i = refs.length - 1; i >= 0; i--) {
    const el = refs[i];
    if (!el) continue;
    const top = el.offsetTop;
    if (top < y - 10) {        // sedikit di atas posisi sekarang
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

  // judul

const title = series?.title || current?.title || slug || cid;
  // 🔑 ID komentar per chapter yang stabil
  const chapterKey = useMemo(() => {
    if (!current) return null;
    const base = series?.slug || slug || 'series';
    const numOrId = current.number ?? current.id ?? cid;
    // contoh: "my-series-slug-ch-3"
    return `${base}-ch-${numOrId}`;
  }, [series, slug, cid, current]);


// navigate helper (gunakan route baru bila memungkinkan)
// navigate helper (untuk route lama /read/:chapterId)
const toChapterHref = (ch) => {
  const baseSlug = series?.slug || slug;
  const idOrNum = String(ch.id || ch.number || '');
  // kalau id sudah mengandung slug, pakai langsung
  const fullId = idOrNum.startsWith(baseSlug)
    ? idOrNum
    : `${baseSlug}-${idOrNum}`;
  return `/read/${fullId}`;
};
  

// Auto next: aktif kalau user benar-benar sudah di paling bawah
useEffect(() => {
  if (!next) {
    cancelNextDelay();
    return;
  }

  const handleScroll = () => {
    const vh =
      window.innerHeight || document.documentElement.clientHeight;
    const fullH = document.documentElement.scrollHeight;
    const y = window.scrollY || window.pageYOffset || 0;

    const distanceFromBottom = fullH - (y + vh);

    // 1) BELUM ada timer & sudah nempel ke bawah -> arm sekali
    if (!nextTimerRef.current && distanceFromBottom <= 24) {
      armNextWithDelay(next, y);
      return;
    }

    // 2) SUDAH ada timer: batalkan kalau user naik cukup jauh dari posisi arm
    if (
      nextTimerRef.current &&
      armedAtYRef.current != null &&
      y < armedAtYRef.current - 120
    ) {
      cancelNextDelay();
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  // kalau pas mount sudah di bawah, cek sekali
  handleScroll();

  return () => {
    window.removeEventListener("scroll", handleScroll);
    cancelNextDelay(); // reset kalau pindah chapter / slug
  };
}, [next, slug, cid]); // ⬅️ tanpa nextPending






  return (
    // keluar dulu dari padding layout dengan margin negatif
      <div className="bg-black -mx-4 sm:mx-0">

      {/* === Image Reader === */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
        onPointerLeave={clearPress}
        onClick={onTap}
        className="
          text-[0] leading-none
         w-full max-w-[800px] mx-auto
        "
      >
{pages?.map((p, i) => {
  const src = p.imageUrl || p.url || p;
  const k = normalizeUrl(src);
  return (
    <PageImage
      key={k || i}
      src={src}
      alt={`Page ${i + 1}`}
      index={i}
      lazy={lazyLoad}                          // ⬅️ kirim flag lazy
      innerRef={el => { pageRefs.current[i] = el; }}
    />
  );
})}


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
            fixed left-2 right-2 sm:left-4 sm:right-4 z-40
            transition-all duration-300 ease-out
            ${hudVisible
              ? 'top-2 sm:top-4 opacity-100 translate-y-0 pointer-events-auto'
              : 'top-0 sm:top-1 opacity-0 -translate-y-3 pointer-events-none'}
          `}
        >
          <div
            className="
              bg-zinc-900/90 ring-1 ring-white/10 rounded-2xl
              px-2.5 py-2 sm:px-4 sm:py-3
              shadow-lg flex items-center gap-2 sm:gap-3
            "
          >
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-zinc-800 w-9 h-9 sm:w-10 sm:h-10 grid place-items-center hover:bg-zinc-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* judul + badge chapter */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold truncate">{title}</div>
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

            <Link
              to="/"
              className="rounded-lg bg-zinc-800 w-9 h-9 sm:w-10 sm:h-10 grid place-items-center hover:bg-zinc-700"
            >
              <Home className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Buttons center bottom */}
        <div
          className="fixed inset-x-0 z-40 pointer-events-none"
          style={{
            // sedikit lebih naik + aman notch
            bottom: 'calc(max(24px, env(safe-area-inset-bottom, 0)) + 10px)',
          }}
          
        >
          <div
            className={`
              mx-auto w-full max-w-[740px] px-3
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

            {next ? (
              <Fab as={Link} to={toChapterHref(next)}>
                <ChevronRight />
              </Fab>
            ) : null}

            <Fab as={Link} to="/">
              <Home />
            </Fab>
          </div>
        </div>


{/* Scroll Up/Down */}
<div
  className={`
    fixed z-40 flex flex-col gap-2 sm:gap-3
    transition-all duration-300 ease-out
    ${hudVisible
      ? 'opacity-100 translate-y-0 pointer-events-auto'
      : 'opacity-0 translate-y-3 pointer-events-none'}
  `}
style={{
  right: isMobile
    ? '28px'  // 📱 mobile: sudah pas
    : '280px', // 🖥 desktop: lebih ke kanan (dekat tepi layar)
  bottom: 'calc(max(24px, env(safe-area-inset-bottom, 0)) + 96px)',
}}

>

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

      {/* Kecepatan Auto Scroll */}
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

      <div className="h-px w-full bg-white/10 my-3" />

      {/* Lazy Load Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Lazy Load Gambar</div>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            {lazyLoad ? (
              <>
                <b>ON</b>: gambar baru diunduh saat kamu
                hampir sampai di bagian tersebut. Lebih hemat kuota dan RAM,
                cocok untuk jaringan lemah.
              </>
            ) : (
              <>
                <b>OFF</b>: semua gambar dalam chapter langsung diunduh dari
                awal. Lebih berat, tapi setelah selesai load, scroll terasa
                lebih mulus karena tidak ada loading di tengah.
              </>
            )}
          </p>
        </div>

        {/* Tombol toggle sederhana */}
        <button
          onClick={() => setLazyLoad((v) => !v)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
            transition-colors duration-200
            ${lazyLoad ? 'bg-emerald-500' : 'bg-zinc-600'}
          `}
          aria-label="Toggle lazy load"
        >
          <span
            className={`
              inline-block h-5 w-5 transform rounded-full bg-white shadow
              transition-transform duration-200
              ${lazyLoad ? 'translate-x-5' : 'translate-x-1'}
            `}
          />
        </button>
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
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => closeTip(true)}
          />
          {/* card */}
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
                title="Sembunyikan untuk saat ini"
              >
                Nanti Saja
              </button>
              <button
                onClick={() => closeTip(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl
                           bg-gradient-to-r from-brand-dark via-brand to-brand-light text-white
                           hover:brightness-110"
                title="Jangan tampilkan lagi"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

{/* ── Banner Auto Next Chapter: di bawah komentar, di atas footer ── */}
{nextPending && next && (
  <div className="mt-8 flex justify-center">
    <div
      className="
        w-full max-w-[960px]
        rounded-3xl bg-zinc-950/90 ring-1 ring-white/10 shadow-xl
        px-4 sm:px-6 py-5 sm:py-6
      "
    >
      <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
        {/* Gambar Yura di atas, lebih besar */}
<div className="flex items-center justify-center">
  <img
    src="/yura-next-ch.png"
    alt="Yura"
    className="w-38 sm:w-42 h-auto shadow-lg"
    draggable={false}
  />
</div>


        {/* Teks */}
        <div className="space-y-1">
          <p className="text-sm sm:text-base font-semibold">
            Sebentar, Yura bantu pindah ke chapter selanjutnya ya kak
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            Auto lanjut ke{" "}
            <span className="font-semibold">Chapter {next.number}</span>{" "}
            dalam{" "}
            <span className="font-semibold">
              {Math.ceil(nextCountdown || 0)}
            </span>{" "}
            detik…
          </p>
        </div>
      </div>

      {/* Progress bar 5 detik */}
      <div className="mt-4 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-brand transition-[width] duration-200 ease-out"
          style={{
            width: `${
              ((AUTO_NEXT_DELAY / 1000 - nextCountdown) /
                (AUTO_NEXT_DELAY / 1000)) *
              100
            }%`,
          }}
        />
      </div>
    </div>
  </div>
)}

        </div>
      )}


    </div>
  );
}
