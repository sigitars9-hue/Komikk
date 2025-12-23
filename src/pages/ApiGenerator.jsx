import { useMemo, useState } from "react";
import toast from "react-hot-toast";

/* ─── Utils ─── */
const slugify = (s = "") =>
  s.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const parseImageList = (raw) => {
  if (!raw) return [];
  const toks = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
        s = s.slice(1, -1).trim();
      if (s.endsWith(",")) s = s.slice(0, -1);
      return s.trim();
    })
    .filter((u) => /^https?:\/\//i.test(u));
  const uniq = [];
  const seen = new Set();
  for (const u of toks) if (!seen.has(u)) { seen.add(u); uniq.push(u); }
  return uniq;
};

/* ─── Presets ─── */
const GENRES = [
  "Action", "Adaptation", "Adult",
  "Adventure", "Comedy", "Cooking",
  "Crime", "Demon", "Demons",

  "Drama", "Ecchi", "Fantasy", "Fight",
  "Game", "Gender Bender", "Harem",

  "Historical", "Horror", "Isekai",
  "Latest", "Magic", "Martial Arts",
  "Mature", "Mecha", "Medical",
  "Murim", "Mystery", "Philosophical",

  "Psychological", "Regression", "Revenge",
  "Romance", "School Life", "Sci-fi",
  "Seinen", "Shoujo", "Shounen",

  "Slice of Life", "Smut", "Sports",
  "Supernatural", "Supranatural", // kalau perlu dua istilah
  "Thriller", "Tragedy", "Violence",
  "Wuxia"

];
const TYPES   = ["Manga", "Manhwa", "Manhua"];
const FORMATS = ["Webtoon", "Comic", "Light Novel"];
const STATUSES = ["Ongoing", "Completed", "Hiatus", "Dropped"];
const BUCKETS = ["data1", "data2", "data3"];

/* ─── ENV ─── */
const API_BASE    = (import.meta.env?.VITE_API_BASE || "/api").replace(/\/+$/,"");
const ADMIN_TOKEN = import.meta.env?.VITE_ADMIN_TOKEN || "";

/* ─── API helpers ─── */
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

// 🟣 Series: body tetap { slug, title, ... }, hanya ditambah field bucket
async function createOrUpdateSeries(seriesObj, bucket) {
  const body = bucket ? { ...seriesObj, bucket } : seriesObj;
  return httpJson(`/admin/series`, {
    method: "POST",
    body,
  });
}

// 🔵 Chapter: sama, chapter disend flat + bucket
async function createOrUpdateChapter(seriesSlug, chapterObj, bucket) {
  const body = bucket ? { ...chapterObj, bucket } : chapterObj;
  return httpJson(
    `/admin/series/${encodeURIComponent(seriesSlug)}/chapters`,
    {
      method: "POST",
      body,
    }
  );
}

// 🔴 Hapus series: DELETE + body { bucket } (kalau backendmu nggak pakai body, ini akan diabaikan)
async function deleteSeries(seriesSlug, bucket) {
  return httpJson(`/admin/series/${encodeURIComponent(seriesSlug)}`, {
    method: "DELETE",
    body: bucket ? { bucket } : undefined,
  });
}

// 🟠 Hapus chapter: DELETE + body { bucket }
async function deleteChapter(seriesSlug, chapterId, bucket) {
  return httpJson(
    `/admin/series/${encodeURIComponent(seriesSlug)}/chapters/${encodeURIComponent(
      chapterId
    )}`,
    {
      method: "DELETE",
      body: bucket ? { bucket } : undefined,
    }
  );
}


