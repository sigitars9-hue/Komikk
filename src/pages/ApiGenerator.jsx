import { useEffect, useMemo, useState } from "react";

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

  for (const u of toks) {

    if (!seen.has(u)) {

      seen.add(u);

      uniq.push(u);

    }

  }

  return uniq;

};



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

const API_BASE = (

  import.meta.env.VITE_API_BASE || "/api"

).replace(/\/+$/, "");



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



/* ─── Micro Components ─── */

const Field = ({ label, hint, children }) => (

  <div className="space-y-1.5">

    <label className="block text-xs sm:text-sm font-medium text-zinc-300">{label}</label>

    {children}

    {hint && <p className="text-[11px] text-zinc-500 leading-normal">{hint}</p>}

  </div>

);



const Chip = ({ active, onClick, children }) => (

  <button

    type="button"

    onClick={onClick}

    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 ${

      active

        ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/20"

        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-200"

    }`}

  >

    {children}

  </button>

);



const Card = ({ title, badge, actions, children, className = "" }) => (

  <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md p-4 sm:p-5 shadow-sm ${className}`}>

    {(title || actions) && (

      <div className="flex items-center justify-between gap-3 mb-4 border-b border-zinc-800/70 pb-3">

        <div className="flex items-center gap-2">

          <h3 className="text-sm sm:text-base font-semibold text-zinc-100">{title}</h3>

          {badge && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{badge}</span>}

        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}

      </div>

    )}

    {children}

  </section>

);



