// src/pages/AnnouncementsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ANNOUNCEMENTS } from "../data/announcements";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Pin,
  CalendarDays,
  Clock3,
  ArrowUpRight,
  Bell,
  Wrench,
  Sparkles,
  Info,
  CheckCheck,
  X,
} from "lucide-react";

const PER_PAGE = 10;
const READ_KEY = "gv-comics-read-announcements";

const CATEGORIES = [
  "Semua",
  "Update",
  "Maintenance",
  "Event",
  "Informasi",
];

function getCategory(item) {
  const value = String(
    item.category || item.type || item.kategori || "Informasi"
  ).toLowerCase();

  if (value.includes("maintenance") || value.includes("perbaikan"))
    return "Maintenance";
  if (value.includes("event") || value.includes("acara"))
    return "Event";
  if (
    value.includes("update") ||
    value.includes("pembaruan") ||
    value.includes("rilis")
  )
    return "Update";

  return "Informasi";
}

function isPinned(item) {
  return Boolean(
    item.pinned || item.isPinned || item.important || item.isImportant
  );
}

function getDescription(item) {
  const text = item.description || item.content || item.message || item.body || "";

  if (typeof text !== "string") return "";
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getDate(item) {
  const raw = item.createdAt || item.date || item.updatedAt;

  if (!raw) return "";

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return String(raw);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTimestamp(item) {
  const raw = item.createdAt || item.date || item.updatedAt;
  if (!raw) return 0;

  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function CategoryIcon({ category, size = 15 }) {
  if (category === "Maintenance") return <Wrench size={size} />;
  if (category === "Event") return <Sparkles size={size} />;
  if (category === "Update") return <Bell size={size} />;

  return <Info size={size} />;
}

export default function AnnouncementsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [unreadOnly, setUnreadOnly] = useState(false);

  const currentPage = Math.max(
    1,
    Number(params.get("page") || 1)
  );

  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(readIds));
    } catch {
      // Tetap bisa digunakan jika penyimpanan browser tidak tersedia.
    }
  }, [readIds]);

  const sortedItems = useMemo(() => {
    return [...ANNOUNCEMENTS].sort((a, b) => {
      if (isPinned(a) !== isPinned(b)) {
        return isPinned(a) ? -1 : 1;
      }

      return getTimestamp(b) - getTimestamp(a);
    });
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return sortedItems.filter((item) => {
      const searchable = [
        item.title,
        getDescription(item),
        item.category,
        item.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || searchable.includes(q);
      const matchesCategory =
        category === "Semua" || getCategory(item) === category;
      const matchesRead = !unreadOnly || !readIds.includes(String(item.id));

      return matchesQuery && matchesCategory && matchesRead;
    });
  }, [sortedItems, query, category, unreadOnly, readIds]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / PER_PAGE)
  );

  const page = Math.min(currentPage, totalPages);

  const visibleItems = filteredItems.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const unreadCount = ANNOUNCEMENTS.filter(
    (item) => !readIds.includes(String(item.id))
  ).length;

  const goPage = (nextPage) => {
    const next = Math.min(Math.max(1, nextPage), totalPages);
    navigate(`/announcements?page=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markAsRead = (id) => {
    const key = String(id);
    setReadIds((prev) =>
      prev.includes(key) ? prev : [...prev, key]
    );
  };

  const markAllAsRead = () => {
    setReadIds((prev) => [
      ...new Set([
        ...prev,
        ...filteredItems.map((item) => String(item.id)),
      ]),
    ]);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("Semua");
    setUnreadOnly(false);
    navigate("/announcements?page=1");
  };

  const pinnedItems = filteredItems.filter(isPinned);
  const hasFilters =
    query.trim() !== "" || category !== "Semua" || unreadOnly;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-zinc-950 to-zinc-950" />

        <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link to="/" className="hover:text-white">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <span className="text-zinc-200">Pengumuman</span>
          </div>

          <div className="mt-7 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
                <Megaphone size={14} />
                PUSAT INFORMASI
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Pengumuman
                <span className="text-brand"> Comicverse.id</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 md:text-base">
                Informasi update series, jadwal maintenance, event,
                dan kabar terbaru dari Comicverse.id.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:min-w-[270px]">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
                <div className="text-xs text-zinc-400">
                  Total pengumuman
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {ANNOUNCEMENTS.length}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
                <div className="text-xs text-zinc-400">
                  Belum dibaca
                </div>
                <div className="mt-2 text-2xl font-bold text-brand">
                  {unreadCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-10">
        {/* Pinned announcements */}
        {!hasFilters && pinnedItems.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Pin size={17} className="text-amber-400" />
              <h2 className="font-bold">Pengumuman Penting</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {pinnedItems.slice(0, 2).map((item) => (
                <Link
                  key={item.id}
                  to={`/announcement/${item.id}`}
                  onClick={() => markAsRead(item.id)}
                  className="group relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.09] to-zinc-900/80 p-4 transition hover:border-amber-400/40 md:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-400">
                      <Pin size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                          Pinned
                        </span>

                        <span className="text-[11px] text-zinc-500">
                          {getDate(item)}
                        </span>
                      </div>

                      <h3 className="line-clamp-2 font-bold leading-snug group-hover:text-amber-300">
                        {item.title}
                      </h3>

                      {getDescription(item) && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                          {getDescription(item)}
                        </p>
                      )}
                    </div>

                    <ArrowUpRight
                      size={17}
                      className="shrink-0 text-zinc-500 transition group-hover:text-white"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search and controls */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-3 md:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (currentPage !== 1) navigate("/announcements?page=1");
                }}
                placeholder="Cari pengumuman..."
                className="w-full rounded-xl border border-white/10 bg-zinc-950 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-zinc-600 focus:border-brand/60"
              />

              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  aria-label="Hapus pencarian"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                  unreadOnly
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-white/10 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <Bell size={14} />
                Belum dibaca
              </button>

              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
              >
                <CheckCheck size={14} />
                Tandai dibaca
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setCategory(name);
                  if (currentPage !== 1) navigate("/announcements?page=1");
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  category === name
                    ? "border-brand/40 bg-brand text-white"
                    : "border-white/10 bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {name !== "Semua" && (
                  <CategoryIcon category={name} size={13} />
                )}
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* List heading */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold md:text-xl">
              {hasFilters ? "Hasil Pengumuman" : "Semua Pengumuman"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Menampilkan {visibleItems.length} dari {filteredItems.length} pengumuman
            </p>
          </div>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-brand hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Announcement list */}
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-800 text-zinc-500">
              <Search size={23} />
            </div>

            <h3 className="mt-4 font-semibold">
              Pengumuman tidak ditemukan
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Coba kata kunci atau kategori lainnya.
            </p>

            <button
              onClick={resetFilters}
              className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Hapus filter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => {
              const itemCategory = getCategory(item);
              const read = readIds.includes(String(item.id));
              const description = getDescription(item);

              return (
                <Link
                  key={item.id}
                  to={`/announcement/${item.id}`}
                  onClick={() => markAsRead(item.id)}
                  className={`group relative flex gap-3 overflow-hidden rounded-2xl border p-3 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-800/80 sm:gap-4 sm:p-4 ${
                    isPinned(item)
                      ? "border-amber-400/20 bg-amber-400/[0.035]"
                      : "border-white/10 bg-zinc-900/50 hover:border-white/20"
                  }`}
                >
                  {!read && (
                    <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-brand" />
                  )}

                  <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800 sm:h-[92px] sm:w-[92px]">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-brand">
                        <Megaphone size={27} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-950/70 px-2 py-1 text-[10px] font-semibold text-zinc-300">
                        <CategoryIcon category={itemCategory} size={12} />
                        {itemCategory}
                      </span>

                      {isPinned(item) && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-400">
                          <Pin size={11} />
                          Penting
                        </span>
                      )}

                      {!read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      )}
                    </div>

                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-100 transition group-hover:text-brand sm:text-base">
                      {item.title}
                    </h3>

                    {description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-400 sm:text-sm">
                        {description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500 sm:text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} />
                        {getDate(item) || "Tanggal tidak tersedia"}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} />
                        {read ? "Sudah dibaca" : "Belum dibaca"}
                      </span>
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-center text-zinc-600 transition group-hover:text-brand sm:flex">
                    <ArrowUpRight size={19} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredItems.length > 0 && (
          <div className="mt-7 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row">
            <p className="text-xs text-zinc-500">
              Halaman {page} dari {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                aria-label="Halaman sebelumnya"
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-zinc-900 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={17} />
              </button>

              {Array.from(
                { length: Math.min(5, totalPages) },
                (_, i) => {
                  const startPage = Math.min(
                    Math.max(1, page - 2),
                    Math.max(1, totalPages - 4)
                  );
                  return startPage + i;
                }
              ).map((num) => (
                <button
                  key={num}
                  onClick={() => goPage(num)}
                  className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-semibold transition ${
                    num === page
                      ? "border-brand bg-brand text-white"
                      : "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Halaman berikutnya"
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-zinc-900 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}