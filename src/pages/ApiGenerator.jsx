// src/pages/ApiGenerator.jsx
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

/** util kecil */
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const GENRE_PRESETS = [
  "Action","Adventure","Comedy","Drama","Fantasy","Game","Historical","Horror","Isekai","Martial Arts",
  "Mecha","Mystery","Psychological","Romance","School","Sci-Fi","Seinen","Shounen","Slice of Life","Sports","Supernatural","Tragedy","Wuxia"
];

const TYPE_PRESETS   = ["Manga","Manhwa","Manhua"];
const FORMAT_PRESETS = ["Webtoon","Comic","Light Novel"];
const STATUS_PRESETS = ["Ongoing","Completed","Hiatus","Dropped"];
const API_URL = import.meta.env.VITE_VERCEL_API || ""; // misal: https://gvcomics.vercel.app
const SUBMIT_SECRET = import.meta.env.VITE_SUBMIT_SECRET; // atau kirim dari server saja (lebih aman)

async function sendToRepo(seriesObjectOrBatch) {
  try {
    // tentukan bentuk payload
    const payload = Array.isArray(seriesObjectOrBatch)
      ? { seriesBatch: seriesObjectOrBatch }
      : { series: seriesObjectOrBatch };

    const res = await fetch(`${API_URL}/api/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-submit-secret": SUBMIT_SECRET, // atau pakai query ?secret=... kalau mau
      },
      body: JSON.stringify({ payload }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Gagal mengirim");
    toast.success("Berhasil! PR dibuat.");
    if (data.prUrl) window.open(data.prUrl, "_blank");
  } catch (e) {
    toast.error(e.message || "Gagal kirim ke repo");
  }
}
/* ============ UI helpers ============ */
const Field = ({ label, children, hint }) => (
  <label className="block">
    <div className="text-sm font-medium mb-1">{label}</div>
    {children}
    {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
  </label>
);

const Chip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm border transition
      ${active ? "bg-violet-600 text-white border-violet-500"
               : "bg-zinc-800/70 text-zinc-200 border-white/10 hover:bg-zinc-700"}`}
  >
    {children}
  </button>
);

const Box = ({ title, children, actions }) => (
  <section className="rounded-2xl ring-1 ring-white/10 bg-zinc-900/60 p-4">
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
    {children}
  </section>
);

/* ============ Parser gambar ============ */
function parseImageList(raw) {
  if (!raw) return [];
  const tokens = raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      if (s.endsWith(",")) s = s.slice(0, -1).trim();
      return s;
    })
    .filter(u => /^https?:\/\//i.test(u));
  const seen = new Set();
  const uniq = [];
  for (const u of tokens) {
    if (!seen.has(u)) { seen.add(u); uniq.push(u); }
  }
  return uniq;
}