/* ─── UI helpers ─── */
const Field = ({ label, hint, children }) => (
  <label className="block">
    <div className="text-[13px] sm:text-sm font-medium mb-1">{label}</div>
    {children}
    {hint && <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">{hint}</div>}
  </label>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-[13px] border transition
      ${active ? "bg-violet-600 text-white border-violet-500"
               : "bg-zinc-800/70 text-zinc-200 border-white/10 hover:bg-zinc-700"}`}
  >
    {children}
  </button>
);

const Box = ({ title, actions, children }) => (
  <section className="rounded-xl sm:rounded-2xl ring-1 ring-white/10 bg-zinc-900/60 p-3 sm:p-4">
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-base sm:text-lg font-bold">{title}</h3>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
    {children}
  </section>
);

/* ─── Modal ─── */
const Modal = ({ open, onClose, title, children, primaryText, onPrimary }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/70 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl bg-zinc-900 ring-1 ring-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-lg sm:text-xl font-bold">{title}</h4>
        </div>
        <div className="text-sm text-zinc-200">{children}</div>
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            Tutup
          </button>
          {onPrimary && (
            <button
              onClick={onPrimary}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {primaryText || "OK"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Page ─── */
export default function ApiGenerator() {
  const [tab, setTab] = useState("series"); // series | chapter | deleteSeries | deleteChapter
  const [busy, setBusy] = useState(false);

  // ➕ bucket target data.json mana
  const [bucket, setBucket] = useState("data1");


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
  const [chDate, setChDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [chImagesRaw, setChImagesRaw] = useState("");
  const [chCover, setChCover] = useState("");
  const [chAutoCover, setChAutoCover] = useState(true);
  const chImages = useMemo(() => parseImageList(chImagesRaw), [chImagesRaw]);
  const [chapterMode, setChapterMode] = useState("comic"); // "comic" | "novel"
  const [chText, setChText] = useState("");                // isi teks novel


  /* Delete form & modals */
  const [deleteSlug, setDeleteSlug] = useState("");

  // ➕ untuk hapus chapter
  const [deleteChSlug, setDeleteChSlug] = useState("");
  const [deleteChCode, setDeleteChCode] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState("series"); // "series" | "chapter"

  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: "", link: null });


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
      type, format, status,
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

  const publishedAt = chDate ? new Date(chDate).toISOString() : nowIso;
  const thumbnail =
    chAutoCover ? chImages[0] || "" : chCover?.trim() || chImages[0] || "";

  // 🔽 validasi beda tergantung mode
  if (chapterMode === "comic" && chImages.length === 0) return null;
  if (chapterMode === "novel" && !chText.trim()) return null;

  let base = {
    number,
    title: chTitle?.trim() || `Chapter ${number}`,
    publishedAt,
    thumbnail: thumbnail || undefined,
  };

  if (chapterMode === "comic") {
    base = {
      ...base,
      pages: chImages,           // schema lama, tetap dipakai untuk komik
      type: "comic",
    };
  } else {
    // mode novel: kirim teks
    const blocks = chText
      .split(/\n{2,}/)           // paragraf dipisah 1 baris kosong
      .map(p => p.trim())
      .filter(Boolean);

    base = {
      ...base,
      type: "novel",
      content: chText,           // raw full text
      content_blocks: blocks,    // array paragraf – dipakai NovelReader
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
  nowIso,
]);


  /* Actions */
  async function onSendSeries() {
    try {
      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");
      if (seriesInvalid) return toast.error("Lengkapi: Judul, Slug, Sinopsis, Cover, minimal 1 Genre.");
      setBusy(true);
      const out = await createOrUpdateSeries(seriesObj, bucket);
      toast.success("Series tersimpan.");
      setSuccessInfo({ title: `Series '${out?.series?.slug || seriesObj.slug}' tersimpan` });
      setSuccessOpen(true);
    } catch (e) {
      toast.error(e.message || "Gagal kirim series");
    } finally { setBusy(false); }
  }


  async function onSendChapter() {
    try {
      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");
      if (!seriesSlugForChapter.trim())
        return toast.error("Isi Series Slug dulu.");

      if (chapterMode === "comic" && chImages.length === 0)
        return toast.error("Mode komik: isi minimal 1 URL gambar.");
      if (chapterMode === "novel" && !chText.trim())
        return toast.error("Mode novel: isi teks chapter dulu.");

      if (!chapterOnly)
        return toast.error("Data chapter belum lengkap.");

      setBusy(true);
      const out = await createOrUpdateChapter(
        seriesSlugForChapter.trim(),
        chapterOnly,
        bucket
      );
      toast.success(`Chapter ${out?.chapter?.number ?? ""} tersimpan.`);
      setSuccessInfo({
        title: `Chapter tersimpan untuk '${seriesSlugForChapter.trim()}'`,
      });
      setSuccessOpen(true);
    } catch (e) {
      toast.error(e.message || "Gagal kirim chapter");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteChapter() {
    try {
      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");
      if (!deleteChSlug.trim())
        return toast.error("Isi slug series chapter yang mau dihapus.");
      if (!deleteChCode.trim())
        return toast.error("Isi Kode/ID chapter (mis. eleceed-001).");

      setConfirmOpen(false);
      setBusy(true);
      await deleteChapter(
        deleteChSlug.trim(),
        deleteChCode.trim(),
        bucket
      );
      toast.success("Chapter terhapus.");
      setSuccessInfo({
        title: `Chapter '${deleteChCode.trim()}' dari series '${deleteChSlug.trim()}' terhapus`,
      });
      setSuccessOpen(true);
    } catch (e) {
      toast.error(e.message || "Gagal hapus chapter");
    } finally {
      setBusy(false);
    }
  }


  async function onDeleteSeries() {
    try {
      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");
      if (!deleteSlug.trim()) return toast.error("Isi slug series yang mau dihapus.");
      setConfirmOpen(false);
      setBusy(true);
      await deleteSeries(deleteSlug.trim(), bucket);
      toast.success("Series terhapus.");
      setSuccessInfo({ title: `Series '${deleteSlug.trim()}' terhapus` });
      setSuccessOpen(true);
    } catch (e) {
      toast.error(e.message || "Gagal hapus series");
    } finally { setBusy(false); }
  }

  /* UI */
  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold">API Generator (Admin)</h1>
        <div className="ml-auto text-[11px] sm:text-xs text-zinc-400">
          Endpoint BASE: <code className="break-all">{API_BASE}</code>
        </div>
      </div>

      {/* Tabs (sticky on mobile) */}
      {/* Tabs (sticky on mobile) */}
      <div className="sticky top-0 z-10 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50 space-y-2">
        <div className="flex gap-2">
          {["series", "chapter", "deleteSeries", "deleteChapter"].map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm ring-1 ring-white/10
                ${tab === k ? "bg-violet-600 text-white"
                            : "bg-zinc-800 hover:bg-zinc-700"}`}
            >
              {k === "series"
                ? "Upload/Update Series"
                : k === "chapter"
                ? "Upload/Update Chapter"
                : k === "deleteSeries"
                ? "Hapus Series"
                : "Hapus Chapter"}
            </button>
          ))}
        </div>

        {/* ➕ selector bucket */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="text-[11px] sm:text-xs text-zinc-400">
            Target file JSON:
          </div>
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map((b) => (
              <Chip
                key={b}
                active={bucket === b}
                onClick={() => setBucket(b)}
              >
                {b}
              </Chip>
            ))}
          </div>
        </div>
        <div className="text-[10px] sm:text-[11px] text-zinc-500">
          Misal: <b>data1</b> = <code>data/data.json</code>,{" "}
          <b>data2</b> = <code>data/data2.json</code>, dst.
        </div>
      </div>


      {/* SERIES TAB */}
      {tab === "series" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6">
            <Box title="Data Utama">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Judul">
                  <input
                    value={title}
                    onChange={(e) => handleTitle(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>

                <Field label="Type">
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map((t) => <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>)}
                  </div>
                </Field>
                <Field label="Format">
                  <div className="flex flex-wrap gap-2">
                    {FORMATS.map((f) => <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{f}</Chip>)}
                  </div>
                </Field>

                <Field label="Status">
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Chip>)}
                  </div>
                </Field>
                <Field label="Tahun (opsional)">
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                    inputMode="numeric"
                  />
                </Field>

                <Field label="Author (opsional)">
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>
                <Field label="Artist (opsional)">
                  <input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>
              </div>
            </Box>

            <Box title="Media">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Cover URL">
                  <input
                    value={cover}
                    onChange={(e) => setCover(e.target.value.trim())}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>
                <Field label="Backdrop URL (opsional)">
                  <input
                    value={backdrop}
                    onChange={(e) => setBackdrop(e.target.value.trim())}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
                <div>
                  <div className="text-[11px] sm:text-xs text-zinc-400 mb-1">Preview Cover</div>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 grid place-items-center">
                    {cover ? <img src={cover} className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-500">no image</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs text-zinc-400 mb-1">Preview Backdrop</div>
                  <div className="aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 grid place-items-center">
                    {backdrop ? <img src={backdrop} className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-500">no image</span>}
                  </div>
                </div>
              </div>
            </Box>

            <Box title="Genre, Tags & Stats">
              <Field label="Genre">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <Chip key={g} active={genres.includes(g)} onClick={() => toggleGenre(g)}>{g}</Chip>
                  ))}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-400 mt-2">Minimal 1 genre.</div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                <Field label="Tags (pisahkan koma)">
                  <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5" />
                </Field>
                <Field label="Rating (0–10)">
                  <input
                    value={rating}
                    onChange={(e) => setRating(e.target.value.replace(/[^\d.]/g, "").slice(0, 4))}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Views">
                  <input value={views} onChange={(e) => setViews(e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5" inputMode="numeric" />
                </Field>
                <Field label="Bookmarks">
                  <input value={bookmarks} onChange={(e) => setBookmarks(e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5" inputMode="numeric" />
                </Field>
              </div>
            </Box>

            <Box title="Sinopsis">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={6}
                className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
              />
            </Box>

            <button
              disabled={busy}
              onClick={onSendSeries}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold"
            >
              {busy ? "Mengirim…" : "Kirim / Update Series"}
            </button>
          </div>

          {/* Preview */}
          <div className="space-y-4 sm:space-y-6">
            <Box title="Preview (ringkas)">
              <pre className="text-[11px] sm:text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10 max-h-60 sm:max-h-96">
{JSON.stringify(seriesObj, null, 2)}
              </pre>
              <div className="text-[11px] sm:text-xs text-zinc-400 mt-2">
                Akan dikirim ke: <code>POST {API_BASE}/admin/series</code>
              </div>
            </Box>
          </div>
        </div>
      )}

      {/* CHAPTER TAB */}
      {tab === "chapter" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Target Series + Mode Chapter */}
            <Box title="Target Series">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Series Slug (wajib)">
                  <input
                    value={seriesSlugForChapter}
                    onChange={(e) =>
                      setSeriesSlugForChapter(slugify(e.target.value))
                    }
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                    placeholder="mis. infinity-nudes"
                  />
                </Field>

                <Field label="Nomor Chapter">
                  <input
                    value={chNo}
                    onChange={(e) =>
                      setChNo(e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                    inputMode="numeric"
                  />
                </Field>

                <Field label="Judul (opsional)">
                  <input
                    value={chTitle}
                    onChange={(e) => setChTitle(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>

                <Field label="Tanggal Rilis (opsional)">
                  <input
                    type="datetime-local"
                    value={chDate}
                    onChange={(e) => setChDate(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                  />
                </Field>
              </div>

              {/* PILIHAN MODE CHAPTER */}
              <div className="mt-4">
                <div className="text-sm font-medium mb-1">Tipe Chapter</div>
                <div className="flex gap-2 flex-wrap">
                  <Chip
                    active={chapterMode === "comic"}
                    onClick={() => setChapterMode("comic")}
                  >
                    Komik (gambar)
                  </Chip>
                  <Chip
                    active={chapterMode === "novel"}
                    onClick={() => setChapterMode("novel")}
                  >
                    Novel (teks)
                  </Chip>
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                  Pilih <b>Novel (teks)</b> kalau ingin chapter dibaca di{" "}
                  <b>NovelReader</b>.
                </div>
              </div>
            </Box>

            {/* MODE KOMIK: halaman & thumbnail */}
            {chapterMode === "comic" && (
              <Box title="Halaman & Thumbnail">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field
                    label="Daftar URL Gambar"
                    hint='Boleh pakai koma atau baris baru, dengan/tanpa "…".'
                  >
                    <textarea
                      value={chImagesRaw}
                      onChange={(e) => setChImagesRaw(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5 font-mono text-[11px] sm:text-xs"
                    />
                  </Field>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium mb-1">
                        Cover Chapter
                      </div>
                      <label className="text-[12px] sm:text-xs flex items-center gap-2 mb-1 select-none">
                        <input
                          type="checkbox"
                          checked={chAutoCover}
                          onChange={(e) => setChAutoCover(e.target.checked)}
                        />
                        Pakai halaman 1
                      </label>
                    </div>
                    <input
                      value={chCover}
                      onChange={(e) => setChCover(e.target.value)}
                      disabled={chAutoCover}
                      className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5 disabled:opacity-60"
                      placeholder="https://…"
                    />
                    <div className="mt-2">
                      <div className="text-[11px] sm:text-xs text-zinc-400 mb-1">
                        Preview
                      </div>
                      <div className="aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 grid place-items-center">
                        {(chAutoCover ? chImages[0] || "" : chCover) ? (
                          <img
                            src={chAutoCover ? chImages[0] || "" : chCover}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-zinc-500">
                            no image
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-zinc-300 mb-2">
                    Preview Halaman ({chImages.length})
                  </div>
                  <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[260px] overflow-auto pr-1">
                    {chImages.map((u, i) => (
                      <div
                        key={u + i}
                        className="aspect-[3/4] rounded-md overflow-hidden ring-1 ring-white/10 bg-zinc-800"
                      >
                        <img
                          src={u}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Box>
            )}

            {/* MODE NOVEL: textarea teks */}
            {chapterMode === "novel" && (
              <Box title="Konten Novel (Teks)">
                <Field
                  label="Isi Teks Chapter"
                  hint="Pisahkan paragraf dengan 1 baris kosong. Akan dipotong jadi blocks di NovelReader."
                >
                  <textarea
                    value={chText}
                    onChange={(e) => setChText(e.target.value)}
                    rows={14}
                    className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5 text-sm leading-relaxed"
                    placeholder={`Contoh:

[Prolog]
Angin malam berhembus pelan ketika Yura membuka pintu kamar...

Yuto menatap layar monitor, mencoba memperbaiki bug terakhir malam itu...`}
                  />
                </Field>

                <div className="mt-2 text-[11px] sm:text-xs text-zinc-400">
                  Karakter: <b>{chText.length}</b>
                  {chText.length > 0 && (
                    <>
                      {" "}
                      • Perkiraan paragraf:{" "}
                      <b>
                        {chText
                          .split(/\n{2,}/)
                          .map((p) => p.trim())
                          .filter(Boolean).length}
                      </b>
                    </>
                  )}
                </div>
              </Box>
            )}

            {/* Tombol kirim chapter */}
            <button
              disabled={busy}
              onClick={onSendChapter}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-semibold"
            >
              {busy ? "Mengirim…" : "Kirim / Update Chapter"}
            </button>
          </div>

          {/* Preview JSON */}
          <div className="space-y-4 sm:space-y-6">
            <Box title="Preview (ringkas)">
              <pre className="text-[11px] sm:text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10 max-h-60 sm:max-h-96">
{JSON.stringify(
  chapterOnly
    ? { target: seriesSlugForChapter.trim(), chapter: chapterOnly }
    : { info: "Isi Series Slug & data chapter (gambar / teks) untuk melihat preview." },
  null,
  2
)}
              </pre>
              <div className="text-[11px] sm:text-xs text-zinc-400 mt-2">
                Akan dikirim ke:{" "}
                <code>POST {API_BASE}/admin/series/&lt;slug&gt;/chapters</code>
              </div>
            </Box>
          </div>
        </div>
      )}

    
      {/* DELETE SERIES TAB */}
      {tab === "deleteSeries" && (
        <Box title="Hapus Series">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Series Slug (yang akan dihapus)">
              <input
                value={deleteSlug}
                onChange={(e) => setDeleteSlug(slugify(e.target.value))}
                className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                placeholder="mis. eleceed"
              />
            </Field>
          </div>
          <div className="mt-4">
            <button
              disabled={!deleteSlug || busy}
              onClick={() => {
                setConfirmMode("series");
                setConfirmOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-semibold"
            >
              Hapus Series
            </button>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-2">
              Ini akan menghapus entry series (beserta chapters) dari file{" "}
              <code>{bucket}</code>.
            </div>
          </div>
        </Box>
      )}
      {/* DELETE CHAPTER TAB */}
      {tab === "deleteChapter" && (
        <Box title="Hapus Chapter">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Series Slug">
              <input
                value={deleteChSlug}
                onChange={(e) => setDeleteChSlug(slugify(e.target.value))}
                className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                placeholder="mis. eleceed"
              />
            </Field>
            <Field label="Kode / ID Chapter">
              <input
                value={deleteChCode}
                onChange={(e) => setDeleteChCode(e.target.value.trim())}
                className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2.5"
                placeholder="mis. eleceed-001"
              />
            </Field>
          </div>
          <div className="mt-4">
            <button
              disabled={!deleteChSlug || !deleteChCode || busy}
              onClick={() => {
                setConfirmMode("chapter");
                setConfirmOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-semibold"
            >
              Hapus Chapter
            </button>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-2">
              Chapter akan dihapus dari file <code>{bucket}</code> berdasarkan
              slug + kode/ID (mis. <code>eleceed</code> +{" "}
              <code>eleceed-001</code>).
            </div>
          </div>
        </Box>
      )}


      {/* Modals */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={
          confirmMode === "series"
            ? "Konfirmasi Hapus Series"
            : "Konfirmasi Hapus Chapter"
        }
        primaryText="Ya, hapus"
        onPrimary={confirmMode === "series" ? onDeleteSeries : onDeleteChapter}
      >
        {confirmMode === "series" ? (
          <>
            Series <b>{deleteSlug}</b> akan dihapus permanen dari{" "}
            <code>{bucket}</code>.
          </>
        ) : (
          <>
            Chapter <b>{deleteChCode}</b> dari series{" "}
            <b>{deleteChSlug}</b> akan dihapus permanen dari{" "}
            <code>{bucket}</code>.
          </>
        )}
      </Modal>


      <Modal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Berhasil 🎉"
        primaryText="Selesai"
        onPrimary={() => setSuccessOpen(false)}
      >
        <div className="space-y-2">
          <div>{successInfo.title}</div>
        </div>
      </Modal>
    </div>
  );
}
