import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Bookmark,
  Database,
  Eye,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

/* ============================ Utils ============================ */
const slugify = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const parseImageList = (raw = "") => {
  if (!raw.trim()) return [];

  const imagePattern =
    /https?:\/\/[^\s"'<>]+?\.(?:avif|webp|jpe?g|png|gif|bmp)(?:\?[^\s"'<>]*)?/gi;

  const matches = raw.match(imagePattern) || [];

  const cleanUrl = (value) =>
    value.replace(/&amp;/gi, "&").replace(/[),;]+$/, "").trim();

  const urls = matches
    .map(cleanUrl)
    .filter((url) => /^https?:\/\//i.test(url));

  return [...new Set(urls)];
};

const compact = (n) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n) || 0);

/* Chapter berikutnya = nomor terbesar + 1 */
const getNextChapterNumber = (list = []) => {
  const nums = list.map((c) => Number(c?.number)).filter(Number.isFinite);
  return nums.length ? Math.floor(Math.max(...nums)) + 1 : 1;
};

/* Waktu lokal untuk input datetime-local */
const nowLocalInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

/* ============================ Presets ============================ */
const GENRES = [
  "Action", "Adaptation", "Adult", "Adventure", "Comedy", "Cooking",
  "Crime", "Demon", "Drama", "Ecchi", "Fantasy", "Fight",
  "Game", "Gender Bender", "Harem", "Historical", "Horror", "Isekai",
  "Latest", "Magic", "Martial Arts", "Mecha", "Medical",
  "Murim", "Mystery", "Philosophical", "Psychological", "Regression",
  "Revenge", "Romance", "School Life", "Sci-fi", "Seinen", "Shoujo",
  "Shounen", "Slice of Life", "Sports", "Supernatural",
  "Super Power", "Thriller", "Tragedy", "Violence", "Wuxia", "Male MC",
  "Female MC", "Reincarnation",
];
const TYPES = ["Manga", "Manhwa", "Manhua"];
const FORMATS = ["Webtoon", "Comic", "Light Novel"];
const STATUSES = ["Ongoing", "Completed", "Hiatus", "Dropped"];
const BUCKETS = ["data1", "data2", "data3"];

/* ============================ ENV ============================ */
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || "";

/* ============================ API helpers ============================ */
async function httpJson(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  if (!res.ok) throw new Error(json?.error || json?._raw || `HTTP ${res.status}`);
  return json;
}

async function getSeriesLatest({ page = 1, pageSize = 2000 } = {}) {
  return httpJson(`/series/latest?page=${page}&pageSize=${pageSize}`);
}

async function getSeriesChapters(slug, { page = 1, pageSize = 5000 } = {}) {
  return httpJson(
    `/series/${encodeURIComponent(slug)}/chapters?page=${page}&pageSize=${pageSize}`
  );
}

async function getChapterPagesById(id) {
  return httpJson(`/chapter/${encodeURIComponent(id)}`);
}

async function createOrUpdateSeries(seriesObj, bucket) {
  const body = bucket ? { ...seriesObj, bucket } : seriesObj;
  return httpJson(`/admin/series`, { method: "POST", body });
}

async function createOrUpdateChapter(seriesSlug, chapterObj, bucket) {
  const body = bucket ? { ...chapterObj, bucket } : chapterObj;
  return httpJson(`/admin/series/${encodeURIComponent(seriesSlug)}/chapters`, {
    method: "POST",
    body,
  });
}

async function deleteSeries(seriesSlug, bucket) {
  return httpJson(`/admin/series/${encodeURIComponent(seriesSlug)}`, {
    method: "DELETE",
    body: bucket ? { bucket } : undefined,
  });
}

async function deleteChapter(seriesSlug, chapterId, bucket) {
  return httpJson(
    `/admin/series/${encodeURIComponent(seriesSlug)}/chapters/${encodeURIComponent(chapterId)}`,
    {
      method: "DELETE",
      body: bucket ? { bucket } : undefined,
    }
  );
}

/* ============================ Design tokens ============================ */
const baseInput =
  "w-full rounded-lg bg-zinc-900/70 px-3 text-sm text-zinc-100 ring-1 ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2";
const inputCls = `${baseInput} h-11 focus:ring-brand`;
const areaCls = `${baseInput} py-2.5 focus:ring-brand`;
const dangerInputCls = `${baseInput} h-11 focus:ring-red-500`;

const btnGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-800/80 px-4 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50";
const btnBrand =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-dark via-brand to-brand-light text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50";
const btnDanger =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40";

/* ============================ Charts (SVG murni) ============================ */
const smoothPath = (pts) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
};

const LineChart = ({ labels, series, height = 230 }) => {
  const W = 640;
  const H = height;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = labels.length;
  const x = (i) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const grid = [0, 0.25, 0.5, 0.75, 1];

  if (n === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-500"
        style={{ height }}
      >
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik series">
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(max * g)}
            y2={y(max * g)}
            stroke="#3f3f46"
            strokeOpacity="0.6"
            strokeDasharray="3 4"
          />
          <text x={padL - 8} y={y(max * g) + 3} textAnchor="end" fontSize="10" fill="#71717a">
            {compact(max * g)}
          </text>
        </g>
      ))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => [x(i), y(v)]);
        const line = smoothPath(pts);
        return (
          <g key={s.name}>
            {si === 0 && pts.length > 1 && (
              <path
                d={`${line} L${pts[pts.length - 1][0]},${H - padB} L${pts[0][0]},${H - padB} Z`}
                fill={`url(#area-${si})`}
              />
            )}
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
            {pts.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r="3.5" fill="#09090b" stroke={s.color} strokeWidth="2" />
            ))}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#71717a">
          {l}
        </text>
      ))}
    </svg>
  );
};

