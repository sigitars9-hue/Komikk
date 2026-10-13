// src/lib/api.js
import axios from "axios";

// Contoh .env: VITE_API_BASE=https://gv-comics-api-2.vercel.app/api
export let API_BASE = (
  import.meta?.env?.VITE_API_BASE || "https://gv-comics-api-2.vercel.app"
).replace(/\/+$/, "");

// Deteksi apakah base sudah berakhiran /api
const baseHasApi = /\/api$/i.test(API_BASE);

// Buat instance axios TANPA default Content-Type (agar GET tidak preflight)
export const http = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  // biarkan axios set Accept sendiri; jangan pasang Content-Type global
  validateStatus: (s) => s >= 200 && s < 300,
});

// Tambahkan cache-buster, tapi jangan tambah header aneh-aneh (biar gak preflight)
http.interceptors.request.use((config) => {
  config.params = { ...(config.params || {}), t: Date.now() };

  // Hanya set Content-Type saat ada body (POST/PUT/DELETE), bukan GET/HEAD
  const m = (config.method || "get").toUpperCase();
  if (m !== "GET" && m !== "HEAD") {
    config.headers = {
      ...(config.headers || {}),
      "Content-Type": "application/json",
    };
  }
  return config;
});

export function setApiBase(nextBase) {
  API_BASE = String(nextBase || API_BASE).replace(/\/+$/, "");
  http.defaults.baseURL = API_BASE;
}

/* ====================== ROUTE FALLBACK ====================== */
// Jika base sudah /api, tidak perlu prefix tambahan.
// Jika base TIDAK /api, coba tanpa prefix lalu dengan /api.
const PREFIXES = baseHasApi ? [""] : ["", "/api"];

function withPrefixes(paths) {
  const out = [];
  for (const p of paths) {
    for (const pref of PREFIXES) {
      const joined = (pref + (p.startsWith("/") ? p : `/${p}`)).replace(
        /\/{2,}/g,
        "/"
      );
      out.push(joined === "/" ? "/" : joined);
    }
  }
  return out;
}

