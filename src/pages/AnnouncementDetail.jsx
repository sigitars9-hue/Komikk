// src/pages/AnnouncementDetail.jsx
import { useParams, Link } from "react-router-dom";
import { ANNOUNCEMENTS } from "../data/announcements";
import {
  ArrowLeft,
  Bell,
  Pin,
  CalendarDays,
  Megaphone,
} from "lucide-react";

const DEFAULT_AVATAR =
  "https://i.ibb.co.com/ZR4g84zj/yuracry.png";

function getCategory(item) {
  const category = item.category || item.type || item.kategori || "Informasi";

  const allowedCategories = [
    "Update",
    "Maintenance",
    "Event",
    "Informasi",
  ];

  const found = allowedCategories.find(
    (value) => value.toLowerCase() === String(category).toLowerCase()
  );

  return found || "Informasi";
}

function formatDate(dateString) {
  if (!dateString) return "Tanggal tidak tersedia";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function AnnouncementDetail() {
  const { id } = useParams();

  const item = ANNOUNCEMENTS.find(
    (announcement) => String(announcement.id) === String(id)
  );

  if (!item) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 rounded-full bg-zinc-800 p-5">
          <Bell size={32} className="text-zinc-400" />
        </div>

        <h1 className="text-2xl font-bold text-white">
          Pengumuman tidak ditemukan
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Pengumuman mungkin sudah tidak tersedia atau alamatnya salah.
        </p>

        <Link
          to="/announcements"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:opacity-90"
        >
          <ArrowLeft size={18} />
          Kembali ke Pengumuman
        </Link>
      </main>
    );
  }

  const category = getCategory(item);
  const isPinned = Boolean(
    item.pinned ??
    item.isPinned ??
    item.important ??
    item.isImportant
  );

  const content =
    item.content ??
    item.description ??
    item.message ??
    item.body ??
    "";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      {/* Tombol kembali */}
      <Link
        to="/announcements"
        className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
      >
        <ArrowLeft size={18} />
        Semua Pengumuman
      </Link>

      {/* Konten utama */}
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl">
        {/* Header */}
        <div className="border-b border-white/10 bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 p-5 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
              <Megaphone size={14} />
              {category}
            </span>

            {isPinned && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                <Pin size={13} />
                Pengumuman Penting
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-4xl">
            {item.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 text-sm text-zinc-400">
            <CalendarDays size={17} className="shrink-0" />
            <time dateTime={item.createdAt || undefined}>
              {formatDate(item.createdAt)}
            </time>
          </div>
        </div>

        {/* Informasi pengumuman */}
        <div className="p-5 sm:p-8">
          <div className="mb-7 flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-800/40 p-3">
            <img
              src={item.avatar || DEFAULT_AVATAR}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_AVATAR;
              }}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg border border-white/10 object-cover"
            />

            <div className="min-w-0">
              <p className="font-semibold text-white">
                Comicverse.id
              </p>
              <p className="text-xs text-zinc-400">
                Pengumuman resmi website
              </p>
            </div>
          </div>

          {/* Isi */}
          <div className="whitespace-pre-line break-words text-sm leading-8 text-zinc-200 sm:text-base">
            {content || "Belum ada isi pengumuman."}
          </div>
        </div>
      </article>

      {/* Navigasi bawah */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          Terima kasih telah mengikuti informasi terbaru Comicverse.id.
        </p>

        <Link
          to="/announcements"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          <ArrowLeft size={16} />
          Daftar Pengumuman
        </Link>
      </div>
    </main>
  );
}