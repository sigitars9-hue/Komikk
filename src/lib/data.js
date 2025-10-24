// src/lib/data.js
import { supabase } from './supabaseClient';

// Kalau kamu punya backend (Express/Next API) set VITE_API_BASE di .env
const API_BASE = import.meta.env.VITE_API_BASE || null;

/** Ambil detail series (slug, title, cover, dsb) */
export async function fetchSeries(slug) {
  if (!slug) throw new Error('slug kosong');

  if (API_BASE) {
    const r = await fetch(`${API_BASE}/series/${encodeURIComponent(slug)}`);
    if (!r.ok) throw new Error('fetchSeries gagal (REST)');
    return await r.json();
  }

  // === Supabase fallback ===
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
 * Ambil daftar URL gambar untuk chapter.
 * Kembalikan array URL (string) dan optional meta { title }.
 */
export async function fetchChapterImages(slug, chNo) {
  if (!slug) throw new Error('slug kosong');
  const chapterNumber = Number(chNo);

  if (API_BASE) {
    const r = await fetch(
      `${API_BASE}/chapters/${encodeURIComponent(slug)}/${chapterNumber}`
    );
    if (!r.ok) throw new Error('fetchChapterImages gagal (REST)');
    const payload = await r.json();
    // Normalisasi: pastikan format { images: string[], meta?: { title?: string } }
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.images)) return payload.images;
    return [];
  }

  // === Supabase fallback ===
  // Contoh skema:
  // table "chapters": { id, series_slug, number, title }
  // table "chapter_images": { chapter_id, page_index, url }
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

  const images = (imgs || []).map((x) => x.url);
  // sisipkan meta di property non-enumerable agar aman dipakai opsional
  Object.defineProperty(images, 'meta', {
    value: { title: chapter.title || null, number: chapter.number },
    enumerable: false,
  });
  return images;
}
