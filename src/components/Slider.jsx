import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchSlider } from '../lib/api';
import { isInLibrary, toggleLibrary } from '../lib/library';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  BookmarkPlus,
  BookmarkCheck
} from 'lucide-react';

const AUTOPLAY_MS = 5000;
const SWIPE_MIN = 40;

export default function Slider() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);

  // status readlist
  const [inFav, setInFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSlider().then(setItems).catch(() => setItems([]));
  }, []);

  const clamp = useCallback(
    (n) => (items.length ? (n + items.length) % items.length : 0),
    [items.length]
  );
  const next = useCallback(() => setI((n) => clamp(n + 1)), [clamp]);
  const prev = useCallback(() => setI((n) => clamp(n - 1)), [clamp]);

  // auto slide
  const timer = useRef(null);
  useEffect(() => {
    clearInterval(timer.current);
    if (items.length > 1) timer.current = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer.current);
  }, [items.length, next]);

  // swipe (mobile)
  const touchStartX = useRef(0);
  const touchDX = useRef(0);
  const onTouchStart = (e) => {
    touchDX.current = 0;
    touchStartX.current = e.touches?.[0]?.clientX ?? 0;
  };
  const onTouchMove = (e) => {
    const x = e.touches?.[0]?.clientX ?? 0;
    touchDX.current = x - touchStartX.current;
  };
  const onTouchEnd = () => {
    const dx = touchDX.current;
    if (dx > SWIPE_MIN) prev();
    else if (dx < -SWIPE_MIN) next();
    touchDX.current = 0;
  };

  const cur = items[i] || {};
  const dots = items.length;

  // cek status readlist ketika slide/daftar berubah
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cur?.slug) {
        if (alive) setInFav(false);
        return;
      }
      try {
        const ok = await isInLibrary('favorites', cur.slug);
        if (alive) setInFav(!!ok);
      } catch {
        if (alive) setInFav(false);
      }
    })();
    return () => { alive = false; };
  }, [i, items, cur?.slug]);

  // toggle readlist
  const onToggleReadlist = async () => {
    if (!cur?.slug) return;
    try {
      setBusy(true);
      const { action } = await toggleLibrary('favorites', {
        slug: cur.slug,
        title: cur.title,
        cover: cur.cover,
        updatedAt: cur.updatedAt || cur.createdAt || null,
      });
      const added = action === 'added';
      setInFav(added);
      toast.success(added ? 'Ditambahkan ke Readlist' : 'Dihapus dari Readlist');
    } catch (e) {
      console.error(e);
      toast.error('Login Dulu Kawan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden ring-1 ring-white/10 bg-zinc-900 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* gambar */}
      {cur.cover ? (
        <img
          src={cur.cover}
          alt={cur.title || 'slider'}
          className="w-full h-[300px] md:h-[420px] object-cover"
        />
      ) : (
        <div className="w-full h-[300px] md:h-[420px] bg-zinc-800" />
      )}

      {/* overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />

      {/* konten */}
      <div className="absolute left-5 md:left-8 bottom-6 md:bottom-8 right-5">
        <div className="max-w-3xl space-y-2 md:space-y-3">
          {/* rating + genre */}
          <div className="flex items-center gap-2 text-sm">
            {cur.rating && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 ring-1 ring-white/15">
                <Star className="w-4 h-4 text-yellow-300" />
                {cur.rating}
              </span>
            )}
            {Array.isArray(cur.genres) && cur.genres[0] && (
              <span className="px-2 py-1 rounded-md bg-brand/90 text-white">
                {cur.genres[0]}
              </span>
            )}
          </div>

          {/* judul */}
          <h3 className="text-2xl md:text-4xl font-extrabold leading-tight">
            {cur.title || '—'}
          </h3>

          {/* sinopsis */}
          {cur.desc && (
            <p className="text-white/90 text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-3">
              {cur.desc}
            </p>
          )}

          {/* tombol */}
          <div className="pt-2 flex items-center gap-2">
            {cur.slug && (
              <Link
                to={`/series/${cur.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:brightness-110 font-semibold"
              >
                Baca
              </Link>
            )}
            <button
              onClick={onToggleReadlist}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-60"
              aria-label="Toggle Readlist"
            >
              {inFav ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Di Readlist</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Readlist</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* tombol panah */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-black/50 hover:bg-black/60 ring-1 ring-white/15 backdrop-blur"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-black/50 hover:bg-black/60 ring-1 ring-white/15 backdrop-blur"
            aria-label="Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* indikator dot */}
      {dots > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 px-3">
          {Array.from({ length: dots }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === i ? 'w-5 bg-brand' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
