// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Slider from '../components/Slider';
import Card from '../components/Card';
import CardPopular from '../components/CardPopular';
import SectionHeader from '../components/SectionHeader';
import Pagination from '../components/Pagination';
import HomeTopBar from '../components/HomeTopBar';
import { fetchLatest, fetchRecommendations, fetchPopular } from '../lib/api';
import { ANNOUNCEMENTS } from '../data/announcements';


/* Hook sederhana cek mobile */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

/* ======= Announcement teaser ringkas ======= */
function AnnouncementTeaser({ limit = 1 }) {
  // langsung pakai data lokal
  const items = ANNOUNCEMENTS;

  if (!items.length) {
    return <div className="text-zinc-400">Belum ada pengumuman.</div>;
  }

  return (
    <ul className="space-y-3">
      {items.slice(0, limit).map((a) => (
        <li key={a.id}>
          <Link
            to={`/announcement/${a.id}`}
            className="flex items-start gap-3 rounded-lg p-3 transition
                       hover:bg-zinc-800/70 ring-1 ring-white/10 bg-zinc-900/50"
          >
<img
  src={a.avatar || "https://i.ibb.co.com/ZR4g84zj/yuracry.png"}
  onError={(e) => { e.currentTarget.src = "https://i.ibb.co.com/ZR4g84zj/yuracry.png"; }}
  alt=""
  className="w-12 h-12 rounded-md object-cover ring-1 ring-white/10 flex-none"
/>

            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold line-clamp-2">
                {a.title}
              </div>
              <div className="text-xs text-zinc-400 mt-1">{a.createdAt}</div>
            </div>
          </Link>
        </li>
      ))}
      <li className="md:hidden pt-1">
        <Link
          to="/announcements"
          className="inline-flex items-center text-sm text-brand hover:underline"
        >
          Lihat semua
        </Link>
      </li>
    </ul>
  );
}


