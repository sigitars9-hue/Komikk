import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { X } from "lucide-react";
import dayjs from "dayjs";

import { fetchChapters } from "../lib/api";

function relativeTime(d) {
  if (!d) return "";
  const now = dayjs();
  const t = dayjs(d);

  const mins = now.diff(t, "minute");
  if (mins < 60) return `${mins} mnt lalu`;

  const hours = now.diff(t, "hour");
  if (hours < 24) return `${hours} jam lalu`;

  const days = now.diff(t, "day");
  if (days < 30) return `${days} hari lalu`;

  const months = now.diff(t, "month");
  if (months < 12) return `${months} bln lalu`;

  const years = now.diff(t, "year");
  return `${years} th lalu`;
}

function getOriginBadge(seriesTitle, seriesFormat, seriesType, seriesTags) {
  const fmt = String(seriesFormat || seriesType || "").toLowerCase();
  const tags = Array.isArray(seriesTags)
    ? seriesTags.map((t) => String(t).toLowerCase())
    : [];

  const all = [fmt, ...tags].join(" ");

  // urutan penting (manhwa/manhua/manga)
  if (all.includes("manhwa")) return { flag: "🇰🇷", code: "KR", label: "Manhwa (Korea)" };
  if (all.includes("manhua")) return { flag: "🇨🇳", code: "CN", label: "Manhua (China)" };
  if (all.includes("manga"))  return { flag: "🇯🇵", code: "JP", label: "Manga (Jepang)" };

  // fallback kosong
  return null;
}


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
  () => getOriginBadge(title, format, type, tags),
  [title, format, type, tags]
);

  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [err, setErr] = useState("");

  const panelRef = useRef(null);

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

  // klik di luar panel -> close
  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) onClose?.();
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open, onClose]);

  const desktopPosClass = useMemo(() => {
    return anchor === "left" ? "left-0" : "right-0";
  }, [anchor]);

  if (!open) return null;

  return (
    <>
{/* ✅ MOBILE overlay supaya aman & ga kepotong */}
<div
  className="fixed inset-0 z-40 md:hidden"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose?.();
  }}
  onPointerDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  onTouchStart={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
>
  {/* ✅ PANEL popup */}
  <div
    ref={panelRef}
    className={clsx(
      "absolute top-16 left-2 right-2",
      "rounded-2xl overflow-hidden",
      "bg-zinc-950/95 backdrop-blur ring-1 ring-white/12 shadow-2xl"
    )}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onPointerDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onTouchStart={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
  >
    {/* Header */}
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-[12px] font-semibold text-white/90 truncate">
          {title || "Chapter Terbaru"}
        </div>
        <div className="text-[10px] text-zinc-400">3 chapter terakhir</div>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10"
        title="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    <PopupBody
      chapters={chapters}
      loading={loading}
      err={err}
      slug={slug}
      onClose={onClose}
    />
  </div>
</div>


      {/* ✅ DESKTOP popup nempel card (seperti sekarang) */}
      <div className="absolute inset-0 z-40 hidden md:block">
<div
  ref={panelRef}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  className={clsx(
    "absolute top-0 mt-2 w-[220px] rounded-2xl overflow-hidden",
    "bg-zinc-950/95 backdrop-blur ring-1 ring-white/12 shadow-2xl",
    desktopPosClass
  )}
>

          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[12px] font-semibold text-white/90 truncate">
                {title || "Chapter Terbaru"}
              </div>
              <div className="text-[10px] text-zinc-400">3 chapter terakhir</div>
            </div>

<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose?.();
  }}
  className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-white/10"
  title="Tutup"
>
  <X className="w-4 h-4" />
</button>

          </div>

          <PopupBody chapters={chapters} loading={loading} err={err} slug={slug} onClose={onClose} />
        </div>
      </div>
    </>
  );
}

/* dipisah biar rapih */
function PopupBody({ chapters, loading, err, slug, onClose }) {
  return (
    <>
      <div className="p-2 space-y-2">
        {loading && (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-zinc-900/60 ring-1 ring-white/10 p-2"
              >
                <div className="h-3 bg-zinc-800/70 rounded w-4/5" />
                <div className="h-3 bg-zinc-800/50 rounded w-2/3 mt-2" />
              </div>
            ))}
          </div>
        )}

        {!loading && err && (
          <div className="text-xs text-rose-400 px-1 py-2">{err}</div>
        )}

        {!loading && !err && chapters.length === 0 && (
          <div className="text-xs text-zinc-400 px-1 py-2">
            Belum ada chapter.
          </div>
        )}

        {!loading &&
          !err &&
          chapters.map((ch) => (
            <Link
              key={ch?.id}
              to={`/series/${slug}`}
              className="block rounded-xl p-2 bg-zinc-900/50 ring-1 ring-white/10 hover:bg-zinc-900"
              onClick={onClose}
              title="Buka series"
            >
              <div className="flex gap-2">
                {ch?.thumbnail ? (
                  <img
                    src={ch.thumbnail}
                    alt=""
                    className="w-[56px] h-[40px] rounded-lg object-cover flex-none"
                  />
                ) : (
                  <div className="w-[56px] h-[40px] rounded-lg bg-zinc-800/60 flex-none" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold line-clamp-1">
                    Chapter {ch?.number ?? "—"}
                  </div>

                  {ch?.title ? (
                    <div className="text-[11px] text-zinc-300 line-clamp-1">
                      {ch.title}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-500 line-clamp-1">—</div>
                  )}

                  <div className="text-[10px] text-zinc-500 mt-1">
                    {relativeTime(ch?.createdAt)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
      </div>

      <div className="px-3 py-2 border-t border-white/10">
        <Link
          to={`/series/${slug}`}
          className="text-[11px] text-brand hover:underline"
          onClick={onClose}
        >
          Lihat semua chapter →
        </Link>
      </div>
    </>
  );
}