/* ============ Halaman ============ */
export default function ApiGenerator() {
  // --- data utama
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
  const [endpoint, setEndpoint] = useState("/api/series");

  // — NEW: stats
  const [views, setViews] = useState("");
  const [rating, setRating] = useState("");
  const [bookmarks, setBookmarks] = useState("");

  // --- chapter builder
  const [chNo, setChNo] = useState("1");
  const [chTitle, setChTitle] = useState("");
  const [chDate, setChDate] = useState(() => new Date().toISOString().slice(0,16)); // datetime-local
  const [chImagesRaw, setChImagesRaw] = useState("");

  // — NEW: chapter cover
  const [chCover, setChCover] = useState("");
  const [chAutoCover, setChAutoCover] = useState(true); // auto pakai halaman 1

  const chImages = useMemo(() => parseImageList(chImagesRaw), [chImagesRaw]);

  // auto-slug
  const handleTitle = (v) => {
    setTitle(v);
    if (!slug.trim()) setSlug(slugify(v));
  };

  const toggleGenre = (g) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  // bentuk payload
  const payload = useMemo(() => {
    const now = new Date().toISOString();
    const chapterNumber = Number(chNo) || 1;
    const chapterTitle = chTitle?.trim() || `Chapter ${chapterNumber}`;
    const chapterPublishedAt = chDate
      ? new Date(chDate).toISOString()
      : now;

    // tentukan cover chapter
    const chapterThumb =
      chAutoCover
        ? (chImages[0] || "")                    // auto dari halaman 1
        : (chCover?.trim() || chImages[0] || ""); // manual > fallback halaman 1 > kosong

    const idBase = (slug.trim() || slugify(title));
    const chapter =
      chImages.length === 0
        ? null
        : {
            id: `${idBase}-${String(chapterNumber).padStart(3, '0')}`, // id stabil: <slug>-001
            number: chapterNumber,
            title: chapterTitle,
            pages: chImages,
            publishedAt: chapterPublishedAt,
            thumbnail: chapterThumb || undefined,  // NEW
          };

    // stats: simpan di top-level biar FE normalizer bisa baca
    const obj = {
      title: title.trim(),
      slug: idBase || undefined,
      type,
      format,
      status,
      year: year ? Number(year) : undefined,
      author: author.trim() || undefined,
      artist: artist.trim() || undefined,
      description: desc.trim(),
      genres,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      cover,
      backdrop: backdrop || undefined,
      rating: rating ? Number(rating) : undefined,       // NEW
      views: views ? Number(views) : undefined,          // NEW
      bookmarks: bookmarks ? Number(bookmarks) : undefined, // NEW
      chapters: chapter ? [chapter] : [], // 0 atau 1 chapter
      createdAt: now,
      updatedAt: now,
    };
    return obj;
  }, [
    title, slug, type, format, status, year, author, artist, desc, genres, tags, cover, backdrop,
    rating, views, bookmarks,
    chNo, chTitle, chDate, chImages, chCover, chAutoCover
  ]);

  const payloadStr = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const tsInterface = `export interface ChapterPayload {
  id: string;
  number: number;
  title: string;
  pages: string[]; // URL gambar berurutan
  thumbnail?: string; // cover chapter
  publishedAt: string; // ISO
}
export interface SeriesPayload {
  title: string;
  slug: string;
  type: "Manga" | "Manhwa" | "Manhua";
  format: "Webtoon" | "Comic" | "Light Novel";
  status: "Ongoing" | "Completed" | "Hiatus" | "Dropped";
  year?: number;
  author?: string;
  artist?: string;
  description: string;
  genres: string[];
  tags: string[];
  cover: string;
  backdrop?: string;
  rating?: number;    // 0..10
  views?: number;     // total views
  bookmarks?: number; // total bookmarks
  chapters: ChapterPayload[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}`;

  const curlCmd = `curl -X POST '${endpoint}'
  -H 'Content-Type: application/json'
  -d '${payloadStr.replace(/\n/g, "\\n").replace(/'/g, "'\"'\"'")}'`;

  const axiosJs = `import axios from "axios";
const payload = ${payloadStr};
const res = await axios.post("${endpoint}", payload);
console.log(res.data);`;

  const fetchJs = `const payload = ${payloadStr};
const res = await fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const data = await res.json();
console.log(data);`;

  const supabaseInsert = `import { supabase } from "../lib/supabaseClient";
const payload = ${payloadStr};
const { data, error } = await supabase.from("series").insert([payload]).select();
if (error) throw error;
console.log(data);`;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const invalid =
    !payload.title ||
    !payload.slug ||
    !payload.description ||
    !payload.cover ||
    payload.genres.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">API Payload Generator</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2 w-[280px]"
            placeholder="/api/series"
            aria-label="Endpoint"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT: Form */}
        <div className="space-y-4">
          <Box title="Data Utama">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Judul">
                <input
                  value={title}
                  onChange={(e) => handleTitle(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="Mis. Infinite Mage"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="auto dari judul"
                />
              </Field>

              <Field label="Type">
                <div className="flex flex-wrap gap-2">
                  {TYPE_PRESETS.map((t) => (
                    <Chip key={t} active={type === t} onClick={() => setType(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Format">
                <div className="flex flex-wrap gap-2">
                  {FORMAT_PRESETS.map((f) => (
                    <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
                      {f}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Status">
                <div className="flex flex-wrap gap-2">
                  {STATUS_PRESETS.map((s) => (
                    <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Tahun (opsional)">
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="2025"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Author (opsional)">
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="Nama penulis"
                />
              </Field>

              <Field label="Artist (opsional)">
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="Nama ilustrator"
                />
              </Field>
            </div>
          </Box>

          <Box title="Media">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Cover URL">
                <input
                  value={cover}
                  onChange={(e) => setCover(e.target.value.trim())}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="https://…/cover.jpg"
                />
              </Field>
              <Field label="Backdrop URL (opsional)">
                <input
                  value={backdrop}
                  onChange={(e) => setBackdrop(e.target.value.trim())}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="https://…/backdrop.jpg"
                />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-xs text-zinc-400 mb-1">Preview Cover</div>
                <div className="aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 grid place-items-center">
                  {cover ? <img src={cover} alt="cover" className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-500">no image</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400 mb-1">Preview Backdrop</div>
                <div className="aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 grid place-items-center">
                  {backdrop ? <img src={backdrop} alt="backdrop" className="w-full h-full object-cover" /> : <span className="text-xs text-zinc-500">no image</span>}
                </div>
              </div>
            </div>
          </Box>

          <Box title="Genre, Tag & Stats">
            <Field label="Genre">
              <div className="flex flex-wrap gap-2">
                {GENRE_PRESETS.map((g) => (
                  <Chip key={g} active={genres.includes(g)} onClick={() => toggleGenre(g)}>
                    {g}
                  </Chip>
                ))}
              </div>
              <div className="text-xs text-zinc-400 mt-2">Minimal pilih 1 genre.</div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Tag (pisahkan koma)">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="magic, dungeon, regression"
                />
              </Field>
              <Field label="Rating (0–10)">
                <input
                  value={rating}
                  onChange={(e) => setRating(e.target.value.replace(/[^\d.]/g, '').slice(0, 4))}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="9.1"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Views (angka)">
                <input
                  value={views}
                  onChange={(e) => setViews(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="40874"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Bookmarks (angka)">
                <input
                  value={bookmarks}
                  onChange={(e) => setBookmarks(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="12000"
                  inputMode="numeric"
                />
              </Field>
            </div>
          </Box>

          <Box title="Sinopsis">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={6}
              className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
              placeholder="Tulis ringkasan cerita…"
            />
          </Box>

          {/* ========== CHAPTER BUILDER ========== */}
          <Box title="Chapter Builder (Gambar untuk Reader)">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nomor Chapter">
                <input
                  value={chNo}
                  onChange={(e) => setChNo(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="1"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Judul Chapter (opsional)">
                <input
                  value={chTitle}
                  onChange={(e) => setChTitle(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                  placeholder="Chapter 1"
                />
              </Field>
              <Field label="Tanggal Rilis (opsional)">
                <input
                  type="datetime-local"
                  value={chDate}
                  onChange={(e) => setChDate(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2"
                />
              </Field>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <Field
                label="Daftar URL Gambar (batch)"
                hint='Boleh pakai koma atau baris baru, dengan/ tanpa "…". Contoh: `"https://…/001.jpg", "https://…/002.jpg", ...`'
              >
                <textarea
                  value={chImagesRaw}
                  onChange={(e) => setChImagesRaw(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2 font-mono text-xs"
                  placeholder={`"https://example.com/ch-01-001.jpg",
"https://example.com/ch-01-002.jpg",
https://example.com/ch-01-003.jpg`}
                />
              </Field>

              {/* NEW: Chapter Cover */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium mb-1">Cover Chapter (thumbnail)</div>
                  <label className="flex items-center gap-2 text-xs mb-1">
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
                  className="w-full rounded-lg bg-zinc-900/60 ring-1 ring-white/10 px-3 py-2 disabled:opacity-60"
                  placeholder="https://…/thumb-chapter.jpg"
                />
                <div className="mt-2">
                  <div className="text-xs text-zinc-400 mb-1">Preview</div>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 grid place-items-center">
                    { (chAutoCover ? (chImages[0] || "") : chCover)
                      ? <img src={chAutoCover ? (chImages[0] || "") : chCover} alt="thumb" className="w-full h-full object-cover" />
                      : <span className="text-xs text-zinc-500">no image</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                Preview Halaman ({chImages.length})
              </div>

              {/* Preview besar (halaman 1) */}
              <div className="rounded-lg overflow-hidden ring-1 ring-white/10 bg-zinc-800 mb-3">
                {chImages[0] ? (
                  <img src={chImages[0]} alt="page-1" className="w-full max-h-[360px] object-contain bg-black" />
                ) : (
                  <div className="h-40 grid place-items-center text-xs text-zinc-500">Belum ada gambar</div>
                )}
              </div>

              {/* Grid kecil */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[260px] overflow-auto pr-1">
                {chImages.map((u, i) => (
                  <div key={u + i} className="aspect-[3/4] rounded-md overflow-hidden ring-1 ring-white/10 bg-zinc-800">
                    <img src={u} alt={`p-${i+1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            
          </Box>
          <button
  onClick={() => sendToRepo(generatedSeries)} // atau array untuk batch
  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
>
  Kirim ke Repo (PR)
</button>

        </div>

        {/* RIGHT: Output */}
        <div className="space-y-4">
          <Box
            title="JSON Payload"
            actions={
              <button
                className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                onClick={() => copy(payloadStr)}
              >
                Copy
              </button>
            }
          >
            {invalid && (
              <div className="mb-2 text-xs text-amber-400">
                * Wajib: Judul, Slug, Sinopsis, Cover, minimal 1 Genre.
              </div>
            )}
            <pre className="text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10">
{payloadStr}
            </pre>
          </Box>

          <Box
            title="curl"
            actions={<button className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => copy(curlCmd)}>Copy</button>}
          >
            <pre className="text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10">{curlCmd}</pre>
          </Box>

          <Box
            title="Axios"
            actions={<button className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => copy(axiosJs)}>Copy</button>}
          >
            <pre className="text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10">{axiosJs}</pre>
          </Box>

          <Box
            title="fetch()"
            actions={<button className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => copy(fetchJs)}>Copy</button>}
          >
            <pre className="text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10">{fetchJs}</pre>
          </Box>

          <Box
            title="Supabase Insert"
            actions={<button className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => copy(supabaseInsert)}>Copy</button>}
          >
            <pre className="text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10">{supabaseInsert}</pre>
          </Box>

          <Box
            title="TypeScript Interface"
            actions={<button className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => copy(tsInterface)}>Copy</button>}
          >
            <pre className="text-xs bg-zinc-950/70 rounded-xl p-3 overflow-auto ring-1 ring-white/10">{tsInterface}</pre>
          </Box>
        </div>
      </div>
    </div>
  );
}
