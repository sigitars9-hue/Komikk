// src/components/Slider.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSlider } from '../lib/api';
import { isInLibrary, toggleLibrary } from '../lib/library';
import toast from 'react-hot-toast';
import { BookmarkPlus, BookmarkCheck, Star } from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination as SwiperPagination, EffectFade, Parallax, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/parallax';

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

const TypeChip = ({ type }) => {
  const t = (type || '').toLowerCase();
  let cls = 'bg-zinc-800 text-white';
  if (t === 'manga')   cls = 'bg-black text-white';
  if (t === 'manhwa')  cls = 'bg-blue-600 text-white';
  if (t === 'manhua')  cls = 'bg-red-600 text-yellow-300';
  return (
    <span className={`px-2 py-[3px] rounded-md text-[10px] sm:text-[11px] ${cls}`}>
      {type}
    </span>
  );
};

export default function Slider() {
  const [items, setItems] = useState([]);
  const heroItems = useMemo(() => items.slice(0, 8), [items]);

  const [active, setActive] = useState(0);
  const [inFav, setInFav]   = useState(false);
  const [busy, setBusy]     = useState(false);
  const cur = heroItems[active] || {};

  useEffect(() => {
    let live = true;
    fetchSlider().then(r => live && setItems(Array.isArray(r) ? r : [])).catch(() => live && setItems([]));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cur?.slug) { if (alive) setInFav(false); return; }
      try {
        const ok = await isInLibrary('favorites', cur.slug);
        if (alive) setInFav(!!ok);
      } catch {
        if (alive) setInFav(false);
      }
    })();
    return () => { alive = false; };
  }, [cur?.slug]);

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
    <div className="rounded-none md:rounded-3xl overflow-hidden ring-0 md:ring-1 md:ring-white/10 shadow-none md:shadow-[0_10px_30px_rgba(0,0,0,.25)]">
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
        onSlideChange={(sw) => setActive(sw.realIndex ?? sw.activeIndex ?? 0)}
        // ❗ lebih pendek sedikit di mobile, biar konten nggak “mejet”
        className="w-full h-[50vw] sm:h-[38vw] lg:h-[460px] bg-zinc-900"
      >
        {heroItems.map((it, idx) => (
          <SwiperSlide key={`hero-${idx}`}>
            <div className="relative w-full h-full">
              <Link to={`/series/${it.slug || it.id}`} className="block absolute inset-0">
                <img
                  data-swiper-parallax="-15%"
                  src={it.backdrop || it.cover}
                  alt={it.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>

              {/* Overlay gelap */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/0" />

              {/* Konten — pake padding aman kiri/kanan + ukuran mobile diperkecil */}
              <div
                data-swiper-parallax="-100"
                className="
                  absolute bottom-6 sm:bottom-10
                  left-[max(14px,env(safe-area-inset-left))]
                  right-[max(14px,env(safe-area-inset-right))]
                  max-w-[min(720px,78%)]
                "
              >
                {/* meta row */}
                <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                  {it.rating && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-[3px] rounded-md bg-white/10 ring-1 ring-white/15">
                      <Star className="w-3.5 h-3.5 text-yellow-300" />
                      {it.rating}
                    </span>
                  )}
                  {it.type && <TypeChip type={it.type} />}
                  {it.badge && (
                    <span className="text-[10px] sm:text-xs px-2 py-[3px] rounded-md bg-orange-500 text-white">
                      {it.badge}
                    </span>
                  )}
                  {it.updatedAt && (
                    <span className="text-[10px] sm:text-xs px-2 py-[3px] rounded-md bg-zinc-800 text-zinc-200">
                      {fmtAge(it.updatedAt)}
                    </span>
                  )}
                </div>

                {/* judul — skala dinamis di mobile */}
                <h3 className="text-white font-semibold leading-tight drop-shadow
                               text-[clamp(18px,6vw,28px)] sm:text-4xl line-clamp-2">
                  {it.title}
                </h3>

                {/* deskripsi (tetap ada, tapi rapat di mobile) */}
                {it.description && (
                  <p className="mt-1.5 sm:mt-2 text-zinc-200/90 text-[13px] sm:text-base line-clamp-2 sm:line-clamp-3">
                    {it.description}
                  </p>
                )}

                {/* actions */}
                <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 sm:gap-2">
                  <Link
                    to={`/series/${it.slug || it.id}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5
                               rounded-lg bg-brand hover:brightness-110 font-semibold text-[13px] sm:text-[15px]"
                  >
                    Baca
                  </Link>

                  {idx === active && (
                    <button
                      onClick={onToggleReadlist}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5
                                 rounded-lg bg-white/10 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-60
                                 text-[13px] sm:text-[15px]"
                      aria-label={inFav ? 'Hapus dari Readlist' : 'Tambahkan ke Readlist'}
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
                  )}
                </div>
              </div>

              {/* tweak posisi pagination di mobile biar nggak nabrak tombol */}
              <style>{`
                .swiper-pagination-bullets { bottom: 10px; }
                @media (min-width: 640px) { .swiper-pagination-bullets { bottom: 14px; } }
              `}</style>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
