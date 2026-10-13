import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

/* ─── Utils ─── */
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

  const cleanUrl = (value) => {
    return value
      .replace(/&amp;/gi, "&")
      .replace(/[),;]+$/, "")
      .trim();
  };

  const urls = matches
    .map(cleanUrl)
    .filter((url) => /^https?:\/\//i.test(url));

  return [...new Set(urls)];
};

const compact = (n) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number(n) || 0
  );

/* ─── Presets ─── */
const GENRES = [
  "Action", "Adaptation", "Adult", "Adventure", "Comedy", "Cooking",
  "Crime", "Demon", "Demons", "Drama", "Ecchi", "Fantasy", "Fight",
  "Game", "Gender Bender", "Harem", "Historical", "Horror", "Isekai",
  "Latest", "Magic", "Martial Arts", "Mature", "Mecha", "Medical",
  "Murim", "Mystery", "Philosophical", "Psychological", "Regression",
  "Revenge", "Romance", "School Life", "Sci-fi", "Seinen", "Shoujo",
  "Shounen", "Slice of Life", "Smut", "Sports", "Supernatural",
  "Supranatural", "Thriller", "Tragedy", "Violence", "Wuxia",
];
const TYPES = ["Manga", "Manhwa", "Manhua"];
const FORMATS = ["Webtoon", "Comic", "Light Novel"];
const STATUSES = ["Ongoing", "Completed", "Hiatus", "Dropped"];
const BUCKETS = ["data1", "data2", "data3"];

/* ─── ENV ─── */
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || "";

/* ─── API helpers ─── */
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
  return httpJson(`/series/${encodeURIComponent(slug)}/chapters?page=${page}&pageSize=${pageSize}`);
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

/* ─── Design tokens ─── */
const inputCls =
  "w-full bg-slate-950/60 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition";
const inputDangerCls =
  "w-full bg-slate-950/60 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition";

/* ─── Icons ─── */
const ICONS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  layers: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>
  ),
  refresh: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  chevronDown: <polyline points="6 9 12 15 18 9" />,
};

const Icon = ({ name, className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {ICONS[name]}
  </svg>
);

/* ─── Charts (SVG murni) ─── */
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
      <div className="flex items-center justify-center text-xs text-slate-500" style={{ height }}>
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Grafik series">
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
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
            stroke="#334155"
            strokeOpacity="0.5"
            strokeDasharray="3 4"
          />
          <text x={padL - 8} y={y(max * g) + 3} textAnchor="end" fontSize="10" fill="#64748b">
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
              <circle key={i} cx={px} cy={py} r="3.5" fill="#0f172a" stroke={s.color} strokeWidth="2" />
            ))}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Grafik status">
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line
            x1={padL}
            x2={W - 8}
            y1={padT + (1 - g) * (H - padT - padB)}
            y2={padT + (1 - g) * (H - padT - padB)}
            stroke="#334155"
            strokeOpacity="0.5"
            strokeDasharray="3 4"
          />
          <text
            x={padL - 6}
            y={padT + (1 - g) * (H - padT - padB) + 3}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
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
            <rect x={bx} y={H - padB - h} width={bw} height={Math.max(h, 2)} rx="6" fill={d.color} />
            <text x={bx + bw / 2} y={H - padB - h - 5} textAnchor="middle" fontSize="10" fill="#cbd5e1">
              {d.value}
            </text>
            <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ─── Micro Components ─── */
