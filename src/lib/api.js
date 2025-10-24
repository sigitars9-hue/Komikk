// src/lib/api.js
import axios from 'axios';

// Pastikan .env di root proyek FE berisi:
// VITE_API_BASE=http://localhost:3000
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

/* ========================= HOME / SLIDER ========================= */

export async function fetchHome() {
  // Untuk saat ini: pulangkan daftar latest halaman 1
  return await fetchLatest(1);
}

export async function fetchSlider() {
  // Ambil 5 teratas dari latest agar pasti ada
  const latest = await fetchLatest(1);
  return latest.slice(0, 5);
}

/* =========================== PENGUMUMAN ========================== */

export async function fetchAnnouncements(page = 1) {
  // Server bisa mengabaikan page; dipertahankan untuk konsistensi signature
  const { data } = await http.get('/announcements');
  return Array.isArray(data) ? data : (data.items || []);
}

/* ===================== LISTING / UPDATE TERBARU ================== */

export async function fetchLatest(page = 1, pageSize = 20) {
  const { data } = await http.get(`/latest?page=${page}&pageSize=${pageSize}`);
  const list = Array.isArray(data) ? data : (data.items || []);
  return list.map((it, idx) => ({
    id: it.id || it.slug || String(idx + 1),
    slug: it.slug || it.id || String(idx + 1),
    title: it.title || it.name || 'Untitled',
    cover: it.cover || it.thumbnail || it.image || it.thumb,
    updatedAt: it.updatedAt || it.date || it.released || null,
    badge: it.badge || it.type || 'UP',
  }));
}

/* ============================ REKOMENDASI ======================== */

export async function fetchRecommendations(kind = 'manhwa') {
  const { data } = await http.get('/recommendations?type=' + encodeURIComponent(kind));
  const list = Array.isArray(data) ? data : (data.items || []);
  return list.map((it, idx) => ({
    id: it.id || it.slug || String(idx + 1),
    slug: it.slug || it.id || String(idx + 1),
    title: it.title || it.name || 'Untitled',
    cover: it.cover || it.thumbnail || it.image || it.thumb,
    updatedAt: it.updatedAt || it.date || null,
  }));
}

/* ========================= DETAIL & CHAPTERS ===================== */

/**
 * Ambil detail series (+ chapters). Chapter akan dinormalisasi
 * sehingga selalu punya properti `images` bila data sumber punya
 * pages/images/content.
 */
export async function fetchSeries(slug) {
  const { data } = await http.get(`/manga/${slug}`);
  return normalizeSeries(data);
}

export async function fetchChapters(slug, page = 1) {
  // Di API ini, chapters biasanya sudah ikut di detail
  const detail = await fetchSeries(slug);
  return detail.chapters || [];
}

/**
 * Ambil halaman gambar untuk sebuah chapter.
 * - Bisa dipanggil dengan chapter object (yang sudah punya `images`)
 *   atau cukup sebuah chapterId string/number.
 * - Jika tidak ada images di object, fallback request ke /manga/chapter/:id
 */
export async function fetchChapterPages(chapterOrId) {
  // 1) Jika sudah berupa object & punya images
  if (chapterOrId && typeof chapterOrId === 'object') {
    const ch = normalizeChapter(chapterOrId);
    return ch.images.map((url, i) => ({ index: i, imageUrl: url }));
  }

  // 2) Kalau cuma id → ambil dari API
  const id = String(chapterOrId);
  const { data } = await http.get(`/manga/chapter/${encodeURIComponent(id)}`);

  // data bisa: { pages: [] } atau { images: [] } atau array langsung, atau content[]
  let rawList =
    (Array.isArray(data) ? data : (data?.pages || data?.images || data?.content || [])) || [];

  // Normalisasi menjadi url[]
  const urls = rawList
    .map((x) => (x?.url || x?.image || x?.src || x))
    .filter(Boolean)
    .map(String);

  return urls.map((url, i) => ({ index: i, imageUrl: url }));
}

/* ============================== SEARCH =========================== */

/**
 * Search dengan dukungan pagination:
 * - Jika backend mendukung ?page & ?pageSize → gunakan hasilnya.
 * - Jika tidak, fallback ke client-side slice dari searchSeries(q).
 */
export async function fetchSearch(q, page = 1, pageSize = 20) {
  try {
    const { data } = await http.get(
      `/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`
    );
    const list = Array.isArray(data) ? data : data.items || [];
    return list.map((it, idx) => ({
      id: it.id || it.slug || String(idx + 1),
      slug: it.slug || it.id,
      title: it.title || it.name || 'Untitled',
      cover: it.cover || it.thumbnail || it.image || it.thumb,
      updatedAt: it.updatedAt || it.date || null,
    }));
  } catch (e) {
    // Fallback kalau server belum support pagination
    const all = await searchSeries(q);
    const start = Math.max(0, (page - 1) * pageSize);
    return all.slice(start, start + pageSize);
  }
}

// Tetap sediakan versi simple (tanpa pagination) untuk kompatibilitas
export async function searchSeries(q) {
  const { data } = await http.get(`/search?q=${encodeURIComponent(q)}`);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map((it, idx) => ({
    id: it.id || it.slug || String(idx + 1),
    slug: it.slug || it.id,
    title: it.title || it.name || 'Untitled',
    cover: it.cover || it.thumbnail || it.image || it.thumb,
    updatedAt: it.updatedAt || null,
  }));
}

/* ============================== POPULAR ========================== */

export async function fetchPopular(range = 'daily') {
  const { data } = await http.get(`/popular?range=${encodeURIComponent(range)}`);
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map((it, idx) => ({
    id: it.id || it.slug || String(idx + 1),
    slug: it.slug || it.id,
    title: it.title || it.name || 'Untitled',
    cover: it.cover || it.thumbnail || it.image || it.thumb,
    updatedAt: it.updatedAt || null,
    badge: it.badge || it.type || 'UP',
  }));
}