const BarChart = ({ data, height = 230 }) => {
  const W = 360;
  const H = height;
  const padL = 30;
  const padB = 28;
  const padT = 12;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (W - padL - 8) / Math.max(1, data.length);
  const bw = Math.min(34, slot * 0.55);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik status">
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line
            x1={padL}
            x2={W - 8}
            y1={padT + (1 - g) * (H - padT - padB)}
            y2={padT + (1 - g) * (H - padT - padB)}
            stroke="#3f3f46"
            strokeOpacity="0.6"
            strokeDasharray="3 4"
          />
          <text
            x={padL - 6}
            y={padT + (1 - g) * (H - padT - padB) + 3}
            textAnchor="end"
            fontSize="10"
            fill="#71717a"
          >
            {Math.round(max * g)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * (H - padT - padB);
        const bx = padL + slot * i + (slot - bw) / 2;
        return (
          <g key={d.label}>
            <rect x={bx} y={H - padB - h} width={bw} height={Math.max(h, 2)} rx="3" fill={d.color} />
            <text x={bx + bw / 2} y={H - padB - h - 5} textAnchor="middle" fontSize="10" fill="#d4d4d8">
              {d.value}
            </text>
            <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#71717a">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ============================ Micro components ============================ */
/* Section tanpa kotak: hanya garis pemisah di atas */
const Section = ({ title, badge, actions, children, className = "" }) => (
  <section className={`border-t border-white/10 pt-5 first:border-t-0 first:pt-0 ${className}`}>
    {(title || actions) && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
          {badge && (
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-zinc-400">
              {badge}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-zinc-400 sm:text-sm">{label}</label>
    {children}
    {hint && <p className="text-[11px] leading-normal text-zinc-500">{hint}</p>}
  </div>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={!!active}
    className={`h-9 rounded-lg px-3 text-xs font-medium ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
      active
        ? "bg-brand text-white ring-brand"
        : "bg-zinc-900/70 text-zinc-300 ring-white/10 hover:bg-zinc-800"
    }`}
  >
    {children}
  </button>
);

const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-zinc-800/60 p-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={`h-9 shrink-0 whitespace-nowrap rounded-md px-3 text-xs font-medium transition ${
          value === o.value ? "bg-brand text-white" : "text-zinc-300 hover:bg-white/10"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Stat = ({ icon: Icon, label, value, tone = "" }) => (
  <div className="flex items-center gap-3 border-l-2 border-brand/70 pl-3">
    <Icon className="h-5 w-5 shrink-0 text-brand-light" aria-hidden="true" />
    <div className="min-w-0">
      <div className={`truncate text-xl font-bold tabular-nums sm:text-2xl ${tone}`}>{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  </div>
);

const Modal = ({ open, onClose, title, children, primaryText, onPrimary, danger = false }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-xl bg-zinc-900 p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] ring-1 ring-white/10 sm:max-w-md sm:rounded-xl sm:pb-5"
      >
        <h4 className="mb-2 text-lg font-bold">{title}</h4>
        <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onClose} className={`${btnGhost} w-full sm:w-auto`}>
            Batal
          </button>
          {onPrimary && (
            <button
              onClick={onPrimary}
              className={`inline-flex h-11 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition sm:w-auto ${
                danger
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-gradient-to-r from-brand-dark via-brand to-brand-light hover:brightness-110"
              }`}
            >
              {primaryText || "Lanjutkan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SeriesPickerList = ({ loading, items, onPick, thumb = "h-16 w-12", maxH = "max-h-72", extra }) => (
  <div
    className={`${maxH} divide-y divide-white/5 overflow-y-auto rounded-lg bg-zinc-900/40 ring-1 ring-white/10`}
  >
    {loading ? (
      <p className="p-4 text-sm text-zinc-400">Memuat daftar komik...</p>
    ) : items.length === 0 ? (
      <p className="p-4 text-sm text-zinc-400">Komik tidak ditemukan.</p>
    ) : (
      items.map((series) => (
        <button
          key={series.slug}
          type="button"
          onClick={() => onPick(series)}
          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {series.cover ? (
            <img
              src={series.cover}
              alt=""
              loading="lazy"
              className={`${thumb} shrink-0 rounded-md object-cover`}
            />
          ) : (
            <div
              className={`${thumb} grid shrink-0 place-items-center rounded-md bg-zinc-800 text-[10px] text-zinc-500`}
            >
              No cover
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{series.title}</p>
            <p className="truncate font-mono text-xs text-zinc-500">{series.slug}</p>
            {extra && (
              <p className="text-xs text-zinc-500">
                {series.format || series.type || "Komik"} | {series.status || "Ongoing"}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs font-medium text-brand">Pilih</span>
        </button>
      ))
    )}
  </div>
);

const PreviewBox = ({ label, src, ratio }) => (
  <div>
    <span className="mb-1.5 block text-[11px] text-zinc-500">{label}</span>
    <div
      className={`${ratio} grid place-items-center overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10`}
    >
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs text-zinc-600">No Image</span>
      )}
    </div>
  </div>
);

/* ============================ Main ============================ */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview"); // overview | series | chapter | trash
  const [busy, setBusy] = useState(false);
  const chapterSubmitLock = useRef(false);
  const [bucket, setBucket] = useState("data1");
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);

  /* Remote data */
  const [remoteSeries, setRemoteSeries] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [apiOk, setApiOk] = useState(null); // null = memeriksa
  const [seriesQuery, setSeriesQuery] = useState("");
  const [seriesSort, setSeriesSort] = useState("updated");
  const [overviewLimit, setOverviewLimit] = useState(12);
  const [editingSlug, setEditingSlug] = useState("");
  const [editSearchOpen, setEditSearchOpen] = useState(false);

  const [remoteChapters, setRemoteChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  /* Series form */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("Manhwa");
  const [format, setFormat] = useState("Webtoon");
  const [status, setStatus] = useState("Ongoing");
  const [genres, setGenres] = useState([]);
  const [tags, setTags] = useState("");
  const [year, setYear] = useState("");
  const [author, setAuthor] = useState("");
  const [artist, setArtist] = useState("");
  const [desc, setDesc] = useState("");
  const [cover, setCover] = useState("");
  const [backdrop, setBackdrop] = useState("");
  const [rating, setRating] = useState("");
  const [views, setViews] = useState("");
  const [bookmarks, setBookmarks] = useState("");

  /* Chapter form */
  const [seriesSlugForChapter, setSeriesSlugForChapter] = useState("");
  const [chNo, setChNo] = useState("1");
  const [chTitle, setChTitle] = useState("");
  const [chDate, setChDate] = useState(() => nowLocalInput());
  const [chImagesRaw, setChImagesRaw] = useState("");
  const [chCover, setChCover] = useState("");
  const [chAutoCover, setChAutoCover] = useState(true);
  const [chapterMode, setChapterMode] = useState("comic");
  const [chText, setChText] = useState("");

  /* Delete state */
  const [deleteSlug, setDeleteSlug] = useState("");
  const [deleteChSlug, setDeleteChSlug] = useState("");
  const [deleteChCode, setDeleteChCode] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState("series");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: "" });

  const chImages = useMemo(() => parseImageList(chImagesRaw), [chImagesRaw]);

  const handleTitle = (v) => {
    setTitle(v);
    if (!slug.trim()) setSlug(slugify(v));
  };

  const toggleGenre = (g) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const seriesObj = useMemo(() => {
    const sSlug = slug.trim() || slugify(title);
    return {
      title: title.trim(),
      slug: sSlug || undefined,
      type,
      format,
      status,
      year: year ? Number(year) : undefined,
      author: author.trim() || undefined,
      artist: artist.trim() || undefined,
      description: desc.trim(),
      genres,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      cover,
      backdrop: backdrop || undefined,
      rating: rating ? Number(rating) : undefined,
      views: views ? Number(views) : undefined,
      bookmarks: bookmarks ? Number(bookmarks) : undefined,
      chapters: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }, [title, slug, type, format, status, year, author, artist, desc, genres, tags, cover, backdrop, rating, views, bookmarks, nowIso]);

  const seriesInvalid =
    !seriesObj.title ||
    !seriesObj.slug ||
    !seriesObj.description ||
    !seriesObj.cover ||
    seriesObj.genres.length === 0;

  const chapterOnly = useMemo(() => {
    const idBase = seriesSlugForChapter.trim();
    const number = Number(chNo) || 1;
    if (!idBase) return null;

    const publishedAt = chDate ? new Date(chDate).toISOString() : new Date().toISOString();

    const customCover = chCover.trim();
    const thumbnail = chAutoCover
      ? chImages[0] || undefined
      : customCover || chImages[0] || undefined;

    if (chapterMode === "comic" && chImages.length === 0) return null;
    if (chapterMode === "novel" && !chText.trim()) return null;

    let base = {
      number,
      title: chTitle?.trim() || `Chapter ${number}`,
      publishedAt,
      thumbnail,
    };

    if (chapterMode === "comic") {
      base = { ...base, pages: chImages, type: "comic" };
    } else {
      const blocks = chText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      base = { ...base, type: "novel", content: chText, content_blocks: blocks };
    }

    return base;
  }, [seriesSlugForChapter, chNo, chTitle, chDate, chAutoCover, chCover, chImages, chText, chapterMode]);

  /* ---------------- Fetch API ---------------- */
  async function refreshSeriesList() {
    try {
      setRemoteLoading(true);
      const out = await getSeriesLatest({ page: 1, pageSize: 2000 });
      setRemoteSeries(Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : []);
      setApiOk(true);
    } catch (e) {
      setApiOk(false);
      toast.error(e.message || "Gagal mengambil daftar series");
      setRemoteSeries([]);
    } finally {
      setRemoteLoading(false);
    }
  }

  async function refreshChaptersFor(slugTarget, { autofill = false } = {}) {
    if (!slugTarget) {
      setRemoteChapters([]);
      return;
    }
    try {
      setChaptersLoading(true);
      const out = await getSeriesChapters(slugTarget, { page: 1, pageSize: 5000 });
      const items = Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : [];
      setRemoteChapters(items);

      if (autofill) {
        setChNo(String(getNextChapterNumber(items)));
        setChTitle("");
        setChDate(nowLocalInput());
        setChImagesRaw("");
        setChCover("");
        setChAutoCover(true);
        setChText("");
      }
    } catch (e) {
      toast.error(e.message || "Gagal mengambil chapter");
      setRemoteChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  }

  /* Pilih series untuk chapter: set tujuan + isi otomatis chapter berikutnya */
  function selectSeriesForChapter(slugTarget) {
    setSeriesSlugForChapter(slugTarget);
    refreshChaptersFor(slugTarget, { autofill: true });
  }

  useEffect(() => {
    refreshSeriesList();
  }, []);

  const filteredSeries = useMemo(() => {
    const q = seriesQuery.trim().toLowerCase();
    let list = Array.isArray(remoteSeries) ? [...remoteSeries] : [];
    if (q) {
      list = list.filter(
        (s) =>
          String(s?.title || "").toLowerCase().includes(q) ||
          String(s?.slug || "").toLowerCase().includes(q)
      );
    }
    if (seriesSort === "title") {
      list.sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")));
    } else if (seriesSort === "views") {
      list.sort((a, b) => Number(b?.views || 0) - Number(a?.views || 0));
    } else if (seriesSort === "bookmarks") {
      list.sort((a, b) => Number(b?.bookmarks || 0) - Number(a?.bookmarks || 0));
    } else {
      list.sort(
        (a, b) => (Date.parse(b?.updatedAt || 0) || 0) - (Date.parse(a?.updatedAt || 0) || 0)
      );
    }
    return list;
  }, [remoteSeries, seriesQuery, seriesSort]);

  const stats = useMemo(() => {
    const list = Array.isArray(remoteSeries) ? remoteSeries : [];
    const totalViews = list.reduce((a, s) => a + (Number(s?.views) || 0), 0);
    const totalBookmarks = list.reduce((a, s) => a + (Number(s?.bookmarks) || 0), 0);
    const top = [...list]
      .sort((a, b) => Number(b?.views || 0) - Number(a?.views || 0))
      .slice(0, 8);
    const byStatus = STATUSES.map((st, i) => ({
      label: st,
      value: list.filter((s) => (s?.status || "Ongoing") === st).length,
      color: ["#8b5cf6", "#34d399", "#f9a8d4", "#71717a"][i],
    }));
    return { totalViews, totalBookmarks, top, byStatus };
  }, [remoteSeries]);

  const selectedSeries = useMemo(
    () => remoteSeries.find((s) => s.slug === seriesSlugForChapter) || null,
    [remoteSeries, seriesSlugForChapter]
  );

  function startEditSeries(series) {
    if (!series) return;

    setEditingSlug(series.slug || "");
    setTitle(series.title || "");
    setSlug(series.slug || "");
    setType(series.type || "Manhwa");
    setFormat(series.format || "Webtoon");
    setStatus(series.status || "Ongoing");
    setYear(series.year ? String(series.year) : "");
    setAuthor(series.author || "");
    setArtist(series.artist || "");
    setDesc(series.description || "");
    setGenres(Array.isArray(series.genres) ? series.genres : []);
    setTags(Array.isArray(series.tags) ? series.tags.join(", ") : "");
    setCover(series.cover || "");
    setBackdrop(series.backdrop || "");
    setRating(series.rating ? String(series.rating) : "");
    setViews(series.views ? String(series.views) : "");
    setBookmarks(series.bookmarks ? String(series.bookmarks) : "");

    setEditSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetSeriesForm() {
    setEditingSlug("");
    setTitle("");
    setSlug("");
    setType("Manhwa");
    setFormat("Webtoon");
    setStatus("Ongoing");
    setGenres([]);
    setTags("");
    setYear("");
    setAuthor("");
    setArtist("");
    setDesc("");
    setCover("");
    setBackdrop("");
    setRating("");
    setViews("");
    setBookmarks("");
    setSeriesQuery("");
    setEditSearchOpen(false);
  }

  /* ---------------- Submit handlers ---------------- */
  async function onSendSeries() {
    try {
      if (!ADMIN_TOKEN) {
        toast.error("VITE_ADMIN_TOKEN belum diset.");
        return false;
      }
      if (seriesInvalid) {
        toast.error("Lengkapi judul, slug, sinopsis, cover, dan minimal 1 genre.");
        return false;
      }
      setBusy(true);
      const isEditing = Boolean(editingSlug);
      const timestamp = new Date().toISOString();
      let payload;

      if (isEditing) {
        // eslint-disable-next-line no-unused-vars
        const { chapters, createdAt, ...editableFields } = seriesObj;
        payload = { ...editableFields, originalSlug: editingSlug, updatedAt: timestamp };
      } else {
        payload = { ...seriesObj, chapters: [], createdAt: timestamp, updatedAt: timestamp };
      }

      const out = await createOrUpdateSeries(payload, bucket);
      toast.success(
        isEditing ? "Informasi komik berhasil diperbarui!" : "Komik baru berhasil ditambahkan!"
      );
      setSuccessInfo({
        title: isEditing
          ? `Komik '${out?.series?.title || seriesObj.title}' berhasil diperbarui.`
          : `Komik '${out?.series?.title || seriesObj.title}' berhasil disimpan.`,
      });
      setSuccessOpen(true);
      await refreshSeriesList();
      resetSeriesForm();
      return true;
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan informasi komik.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onSendChapter() {
    if (chapterSubmitLock.current) return;

    if (!ADMIN_TOKEN) {
      toast.error("VITE_ADMIN_TOKEN belum diset.");
      return;
    }
    if (!seriesSlugForChapter.trim()) {
      toast.error("Pilih Series tujuan.");
      return;
    }
    if (chapterMode === "comic" && chImages.length === 0) {
      toast.error("Masukkan minimal 1 URL gambar.");
      return;
    }
    if (chapterMode === "novel" && !chText.trim()) {
      toast.error("Teks novel tidak boleh kosong.");
      return;
    }
    if (!chapterOnly) {
      toast.error("Data chapter tidak valid.");
      return;
    }

    chapterSubmitLock.current = true;
    setBusy(true);

    try {
      const targetSlug = seriesSlugForChapter.trim();
      const chapterNumber = Number(chapterOnly.number);

      const out = await createOrUpdateChapter(targetSlug, chapterOnly, bucket);
      const uploadedNo = out?.chapter?.number ?? chapterNumber;

      toast.success(`Chapter ${uploadedNo} berhasil disimpan!`);
      setSuccessInfo({ title: `Chapter [${uploadedNo}] berhasil diupload ke '${targetSlug}'` });
      setSuccessOpen(true);

      /* Cadangan jika refresh gagal */
      setChTitle("");
      setChNo(String((Number(uploadedNo) || 1) + 1));
      if (chapterMode === "comic") {
        setChImagesRaw("");
        setChCover("");
        setChAutoCover(true);
      } else {
        setChText("");
      }

      await refreshChaptersFor(targetSlug, { autofill: true });
    } catch (e) {
      toast.error(e.message || "Gagal kirim chapter");
    } finally {
      chapterSubmitLock.current = false;
      setBusy(false);
    }
  }

  async function onLoadChapterToForm(ch) {
    try {
      if (!ch?.id) return toast.error("Chapter tidak memiliki ID valid.");
      setBusy(true);
      const detail = await getChapterPagesById(ch.id);
      setChapterMode("comic");
      setChNo(String(ch.number || 1));
      setChTitle(ch.title || "");
      const iso = detail?.publishedAt || ch?.publishedAt || null;
      if (iso) {
        const d = new Date(iso);
        const fixed = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        setChDate(fixed.toISOString().slice(0, 16));
      }
      const pages = Array.isArray(detail?.pages) ? detail.pages : [];
      setChImagesRaw(pages.join("\n"));
      setChAutoCover(true);
      setChCover("");
      toast.success(`Chapter ${ch.number} dimuat ke form.`);
      setActiveTab("chapter");
    } catch (e) {
      toast.error(e.message || "Gagal memuat chapter");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteSeries() {
    try {
      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");
      if (!deleteSlug.trim()) return toast.error("Isi slug series.");
      setConfirmOpen(false);
      setBusy(true);
      await deleteSeries(deleteSlug.trim(), bucket);
      toast.success("Series berhasil dihapus.");
      setSuccessInfo({ title: `Series '${deleteSlug.trim()}' terhapus.` });
      setSuccessOpen(true);
      setDeleteSlug("");
      refreshSeriesList();
    } catch (e) {
      toast.error(e.message || "Gagal menghapus series");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteChapter() {
    try {
      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");
      if (!deleteChSlug.trim() || !deleteChCode.trim())
        return toast.error("Lengkapi slug & ID chapter.");
      setConfirmOpen(false);
      setBusy(true);
      await deleteChapter(deleteChSlug.trim(), deleteChCode.trim(), bucket);
      toast.success("Chapter berhasil dihapus.");
      setSuccessInfo({ title: `Chapter '${deleteChCode.trim()}' dihapus.` });
      setSuccessOpen(true);
      refreshChaptersFor(deleteChSlug.trim());
      setDeleteChCode("");
    } catch (e) {
      toast.error(e.message || "Gagal menghapus chapter");
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { id: "overview", label: "Dashboard" },
    { id: "series", label: "Series" },
    { id: "chapter", label: "Chapter" },
    { id: "trash", label: "Hapus" },
  ];

  const chapterCoverPreview = chAutoCover ? chImages[0] : chCover.trim() || chImages[0];
  const lastChapterNo = remoteChapters.length ? getNextChapterNumber(remoteChapters) - 1 : 0;

  const apiLabel = apiOk === null ? "Memeriksa" : apiOk ? "Online" : "Gagal";
  const apiTone = apiOk === null ? "text-zinc-300" : apiOk ? "text-emerald-400" : "text-red-400";
  const apiDot = apiOk === null ? "bg-zinc-500" : apiOk ? "bg-emerald-400" : "bg-red-500";

  const openSeriesConfirm = () => {
    if (seriesInvalid) {
      toast.error("Lengkapi judul, slug, sinopsis, cover, dan minimal 1 genre.");
      return;
    }
    setShowLocationConfirm(true);
  };

  /* ============================ Render ============================ */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-brand selection:text-white">
      {/* Header + Tabs (sticky) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">Studio Panel</h1>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${apiDot}`} />
              <span className="truncate font-mono">{API_BASE}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-zinc-400 sm:inline">Database</span>
            <Segmented
              value={bucket}
              onChange={setBucket}
              options={BUCKETS.map((b) => ({ value: b, label: b }))}
            />
          </div>
        </div>

        <nav
          role="tablist"
          aria-label="Menu admin"
          className="mx-auto grid max-w-7xl grid-cols-4 px-2 sm:px-4"
        >
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.id)}
                className={`relative py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:py-3.5 sm:text-base ${
                  active ? "text-brand" : "text-zinc-100 hover:text-white"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand sm:inset-x-6" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-24 pt-6">
        {/* ====================== TAB: DASHBOARD ====================== */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3 lg:grid-cols-6">
              <Stat icon={Layers} label="Total Series" value={remoteSeries.length} />
              <Stat icon={Eye} label="Total Views" value={compact(stats.totalViews)} />
              <Stat icon={Bookmark} label="Total Bookmark" value={compact(stats.totalBookmarks)} />
              <Stat icon={Database} label="Database" value={bucket.toUpperCase()} />
              <Stat icon={ShieldCheck} label="Status API" value={apiLabel} tone={apiTone} />
              <Stat
                icon={Lock}
                label="Admin Auth"
                value={ADMIN_TOKEN ? "Aktif" : "Kosong"}
                tone={ADMIN_TOKEN ? "" : "text-red-400"}
              />
            </div>

            <div className="grid gap-8 xl:grid-cols-3">
              <Section
                title="Views & Bookmark"
                badge="Top 8"
                className="xl:col-span-2"
                actions={
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
                      Views
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-pink-300" />
                      Bookmark
                    </span>
                  </div>
                }
              >
                <LineChart
                  labels={stats.top.map((s) => String(s.title || s.slug || "").slice(0, 8))}
                  series={[
                    { name: "Views", color: "#8b5cf6", values: stats.top.map((s) => Number(s.views) || 0) },
                    { name: "Bookmark", color: "#f9a8d4", values: stats.top.map((s) => Number(s.bookmarks) || 0) },
                  ]}
                />
              </Section>

              <Section title="Status Series" badge="Distribusi">
                <BarChart data={stats.byStatus} />
              </Section>
            </div>

            <Section
              title="Daftar Series"
              badge={filteredSeries.length}
              actions={
                <button
                  onClick={refreshSeriesList}
                  aria-label="Refresh daftar series"
                  title="Refresh"
                  className="grid h-11 w-11 place-items-center rounded-lg bg-zinc-800/80 hover:bg-zinc-700"
                >
                  <RefreshCw className={`h-4 w-4 ${remoteLoading ? "animate-spin" : ""}`} />
                </button>
              }
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={seriesQuery}
                    onChange={(e) => setSeriesQuery(e.target.value)}
                    placeholder="Cari berdasarkan judul atau slug..."
                    aria-label="Cari series"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                <Segmented
                  value={seriesSort}
                  onChange={setSeriesSort}
                  options={[
                    { value: "updated", label: "Updated" },
                    { value: "title", label: "Title" },
                    { value: "views", label: "Views" },
                    { value: "bookmarks", label: "Bookmark" },
                  ]}
                />
              </div>

              <ul className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
                {filteredSeries.slice(0, overviewLimit).map((item) => (
                  <li
                    key={item.slug}
                    className="flex items-center gap-3 border-b border-white/5 py-3"
                  >
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-semibold">{item.title}</h4>
                      <div className="truncate font-mono text-[11px] text-zinc-500">{item.slug}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-500">{compact(item.views)} views</span>
                        <button
                          onClick={() => {
                            selectSeriesForChapter(item.slug);
                            setActiveTab("chapter");
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-brand/15 px-2.5 text-[11px] font-medium text-brand-light ring-1 ring-brand/30 transition hover:bg-brand/25"
                        >
                          <Plus className="h-3 w-3" />
                          Chapter
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {filteredSeries.length > overviewLimit && (
                <div className="mt-4 text-center">
                  <button onClick={() => setOverviewLimit((n) => n + 12)} className={btnGhost}>
                    Tampilkan lebih banyak
                  </button>
                </div>
              )}
              {!remoteLoading && filteredSeries.length === 0 && (
                <p className="py-10 text-center text-sm text-zinc-500">Tidak ada series.</p>
              )}
            </Section>
          </>
        )}

        {/* ====================== TAB: SERIES ====================== */}
        {activeTab === "series" && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-8">
              <Section title="Cari & Edit Komik" badge={`${filteredSeries.length} komik`}>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={seriesQuery}
                      onChange={(e) => {
                        setSeriesQuery(e.target.value);
                        setEditSearchOpen(true);
                      }}
                      onFocus={() => setEditSearchOpen(true)}
                      placeholder="Cari berdasarkan judul atau slug..."
                      aria-label="Cari komik untuk diedit"
                      className={`${inputCls} pl-9`}
                    />
                  </div>

                  {editSearchOpen && (
                    <SeriesPickerList
                      loading={remoteLoading}
                      items={filteredSeries}
                      onPick={startEditSeries}
                      extra
                    />
                  )}

                  {editingSlug && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-brand pl-3">
                      <p className="text-sm text-zinc-200">
                        Mode edit: <strong className="text-brand-light">{editingSlug}</strong>
                      </p>
                      <button type="button" onClick={resetSeriesForm} className={btnGhost}>
                        Batal edit
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Identitas & Metadata">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Judul Series">
                    <input
                      value={title}
                      onChange={(e) => handleTitle(e.target.value)}
                      placeholder="Contoh: Solo Leveling"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Slug URL">
                    <input
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      placeholder="solo-leveling"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Tipe">
                    <div className="flex flex-wrap gap-2">
                      {TYPES.map((t) => (
                        <Chip key={t} active={type === t} onClick={() => setType(t)}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Format">
                    <div className="flex flex-wrap gap-2">
                      {FORMATS.map((f) => (
                        <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
                          {f}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <Field label="Status Publikasi">
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Tahun Rilis">
                    <input
                      value={year}
                      onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                      placeholder="2025"
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Penulis (Author)">
                    <input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Chugong"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Artis / Ilustrator">
                    <input
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="DUBU (REDICE STUDIO)"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Aset Visual">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cover URL">
                    <input
                      value={cover}
                      onChange={(e) => setCover(e.target.value.trim())}
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Backdrop URL (Opsional)">
                    <input
                      value={backdrop}
                      onChange={(e) => setBackdrop(e.target.value.trim())}
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-[120px_1fr] items-start gap-4 sm:grid-cols-[140px_minmax(0,320px)]">
                  <PreviewBox label="Preview Cover" src={cover} ratio="aspect-[3/4]" />
                  <PreviewBox label="Preview Backdrop" src={backdrop} ratio="aspect-[16/9]" />
                </div>
              </Section>

              <Section title="Genre & Klasifikasi">
                <Field label="Pilih Genre" hint="Pilih minimal satu genre yang sesuai">
                  <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                    {GENRES.map((g) => (
                      <Chip key={g} active={genres.includes(g)} onClick={() => toggleGenre(g)}>
                        {g}
                      </Chip>
                    ))}
                  </div>
                </Field>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Tags">
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="overpowered, dungeon"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Rating (0-10)">
                    <input
                      value={rating}
                      onChange={(e) => setRating(e.target.value.replace(/[^\d.]/g, "").slice(0, 4))}
                      placeholder="9.5"
                      inputMode="decimal"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Views Awal">
                    <input
                      value={views}
                      onChange={(e) => setViews(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="1000"
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Sinopsis">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={5}
                  placeholder="Tuliskan sinopsis lengkap komik di sini..."
                  aria-label="Sinopsis"
                  className={`${areaCls} leading-relaxed`}
                />
              </Section>

              {/* Submit (sticky) */}
              <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur xl:mx-0 xl:px-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={openSeriesConfirm}
                  className={btnBrand}
                >
                  {busy
                    ? "Sedang Menyimpan..."
                    : editingSlug
                    ? `Simpan Perubahan Komik (${bucket})`
                    : `Publikasikan Komik Baru (${bucket})`}
                </button>
              </div>
            </div>

            {/* JSON inspector */}
            <aside className="xl:sticky xl:top-32 xl:self-start">
              <details className="border-t border-white/10 pt-5 xl:border-t-0 xl:pt-0">
                <summary className="flex cursor-pointer items-center gap-2 text-base font-semibold sm:text-lg">
                  Payload Inspector
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-normal text-zinc-400">
                    JSON
                  </span>
                </summary>
                <pre className="mt-3 max-h-[60vh] overflow-auto rounded-md bg-zinc-900 p-3 font-mono text-[11px] text-zinc-400 ring-1 ring-white/10">
                  {JSON.stringify(seriesObj, null, 2)}
                </pre>
              </details>
            </aside>
          </div>
        )}

        {/* ====================== TAB: CHAPTER ====================== */}
        {activeTab === "chapter" && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-8">
              <Section title="Series Tujuan" badge={`${filteredSeries.length} series`}>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={seriesQuery}
                      onChange={(e) => {
                        setSeriesQuery(e.target.value);
                        setEditSearchOpen(true);
                      }}
                      onFocus={() => setEditSearchOpen(true)}
                      placeholder="Cari judul atau slug series..."
                      aria-label="Cari series tujuan"
                      className={`${inputCls} pl-9`}
                    />
                  </div>

                  {editSearchOpen && (
                    <SeriesPickerList
                      loading={remoteLoading}
                      items={filteredSeries}
                      thumb="h-14 w-10"
                      maxH="max-h-64"
                      onPick={(series) => {
                        selectSeriesForChapter(series.slug);
                        setSeriesQuery("");
                        setEditSearchOpen(false);
                      }}
                    />
                  )}

                  <div className="flex items-center gap-3 border-l-2 border-brand pl-3">
                    {selectedSeries?.cover && (
                      <img
                        src={selectedSeries.cover}
                        alt=""
                        className="h-12 w-9 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400">Series tujuan</p>
                      <p className="truncate text-sm font-semibold text-brand-light">
                        {selectedSeries?.title || seriesSlugForChapter || "Belum dipilih"}
                      </p>
                      {seriesSlugForChapter && (
                        <p className="truncate font-mono text-[11px] text-zinc-500">
                          {seriesSlugForChapter}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Detail Chapter">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Nomor Chapter"
                    hint={
                      chaptersLoading
                        ? "Memuat daftar chapter..."
                        : remoteChapters.length
                        ? `Chapter terakhir: ${lastChapterNo}. Terisi otomatis, tetap bisa diubah.`
                        : seriesSlugForChapter
                        ? "Belum ada chapter, dimulai dari 1."
                        : undefined
                    }
                  >
                    <input
                      value={chNo}
                      onChange={(e) => setChNo(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="1"
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Judul Chapter">
                    <input
                      value={chTitle}
                      onChange={(e) => setChTitle(e.target.value)}
                      placeholder="Chapter 1 (Opsional)"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Tanggal Rilis">
                    <input
                      type="datetime-local"
                      value={chDate}
                      onChange={(e) => setChDate(e.target.value)}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <span className="mb-2 block text-xs font-medium text-zinc-400 sm:text-sm">
                    Format Konten
                  </span>
                  <Segmented
                    value={chapterMode}
                    onChange={setChapterMode}
                    options={[
                      { value: "comic", label: "Komik (gambar)" },
                      { value: "novel", label: "Novel (paragraf)" },
                    ]}
                  />
                </div>
              </Section>

              {chapterMode === "comic" && (
                <Section title="Halaman & URL Gambar">
                  <div className="space-y-4">
                    <Field
                      label="Daftar URL Gambar"
                      hint="Tempel URL gambar (satu per baris atau dipisah koma)"
                    >
                      <textarea
                        value={chImagesRaw}
                        onChange={(e) => setChImagesRaw(e.target.value)}
                        rows={7}
                        placeholder={"https://i.ibb.co/.../001.jpg\nhttps://i.ibb.co/.../002.jpg"}
                        className={`${areaCls} font-mono text-xs`}
                      />
                    </Field>

                    <p className="text-xs text-zinc-400">
                      Terdeteksi: <b className="text-zinc-100">{chImages.length}</b> gambar
                    </p>

                    <Field
                      label="Cover Chapter"
                      hint="Otomatis memakai gambar pertama, atau isi URL cover khusus."
                    >
                      <div className="flex flex-wrap gap-2">
                        <Chip active={chAutoCover} onClick={() => setChAutoCover(true)}>
                          Otomatis (gambar pertama)
                        </Chip>
                        <Chip active={!chAutoCover} onClick={() => setChAutoCover(false)}>
                          Cover custom
                        </Chip>
                      </div>
                    </Field>

                    {!chAutoCover && (
                      <input
                        type="url"
                        value={chCover}
                        onChange={(e) => setChCover(e.target.value)}
                        placeholder="https://example.com/cover-chapter.jpg"
                        aria-label="URL cover chapter"
                        className={inputCls}
                      />
                    )}

                    {chapterCoverPreview && (
                      <div className="w-32">
                        <PreviewBox
                          label="Preview Cover Chapter"
                          src={chapterCoverPreview}
                          ratio="aspect-[3/4]"
                        />
                      </div>
                    )}

                    {chImages.length > 0 && (
                      <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
                        {chImages.map((src, i) => (
                          <div
                            key={i}
                            className="aspect-[3/4] overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10"
                          >
                            <img
                              src={src}
                              alt={`P.${i + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {chapterMode === "novel" && (
                <Section title="Teks Novel">
                  <textarea
                    value={chText}
                    onChange={(e) => setChText(e.target.value)}
                    rows={12}
                    placeholder="Tuliskan naskah novel di sini. Beri satu baris kosong antar paragraf."
                    aria-label="Teks novel"
                    className={`${areaCls} leading-relaxed`}
                  />
                  <div className="mt-2 text-[11px] text-zinc-500">Jumlah karakter: {chText.length}</div>
                </Section>
              )}

              <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur xl:mx-0 xl:px-0">
                <button
                  disabled={busy || chaptersLoading}
                  onClick={onSendChapter}
                  className={btnBrand}
                >
                  {busy
                    ? "Sedang Mengirim..."
                    : `Upload Chapter ke '${seriesSlugForChapter || "Series"}'`}
                </button>
              </div>
            </div>

            {/* Daftar chapter */}
            <aside className="xl:sticky xl:top-32 xl:self-start">
              <Section
                title="Daftar Chapter"
                badge={remoteChapters.length}
                actions={
                  <button
                    onClick={() => refreshChaptersFor(seriesSlugForChapter)}
                    aria-label="Refresh chapter"
                    title="Refresh"
                    className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-800/80 hover:bg-zinc-700"
                  >
                    <RefreshCw className={`h-4 w-4 ${chaptersLoading ? "animate-spin" : ""}`} />
                  </button>
                }
              >
                <ul className="max-h-[60vh] divide-y divide-white/5 overflow-y-auto">
                  {remoteChapters.length === 0 ? (
                    <li className="py-8 text-center text-xs text-zinc-500">
                      Belum ada chapter pada series ini.
                    </li>
                  ) : (
                    remoteChapters.map((ch) => (
                      <li key={ch.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-200">
                            {ch.number}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">
                              Ch. {ch.number} {ch.title ? `- ${ch.title}` : ""}
                            </div>
                            <div className="truncate font-mono text-[10px] text-zinc-500">{ch.id}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            onClick={() => onLoadChapterToForm(ch)}
                            className="h-9 rounded-lg bg-brand/15 px-3 text-xs font-medium text-brand-light ring-1 ring-brand/30 transition hover:bg-brand/25"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteChSlug(seriesSlugForChapter);
                              setDeleteChCode(ch.id);
                              setConfirmMode("chapter");
                              setConfirmOpen(true);
                            }}
                            className="h-9 rounded-lg bg-red-600/15 px-3 text-xs font-medium text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-600/25"
                          >
                            Hapus
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </Section>
            </aside>
          </div>
        )}

        {/* ====================== TAB: HAPUS ====================== */}
        {activeTab === "trash" && (
          <div className="grid gap-8 md:grid-cols-2">
            <Section title="Hapus Series" badge="Danger">
              <p className="mb-4 text-xs leading-normal text-zinc-400">
                Menghapus series beserta seluruh chapter-nya secara permanen dari file{" "}
                <code className="text-zinc-200">{bucket}</code>.
              </p>
              <div className="space-y-3">
                <Field label="Slug Series yang Dihapus">
                  <input
                    value={deleteSlug}
                    onChange={(e) => setDeleteSlug(slugify(e.target.value))}
                    placeholder="mis. solo-leveling"
                    className={dangerInputCls}
                  />
                </Field>
                <button
                  disabled={!deleteSlug.trim() || busy}
                  onClick={() => {
                    setConfirmMode("series");
                    setConfirmOpen(true);
                  }}
                  className={btnDanger}
                >
                  Hapus Series Permanen
                </button>
              </div>
            </Section>

            <Section title="Hapus Chapter" badge="Danger">
              <p className="mb-4 text-xs leading-normal text-zinc-400">
                Hapus satu chapter menggunakan slug series dan ID unik chapter.
              </p>
              <div className="space-y-3">
                <Field label="Slug Series">
                  <input
                    value={deleteChSlug}
                    onChange={(e) => setDeleteChSlug(slugify(e.target.value))}
                    placeholder="mis. solo-leveling"
                    className={dangerInputCls}
                  />
                </Field>
                <Field label="ID / Kode Chapter">
                  <input
                    value={deleteChCode}
                    onChange={(e) => setDeleteChCode(e.target.value.trim())}
                    placeholder="mis. solo-leveling-001"
                    className={dangerInputCls}
                  />
                </Field>
                <button
                  disabled={!deleteChSlug.trim() || !deleteChCode.trim() || busy}
                  onClick={() => {
                    setConfirmMode("chapter");
                    setConfirmOpen(true);
                  }}
                  className={btnDanger}
                >
                  Hapus Chapter Terpilih
                </button>
              </div>
            </Section>
          </div>
        )}
      </main>

      {/* Konfirmasi hapus */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmMode === "series" ? "Konfirmasi Hapus Series" : "Konfirmasi Hapus Chapter"}
        primaryText="Ya, Hapus Data"
        onPrimary={confirmMode === "series" ? onDeleteSeries : onDeleteChapter}
        danger
      >
        {confirmMode === "series" ? (
          <>
            Yakin ingin menghapus series <b className="text-red-400">{deleteSlug}</b> dari{" "}
            <code className="text-zinc-100">{bucket}</code>? Tindakan ini tidak dapat dibatalkan.
          </>
        ) : (
          <>
            Yakin ingin menghapus chapter <b className="text-red-400">{deleteChCode}</b> dari series{" "}
            <b className="text-zinc-100">{deleteChSlug}</b>?
          </>
        )}
      </Modal>

      {/* Sukses */}
      <Modal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Operasi Berhasil"
        primaryText="Selesai"
        onPrimary={() => setSuccessOpen(false)}
      >
        <p>{successInfo.title}</p>
      </Modal>

      {/* Konfirmasi lokasi penyimpanan */}
      <Modal
        open={showLocationConfirm}
        onClose={() => {
          if (!busy) setShowLocationConfirm(false);
        }}
        title="Konfirmasi Lokasi Data"
        primaryText={busy ? "Menyimpan..." : "Ya, Lanjutkan"}
        onPrimary={async () => {
          if (busy) return;
          await onSendSeries();
          setShowLocationConfirm(false);
        }}
      >
        <div className="space-y-3">
          <p>Pastikan tujuan penyimpanan komik sudah benar.</p>

          <dl className="space-y-3 border-l-2 border-brand pl-3">
            <div>
              <dt className="text-xs text-zinc-400">Bucket tujuan</dt>
              <dd className="text-xl font-bold text-emerald-400">{bucket.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Judul komik</dt>
              <dd className="font-semibold">{title || "Belum diisi"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Slug</dt>
              <dd className="break-all font-mono text-zinc-200">{slug || "Belum diisi"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Mode</dt>
              <dd>{editingSlug ? "Simpan perubahan" : "Publikasikan komik baru"}</dd>
            </div>
          </dl>

          <p className="text-amber-300">
            Periksa kembali bucket tujuan sebelum mengirim data ke API.
          </p>
        </div>
      </Modal>
    </div>
  );
}
