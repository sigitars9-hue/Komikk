import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { X } from "lucide-react";
import dayjs from "dayjs";

import { fetchChapters } from "../lib/api";

/* ============================= Helpers ============================= */
function chapterDate(ch) {
  // API backend menyimpan publishedAt; sumber lain memakai createdAt
  return ch?.createdAt || ch?.publishedAt || null;
}

function relativeTime(d) {
  if (!d) return "";
  const t = dayjs(d);
  if (!t.isValid()) return "";
  const now = dayjs();

  const mins = Math.max(0, now.diff(t, "minute"));
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;

  const hours = now.diff(t, "hour");
  if (hours < 24) return `${hours} jam lalu`;

  const days = now.diff(t, "day");
  if (days < 30) return `${days} hari lalu`;

  const months = now.diff(t, "month");
  if (months < 12) return `${months} bln lalu`;

  return `${now.diff(t, "year")} th lalu`;
}

function isFresh(d) {
  const t = dayjs(d);
  return t.isValid() && dayjs().diff(t, "day") < 3;
}

function getOriginBadge(seriesFormat, seriesType, seriesTags) {
  const fmt = String(seriesFormat || seriesType || "").toLowerCase();
  const tags = Array.isArray(seriesTags)
    ? seriesTags.map((t) => String(t).toLowerCase())
    : [];
  const all = [fmt, ...tags].join(" ");

  // urutan penting (manhwa/manhua/manga)
  if (all.includes("manhwa")) return { flag: "ðŸ‡°ðŸ‡·", code: "KR", label: "Manhwa (Korea)" };
  if (all.includes("manhua")) return { flag: "ðŸ‡¨ðŸ‡³", code: "CN", label: "Manhua (China)" };
  if (all.includes("manga")) return { flag: "ðŸ‡¯ðŸ‡µ", code: "JP", label: "Manga (Jepang)" };
  return null;
}

/* ============================== Popup ============================== */
export default function LatestChaptersPopup({
  slug,
  title,
  format,
  type,
  tags,
  open,
  onClose,
  anchor = "right",
}) {
  const origin = useMemo(
    () => getOriginBadge(format, type, tags),
    [format, type, tags]
  );

  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [err, setErr] = useState("");

  // dua panel (mobile & desktop) -> dua ref supaya klik di dalam tidak dianggap "di luar"
  const mobileRef = useRef(null);
  const desktopRef = useRef(null);

  useEffect(() => {
    if (!open || !slug) return;

    let alive = true;
    setLoading(true);
    setErr("");
    setChapters([]);

    fetchChapters(slug)
      .then((res) => {
        if (!alive) return;
        const arr = Array.isArray(res) ? res : [];
        const sorted = [...arr].sort(
          (a, b) => Number(b?.number || 0) - Number(a?.number || 0)
        );
        setChapters(sorted.slice(0, 3));
      })
      .catch(() => alive && setErr("Gagal memuat chapter."))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [open, slug]);

  // klik di luar panel / tekan Esc -> tutup
  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      const inMobile = mobileRef.current?.contains(e.target);
      const inDesktop = desktopRef.current?.contains(e.target);
      if (!inMobile && !inDesktop) onClose?.();
    };
    const onKey = (e) => e.key === "Escape" && onClose?.();

    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Popup sering berada di dalam kartu yang berupa <Link>; cegah klik tembus ke kartu.
  const swallow = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const header = (
    <Header title={title} origin={origin} onClose={onClose} swallow={swallow} />
  );
  const body = (
    <PopupBody
      chapters={chapters}
      loading={loading}
      err={err}
      slug={slug}
      onClose={onClose}
    />
  );

  const panelBase =
    "overflow-hidden rounded-xl bg-zinc-950/95 backdrop-blur ring-1 ring-white/10 shadow-2xl";

  return (
    <>
      {/* MOBILE: backdrop + panel di bawah top bar */}
      <div
        className="fixed inset-0 z-40 md:hidden bg-black/50"
        onClick={(e) => {
          swallow(e);
          onClose?.();
        }}
      >
        <div
          ref={mobileRef}
          role="dialog"
          aria-label={`Chapter terbaru ${title || ""}`}
          onClick={swallow}
          className={clsx(
            panelBase,
            "absolute top-16 inset-x-3 max-h-[75vh] overflow-y-auto"
          )}
        >
          {header}
          {body}
        </div>
      </div>

      {/* DESKTOP: popup menempel di kartu */}
      <div className="absolute inset-0 z-40 hidden md:block pointer-events-none">
        <div
          ref={desktopRef}
          role="dialog"
          aria-label={`Chapter terbaru ${title || ""}`}
          onClick={swallow}
          className={clsx(
            panelBase,
            "pointer-events-auto absolute top-0 mt-2 w-[250px]",
            anchor === "left" ? "left-0" : "right-0"
          )}
        >
          {header}
          {body}
        </div>
      </div>
    </>
  );
}

