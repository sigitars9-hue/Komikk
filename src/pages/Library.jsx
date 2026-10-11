// src/pages/Library.jsx
import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import Card from "../components/Card";
import HomeTopBar from "../components/HomeTopBar";
import { useAuth } from "../providers/AuthProvider";
import { getLibraryAll, removeFromLibrary, clearSection } from "../lib/library";
import { supabase } from "../lib/supabaseClient";
import clsx from "clsx";
import { Search, ArrowUpDown } from "lucide-react";

/* ===== Constants ===== */
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

function safeText(v) {
  return String(v || "").toLowerCase().trim();
}

function getUpdatedAtValue(it) {
  // library items bisa beda bentuk, amanin.
  // updatedAt bisa string ISO atau plain date.
  const raw =
    it?.updatedAt ||
    it?.lastReadAt ||
    it?.createdAt ||
    it?.addedAt ||
    "";

  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/* ===== Skeletons (Home-like) ===== */
function GridCardSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 overflow-hidden"
        >
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

function HistorySkeleton({ count = 6 }) {
  return (
    <div className="space-y-2 sm:space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 flex gap-3"
        >
          <div className="w-20 h-28 rounded-xl bg-zinc-800/70 flex-none" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-zinc-800/70 rounded w-3/4" />
            <div className="h-3 bg-zinc-800/40 rounded w-1/3" />
          </div>
          <div className="w-16 h-8 rounded-xl bg-zinc-800/50 self-center" />
        </div>
      ))}
    </div>
  );
}