const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs sm:text-sm font-medium text-slate-300">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-slate-500 leading-normal">{hint}</p>}
  </div>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
      active
        ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/20"
        : "bg-slate-800/70 text-slate-400 border-slate-700/60 hover:bg-slate-700 hover:text-slate-200"
    }`}
  >
    {children}
  </button>
);

const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex bg-slate-950/70 border border-slate-800 rounded-lg p-0.5 overflow-x-auto max-w-full">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
          value === o.value
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Card = ({ title, badge, actions, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 sm:p-5 shadow-lg shadow-black/20 ${className}`}
  >
    {(title || actions) && (
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-slate-100">{title}</h3>
          {badge && (
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
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

const StatCard = ({ icon, label, value, tone = "violet", dark = false, children }) => {
  const tones = {
    violet: "bg-violet-500/15 text-violet-300",
    pink: "bg-pink-500/15 text-pink-300",
    sky: "bg-sky-500/15 text-sky-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
  };
  return (
    <div
      className={`p-4 rounded-2xl border shadow-lg shadow-black/20 ${
        dark
          ? "bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-500/40"
          : "bg-slate-900/80 border-slate-800/90"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          dark ? "bg-white/15 text-white" : tones[tone]
        }`}
      >
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <div className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white truncate">{value}</div>
      <div className={`text-xs mt-0.5 ${dark ? "text-violet-100/80" : "text-slate-500"}`}>{label}</div>
      {children}
    </div>
  );
};

const Modal = ({ open, onClose, title, children, primaryText, onPrimary, danger = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl">
        <h4 className="text-base sm:text-lg font-bold text-slate-100 mb-2">{title}</h4>
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">{children}</div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition"
          >
            Batal
          </button>
          {onPrimary && (
            <button
              onClick={onPrimary}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold transition shadow-lg ${
                danger
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
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
  <div className={`${maxH} space-y-2 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/40 p-2`}>
    {loading ? (
      <p className="p-3 text-sm text-slate-400">Memuat daftar komik...</p>
    ) : items.length === 0 ? (
      <p className="p-3 text-sm text-slate-400">Komik tidak ditemukan.</p>
    ) : (
      items.map((series) => (
        <button
          key={series.slug}
          type="button"
          onClick={() => onPick(series)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-violet-500/70 hover:bg-slate-800"
        >
          {series.cover ? (
            <img src={series.cover} alt={series.title} className={`${thumb} rounded-lg object-cover shrink-0`} />
          ) : (
            <div
              className={`${thumb} shrink-0 flex items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500`}
            >
              No cover
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{series.title}</p>
            <p className="truncate text-xs text-slate-400">{series.slug}</p>
            {extra && (
              <p className="text-xs text-slate-500">
                {series.format || series.type || "Komik"} · {series.status || "Ongoing"}
              </p>
            )}
          </div>
          <span className="text-xs font-medium text-violet-400 shrink-0">Pilih</span>
        </button>
      ))
    )}
  </div>
);

/* ─── Main Admin Dashboard Component ─── */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview"); // overview | series | chapter | trash
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const chapterSubmitLock = useRef(false);
  const [bucket, setBucket] = useState("data1");

  /* Remote Data State */
  const [remoteSeries, setRemoteSeries] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [seriesQuery, setSeriesQuery] = useState("");
  const [seriesSort, setSeriesSort] = useState("updated");
  const [editingSlug, setEditingSlug] = useState("");
  const [editSearchOpen, setEditSearchOpen] = useState(false);

  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState("");
  const [remoteChapters, setRemoteChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  /* Series Form State */
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

  /* Chapter Form State */
  const [seriesSlugForChapter, setSeriesSlugForChapter] = useState("");
  const [chNo, setChNo] = useState("1");
  const [chTitle, setChTitle] = useState("");
  const [chDate, setChDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [chImagesRaw, setChImagesRaw] = useState("");
  const [chCover, setChCover] = useState("");
  const [chAutoCover, setChAutoCover] = useState(true);
  const [chapterMode, setChapterMode] = useState("comic");
  const [chText, setChText] = useState("");

  /* Trash / Delete State */
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
    !seriesObj.title || !seriesObj.slug || !seriesObj.description ||
    !seriesObj.cover || seriesObj.genres.length === 0;

  const chapterOnly = useMemo(() => {
    const idBase = seriesSlugForChapter.trim();
    const number = Number(chNo) || 1;
    if (!idBase) return null;

    const publishedAt = chDate
      ? new Date(chDate).toISOString()
      : new Date().toISOString();

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
      base = {
        ...base,
        pages: chImages,
        type: "comic",
      };
    } else {
      const blocks = chText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

      base = {
        ...base,
        type: "novel",
        content: chText,
        content_blocks: blocks,
      };
    }

    return base;
  }, [
    seriesSlugForChapter,
    chNo,
    chTitle,
    chDate,
    chAutoCover,
    chCover,
    chImages,
    chText,
    chapterMode,
  ]);

  /* Fetch API */
  async function refreshSeriesList() {
    try {
      setRemoteLoading(true);
      const out = await getSeriesLatest({ page: 1, pageSize: 2000 });
      setRemoteSeries(Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : []);
    } catch (e) {
      toast.error(e.message || "Gagal mengambil daftar series");
      setRemoteSeries([]);
    } finally {
      setRemoteLoading(false);
    }
  }

  async function refreshChaptersFor(slugTarget) {
    if (!slugTarget) {
      setRemoteChapters([]);
      return;
    }
    try {
      setChaptersLoading(true);
      const out = await getSeriesChapters(slugTarget, { page: 1, pageSize: 5000 });
      setRemoteChapters(Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : []);
    } catch (e) {
      toast.error(e.message || "Gagal mengambil chapter");
      setRemoteChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  }

  useEffect(() => {
    refreshSeriesList();
  }, []);

  useEffect(() => {
    if (!selectedSeriesSlug) return;
    setSeriesSlugForChapter(selectedSeriesSlug);
    refreshChaptersFor(selectedSeriesSlug);
  }, [selectedSeriesSlug]);

  const filteredSeries = useMemo(() => {
    const q = seriesQuery.trim().toLowerCase();
    let list = Array.isArray(remoteSeries) ? [...remoteSeries] : [];
    if (q) {
      list = list.filter((s) =>
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
      list.sort((a, b) => (Date.parse(b?.updatedAt || 0) || 0) - (Date.parse(a?.updatedAt || 0) || 0));
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
      color: ["#8b5cf6", "#34d399", "#f9a8d4", "#64748b"][i],
    }));
    return { totalViews, totalBookmarks, top, byStatus };
  }, [remoteSeries]);

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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  /* Submit Handlers */
  async function onSendSeries() {
    try {
      if (!ADMIN_TOKEN) {
        toast.error("VITE_ADMIN_TOKEN belum diset.");
        return;
      }
      if (seriesInvalid) {
        toast.error("Lengkapi judul, slug, sinopsis, cover, dan minimal 1 genre.");
        return;
      }
      setBusy(true);
      const isEditing = Boolean(editingSlug);
      const timestamp = new Date().toISOString();
      let payload;

      if (isEditing) {
        const { chapters, createdAt, ...editableFields } = seriesObj;
        payload = {
          ...editableFields,
          originalSlug: editingSlug,
          updatedAt: timestamp,
        };
      } else {
        payload = {
          ...seriesObj,
          chapters: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }

      const out = await createOrUpdateSeries(payload, bucket);
      toast.success(isEditing ? "Informasi komik berhasil diperbarui!" : "Komik baru berhasil ditambahkan!");
      setSuccessInfo({
        title: isEditing
          ? `Komik '${out?.series?.title || seriesObj.title}' berhasil diperbarui.`
          : `Komik '${out?.series?.title || seriesObj.title}' berhasil disimpan.`,
      });
      setSuccessOpen(true);
      await refreshSeriesList();
      resetSeriesForm();
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan informasi komik.");
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
      const targetBucket = bucket;
      const chapterNumber = Number(chapterOnly.number);

      const out = await createOrUpdateChapter(
        targetSlug,
        chapterOnly,
        targetBucket
      );

      const uploadedNo = out?.chapter?.number ?? chapterNumber;

      toast.success(`Chapter ${uploadedNo} berhasil disimpan!`);

      setSuccessInfo({
        title: `Chapter [${uploadedNo}] berhasil diupload ke '${targetSlug}'`,
      });
      setSuccessOpen(true);

      setChTitle("");
      setChNo(String((Number(uploadedNo) || 1) + 1));

      if (chapterMode === "comic") {
        setChImagesRaw("");
        setChCover("");
        setChAutoCover(true);
      } else {
        setChText("");
      }

      await refreshChaptersFor(targetSlug);
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
      if (!deleteChSlug.trim() || !deleteChCode.trim()) return toast.error("Lengkapi slug & ID chapter.");
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

  const navItems = [
    { id: "overview", label: "Dashboard", short: "Dashboard", icon: "grid" },
    { id: "series", label: "Kelola Series", short: "Series", icon: "book" },
    { id: "chapter", label: "Update Chapter", short: "Chapter", icon: "upload" },
    { id: "trash", label: "Hapus Data", short: "Hapus", icon: "trash" },
  ];
  const activeLabel = navItems.find((n) => n.id === activeTab)?.label || "Dashboard";
  const activeIcon = navItems.find((n) => n.id === activeTab)?.icon || "grid";

  const chapterCoverPreview = chAutoCover ? chImages[0] : chCover.trim() || chImages[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-violet-600 selection:text-white">
      {/* ─── Backdrop Dropdown (Mobile) ─── */}
      {menuDropdownOpen && (
        <div
          onClick={() => setMenuDropdownOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar (Hanya Desktop) ─── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-800/80 bg-slate-900 p-4">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-sm shadow-lg shadow-violet-500/30">
            GV
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">Studio Panel</h1>
            <span className="text-[11px] text-slate-500">Comic Management API</span>
          </div>
        </div>

        <p className="mt-6 mb-2 px-3 text-xs font-medium text-slate-500">Menu</p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === item.id
                  ? "bg-violet-600/15 text-violet-300 ring-1 ring-inset ring-violet-500/30"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
              }`}
            >
              <Icon name={item.icon} className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Quick Endpoint Info Card */}
        <div className="mt-auto p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">Endpoint Aktif</div>
          <div className="truncate font-mono text-[10px] text-slate-500">{API_BASE}</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            API Connected
          </div>
        </div>
      </aside>

      {/* ─── Konten Utama ─── */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        {/* Top bar Header */}
        <header className="sticky top-0 z-50 h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3">
         <div className="flex items-center min-w-0">
  {/* Desktop: Label Judul Tetap Statis */}
  <h2 className="hidden lg:block text-lg font-bold tracking-tight truncate">
    {activeLabel}
  </h2>

  {/* Mobile: Tombol Dropdown Dashboard rata kiri */}
  <div className="relative lg:hidden">
    <button
      type="button"
      onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-violet-500/50 focus:outline-none transition active:scale-95"
    >
      <Icon name={activeIcon} className="w-4 h-4 text-violet-400 shrink-0" />
      <span className="text-xs font-semibold">{activeLabel}</span>
      <Icon
        name="chevronDown"
        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
          menuDropdownOpen ? "rotate-180" : ""
        }`}
      />
    </button>

    {/* Menu Popup */}
    {menuDropdownOpen && (
      <div className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setMenuDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
              activeTab === item.id
                ? "bg-violet-600/20 text-violet-300 font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Icon name={item.icon} className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>
    )}
  </div>
</div>

          {/* Database Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-400">DB:</span>
            <div className="flex bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-slate-800">
              {BUCKETS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBucket(b)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition ${
                    bucket === b
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-[1400px] w-full mx-auto space-y-6">
          {/* TAB 1: OVERVIEW / DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard icon="layers" label="Total Series" value={remoteSeries.length} dark />
                <StatCard icon="eye" label="Total Views" value={compact(stats.totalViews)} tone="sky" />
                <StatCard icon="bookmark" label="Total Bookmark" value={compact(stats.totalBookmarks)} tone="pink" />
                <StatCard icon="database" label="Target Database" value={bucket.toUpperCase()} tone="violet" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
                    <Icon name="shield" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500">Status API</div>
                    <div className="text-sm sm:text-lg font-bold text-emerald-400 truncate">Online</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center shrink-0">
                    <Icon name="shield" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500">Admin Auth</div>
                    <div className={`text-sm sm:text-lg font-bold truncate ${ADMIN_TOKEN ? "text-slate-100" : "text-rose-400"}`}>
                      {ADMIN_TOKEN ? "Aktif" : "Kosong"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                <Card
                  title="Views & Bookmark"
                  badge="Top 8"
                  className="xl:col-span-2"
                  actions={
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        Views
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-300" />
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
                </Card>

                <Card title="Status Series" badge="Distribusi">
                  <BarChart data={stats.byStatus} />
                </Card>
              </div>

              {/* Series Listing & Quick Actions */}
              <Card
                title="Daftar Series di Database"
                badge={`${filteredSeries.length}`}
                actions={
                  <button
                    onClick={refreshSeriesList}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                  >
                    <Icon name="refresh" className={`w-3.5 h-3.5 ${remoteLoading ? "animate-spin" : ""}`} />
                    {remoteLoading ? "Memuat…" : "Refresh"}
                  </button>
                }
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <input
                    value={seriesQuery}
                    onChange={(e) => setSeriesQuery(e.target.value)}
                    placeholder="Cari berdasarkan judul atau slug…"
                    className={`${inputCls} flex-1`}
                  />
                  <Segmented
                    value={seriesSort}
                    onChange={setSeriesSort}
                    options={[
                      { value: "updated", label: "Updated" },
                      { value: "title", label: "Title" },
                      { value: "views", label: "Views" },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredSeries.slice(0, 12).map((item) => (
                    <div
                      key={item.slug}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3 hover:border-slate-600 transition"
                    >
                      <div className="w-12 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                        {item.cover ? (
                          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold truncate text-slate-200">{item.title}</h4>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{item.slug}</div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[11px] text-slate-500">
                            {compact(item.views)} views
                          </span>
                          <button
                            onClick={() => {
                              setSelectedSeriesSlug(item.slug);
                              setActiveTab("chapter");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-600/20 text-violet-300 text-[11px] font-medium border border-violet-500/25 hover:bg-violet-600/30 transition"
                          >
                            <Icon name="plus" className="w-3 h-3" />
                            Chapter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: SERIES MANAGEMENT */}
          {activeTab === "series" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-5">
                {/* Search existing series to edit */}
                <Card title="Cari & Edit Komik" badge={`${filteredSeries.length} komik`}>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={seriesQuery}
                      onChange={(e) => {
                        setSeriesQuery(e.target.value);
                        setEditSearchOpen(true);
                      }}
                      onFocus={() => setEditSearchOpen(true)}
                      placeholder="Cari berdasarkan judul atau slug..."
                      className={inputCls}
                    />

                    {editSearchOpen && (
                      <SeriesPickerList
                        loading={remoteLoading}
                        items={filteredSeries}
                        onPick={startEditSeries}
                        extra
                      />
                    )}

                    {editingSlug && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/40 bg-violet-500/10 p-3">
                        <p className="text-sm text-violet-200">
                          Mode edit: <strong>{editingSlug}</strong>
                        </p>
                        <button
                          type="button"
                          onClick={resetSeriesForm}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white hover:bg-slate-800"
                        >
                          Batal edit
                        </button>
                      </div>
                    )}
                  </div>
                </Card>

                <Card title="Identitas & Metadata Komik">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>
                        ))}
                      </div>
                    </Field>
                    <Field label="Format">
                      <div className="flex flex-wrap gap-2">
                        {FORMATS.map((f) => (
                          <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{f}</Chip>
                        ))}
                      </div>
                    </Field>

                    <Field label="Status Publikasi">
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => (
                          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Chip>
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
                </Card>

                <Card title="Aset Visual">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1.5 block">Preview Cover</span>
                      <div className="aspect-[3/4] max-h-48 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                        {cover ? (
                          <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-600">No Image</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1.5 block">Preview Backdrop</span>
                      <div className="aspect-[16/9] max-h-48 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                        {backdrop ? (
                          <img src={backdrop} alt="Backdrop" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-600">No Image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Genre & Klasifikasi">
                  <Field label="Pilih Genre" hint="Pilih minimal satu genre yang sesuai">
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                      {GENRES.map((g) => (
                        <Chip key={g} active={genres.includes(g)} onClick={() => toggleGenre(g)}>
                          {g}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
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
                </Card>

                <Card title="Sinopsis Cerita">
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={5}
                    placeholder="Tuliskan sinopsis lengkap komik di sini..."
                    className={`${inputCls} leading-relaxed`}
                  />
                </Card>

                {/* Submit Action */}
                <div className="sticky bottom-4 z-20">
                  <button
                    disabled={busy}
                    onClick={onSendSeries}
                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-black/40 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy
                      ? "Sedang Menyimpan…"
                      : editingSlug
                      ? `Simpan Perubahan Komik (${bucket})`
                      : `Publikasikan Komik Baru (${bucket})`}
                  </button>
                </div>
              </div>

              {/* Live JSON Preview */}
              <div className="space-y-4">
                <Card title="Payload Inspector" badge="JSON">
                  <pre className="text-[11px] font-mono text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800/80 overflow-x-auto max-h-[500px]">
                    {JSON.stringify(seriesObj, null, 2)}
                  </pre>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: CHAPTER MANAGEMENT */}
          {activeTab === "chapter" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-5">
                {/* Target Series Picker */}
                <Card title="Pilih Series Tujuan" badge={`${filteredSeries.length} series`}>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={seriesQuery}
                      onChange={(e) => {
                        setSeriesQuery(e.target.value);
                        setEditSearchOpen(true);
                      }}
                      onFocus={() => setEditSearchOpen(true)}
                      placeholder="Cari judul atau slug series..."
                      className={inputCls}
                    />
                    {editSearchOpen && (
                      <SeriesPickerList
                        loading={remoteLoading}
                        items={filteredSeries}
                        thumb="h-14 w-10"
                        maxH="max-h-64"
                        onPick={(series) => {
                          setSelectedSeriesSlug(series.slug);
                          setSeriesSlugForChapter(series.slug);
                          setSeriesQuery("");
                          setEditSearchOpen(false);
                        }}
                      />
                    )}
                    <p className="text-xs text-slate-400">
                      Series tujuan:{" "}
                      <strong className="text-violet-300">{seriesSlugForChapter || "Belum dipilih"}</strong>
                    </p>
                  </div>
                </Card>

                {/* Chapter Meta */}
                <Card title="Detail Chapter">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Nomor Chapter">
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

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-400 block mb-2 font-medium">Format Konten</span>
                    <div className="flex flex-wrap gap-2">
                      <Chip active={chapterMode === "comic"} onClick={() => setChapterMode("comic")}>
                        🖼️ Komik (Kumpulan Gambar)
                      </Chip>
                      <Chip active={chapterMode === "novel"} onClick={() => setChapterMode("novel")}>
                        📝 Novel (Format Paragraf)
                      </Chip>
                    </div>
                  </div>
                </Card>

                {/* Mode Komik */}
                {chapterMode === "comic" && (
                  <Card title="Halaman & URL Gambar">
                    <div className="space-y-4">
                      <Field
                        label="Daftar URL Gambar"
                        hint="Tempel baris URL gambar (satu per baris atau dipisah koma)"
                      >
                        <textarea
                          value={chImagesRaw}
                          onChange={(e) => setChImagesRaw(e.target.value)}
                          rows={7}
                          placeholder={"https://i.ibb.co/.../001.jpg\nhttps://i.ibb.co/.../002.jpg"}
                          className={`${inputCls} font-mono text-xs`}
                        />
                      </Field>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          Total terdeteksi: <b className="text-slate-200">{chImages.length}</b> gambar
                        </span>
                        <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chAutoCover}
                            onChange={(e) => setChAutoCover(e.target.checked)}
                            className="accent-violet-500"
                          />
                          Jadikan gambar ke-1 sebagai cover
                        </label>
                      </div>

                      <Field
                        label="Cover Chapter Custom (Opsional)"
                        hint="Masukkan URL gambar cover khusus. Jika mode otomatis aktif, cover mengikuti gambar pertama."
                      >
                        <input
                          type="url"
                          value={chCover}
                          onChange={(e) => {
                            setChCover(e.target.value);
                            setChAutoCover(false);
                          }}
                          placeholder="https://example.com/cover-chapter.jpg"
                          className={inputCls}
                        />
                      </Field>

                      <div className="flex flex-wrap gap-2">
                        <Chip active={chAutoCover} onClick={() => setChAutoCover(true)}>
                          Otomatis (gambar pertama)
                        </Chip>
                        <Chip active={!chAutoCover} onClick={() => setChAutoCover(false)}>
                          Gunakan cover custom
                        </Chip>
                      </div>

                      {chapterCoverPreview && (
                        <div>
                          <span className="text-[11px] text-slate-500 mb-1.5 block">
                            Preview Cover Chapter
                          </span>
                          <div className="w-32 aspect-[3/4] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                            <img
                              src={chapterCoverPreview}
                              alt="Preview cover chapter"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* Image Preview Grid */}
                      {chImages.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                          {chImages.map((src, i) => (
                            <div
                              key={i}
                              className="aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden"
                            >
                              <img
                                src={src}
                                alt={`P.${i + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Mode Novel */}
                {chapterMode === "novel" && (
                  <Card title="Teks Paragraf Novel">
                    <textarea
                      value={chText}
                      onChange={(e) => setChText(e.target.value)}
                      rows={12}
                      placeholder="Tuliskan naskah novel di sini. Beri satu spasi baris kosong antar paragraf."
                      className={`${inputCls} leading-relaxed`}
                    />
                    <div className="text-[11px] text-slate-500 mt-2">
                      Jumlah Karakter: {chText.length}
                    </div>
                  </Card>
                )}

                <div className="sticky bottom-4 z-20">
                  <button
                    disabled={busy}
                    onClick={onSendChapter}
                    className="w-full py-3.5 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-xl shadow-black/40 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy ? "Sedang Mengirim…" : `Upload Chapter ke '${seriesSlugForChapter || "Series"}'`}
                  </button>
                </div>
              </div>

              {/* Existing Chapters Panel */}
              <div className="space-y-4">
                <Card
                  title={`Daftar Chapter (${remoteChapters.length})`}
                  actions={
                    <button
                      onClick={() => refreshChaptersFor(seriesSlugForChapter)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      <Icon name="refresh" className={`w-3.5 h-3.5 ${chaptersLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  }
                >
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {remoteChapters.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Belum ada chapter pada series ini.
                      </div>
                    ) : (
                      remoteChapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                              {ch.number}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate">
                                Ch. {ch.number} {ch.title ? `— ${ch.title}` : ""}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">{ch.id}</div>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => onLoadChapterToForm(ch)}
                              className="px-2.5 py-1 rounded-md bg-sky-600/20 text-sky-300 text-xs font-medium border border-sky-500/25 hover:bg-sky-600/30 transition"
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
                              className="px-2.5 py-1 rounded-md bg-rose-600/20 text-rose-300 text-xs font-medium border border-rose-500/25 hover:bg-rose-600/30 transition"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: TRASH & MANAGEMENT */}
          {activeTab === "trash" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Hapus Keseluruhan Series" badge="Danger">
                <p className="text-xs text-slate-400 mb-4 leading-normal">
                  Tindakan ini akan menghapus entitas series beserta seluruh chapter-nya secara permanen dari file{" "}
                  <code className="text-slate-200">{bucket}</code>.
                </p>
                <div className="space-y-3">
                  <Field label="Slug Series yang Dihapus">
                    <input
                      value={deleteSlug}
                      onChange={(e) => setDeleteSlug(slugify(e.target.value))}
                      placeholder="mis. solo-leveling"
                      className={inputDangerCls}
                    />
                  </Field>
                  <button
                    disabled={!deleteSlug.trim() || busy}
                    onClick={() => {
                      setConfirmMode("series");
                      setConfirmOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm disabled:opacity-50 transition"
                  >
                    Hapus Series Permanen
                  </button>
                </div>
              </Card>

              <Card title="Hapus Chapter Tertentu" badge="Danger">
                <p className="text-xs text-slate-400 mb-4 leading-normal">
                  Hapus satu chapter secara spesifik menggunakan slug series dan ID unik chapter.
                </p>
                <div className="space-y-3">
                  <Field label="Slug Series">
                    <input
                      value={deleteChSlug}
                      onChange={(e) => setDeleteChSlug(slugify(e.target.value))}
                      placeholder="mis. solo-leveling"
                      className={inputDangerCls}
                    />
                  </Field>
                  <Field label="ID / Kode Chapter">
                    <input
                      value={deleteChCode}
                      onChange={(e) => setDeleteChCode(e.target.value.trim())}
                      placeholder="mis. solo-leveling-001"
                      className={inputDangerCls}
                    />
                  </Field>
                  <button
                    disabled={!deleteChSlug.trim() || !deleteChCode.trim() || busy}
                    onClick={() => {
                      setConfirmMode("chapter");
                      setConfirmOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm disabled:opacity-50 transition"
                  >
                    Hapus Chapter Terpilih
                  </button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal */}
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
            Apakah kamu yakin ingin menghapus series <b className="text-rose-400">{deleteSlug}</b> dari basis data{" "}
            <code className="text-slate-200">{bucket}</code>? Tindakan ini tidak dapat dibatalkan.
          </>
        ) : (
          <>
            Apakah kamu yakin ingin menghapus chapter <b className="text-rose-400">{deleteChCode}</b> dari series{" "}
            <b className="text-slate-200">{deleteChSlug}</b>?
          </>
        )}
      </Modal>

      {/* Success Modal */}
      <Modal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Operasi Berhasil 🎉"
        primaryText="Selesai"
        onPrimary={() => setSuccessOpen(false)}
      >
        <p className="text-slate-300">{successInfo.title}</p>
      </Modal>
    </div>
  );
}
