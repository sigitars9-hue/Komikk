// src/pages/AnnouncementsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { fetchAnnouncements } from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 10;

/* Hook kecil untuk deteksi layar kecil */
function useIsSmall(breakpointPx = 480) {
  const [small, setSmall] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= breakpointPx : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpointPx}px)`);
    const handler = (e) => setSmall(e.matches);
    handler(mq); // initial
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [breakpointPx]);
  return small;
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sp] = useSearchParams();
  const nav = useNavigate();
  const pageFromUrl = Math.max(1, Number(sp.get("page") || 1));

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchAnnouncements()
      .then((r) => live && setItems(Array.isArray(r) ? r : []))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / PER_PAGE)),
    [items.length]
  );

  const page = Math.min(pageFromUrl, totalPages);
  const start = (page - 1) * PER_PAGE;
  const pageItems = items.slice(start, start + PER_PAGE);

  useEffect(() => {
    // scroll ke atas tiap ganti page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const goPage = (p) => {
    const n = Math.min(Math.max(1, p), totalPages);
    nav({ pathname: "/announcements", search: `?page=${n}` });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 md:px-6 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-4 md:mb-6">
        Pengumuman
      </h1>

      {loading ? (
        <div className="space-y-3 md:space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 md:h-24 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="text-zinc-400">Belum ada pengumuman.</div>
      ) : (
        <>
          <div className="space-y-3 md:space-y-4">
            {pageItems.map((a) => (
              <Link
                key={a.id}
                to={`/announcement/${a.id}`}
                className="block p-4 md:p-5 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 hover:bg-zinc-800 transition shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <img
                    src={a.avatar || "https://i.ibb.co.com/ZR4g84zj/yuracry.png"}
                    alt=""
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover ring-1 ring-white/10 flex-none"
                  />
                  <div className="min-w-0 flex-1">
                    {/* Kalau ada plugin line-clamp, pakai line-clamp-2.
                       Jika tidak, `truncate` akan fallback di satu baris. */}
                    <div className="text-[15px] md:text-lg font-semibold line-clamp-2 md:line-clamp-2">
                      {a.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">{a.createdAt}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pager
            page={page}
            totalPages={totalPages}
            onPrev={() => goPage(page - 1)}
            onNext={() => goPage(page + 1)}
            onGoto={(p) => goPage(p)}
            className="mt-5 md:mt-6"
          />
        </>
      )}
    </div>
  );
}

/** Kontrol pagination — responsif di mobile */
function Pager({ page, totalPages, onPrev, onNext, onGoto, className = "" }) {
  const isSmall = useIsSmall(480);
  const windowSize = isSmall ? 3 : 5; // 3 angka di mobile, 5 di desktop
  const half = Math.floor(windowSize / 2);

  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 select-none ${className}`}
    >
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="h-9 w-9 grid place-items-center rounded-md bg-zinc-800 ring-1 ring-white/10 disabled:opacity-50 hover:bg-zinc-700"
        aria-label="Sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onGoto(p)}
          className={`px-3 h-9 rounded-md ring-1 ring-white/10 text-sm sm:text-base ${
            p === page
              ? "bg-brand text-white"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="h-9 w-9 grid place-items-center rounded-md bg-zinc-800 ring-1 ring-white/10 disabled:opacity-50 hover:bg-zinc-700"
        aria-label="Berikutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