/* ===== Empty states ===== */
function EmptyState({ tab }) {
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

  const s = map[tab] || { title: "Kosong.", desc: "" };

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

export default function Library() {
  const { user, loading, signInGoogle } = useAuth();

  const [tab, setTab] = useState("bookmarks");
  const [data, setData] = useState({ favorites: [], bookmarks: [], history: [] });
  const [busy, setBusy] = useState(false);

  // ✅ tambahan fitur
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest"); // newest | oldest | az

  // load awal
  useEffect(() => {
    let alive = true;
    if (!user) return;

    (async () => {
      setBusy(true);
      try {
        const all = await getLibraryAll();
        if (alive) setData(all);
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  // realtime
  useEffect(() => {
    if (!user || !supabase) return;

    const ch = supabase
      .channel("library-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "library_items",
          filter: `user_id=eq.${user.id}`,
        },
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

  const reload = async () => {
    if (!user) return;
    setBusy(true);
    try {
      setData(await getLibraryAll());
    } finally {
      setBusy(false);
    }
  };

  // badge counts
  const counts = useMemo(() => {
    return {
      bookmarks: (data.bookmarks || []).length,
      favorites: (data.favorites || []).length,
      history: (data.history || []).length,
    };
  }, [data]);

  const rawList = data[tab] || [];

  // search + sort
  const list = useMemo(() => {
    const q = safeText(query);

    let arr = [...rawList];

    // filter search (title)
    if (q) {
      arr = arr.filter((it) => safeText(it?.title).includes(q));
    }

    // sort
    arr.sort((a, b) => {
      if (sort === "az") {
        return safeText(a?.title).localeCompare(safeText(b?.title));
      }
      const ta = getUpdatedAtValue(a);
      const tb = getUpdatedAtValue(b);

      if (sort === "oldest") return ta - tb;
      // newest
      return tb - ta;
    });

    return arr;
  }, [rawList, query, sort]);

  const tabLabel = useMemo(
    () => TABS.find((t) => t.key === tab)?.label || "Library",
    [tab]
  );

  /* ===== RENDER ===== */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Topbar normal */}
        <div className="sticky top-0 z-30 backdrop-blur bg-zinc-950/70 ring-b ring-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <HomeTopBar />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Library" />
          <div className="mt-4 rounded-3xl ring-1 ring-white/10 bg-zinc-900/40 p-4 sm:p-6">
            <GridCardSkeleton count={10} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        {/* Topbar normal (NO fullbleed hacks) */}
        <div className="sticky top-0 z-30 backdrop-blur bg-zinc-950/70 ring-b ring-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <HomeTopBar />
          </div>
        </div>

        {/* Center card (rapi, tidak berantakan) */}
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
                className="
                  mt-6 px-8 py-3 rounded-2xl
                  bg-gradient-to-r from-brand-dark via-brand to-brand-light
                  text-white font-semibold
                  ring-1 ring-brand/30
                  hover:brightness-110 transition
                "
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

  return (
    <div className="space-y-6">
      {/* Topbar normal, konsisten Home */}
      <div className="sticky top-0 z-30 backdrop-blur bg-zinc-950/70 ring-b ring-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <HomeTopBar />
        </div>
      </div>

      {/* Header + Tabs + Search + Sort */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader title="Library" />
          <button
            onClick={reload}
            className="
              inline-flex items-center gap-2
              px-3 py-2 rounded-xl text-sm
              bg-zinc-900/60 hover:bg-zinc-800
              ring-1 ring-white/10
            "
            title="Refresh"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  "shrink-0 px-3 py-2 rounded-xl text-sm font-semibold ring-1 transition inline-flex items-center gap-2",
                  active
                    ? "bg-gradient-to-r from-brand-dark via-brand to-brand-light text-white ring-brand/30"
                    : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 ring-white/10"
                )}
              >
                <span>{t.label}</span>
                <span
                  className={clsx(
                    "text-[11px] px-2 py-0.5 rounded-lg",
                    active ? "bg-white/15" : "bg-white/10"
                  )}
                >
                  {counts[t.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Sort bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Cari di ${tabLabel}...`}
              className="
                w-full pl-9 pr-3 py-2.5 rounded-2xl
                bg-zinc-900/60 ring-1 ring-white/10
                text-sm placeholder:text-zinc-500
                focus:outline-none focus:ring-brand
              "
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-900/60 ring-1 ring-white/10">
              <ArrowUpDown className="w-4 h-4 text-zinc-200" />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="
                w-full h-10 rounded-2xl px-3
                bg-zinc-900/60 ring-1 ring-white/10
                text-sm text-zinc-200
                focus:outline-none focus:ring-brand
              "
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* meta info */}
        <div className="mt-3 text-xs text-zinc-500">
          Menampilkan: <span className="text-zinc-300 font-semibold">{tabLabel}</span>{" "}
          · Hasil: <span className="text-zinc-300 font-semibold">{list.length}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-[calc(72px+env(safe-area-inset-bottom,0))]">
        <div className="rounded-3xl ring-1 ring-white/10 bg-zinc-900/40 p-4 sm:p-6">
          {busy ? (
            tab === "history" ? <HistorySkeleton /> : <GridCardSkeleton count={10} />
          ) : list.length === 0 ? (
            <EmptyState tab={tab} />
          ) : tab !== "history" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {list.map((it) => (
                <div key={it.slug} className="group relative">
                  <Card item={it} />
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await removeFromLibrary(tab, it.slug);
                      await reload();
                    }}
                    className={clsx(
                      "absolute top-2 right-2 z-20",
                      "text-xs rounded-xl px-2 py-1",
                      "bg-black/60 hover:bg-black/75 ring-1 ring-white/15 text-white",
                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    )}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {list.map((it) => (
                <div
                  key={it.slug}
                  className="
                    p-3 rounded-3xl
                    bg-zinc-900/60 ring-1 ring-white/10
                    hover:bg-zinc-900 transition
                    flex gap-3
                  "
                >
                  <img
                    src={it.cover}
                    alt={it.title}
                    className="w-20 h-28 rounded-2xl object-cover ring-1 ring-white/10 flex-none"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold line-clamp-1 text-sm sm:text-base">
                      {it.title}
                    </div>
                    {it.updatedAt && (
                      <div className="mt-1 text-[11px] sm:text-xs text-zinc-400">
                        Update: {it.updatedAt}
                      </div>
                    )}
                    <div className="mt-2">
                      <a
                        href={`/series/${it.slug}`}
                        className="text-[11px] text-brand hover:underline"
                      >
                        Buka series →
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await removeFromLibrary("history", it.slug);
                      await reload();
                    }}
                    className="
                      ml-auto text-[11px]
                      bg-zinc-800 hover:bg-zinc-700
                      ring-1 ring-white/10
                      rounded-2xl px-3 py-1 h-fit self-center
                    "
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}

          {!busy && list.length > 0 && (
            <div className="pt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-zinc-500">
                Tip: pakai search untuk cari judul cepat.
              </div>

              <button
                onClick={async () => {
                  await clearSection(tab);
                  await reload();
                }}
                className="
                  text-xs px-4 py-2 rounded-2xl
                  bg-zinc-900/70 hover:bg-zinc-800
                  ring-1 ring-white/10
                "
              >
                Bersihkan {tabLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