/* ========================= GENRES & FILTER ======================= */

export async function fetchGenres() {
  const { data } = await http.get('/genres');
  const arr = Array.isArray(data) ? data : [];
  // Normalisasi: backend bisa kirim ['Action', 'Drama'] atau [{name:'Action'}, ...]
  return arr.map((g) => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
}

export async function fetchByGenre(name, page = 1, pageSize = 20) {
  const { data } = await http.get(
    `/by-genre/${encodeURIComponent(name)}?page=${page}&pageSize=${pageSize}`
  );
  const list = data?.items || [];
  return list.map((it, idx) => ({
    id: it.id || it.slug || String(idx + 1),
    slug: it.slug || it.id,
    title: it.title || it.name || 'Untitled',
    cover: it.cover || it.thumbnail || it.image || it.thumb,
    updatedAt: it.updatedAt || it.date || null,
    badge: it.badge || it.type || 'UP',
  }));
}

/* ============================ NORMALIZER ========================= */

/**
 * Samakan berbagai bentuk chapter ke { images: string[], ... }
 * - Mendukung: pages[], images[], content[{url|src}] atau campuran.
 */
/* ============================ NORMALIZER (PATCH) ========================= */

/** Normalisasi array gambar ke string[] apa pun skemanya */
function pickImageUrls(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(x => (x?.url || x?.image || x?.src || x))   // dukung object {url|image|src} atau string langsung
    .filter(Boolean)
    .map(String);
}

/** Samakan berbagai bentuk chapter → selalu punya { id, number, title, images[] } */
function normalizeChapter(ch, idx = 0, seriesSlug = '') {
  if (!ch) return null;

  // id yang masuk akal
  const numberRaw = ch.number ?? ch.chapter ?? ch.no ?? (idx + 1);
  const number = Number(numberRaw) || (idx + 1);

  const id =
    ch.id ||
    ch.slug ||
    ch.chapterId ||
    ch.chapterEndpoint ||
    // fallback: buat id stabil dari slug + number
    (seriesSlug ? `${seriesSlug}-${String(number).padStart(3, '0')}` : String(number));

  // kumpulkan kemungkinan sumber gambar
  const images =
    pickImageUrls(ch.pages)    // generator baru
      .concat(pickImageUrls(ch.images))   // skema lain
      .concat(pickImageUrls(ch.content)); // skema lama

  return {
    id: String(id),
    number,
    title: ch.title || `Chapter ${number}`,
    createdAt: ch.createdAt || ch.date || ch.released || null,
    thumbnail: ch.thumbnail || ch.image || ch.cover || null,
    images, // <- inilah yang akan dipakai Reader
  };
}

/**
 * Normalisasi detail series.
 * Menyatukan berbagai nama kunci yang umum dipakai ke 1 bentuk konsisten.
 * - title: title | name
 * - slug: slug | endpoint | id
 * - desc: description | desc | synopsis
 * - type/format/status/genres… dengan fallback berlapis
 * - author/artist bisa string atau array → jadikan string (dipisah koma)
 * - tags: tags | keywords
 * - year: year | releasedYear | released
 * - chapters: terima pages/images/content lalu jadikan images[]
 */
function normalizeSeries(raw) {
  // beberapa backend masuk dalam {data:{info:{...},chapters:[...]}}
  const r = raw?.data || raw;
  const info = r?.info || r;

  // ambil slug paling kuat lebih awal (dipakai normalisasi chapter id)
  const slug =
    info?.slug ||
    r?.slug ||
    info?.endpoint ||
    r?.endpoint ||
    info?.id ||
    r?.id ||
    '';

  // author/artist: bisa string atau array → jadikan string yang rapi
  const joinMaybe = (val) =>
    Array.isArray(val) ? val.filter(Boolean).join(', ') : (val || '');

  // kunci yang sering berbeda nama
  const title =
    info?.title || r?.title || info?.name || r?.name || 'Untitled';

  const desc =
    info?.description || r?.description || info?.desc || r?.desc || info?.synopsis || r?.synopsis || '';

  const type =
    info?.type || r?.type || info?.format || r?.format || 'Unknown';

  const format =
    info?.format || r?.format || info?.type || r?.type || 'Unknown';

  const status =
    info?.status || r?.status || 'Ongoing';

  const cover =
    info?.cover || r?.cover || info?.thumbnail || r?.thumbnail || info?.image || r?.image || '';

  const banner =
    info?.banner || r?.banner || info?.background || r?.background || r?.backdrop || info?.backdrop || cover;

  const genres =
    (info?.genres || r?.genres || []).map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean);

  const author = joinMaybe(info?.author ?? r?.author ?? info?.authors ?? r?.authors);
  const artist = joinMaybe(info?.artist ?? r?.artist ?? info?.artists ?? r?.artists);

  const year =
    info?.year || r?.year || info?.releasedYear || r?.releasedYear || info?.released || r?.released || null;

  const tags =
    (info?.tags || r?.tags || info?.keywords || r?.keywords || [])
      .map(t => (typeof t === 'string' ? t : t?.name))
      .filter(Boolean);

  const stats = {
    rating: info?.rating || r?.rating || 0,
    views: info?.views || r?.views || 0,
    bookmarks: info?.bookmarks || r?.bookmarks || 0,
  };

  // chapters: cari di banyak kemungkinan field
  const chaptersRaw =
    r?.chapters || r?.chapter || info?.chapters || [];

  const chapters = (chaptersRaw || []).map((c, idx) =>
    normalizeChapter(c, idx, slug)
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

