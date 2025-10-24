// src/pages/Home.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Slider from '../components/Slider';
import Announcements from '../components/Announcements';
import Card from '../components/Card';
import CardPopular from '../components/CardPopular';
import SectionHeader from '../components/SectionHeader';
import Pagination from '../components/Pagination';
import HomeTopBar from '../components/HomeTopBar';
import { fetchLatest, fetchRecommendations, fetchPopular } from '../lib/api';
import { fetchAnnouncements } from '../lib/api'; 
import { PanelsTopLeft } from 'lucide-react';

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

/* Helpers ukuran kartu populer */
const WIDTH_3_MOBILE = 'w-[calc((100%_-_8px*2)/3)]';
const WIDTH_6_DESK   = 'md:w-[calc((100%_-_12px*5)/6)]';
const WIDTH_2_DESK   = 'md:w-[calc((100%_-_12px*1)/2)]';

function RowItems({ items, colsDesktop }) {
  const widthDesk = colsDesktop === 6 ? WIDTH_6_DESK : WIDTH_2_DESK;
  return (
    <>
      {items.map((it, i) => (
        <div key={(it.id || it.slug || i) + '-row'} className={`shrink-0 ${WIDTH_3_MOBILE} ${widthDesk}`}>
          <CardPopular item={it} />
        </div>
      ))}
    </>
  );
}
function ColBlock({ items }) {
  return (
    <div className={`shrink-0 ${WIDTH_3_MOBILE} ${WIDTH_6_DESK}`}>
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={(it.id || it.slug || i) + '-colitem'}>
            <CardPopular item={it} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== POPULAR SECTION ===== */
export function PopularSection() {
  const [tab, setTab] = useState('daily');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setItems([]);
    fetchPopular(tab)
      .then(r => { if (alive) setItems(r || []); })
      .catch(() => { if (alive) setError('Gagal memuat populer.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  const sixA   = items.slice(0, 6);
  const fourV  = items.slice(6, 10);
  const twoB   = items.slice(10, 12);
  const sixB   = items.slice(12, 18);
  const twelve = items.slice(18, 30);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <SectionHeader title="Populer" />
        <div className="ml-auto flex gap-2">
          {[
            { key: 'daily',  label: 'Harian' },
            { key: 'weekly', label: 'Mingguan' },
            { key: 'all',    label: 'Semua' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded-xl text-sm transition ${
                tab === t.key ? 'bg-brand text-white' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-zinc-400">Memuat…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-wrap gap-2 md:gap-3">
          <RowItems items={sixA} colsDesktop={6} />
          {fourV.length > 0 && <ColBlock items={[fourV[0]]} />}
          {fourV.length > 1 && <ColBlock items={[fourV[1]]} />}
          {fourV.length > 2 && <ColBlock items={[fourV[2]]} />}
          {fourV.length > 3 && <ColBlock items={[fourV[3]]} />}
          <RowItems items={twoB} colsDesktop={2} />
          <RowItems items={sixB} colsDesktop={6} />
          {twelve.map((it, idx) => <ColBlock key={(it.id || it.slug || idx) + '-tw'} items={[it]} />)}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-zinc-400">Belum ada data populer.</div>
      )}
    </section>
  );
}
function AnnouncementTeaser({ limit = 1 }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let live = true;
    fetchAnnouncements()
      .then(r => { if (live) setItems(Array.isArray(r) ? r : []) })
      .catch(() => setItems([]));
    return () => { live = false; };
  }, []);

  if (!items.length) {
    return <div className="text-zinc-400">Belum ada pengumuman.</div>;
  }

  return (
    <ul className="space-y-3">
      {items.slice(0, limit).map(a => (
        <li key={a.id}>
          <Link
            to={`/announcement/${a.id}`}
            className="flex items-start gap-3 rounded-xl p-3 transition
                       hover:bg-zinc-800 ring-1 ring-white/10 bg-zinc-900/40"
          >
            <img
              src={a.avatar || 'https://i.ibb.co.com/ZR4g84zj/yuracry.png'}
              alt=""
              className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10 flex-none"
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
      {/* CTA kecil di mobile */}
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

/* ===== HOME PAGE ===== */
export default function Home() {
  const [latest, setLatest] = useState([]);
  const [reco, setReco] = useState([]);
  const [tab, setTab] = useState('manhwa');
  const [page, setPage] = useState(1);
  const [loadLatest, setLoadLatest] = useState(false);
  const [loadReco, setLoadReco] = useState(false);

  const isMobile = useIsMobile();
  const recoLimit = isMobile ? 3 : 8;   // <<— 3 di mobile, 8 di desktop

  useEffect(() => {
    let live = true;
    setLoadLatest(true);
    fetchLatest(page).then(r => { if (live) setLatest(r); }).finally(() => { if (live) setLoadLatest(false); });
    return () => { live = false; };
  }, [page]);

  useEffect(() => {
    let live = true;
    setLoadReco(true);
    fetchRecommendations(tab).then(r => { if (live) setReco(r); }).finally(() => { if (live) setLoadReco(false); });
    return () => { live = false; };
  }, [tab]);

  return (
    <div className="space-y-10">
      {/* TopBar khusus Home (non-sticky) */}
      <HomeTopBar />

{/* Hero: Slider + Pengumuman */}
<div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
  {/* Slider: full, rapi */}
  <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,.25)]">
    <Slider />
  </div>

  {/* Pengumuman (compact teaser) */}
  <div className="space-y-3">
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-2xl font-extrabold">Pengumuman</h2>
      <Link
        to="/announcements"
        className="text-sm text-zinc-400 hover:text-white"
      >
        Semua
      </Link>
    </div>

    <div className="rounded-2xl ring-1 ring-white/10 bg-zinc-900/60 p-4">
      <AnnouncementTeaser limit={1} />
    </div>
  </div>
</div>



      {/* Rekomendasi */}
      <section className="space-y-4">
        <SectionHeader title="Rekomendasi" />
        <div className="flex gap-2 md:gap-3 flex-nowrap overflow-x-hidden">
          {reco.slice(0, recoLimit).map((it, idx) => (
            <div
              key={it.slug || idx}
              className="
                shrink-0
                w-[calc((100%_-_8px*2)/3)]      /* 3 di mobile */
                md:w-[calc((100%_-_12px*7)/8)]   /* 8 di desktop */
              "
            >
              <Card item={it} hideTitle />
            </div>
          ))}
        </div>
        {!loadReco && reco.length === 0 && (
          <div className="text-zinc-400">Rekomendasi belum tersedia.</div>
        )}
      </section>

      {/* Populer */}
      <PopularSection />

      {/* Update Terbaru */}
      <section className="space-y-4">
        <SectionHeader title="Update Terbaru" />
        {loadLatest && <div className="text-zinc-400">Memuat update…</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {latest.map(it => <Card key={it.id || it.slug} item={it} variant="compact" />)}
        </div>
        <Pagination page={page} setPage={setPage} />
      </section>
    </div>
  );
}