const Modal = ({ open, onClose, title, children, primaryText, onPrimary, danger = false }) => {

  if (!open) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">

      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 shadow-2xl">

        <h4 className="text-base sm:text-lg font-bold text-zinc-100 mb-2">{title}</h4>

        <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{children}</div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">

          <button

            onClick={onClose}

            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs sm:text-sm font-medium transition"

          >

            Batal

          </button>

          {onPrimary && (

            <button

              onClick={onPrimary}

              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold transition ${

                danger ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"

              } shadow-lg`}

            >

              {primaryText || "Lanjutkan"}

            </button>

          )}

        </div>

      </div>

    </div>

  );

};



/* ─── Main Admin Dashboard Component ─── */

export default function AdminDashboard() {

  const [activeTab, setActiveTab] = useState("overview"); // overview | series | chapter | trash

  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [busy, setBusy] = useState(false);

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



    const publishedAt = chDate ? new Date(chDate).toISOString() : new Date().toISOString();

    const thumbnail = chAutoCover ? chImages[0] || "" : chCover?.trim() || chImages[0] || "";



    if (chapterMode === "comic" && chImages.length === 0) return null;

    if (chapterMode === "novel" && !chText.trim()) return null;



    let base = {

      number,

      title: chTitle?.trim() || `Chapter ${number}`,

      publishedAt,

      thumbnail: thumbnail || undefined,

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

  }, [seriesSlugForChapter, chNo, chTitle, chDate, chAutoCover, chCover, chImages, chText, chapterMode, nowIso]);



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

  setTags(

    Array.isArray(series.tags)

      ? series.tags.join(", ")

      : ""

  );

  setCover(series.cover || "");

  setBackdrop(series.backdrop || "");

  setRating(series.rating ? String(series.rating) : "");

  setViews(series.views ? String(series.views) : "");

  setBookmarks(

    series.bookmarks ? String(series.bookmarks) : ""

  );



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
        // Jangan menimpa daftar chapter atau tanggal pembuatan yang lama.
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

    try {

      if (!ADMIN_TOKEN) return toast.error("VITE_ADMIN_TOKEN belum diset.");

      if (!seriesSlugForChapter.trim()) return toast.error("Pilih Series tujuan.");

      if (chapterMode === "comic" && chImages.length === 0) return toast.error("Masukkan minimal 1 URL gambar.");

      if (chapterMode === "novel" && !chText.trim()) return toast.error("Teks novel tidak boleh kosong.");

      if (!chapterOnly) return toast.error("Data chapter tidak valid.");



      setBusy(true);

      const out = await createOrUpdateChapter(seriesSlugForChapter.trim(), chapterOnly, bucket);

      const uploadedNo = out?.chapter?.number ?? chapterOnly?.number ?? chNo;



      toast.success(`Chapter ${uploadedNo} berhasil disimpan!`);

      setSuccessInfo({ title: `Chapter [${uploadedNo}] berhasil diupload ke '${seriesSlugForChapter.trim()}'` });

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

      await refreshChaptersFor(seriesSlugForChapter.trim());

    } catch (e) {

      toast.error(e.message || "Gagal kirim chapter");

    } finally {

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

    { id: "overview", label: "Dashboard", icon: "📊" },

    { id: "series", label: "Kelola Series", icon: "📚" },

    { id: "chapter", label: "Upload Chapter", icon: "📑" },

    { id: "trash", label: "Hapus Data", icon: "🗑️" },

  ];



  return (

    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-violet-600 selection:text-white">

      {/* Top Navbar */}

      <header className="sticky top-0 z-40 h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">

        <div className="flex items-center gap-3">

          <button

            onClick={() => setSidebarOpen((prev) => !prev)}

            className="lg:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"

            aria-label="Toggle menu"

          >

            ☰

          </button>

          <div className="flex items-center gap-2.5">

            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-sm shadow-md shadow-violet-500/20">

              GV

            </div>

            <div>

              <h1 className="text-sm font-bold tracking-tight leading-none">Studio Panel</h1>

              <span className="text-[10px] text-zinc-500 font-medium">Comic Management API</span>

            </div>

          </div>

        </div>



        {/* Global Bucket Selector */}

        <div className="flex items-center gap-2 sm:gap-3">

          <div className="hidden sm:flex items-center text-xs text-zinc-400">

            Target DB:

          </div>

          <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">

            {BUCKETS.map((b) => (

              <button

                key={b}

                onClick={() => setBucket(b)}

                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${

                  bucket === b

                    ? "bg-violet-600 text-white shadow-sm"

                    : "text-zinc-400 hover:text-zinc-200"

                }`}

              >

                {b}

              </button>

            ))}

          </div>

        </div>

      </header>



      <div className="flex flex-1 relative overflow-hidden">

        {/* Mobile Backdrop */}

        {isSidebarOpen && (

          <div

            onClick={() => setSidebarOpen(false)}

            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"

          />

        )}



        {/* Sidebar Navigation */}

        <aside

          className={`fixed lg:static top-16 bottom-0 left-0 z-30 w-64 border-r border-zinc-800/80 bg-zinc-950 p-4 transition-transform duration-200 ease-in-out flex flex-col ${

            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"

          }`}

        >

          <nav className="space-y-1.5 flex-1">

            {navItems.map((item) => (

              <button

                key={item.id}

                onClick={() => {

                  setActiveTab(item.id);

                  setSidebarOpen(false);

                }}

                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${

                  activeTab === item.id

                    ? "bg-violet-600/15 text-violet-400 border border-violet-500/30"

                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"

                }`}

              >

                <span className="text-base">{item.icon}</span>

                {item.label}

              </button>

            ))}

          </nav>



          {/* Quick Endpoint Info Card */}

          <div className="mt-auto p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">

            <div className="font-semibold text-zinc-300">Endpoint Aktif:</div>

            <div className="truncate font-mono text-[10px] text-zinc-500">{API_BASE}</div>

            <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1">

              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

              API Connected

            </div>

          </div>

        </aside>



        {/* Main Content Area */}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto space-y-6">



          {/* TAB 1: OVERVIEW / DASHBOARD */}

          {activeTab === "overview" && (

            <div className="space-y-6">

              {/* Quick Metrics */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">

                  <div className="text-zinc-500 text-xs font-medium">Total Series</div>

                  <div className="text-2xl font-bold mt-1 text-zinc-100">{remoteSeries.length}</div>

                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">

                  <div className="text-zinc-500 text-xs font-medium">Target Database</div>

                  <div className="text-2xl font-bold mt-1 text-violet-400 uppercase">{bucket}</div>

                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">

                  <div className="text-zinc-500 text-xs font-medium">Status API</div>

                  <div className="text-2xl font-bold mt-1 text-emerald-400">Online</div>

                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">

                  <div className="text-zinc-500 text-xs font-medium">Admin Auth</div>

                  <div className="text-2xl font-bold mt-1 text-zinc-100">{ADMIN_TOKEN ? "Aktif" : "Kosong"}</div>

                </div>

              </div>



              {/* Series Listing & Quick Actions */}

              <Card

                title="Daftar Series di Database"

                actions={

                  <button

                    onClick={refreshSeriesList}

                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700"

                  >

                    {remoteLoading ? "Memuat…" : "Refresh"}

                  </button>

                }

              >

                <div className="flex flex-col sm:flex-row gap-3 mb-4">

                  <input

                    value={seriesQuery}

                    onChange={(e) => setSeriesQuery(e.target.value)}

                    placeholder="Cari berdasarkan judul atau slug…"

                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-violet-500"

                  />

                  <div className="flex gap-2">

                    {["updated", "title", "views"].map((s) => (

                      <Chip key={s} active={seriesSort === s} onClick={() => setSeriesSort(s)}>

                        {s.toUpperCase()}

                      </Chip>

                    ))}

                  </div>

                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {filteredSeries.slice(0, 12).map((item) => (

                    <div

                      key={item.slug}

                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700 transition"

                    >

                      <div className="w-12 h-16 rounded-lg bg-zinc-800 overflow-hidden shrink-0">

                        {item.cover ? (

                          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />

                        ) : null}

                      </div>

                      <div className="min-w-0 flex-1">

                        <h4 className="text-xs sm:text-sm font-semibold truncate text-zinc-200">{item.title}</h4>

                        <div className="text-[11px] text-zinc-500 font-mono truncate">{item.slug}</div>

                        <div className="flex gap-1.5 mt-2">

                          <button

                            onClick={() => {

                              setSelectedSeriesSlug(item.slug);

                              setActiveTab("chapter");

                            }}

                            className="px-2 py-0.5 rounded bg-violet-600/20 text-violet-400 text-[10px] font-medium border border-violet-500/20"

                          >

                            + Chapter

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

                <Card

  title="Cari & Edit Komik"

  badge={`${filteredSeries.length} komik`}

>

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

      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"

    />



    {editSearchOpen && (

      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-zinc-700 p-2">

        {remoteLoading ? (

          <p className="p-3 text-sm text-zinc-400">

            Memuat daftar komik...

          </p>

        ) : filteredSeries.length === 0 ? (

          <p className="p-3 text-sm text-zinc-400">

            Komik tidak ditemukan.

          </p>

        ) : (

          filteredSeries.map((series) => (

            <button

              key={series.slug}

              type="button"

              onClick={() => startEditSeries(series)}

              className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-violet-500 hover:bg-zinc-800"

            >

              {series.cover ? (

                <img

                  src={series.cover}

                  alt={series.title}

                  className="h-16 w-12 rounded-md object-cover"

                />

              ) : (

                <div className="flex h-16 w-12 items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-500">

                  No cover

                </div>

              )}



              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-semibold text-white">

                  {series.title}

                </p>



                <p className="truncate text-xs text-zinc-400">

                  {series.slug}

                </p>



                <p className="text-xs text-zinc-500">

                  {series.format || series.type || "Komik"}

                  {" · "}

                  {series.status || "Ongoing"}

                </p>

              </div>



              <span className="text-xs font-medium text-violet-400">

                Pilih

              </span>

            </button>

          ))

        )}

      </div>

    )}



    {editingSlug && (

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3">

        <p className="text-sm text-violet-200">

          Mode edit: <strong>{editingSlug}</strong>

        </p>



        <button

          type="button"

          onClick={resetSeriesForm}

          className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-white hover:bg-zinc-800"

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

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Slug URL">

                      <input

                        value={slug}

                        onChange={(e) => setSlug(slugify(e.target.value))}

                        placeholder="solo-leveling"

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

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

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>



                    <Field label="Penulis (Author)">

                      <input

                        value={author}

                        onChange={(e) => setAuthor(e.target.value)}

                        placeholder="Chugong"

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Artis / Ilustrator">

                      <input

                        value={artist}

                        onChange={(e) => setArtist(e.target.value)}

                        placeholder="DUBU (REDICE STUDIO)"

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

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

                        placeholder="https\://..."

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Backdrop URL (Opsional)">

                      <input

                        value={backdrop}

                        onChange={(e) => setBackdrop(e.target.value.trim())}

                        placeholder="https\://..."

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                  </div>



                  <div className="grid grid-cols-2 gap-4 mt-4">

                    <div>

                      <span className="text-[11px] text-zinc-500 mb-1.5 block">Preview Cover</span>

                      <div className="aspect-[3/4] max-h-48 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">

                        {cover ? <img src={cover} alt="Cover" className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-600">No Image</span>}

                      </div>

                    </div>

                    <div>

                      <span className="text-[11px] text-zinc-500 mb-1.5 block">Preview Backdrop</span>

                      <div className="aspect-[16/9] max-h-48 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">

                        {backdrop ? <img src={backdrop} alt="Backdrop" className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-600">No Image</span>}

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

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Rating (0-10)">

                      <input

                        value={rating}

                        onChange={(e) => setRating(e.target.value.replace(/[^\d.]/g, "").slice(0, 4))}

                        placeholder="9.5"

                        inputMode="decimal"

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Views Awal">

                      <input

                        value={views}

                        onChange={(e) => setViews(e.target.value.replace(/[^\d]/g, ""))}

                        placeholder="1000"

                        inputMode="numeric"

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

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

                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm focus:border-violet-500 focus:outline-none leading-relaxed"

                  />

                </Card>



                {/* Submit Action */}

                <div className="sticky bottom-4 z-20">

                  <button

                    disabled={busy}

                    onClick={onSendSeries}

                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all active:scale-[0.99] disabled:opacity-50"

                  >

                    {busy ? "Sedang Menyimpan…" : editingSlug ? `Simpan Perubahan Komik (${bucket})` : `Publikasikan Komik Baru (${bucket})`}

                  </button>

                </div>

              </div>



              {/* Live JSON Preview */}

              <div className="space-y-4">

                <Card title="Payload Inspector" badge="JSON">

                  <pre className="text-[11px] font-mono text-zinc-400 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 overflow-x-auto max-h-[500px]">

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
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    />
                    {editSearchOpen && (
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-700 p-2">
                        {remoteLoading ? (
                          <p className="p-3 text-sm text-zinc-400">Memuat daftar series...</p>
                        ) : filteredSeries.length === 0 ? (
                          <p className="p-3 text-sm text-zinc-400">Series tidak ditemukan.</p>
                        ) : filteredSeries.map((series) => (
                          <button
                            key={series.slug}
                            type="button"
                            onClick={() => {
                              setSelectedSeriesSlug(series.slug);
                              setSeriesSlugForChapter(series.slug);
                              setSeriesQuery("");
                              setEditSearchOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-violet-500 hover:bg-zinc-800"
                          >
                            {series.cover ? (
                              <img src={series.cover} alt={series.title} className="h-14 w-10 rounded-md object-cover" />
                            ) : (
                              <div className="flex h-14 w-10 items-center justify-center rounded-md bg-zinc-800 text-[10px] text-zinc-500">No cover</div>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-white">{series.title}</span>
                              <span className="block truncate text-xs text-zinc-400">{series.slug}</span>
                            </span>
                            <span className="text-xs font-medium text-violet-400">Pilih</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-400">
                      Series tujuan: <strong className="text-violet-300">{seriesSlugForChapter || "Belum dipilih"}</strong>
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

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Judul Chapter">

                      <input

                        value={chTitle}

                        onChange={(e) => setChTitle(e.target.value)}

                        placeholder="Chapter 1 (Opsional)"

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                    <Field label="Tanggal Rilis">

                      <input

                        type="datetime-local"

                        value={chDate}

                        onChange={(e) => setChDate(e.target.value)}

                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:border-violet-500 focus:outline-none"

                      />

                    </Field>

                  </div>



                  <div className="mt-4 pt-4 border-t border-zinc-800">

                    <label className="text-xs text-zinc-400 block mb-2 font-medium">Format Konten</label>

                    <div className="flex gap-2">

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

                          placeholder="https\://i.ibb.co/.../001.jpg&#10;https\://i.ibb.co/.../002.jpg"

                          className="w-full font-mono text-xs bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:border-violet-500 focus:outline-none"

                        />

                      </Field>



                      <div className="flex items-center justify-between">

                        <span className="text-xs text-zinc-400">Total terdeteksi: <b>{chImages.length}</b> gambar</span>

                        <label className="text-xs text-zinc-300 flex items-center gap-2 cursor-pointer">

                          <input

                            type="checkbox"

                            checked={chAutoCover}

                            onChange={(e) => setChAutoCover(e.target.checked)}

                          />

                          Jadikan gambar ke-1 sebagai cover

                        </label>

                      </div>



                      {/* Image Preview Grid */}

                      {chImages.length > 0 && (

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">

                          {chImages.map((src, i) => (

                            <div key={i} className="aspect-[3/4] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">

                              <img src={src} alt={`P.${i + 1}`} className="w-full h-full object-cover" loading="lazy" />

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

                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed focus:border-violet-500 focus:outline-none"

                    />

                    <div className="text-[11px] text-zinc-500 mt-2">

                      Jumlah Karakter: {chText.length}

                    </div>

                  </Card>

                )}



                <div className="sticky bottom-4 z-20">

                  <button

                    disabled={busy}

                    onClick={onSendChapter}

                    className="w-full py-3.5 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-xl shadow-sky-950/50 transition-all active:scale-[0.99] disabled:opacity-50"

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

                      className="text-xs text-zinc-400 hover:text-white"

                    >

                      {chaptersLoading ? "…" : "↻ Refresh"}

                    </button>

                  }

                >

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">

                    {remoteChapters.length === 0 ? (

                      <div className="text-center py-8 text-xs text-zinc-500">

                        Belum ada chapter pada series ini.

                      </div>

                    ) : (

                      remoteChapters.map((ch) => (

                        <div

                          key={ch.id}

                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-2"

                        >

                          <div className="min-w-0">

                            <div className="text-xs font-semibold text-zinc-200 truncate">

                              Ch. {ch.number} {ch.title ? `— ${ch.title}` : ""}

                            </div>

                            <div className="text-[10px] text-zinc-500 font-mono truncate">{ch.id}</div>

                          </div>

                          <div className="flex gap-1 shrink-0">

                            <button

                              onClick={() => onLoadChapterToForm(ch)}

                              className="px-2.5 py-1 rounded bg-sky-600/20 text-sky-400 text-xs font-medium border border-sky-500/20"

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

                              className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-400 text-xs font-medium border border-rose-500/20"

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <Card title="Hapus Keseluruhan Series" badge="Danger">

                <p className="text-xs text-zinc-400 mb-4 leading-normal">

                  Tindakan ini akan menghapus entitas series beserta seluruh chapter-nya secara permanen dari file <code>{bucket}</code>.

                </p>

                <div className="space-y-3">

                  <Field label="Slug Series yang Dihapus">

                    <input

                      value={deleteSlug}

                      onChange={(e) => setDeleteSlug(slugify(e.target.value))}

                      placeholder="mis. solo-leveling"

                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-rose-500 focus:outline-none"

                    />

                  </Field>

                  <button

                    disabled={!deleteSlug.trim() || busy}

                    onClick={() => {

                      setConfirmMode("series");

                      setConfirmOpen(true);

                    }}

                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm disabled:opacity-50 transition"

                  >

                    Hapus Series Permanen

                  </button>

                </div>

              </Card>



              <Card title="Hapus Chapter Tertentu" badge="Danger">

                <p className="text-xs text-zinc-400 mb-4 leading-normal">

                  Hapus satu chapter secara spesifik menggunakan slug series dan ID unik chapter.

                </p>

                <div className="space-y-3">

                  <Field label="Slug Series">

                    <input

                      value={deleteChSlug}

                      onChange={(e) => setDeleteChSlug(slugify(e.target.value))}

                      placeholder="mis. solo-leveling"

                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-rose-500 focus:outline-none"

                    />

                  </Field>

                  <Field label="ID / Kode Chapter">

                    <input

                      value={deleteChCode}

                      onChange={(e) => setDeleteChCode(e.target.value.trim())}

                      placeholder="mis. solo-leveling-001"

                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-rose-500 focus:outline-none"

                    />

                  </Field>

                  <button

                    disabled={!deleteChSlug.trim() || !deleteChCode.trim() || busy}

                    onClick={() => {

                      setConfirmMode("chapter");

                      setConfirmOpen(true);

                    }}

                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm disabled:opacity-50 transition"

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

            Apakah kamu yakin ingin menghapus series <b className="text-rose-400">{deleteSlug}</b> dari basis data <code className="text-zinc-200">{bucket}</code>? Tindakan ini tidak dapat dibatalkan.

          </>

        ) : (

          <>

            Apakah kamu yakin ingin menghapus chapter <b className="text-rose-400">{deleteChCode}</b> dari series <b className="text-zinc-200">{deleteChSlug}</b>?

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

        <p className="text-zinc-300">{successInfo.title}</p>

      </Modal>

    </div>

  );

}