// src/lib/data.js
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE || null;

/** Ambil detail series (sesuai API /manga/:slug) */
export async function fetchSeries(slug) {
  if (!slug) throw new Error('slug kosong');

  if (API_BASE) {
    const r = await fetch(`${API_BASE}/manga/${encodeURIComponent(slug)}`);
    if (!r.ok) throw new Error('fetchSeries gagal (REST)');
    return await r.json();        // bentuknya { info, chapters }
  }

  // === Supabase fallback (opsional) ===
  const { data, error } = await supabase
    .from('series')
    .select('slug,title,cover,description,genres')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Series tidak ditemukan');
  return data;
}

/**
 * Ambil array URL gambar untuk chapter.
 * Karena API kamu butuh chapterId, kita:
 * 1) ambil data series dulu → cari chapter dengan number = chNo
 * 2) pakai id-nya untuk hit /manga/chapter/:id
 */
export async function fetchChapterImages(slug, chNo) {
  if (!slug) throw new Error('slug kosong');
  const chapterNumber = Number(chNo);

  if (API_BASE) {
    // 1) dapatkan daftar chapter untuk dapat id
    const d = await fetchSeries(slug); // { info, chapters }
    const chapters = d?.chapters || [];
    const target = chapters.find(c =>
      Number(c.number ?? c.chapter ?? c.no) === chapterNumber
    );
    if (!target?.id) return [];

    // 2) ambil halaman gambarnya
    const r = await fetch(`${API_BASE}/manga/chapter/${encodeURIComponent(target.id)}`);
    if (!r.ok) throw new Error('fetchChapterImages gagal (REST)');

    const payload = await r.json();
    const raw = Array.isArray(payload)
      ? payload
      : (payload?.pages || payload?.images || payload?.content || []);

    const images = raw
      .map(x => x?.url || x?.image || x?.src || x)
      .filter(Boolean)
      .map(String);

    // sisipkan meta (optional)
    Object.defineProperty(images, 'meta', {
      value: { title: target.title || null, number: target.number || chapterNumber },
      enumerable: false,
    });
    return images;
  }

  // === Supabase fallback (opsional) ===
  const { data: chapter, error: chErr } = await supabase
    .from('chapters')
    .select('id, number, title')
    .eq('series_slug', slug)
    .eq('number', chapterNumber)
    .maybeSingle();
  if (chErr) throw chErr;
  if (!chapter) return [];

  const { data: imgs, error: imErr } = await supabase
    .from('chapter_images')
    .select('url')
    .eq('chapter_id', chapter.id)
    .order('page_index', { ascending: true });
  if (imErr) throw imErr;

  const images = (imgs || []).map(x => x.url);
  Object.defineProperty(images, 'meta', {
    value: { title: chapter.title || null, number: chapter.number },
    enumerable: false,
  });
  return images;
}