/* ============================== Parts ============================== */
function Header({ title, origin, onClose, swallow }) {
  return (
    <div className="flex items-center gap-2 pl-3 pr-1.5 py-2 border-b border-white/10">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-white truncate">
          {title || "Chapter Terbaru"}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span>3 chapter terakhir</span>
          {origin && (
            <span
              title={origin.label}
              className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-white text-zinc-900 font-semibold leading-none"
            >
              <span aria-hidden="true">{origin.flag}</span>
              {origin.code}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          swallow(e);
          onClose?.();
        }}
        aria-label="Tutup"
        title="Tutup"
        className="grid place-items-center w-9 h-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function PopupBody({ chapters, loading, err, slug, onClose }) {
  return (
    <>
      <div className="p-2 space-y-1.5">
        {loading && (
          <div className="space-y-1.5 animate-pulse" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-2.5 rounded-lg bg-zinc-900/60 ring-1 ring-white/10 p-2"
              >
                <div className="w-16 h-11 rounded-md bg-zinc-800/70 flex-none" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-3 bg-zinc-800/70 rounded w-1/2" />
                  <div className="h-3 bg-zinc-800/50 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && err && (
          <div className="rounded-lg bg-red-950/40 ring-1 ring-red-500/30 px-3 py-2.5 text-xs text-red-300">
            {err}
          </div>
        )}

        {!loading && !err && chapters.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-zinc-400">
            Belum ada chapter.
          </div>
        )}

        {!loading &&
          !err &&
          chapters.map((ch, i) => {
            const date = chapterDate(ch);
            return (
              <Link
                key={ch?.id || i}
                to={`/series/${slug}`}
                onClick={onClose}
                title="Buka series"
                className="flex gap-2.5 rounded-lg p-2 bg-zinc-900/60 ring-1 ring-white/10 hover:bg-zinc-800/80 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {ch?.thumbnail ? (
                  <img
                    src={ch.thumbnail}
                    alt=""
                    loading="lazy"
                    className="w-16 h-11 rounded-md object-cover flex-none bg-zinc-800"
                  />
                ) : (
                  <div className="w-16 h-11 rounded-md bg-zinc-800/70 flex-none" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">
                      Chapter {ch?.number ?? "â€”"}
                    </span>
                    {isFresh(date) && (
                      <span className="px-1 py-px rounded bg-red-600 text-[9px] font-bold leading-none text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-300 line-clamp-1">
                    {ch?.title || "â€”"}
                  </div>
                  {date && (
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      {relativeTime(date)}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
      </div>

      <div className="p-2 pt-0">
        <Link
          to={`/series/${slug}`}
          onClick={onClose}
          className="grid place-items-center h-10 rounded-lg bg-gradient-to-r from-brand-dark via-brand to-brand-light text-white text-xs font-semibold hover:brightness-110 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Lihat semua chapter
        </Link>
      </div>
    </>
  );
}