async function tryGET(paths, config = {}) {
  const candidates = withPrefixes(paths);
  let lastErr;
  for (const path of candidates) {
    try {
      const res = await http.get(path, config);
      if (res?.status >= 200 && res?.status < 300) return res;
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error(
    `All GET candidates failed for: ${candidates.join(" | ")}`
  );
  err.cause = lastErr;
  throw err;
}

/* ========================= NORMALIZER ======================= */
function pickImageUrls(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => x?.url || x?.image || x?.src || x)
    .filter(Boolean)
    .map(String);
}

function isTextLike(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  // kalau mengandung http / https atau ekstensi gambar → anggap gambar, bukan teks
  if (/^https?:\/\//i.test(s)) return false;
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(s)) return false;
  return true;
}

function normalizeChapter(ch, idx = 0, seriesSlug = "", seriesFormat = "") {
  if (!ch) return null;

  const numberRaw = ch.number ?? ch.chapter ?? ch.no ?? idx + 1;
  const number = Number(numberRaw) || idx + 1;

  const id =
    ch.id ||
    ch.slug ||
    ch.chapterId ||
    ch.chapterEndpoint ||
    (seriesSlug
      ? `${seriesSlug}-${String(number).padStart(3, "0")}`
      : String(number));

  const seriesIsNovel = String(seriesFormat || "")
    .toLowerCase()
    .includes("novel");

  let images = [];
  let content = null;
  let content_blocks = null;

  const pagesArr = Array.isArray(ch.pages) ? ch.pages : [];
  const imagesArr = Array.isArray(ch.images) ? ch.images : [];
  const contentField = ch.content;

  const first = pagesArr[0] ?? imagesArr[0] ?? contentField;

  // ── kalau series-nya "novel/light novel" dan isi pages-nya text panjang → treat as novel text
  const treatAsText = seriesIsNovel && isTextLike(first);

  if (treatAsText) {
    const blocksSource = pagesArr.length
      ? pagesArr
      : Array.isArray(contentField)
      ? contentField
      : contentField
      ? [contentField]
      : [];

    const blockStrings = blocksSource
      .map((x) => String(x))
      .map((s) => s.trim())
      .filter(Boolean);

    content_blocks = blockStrings;
    content = blockStrings.join("\n\n");
    images = []; // novel tidak punya images untuk reader komik
  } else {
    images = pickImageUrls(ch.pages)
      .concat(pickImageUrls(ch.images))
      .concat(pickImageUrls(ch.content));
  }

  return {
    id: String(id),
    number,
    title: ch.title || `Chapter ${number}`,
    createdAt: ch.createdAt || ch.date || ch.released || null,
    thumbnail: ch.thumbnail || ch.image || ch.cover || null,
    images,
    content,
    content_blocks,
    // type dipakai di beberapa tempat, tandai sebagai "novel" kalau treatAsText
    type: ch.type || (treatAsText ? "novel" : "comic"),
  };
}

function normalizeSeries(raw) {
  const r = raw?.data || raw;
  const info = r?.info || r;

  const slug =
    info?.slug ||
    r?.slug ||
    info?.endpoint ||
    r?.endpoint ||
    info?.id ||
    r?.id ||
    "";
  const joinMaybe = (val) =>
    Array.isArray(val) ? val.filter(Boolean).join(", ") : val || "";

  const title = info?.title || r?.title || info?.name || r?.name || "Untitled";
  const desc =
    info?.description ||
    r?.description ||
    info?.desc ||
    r?.desc ||
    info?.synopsis ||
    r?.synopsis ||
    "";
  const type = info?.type || r?.type || info?.format || r?.format || "Unknown";
  const format =
    info?.format || r?.format || info?.type || r?.type || "Unknown";
  const status = info?.status || r?.status || "Ongoing";

  const cover =
    info?.cover ||
    r?.cover ||
    info?.thumbnail ||
    r?.thumbnail ||
    info?.image ||
    r?.image ||
    "";
  const banner =
    info?.banner ||
    r?.banner ||
    info?.background ||
    r?.background ||
    r?.backdrop ||
    info?.backdrop ||
    cover;

  const genres = (info?.genres || r?.genres || [])
    .map((g) => (typeof g === "string" ? g : g?.name))
    .filter(Boolean);

  const author = joinMaybe(
    info?.author ?? r?.author ?? info?.authors ?? r?.authors
  );
  const artist = joinMaybe(
    info?.artist ?? r?.artist ?? info?.artists ?? r?.artists
  );

  const year =
    info?.year ||
    r?.year ||
    info?.releasedYear ||
    r?.releasedYear ||
    info?.released ||
    r?.released ||
    null;

  const tags = (info?.tags || r?.tags || info?.keywords || r?.keywords || [])
    .map((t) => (typeof t === "string" ? t : t?.name))
    .filter(Boolean);

  const stats = {
    rating: info?.rating || r?.rating || 0,
    views: info?.views || r?.views || 0,
    bookmarks: info?.bookmarks || r?.bookmarks || 0,
  };

  const chaptersRaw = r?.chapters || r?.chapter || info?.chapters || [];
  const chapters = (chaptersRaw || []).map((c, i) =>
    normalizeChapter(c, i, slug, format)
  );

  return {
    slug: String(slug),
    title,
    desc,
    type,
    format,
    status,
    genres,
    author,
    artist,
    year,
    tags,
    cover,
    banner,
    stats,
    chapters,
  };
}

function mapItem(it, idx = 0) {
  return {
    id: it.id || it.slug || String(idx + 1),
    slug: it.slug || it.id || String(idx + 1),
    title: it.title || it.name || "Untitled",
    cover: it.cover || it.thumbnail || it.image || it.thumb || "",
    updatedAt: it.updatedAt || it.date || it.released || null,
    badge: it.badge || it.type || "UP",
  };
}

/* ========================= HOME / SLIDER ========================= */
export async function fetchHome() {
  return fetchLatest(1);
}
export async function fetchSlider() {
  const latest = await fetchLatest(1, 20);
  return latest.slice(0, 5);
}

/* =========================== ANNOUNCEMENTS ======================= */
export async function fetchAnnouncements() {
  const { data } = await tryGET(["/announcements", "/announcement", "/news"]);

  // kalau API langsung ngirim array
  if (Array.isArray(data)) return data;

  // kalau API ngirim object { announcements: [...] }
  if (Array.isArray(data.announcements)) return data.announcements;

  // fallback lama (kalau suatu saat pakai data.items)
  return data.items || [];
}

/* ======================= LATEST / UPDATES ======================== */
export async function fetchLatest(page = 1, pageSize = 20) {
  const qp = `?page=${page}&pageSize=${pageSize}`;
  const { data } = await tryGET([
    `/series/latest${qp}`,
    `/latest${qp}`,
    `/manga/latest${qp}`,
  ]);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map(mapItem);
}

/* ============================= POPULAR =========================== */
export async function fetchPopular(range = "daily") {
  const qs = `?range=${encodeURIComponent(range)}`;
  const { data } = await tryGET([
    `/series/popular${qs}`,
    `/popular${qs}`,
    `/manga/popular${qs}`,
  ]);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map(mapItem);
}

/* ========================== RECOMMENDATIONS ====================== */
export async function fetchRecommendations(kind = "manhwa") {
  const qs = `?type=${encodeURIComponent(kind)}`;
  const { data } = await tryGET([
    `/series/recommendations${qs}`,
    `/recommendations${qs}`,
    `/manga/recommendations${qs}`,
  ]);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map(mapItem);
}

/* =========================== GENRES & FILTER ===================== */
export async function fetchGenres() {
  const { data } = await tryGET(["/genres", "/series/genres", "/manga/genres"]);
  const arr = Array.isArray(data) ? data : data.items || [];
  return arr.map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean);
}

