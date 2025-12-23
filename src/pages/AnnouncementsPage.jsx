import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ANNOUNCEMENTS } from "../data/announcements";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 10; // jumlah item per halaman

export default function AnnouncementsPage() {
 const [items] = useState(ANNOUNCEMENTS);
 const [loading] = useState(false);

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const currentPage = Math.max(1, Number(params.get("page") || 1));

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / PER_PAGE)),
    [items.length]
  );

  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * PER_PAGE;
  const visibleItems = items.slice(start, start + PER_PAGE);

  const goPage = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    navigate(`/announcements?page=${next}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-6">Pengumuman</h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-zinc-400">Belum ada pengumuman.</div>
      ) : (
        <>
          {/* Daftar pengumuman */}
          <div className="space-y-4">
            {visibleItems.map((a) => (
              <Link
                to={`/announcement/${a.id}`}
                key={a.id}
                className="block p-4 rounded-2xl bg-zinc-800/60 ring-1 ring-white/10 hover:bg-zinc-800 transition shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={a.avatar || "https://i.ibb.co.com/ZR4g84zj/yuracry.png"}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-base md:text-lg font-semibold truncate">
                      {a.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {a.createdAt}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="w-9 h-9 grid place-items-center rounded-md bg-zinc-800 ring-1 ring-white/10 disabled:opacity-50 hover:bg-zinc-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages })
              .slice(
                Math.max(0, page - 3),
                Math.min(totalPages, page + 2)
              )
              .map((_, idx) => {
                const num = Math.max(1, page - 2) + idx;
                return (
                  <button
                    key={num}
                    onClick={() => goPage(num)}
                    className={`px-3 h-9 rounded-md ring-1 ring-white/10 ${
                      num === page
                        ? "bg-brand text-white"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}

            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              className="w-9 h-9 grid place-items-center rounded-md bg-zinc-800 ring-1 ring-white/10 disabled:opacity-50 hover:bg-zinc-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
