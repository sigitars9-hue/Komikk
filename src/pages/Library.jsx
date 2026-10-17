// src/pages/Library.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import SectionHeader from "../components/SectionHeader";
import Card from "../components/Card";
import HomeTopBar from "../components/HomeTopBar";
import { useAuth } from "../providers/AuthProvider";
import { getLibraryAll, removeFromLibrary } from "../lib/library";
import { fetchSearch } from "../lib/api";
import { supabase } from "../lib/supabaseClient";

/* ============================ Constants ============================ */
const TABS = [
  { key: "bookmarks", label: "Bookmark" },
  { key: "favorites", label: "Readlist" },
  { key: "history", label: "History" },
];

const SORTS = [
  { key: "newest", label: "Terbaru" },
  { key: "oldest", label: "Terlama" },
  { key: "az", label: "A–Z" },
];

const PAGE_SIZE_GRID = 20;
const PAGE_SIZE_LIST = 10;
const VIEW_KEY = "gv:library:view";

const GRID_CLS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

/* ============================= Helpers ============================= */
function safeText(v) {
  return String(v || "").toLowerCase().trim();
}

function getUpdatedAtValue(it) {
  const raw = it?.updatedAt || it?.lastReadAt || it?.createdAt || it?.addedAt || "";
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function pageNumbers(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…" + n);
    out.push(n);
  });
  return out;
}

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/* ============================ Skeletons ============================ */
function GridCardSkeleton({ count = 10 }) {
  return (
    <div className={clsx(GRID_CLS, "animate-pulse")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 overflow-hidden">
          <div className="aspect-[130/200] bg-zinc-800/70" />
          <div className="p-2 space-y-2">
            <div className="h-3 bg-zinc-800/70 rounded w-5/6" />
            <div className="h-3 bg-zinc-800/40 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ count = 6 }) {
  return (
    <div className="space-y-2 sm:space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 flex gap-3">
          <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-zinc-800/70 flex-none" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-zinc-800/70 rounded w-3/4" />
            <div className="h-3 bg-zinc-800/40 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ Empty state ========================== */
function EmptyState({ tab, searching }) {
  const map = {
    favorites: {
      title: "Readlist kamu masih kosong.",
      desc: "Tambahkan judul yang kamu minati supaya gampang lanjut baca.",
    },
    bookmarks: {
      title: "Bookmark kamu masih kosong.",
      desc: "Bookmark series favoritmu biar gampang dicari.",
    },
    history: {
      title: "Belum ada riwayat baca.",
      desc: "Mulai baca dulu, nanti muncul otomatis di sini.",
    },
  };
  const s = searching
    ? { title: "Tidak ada hasil.", desc: "Coba kata kunci lain." }
    : map[tab] || { title: "Kosong.", desc: "" };

  return (
    <div className="min-h-[36vh] rounded-3xl bg-zinc-900/40 ring-1 ring-white/10 p-8 text-zinc-300 flex flex-col items-center justify-center text-center">
      <img
        src="https://i.ibb.co.com/ZR4g84zj/yuracry.png"
        alt=""
        className="w-20 h-20 sm:w-28 sm:h-28 object-contain mb-4 opacity-95"
      />
      <div className="text-lg sm:text-xl font-semibold">{s.title}</div>
      <div className="text-sm text-zinc-400 mt-2 max-w-md">{s.desc}</div>
    </div>
  );
}

/* ============================ Small parts ========================== */
function SelectBox({ checked, onChange, label, className }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "grid place-items-center w-7 h-7 rounded-lg ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
        checked
          ? "bg-brand text-white ring-brand"
          : "bg-white/90 text-transparent ring-zinc-400/60 hover:bg-white",
        className
      )}
    >
      <Check className="w-4 h-4" strokeWidth={3} />
    </button>
  );
}

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = SORTS.find((s) => s.key === value) || SORTS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Urutkan"
        className="h-11 px-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 inline-flex items-center gap-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-36 rounded-2xl bg-zinc-900 ring-1 ring-white/10 shadow-xl p-1"
        >
          {SORTS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                role="option"
                aria-selected={s.key === value}
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left",
                  s.key === value ? "text-brand" : "text-zinc-200 hover:bg-white/5"
                )}
              >
                {s.label}
                {s.key === value && <Check className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  const btn =
    "grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";
  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5 sm:gap-2" aria-label="Halaman">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
        className={clsx(btn, "ring-white/10 bg-zinc-900/60 text-brand hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900/60")}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {pageNumbers(page, total).map((n) =>
        typeof n === "string" ? (
          <span key={n} className="w-6 text-center text-zinc-500">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={clsx(
              btn,
              "text-sm font-semibold",
              n === page
                ? "bg-brand text-white ring-brand"
                : "bg-zinc-900/60 text-zinc-300 ring-white/10 hover:bg-zinc-800"
            )}
          >
            {n}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= total}
        aria-label="Halaman berikutnya"
        className={clsx(btn, "ring-white/10 bg-zinc-900/60 text-brand hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900/60")}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  );
}

/* =============================== Page ============================== */
export default function Library() {
  const { user, loading, signInGoogle } = useAuth();

  const [tab, setTab] = useState("bookmarks");
  const [data, setData] = useState({ favorites: [], bookmarks: [], history: [] });
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState(readView);
  const [page, setPage] = useState(1);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  // Live search TopBar
  const [topQuery, setTopQuery] = useState("");
  const [topSearchResults, setTopSearchResults] = useState([]);
  const [topSearching, setTopSearching] = useState(false);

  /* ---- Live search (debounce 350ms, min 3 huruf) ---- */
  useEffect(() => {
    const term = topQuery.trim();
    if (term.length < 3) {
      setTopSearchResults([]);
      setTopSearching(false);
      return;
    }
    let alive = true;
    setTopSearching(true);
    const timer = setTimeout(() => {
      fetchSearch(term)
        .then((res) => alive && setTopSearchResults(Array.isArray(res) ? res : []))
        .catch(() => alive && setTopSearchResults([]))
        .finally(() => alive && setTopSearching(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [topQuery]);

  /* ---- Load library ---- */
  const reload = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      setData(await getLibraryAll());
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  /* ---- Realtime Supabase ---- */
  useEffect(() => {
    if (!user || !supabase) return;
    const ch = supabase
      .channel("library-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "library_items", filter: `user_id=eq.${user.id}` },
        async () => {
          try {
            setData(await getLibraryAll());
          } catch (e) {
            console.error("reload gagal", e);
          }
        }
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [user]);

  /* ---- Persist view ---- */
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);

  /* ---- Reset saat ganti tab / filter ---- */
  useEffect(() => {
    setEditing(false);
    setSelected(new Set());
    setPage(1);
    setQuery("");
  }, [tab]);

  useEffect(() => setPage(1), [query, sort, view]);

  /* ---- Derived ---- */
  const counts = useMemo(
    () => ({
      bookmarks: (data.bookmarks || []).length,
      favorites: (data.favorites || []).length,
      history: (data.history || []).length,
    }),
    [data]
  );

  const rawList = data[tab] || [];

  const list = useMemo(() => {
    const q = safeText(query);
    let arr = [...rawList];
    if (q) arr = arr.filter((it) => safeText(it?.title).includes(q));
    arr.sort((a, b) => {
      if (sort === "az") return safeText(a?.title).localeCompare(safeText(b?.title));
      const d = getUpdatedAtValue(a) - getUpdatedAtValue(b);
      return sort === "oldest" ? d : -d;
    });
    return arr;
  }, [rawList, query, sort]);

  const pageSize = view === "list" ? PAGE_SIZE_LIST : PAGE_SIZE_GRID;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => list.slice((safePage - 1) * pageSize, safePage * pageSize),
    [list, safePage, pageSize]
  );

  const tabLabel = TABS.find((t) => t.key === tab)?.label || "Library";
  const isTopSearchActive = topQuery.trim().length >= 3;
  const allSelected = list.length > 0 && list.every((it) => selected.has(it.slug));

  /* ---- Actions ---- */
  const toggleOne = (slug) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(list.map((it) => it.slug)));

  const cancelEdit = () => {
    setEditing(false);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    if (selected.size === 0 || deleting) return;
    if (!window.confirm(`Hapus ${selected.size} item dari ${tabLabel}?`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map((slug) => removeFromLibrary(tab, slug)));
      cancelEdit();
      await reload();
    } catch (e) {
      console.error("hapus gagal", e);
    } finally {
      setDeleting(false);
    }
  };

  const topBar = (
    <div className="max-w-7xl mx-auto px-4 py-3">
      <HomeTopBar searchQuery={topQuery} onSearch={setTopQuery} />
    </div>
  );

  /* ========================== Auth loading ========================== */
  if (loading) {
    return (
      <div className="space-y-6">
        {topBar}
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Library" />
          <div className="mt-4">
            <GridCardSkeleton count={10} />
          </div>
        </div>
      </div>
    );
  }

  /* ========================== Belum login =========================== */
  if (!user && !isTopSearchActive) {
    return (
      <div className="space-y-6">
        {topBar}
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-3xl bg-zinc-900/40 ring-1 ring-white/10 overflow-hidden">
            <div className="p-8 sm:p-12 flex flex-col items-center text-center">
              <img
                src="https://i.ibb.co.com/ZR4g84zj/yuracry.png"
                alt=""
                className="w-20 h-20 sm:w-28 sm:h-28 object-contain mb-5 opacity-95"
              />
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Harus Login Nih Kak~
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-lg">
                Login dulu yuk untuk melihat Bookmark, Readlist, dan History kamu.
              </p>
              <button
                onClick={signInGoogle}
                className="mt-6 px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand-light text-white font-semibold ring-1 ring-brand/30 hover:brightness-110 transition"
              >
                Login
              </button>
              <div className="mt-4 text-xs text-zinc-500">
                Data Library akan tersimpan otomatis setelah kamu login.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ======================== Hasil live search ======================= */
  if (isTopSearchActive) {
    return (
      <div className="space-y-6">
        {topBar}
        <div className="max-w-7xl mx-auto px-4 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
          <div className="space-y-4 min-h-[50vh]">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader title={`Hasil Pencarian: "${topQuery}"`} />
              <button
                onClick={() => setTopQuery("")}
                className="shrink-0 text-xs text-brand hover:underline font-medium"
              >
                Kembali ke Library
              </button>
            </div>

            {topSearching ? (
              <GridCardSkeleton count={10} />
            ) : topSearchResults.length > 0 ? (
              <div className={GRID_CLS}>
                {topSearchResults.map((it) => (
                  <Card key={it.id || it.slug} item={it} />
                ))}
              </div>
            ) : (
              <div className="text-zinc-400 py-16 text-center bg-zinc-900/40 rounded-3xl ring-1 ring-white/5">
                Tidak ada komik yang cocok dengan &quot;{topQuery}&quot;.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ============================= Library ============================ */
  return (
    <div className="space-y-4 sm:space-y-6">
      {topBar}

      <div className="max-w-7xl mx-auto px-4 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
        {/* Tabs: tiga kolom sama lebar, garis bawah untuk tab aktif */}
        <div role="tablist" aria-label="Bagian library" className="grid grid-cols-3 border-b border-white/10">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={clsx(
                  "relative py-3 sm:py-4 text-base sm:text-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                  active ? "text-brand" : "text-zinc-100 hover:text-white"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {t.label}
                  <span
                    className={clsx(
                      "text-[11px] font-medium px-1.5 py-0.5 rounded-md",
                      active ? "bg-brand/20 text-brand" : "bg-white/10 text-zinc-400"
                    )}
                  >
                    {counts[t.key] ?? 0}
                  </span>
                </span>
                {active && <span className="absolute inset-x-2 sm:inset-x-6 -bottom-px h-0.5 rounded-full bg-brand" />}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="mt-4 min-h-11">
          {editing ? (
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-3 cursor-pointer select-none min-w-0">
                <SelectBox
                  checked={allSelected}
                  onChange={toggleAll}
                  label="Pilih semua"
                />
                <span className="text-sm sm:text-base font-medium truncate">
                  Pilih Semua
                  {selected.size > 0 && (
                    <span className="ml-2 text-zinc-400 font-normal">({selected.size})</span>
                  )}
                </span>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={selected.size === 0 || deleting}
                  className="h-11 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white disabled:opacity-40 disabled:hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {deleting ? "Menghapus…" : "Hapus"}
                </button>
                <span className="hidden sm:block w-px h-8 bg-white/10" />
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-11 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search lokal */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Cari di ${tabLabel}…`}
                  aria-label={`Cari di ${tabLabel}`}
                  className="w-full h-11 pl-9 pr-9 rounded-xl bg-zinc-900/60 ring-1 ring-white/10 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-brand"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Hapus pencarian"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Toggle grid / list */}
              <div className="inline-flex p-1 rounded-xl bg-zinc-800/60 gap-1 shrink-0">
                {[
                  ["grid", LayoutGrid, "Tampilan grid"],
                  ["list", List, "Tampilan daftar"],
                ].map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    aria-pressed={view === key}
                    aria-label={label}
                    title={label}
                    className={clsx(
                      "grid place-items-center w-10 h-9 rounded-lg transition",
                      view === key ? "bg-brand text-white" : "text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={rawList.length === 0}
                className="h-11 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-sm font-medium disabled:opacity-40 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                Edit
              </button>

              <span className="hidden sm:block w-px h-8 bg-white/10" />

              <SortMenu value={sort} onChange={setSort} />

              <button
                type="button"
                onClick={reload}
                disabled={busy}
                aria-label="Refresh"
                title="Refresh"
                className="hidden md:grid place-items-center w-11 h-11 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={clsx("w-4 h-4", busy && "animate-spin")} />
              </button>
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-2 text-xs text-zinc-500">
            {list.length} {list.length === 1 ? "judul" : "judul"} di {tabLabel}
          </div>
        )}

        {/* Konten */}
        <div className="mt-4">
          {busy && rawList.length === 0 ? (
            view === "list" ? <ListSkeleton /> : <GridCardSkeleton count={10} />
          ) : list.length === 0 ? (
            <EmptyState tab={tab} searching={!!query.trim()} />
          ) : view === "grid" ? (
            <div className={GRID_CLS}>
              {pageItems.map((it) => {
                const isSel = selected.has(it.slug);
                return (
                  <div
                    key={it.slug}
                    className={clsx(
                      "relative rounded-2xl transition",
                      editing && "cursor-pointer",
                      editing && isSel && "ring-2 ring-brand"
                    )}
                    onClick={editing ? () => toggleOne(it.slug) : undefined}
                  >
                    {/* Saat edit, klik tidak boleh membuka series */}
                    <div className={clsx(editing && "pointer-events-none", editing && !isSel && "opacity-90")}>
                      <Card item={it} />
                    </div>
                    {editing && (
                      <SelectBox
                        checked={isSel}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleOne(it.slug);
                        }}
                        label={`Pilih ${it.title}`}
                        className="absolute bottom-3 right-3 z-20"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {pageItems.map((it) => {
                const isSel = selected.has(it.slug);
                const Row = editing ? "div" : Link;
                const rowProps = editing
                  ? { onClick: () => toggleOne(it.slug), role: "presentation" }
                  : { to: `/series/${it.slug}` };
                return (
                  <li key={it.slug}>
                    <Row
                      {...rowProps}
                      className={clsx(
                        "flex items-center gap-3 sm:gap-4 p-3 rounded-2xl bg-zinc-900/60 ring-1 transition hover:bg-zinc-900",
                        editing ? "cursor-pointer" : "",
                        isSel ? "ring-2 ring-brand" : "ring-white/10"
                      )}
                    >
                      {editing && (
                        <SelectBox
                          checked={isSel}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleOne(it.slug);
                          }}
                          label={`Pilih ${it.title}`}
                          className="shrink-0"
                        />
                      )}
                      <img
                        src={it.cover}
                        alt=""
                        loading="lazy"
                        className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl object-cover ring-1 ring-white/10 flex-none bg-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold line-clamp-2 text-sm sm:text-base">{it.title}</div>
                        {it.updatedAt && (
                          <div className="mt-1 text-[11px] sm:text-xs text-zinc-400">
                            Update: {it.updatedAt}
                          </div>
                        )}
                        {!editing && (
                          <div className="mt-2 text-[11px] sm:text-xs text-brand">Buka series</div>
                        )}
                      </div>
                    </Row>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Pagination
          page={safePage}
          total={totalPages}
          onChange={(n) => {
            setPage(n);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );
}