export async function fetchByGenre(name, page = 1, pageSize = 20) {
  const qp = `?page=${page}&pageSize=${pageSize}`;
  const enc = encodeURIComponent(name);
  const { data } = await tryGET([
    `/genres/${enc}${qp}`,
    `/by-genre/${enc}${qp}`,
    `/series/genre/${enc}${qp}`,
    `/manga/genre/${enc}${qp}`,
  ]);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map(mapItem);
}

/* ========================= DETAIL & CHAPTERS ===================== */
export async function fetchSeries(slugOrId) {
  if (!slugOrId) throw new Error("slug kosong");
  let baseSlug = String(slugOrId);

  // ❗ kalau bentuknya "aku-dan-4-beban-tim-003"
  // potong "-003" → jadi "aku-dan-4-beban-tim"
  if (/-\d{2,}$/.test(baseSlug)) {
    baseSlug = baseSlug.replace(/-\d{2,}$/, "");
  }

  const enc = encodeURIComponent(baseSlug);
  const { data } = await tryGET([`/series/${enc}`, `/manga/${enc}`]);
  return normalizeSeries(data);
}

export async function fetchChapters(slug, page = 1) {
  const detail = await fetchSeries(slug);
  if (Array.isArray(detail?.chapters) && detail.chapters.length)
    return detail.chapters;

  const enc = encodeURIComponent(slug);
  const { data } = await tryGET([
    `/series/${enc}/chapters?page=${page}`,
    `/manga/${enc}/chapters?page=${page}`,
    `/chapters/${enc}?page=${page}`,
  ]);
  const raw = Array.isArray(data) ? data : data.items || [];
  return raw.map((c, i) => normalizeChapter(c, i, slug));
}

/* ======================= CHAPTER PAGES (READER) ================== */
export async function fetchChapterPages(chapterOrId) {
  if (chapterOrId && typeof chapterOrId === "object") {
    const ch = normalizeChapter(chapterOrId);
    const urls = ch.images || [];
    return urls.map((url, i) => ({ index: i, imageUrl: url }));
  }
  const id = String(chapterOrId);
  const { data } = await tryGET([
    `/chapter/${encodeURIComponent(id)}`,
    `/manga/chapter/${encodeURIComponent(id)}`,
    `/chapters/${encodeURIComponent(id)}`,
  ]);
  const rawList =
    (Array.isArray(data)
      ? data
      : data?.pages || data?.images || data?.content || []) || [];
  const urls = pickImageUrls(rawList);
  return urls.map((url, i) => ({ index: i, imageUrl: url }));
}

/* ============================== SEARCH =========================== */
export async function fetchSearch(q, page = 1, pageSize = 20) {
  const qp = `?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
  try {
    const { data } = await tryGET([
      `/search${qp}`,
      `/series/search${qp}`,
      `/manga/search${qp}`,
    ]);
    const list = Array.isArray(data) ? data : data.items || [];
    return list.map(mapItem);
  } catch {
    const all = await searchSeries(q);
    const start = Math.max(0, (page - 1) * pageSize);
    return all.slice(start, start + pageSize);
  }
}

export async function searchSeries(q) {
  const qp = `?q=${encodeURIComponent(q)}`;
  const { data } = await tryGET([
    `/search${qp}`,
    `/series/search${qp}`,
    `/manga/search${qp}`,
  ]);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map(mapItem);
}

/* ============================== HEALTH =========================== */
export async function ping() {
  try {
    const { data } = await tryGET(["/health", "/"]);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || "Ping failed" };
  }
}