/* ======= POPULAR (grid 3/6) ======= */
function PopularSection() {
  const [tab, setTab] = useState('daily');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMobile = useIsMobile();
  const limit = isMobile ? 3 : 6;

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    fetchPopular(tab)
      .then(r => alive && setItems(Array.isArray(r) ? r : []))
      .catch(() => alive && setError('Gagal memuat populer.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tab]);

  return (
    <section className="space-y-4">
      <SectionHeader title="Populer" />
      {/* Tabs di bawah judul */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'daily',  label: 'Harian' },
          { key: 'weekly', label: 'Mingguan' },
          { key: 'all',    label: 'Semua' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ring-1
              ${tab === t.key
                ? 'bg-brand text-white ring-brand/30'
                : 'bg-zinc-800 hover:bg-zinc-700 ring-white/10 text-zinc-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

{loading && (
  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 animate-pulse">
    {Array.from({ length: limit }).map((_, i) => (
      <div
        key={i}
        className="rounded-lg bg-zinc-900/80 ring-1 ring-white/10 overflow-hidden"
      >
        <div className="aspect-[130/200] bg-zinc-800/80" />
        <div className="p-2 space-y-2">
          <div className="h-3 bg-zinc-800/70 rounded w-5/6" />
          <div className="h-3 bg-zinc-800/50 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
)}

{error && <div className="text-rose-400">{error}</div>}

{!loading && !error && (
  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
    {items.slice(0, limit).map((it, idx) => (
      <CardPopular
        key={it.slug || idx}
        item={it}
        className="rounded-lg"
      />
    ))}
  </div>
)}

    </section>
  );
}

/* ======= HOME ======= */
export default function Home() {
  const [latest, setLatest] = useState([]);
  const [reco, setReco] = useState([]);
  const [tab, setTab] = useState('manhwa');
  const [page, setPage] = useState(1);
  const [loadLatest, setLoadLatest] = useState(false);
  const [loadReco, setLoadReco] = useState(false);

  const isMobile = useIsMobile();
  const recoLimit = isMobile ? 3 : 6; // 3 mobile, 6 desktop

  /* Latest */
  useEffect(() => {
    let live = true;
    setLoadLatest(true);
    fetchLatest(page)
      .then(r => live && setLatest(Array.isArray(r) ? r : []))
      .finally(() => live && setLoadLatest(false));
    return () => { live = false; };
  }, [page]);

  /* Recommendations */
  useEffect(() => {
    let live = true;
    setLoadReco(true);
    fetchRecommendations(tab)
      .then(r => live && setReco(Array.isArray(r) ? r : []))
      .finally(() => live && setLoadReco(false));
    return () => { live = false; };
  }, [tab]);

  return (
    <div className="space-y-10">
      {/* TopBar khusus Home */}
      <HomeTopBar />

      {/* Hero: Slider + Pengumuman */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        {/* Slider */}
        <div className="rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,.25)]">
          <Slider />
        </div>

        {/* Pengumuman */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-2xl font-extrabold">Pengumuman</h2>
            <Link to="/announcements" className="text-sm text-zinc-400 hover:text-white">
              Semua
            </Link>
          </div>

          <div className="rounded-xl ring-1 ring-white/10 bg-zinc-900/60 p-4">
            <AnnouncementTeaser limit={1} />
          </div>
        </div>
      </div>
{/* ───── 2 Iklan sejajar kanan–kiri (rapi di mobile) ───── */}
<section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mx-0 md:-mx-6 2xl:-mx-10">
  {[
    { href: "https://tokowendigg.com", src: "/ads/tokowendigg.jpg", alt: "Tokowendigg" },
    { href: "https://instagram.com/juraganakun.official", src: "/ads/juragan.jpg", alt: "Juragan Akun" },
  ].map((ad, i) => (
    <a
      key={i}
      href={ad.href}
      target="_blank"
      rel="noreferrer"
      className="block"
    >
      <img
        src={ad.src}
        alt={ad.alt}
        className="
          block w-full max-w-full
          h-[64px] sm:h-[80px] md:h-[110px] lg:h-[140px]
          object-cover
          ring-1 ring-white/10
          hover:brightness-110 transition
        "
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    </a>
  ))}
</section>


{/* Rekomendasi (grid 3/6, tab di bawah judul) */}
<section className="space-y-4">
  <SectionHeader title="Rekomendasi" />

  {/** Meta tab: flag + label + negara */}
  {/** manga -> 🇯🇵 Jepang, manhwa -> 🇰🇷 Korea Selatan, manhua -> 🇨🇳 China */}
  <div className="flex flex-wrap gap-2">
    {[
      { key: 'manga',  label: 'Manga',  flag: '🇯🇵', country: 'Jepang' },
      { key: 'manhwa', label: 'Manhwa', flag: '🇰🇷', country: 'Korea Selatan' },
      { key: 'manhua', label: 'Manhua', flag: '🇨🇳', country: 'China' },
    ].map(t => (
      <button
        key={t.key}
        onClick={() => setTab(t.key)}
        aria-label={`${t.label} (${t.country})`}
        className={`px-3 py-1.5 rounded-lg text-sm transition ring-1 flex items-center gap-2
          ${tab === t.key
            ? 'bg-brand text-white ring-brand/30'
            : 'bg-zinc-800 hover:bg-zinc-700 ring-white/10 text-zinc-200'}`}
      >
        <span className="text-base">{t.flag}</span>
        {/* Label boleh disembunyikan di layar super kecil kalau mau full icon */}
        <span className="text-xs font-medium">
          {t.label}
        </span>
      </button>
    ))}
  </div>

{loadReco && (
  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 animate-pulse">
    {Array.from({ length: recoLimit }).map((_, i) => (
      <div
        key={i}
        className="rounded-lg bg-zinc-900/80 ring-1 ring-white/10 overflow-hidden"
      >
        <div className="aspect-[130/200] bg-zinc-800/80" />
      </div>
    ))}
  </div>
)}

{!loadReco && (
  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
    {reco.slice(0, recoLimit).map((it, idx) => (
      <Card
        key={it.slug || idx}
        item={it}
        hideTitle
        className="rounded-lg"
      />
    ))}
  </div>
)}

{!loadReco && reco.length === 0 && (
  <div className="text-zinc-400">Rekomendasi belum tersedia.</div>
)}

</section>


      {/* Populer */}
      <PopularSection />

      {/* Update Terbaru */}
      <section className="space-y-4">
<SectionHeader title="Update Terbaru" />

{loadLatest ? (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 animate-pulse">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="rounded-lg bg-zinc-900/80 ring-1 ring-white/10 overflow-hidden"
      >
        <div className="aspect-[130/200] bg-zinc-800/80" />
      </div>
    ))}
  </div>
) : (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
    {latest.map(it => (
      <Card
        key={it.id || it.slug}
        item={it}
        variant="compact"
        className="rounded-lg"
      />
    ))}
  </div>
)}


        <Pagination page={page} setPage={setPage} />
      </section>
    </div>
  );
}
