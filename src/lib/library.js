// src/lib/library.js
import { supabase } from '../lib/supabaseClient';

/**
 * Section yang didukung:
 *  - 'favorites'  → readlist
 *  - 'bookmarks'  → penanda simpan
 *  - 'history'    → riwayat baca
 */

/* ---------------- Utils ---------------- */

export function normalizeItem(x = {}) {
  return {
    slug: x.slug || x.id,
    title: x.title || x.name || 'Untitled',
    cover: x.cover || x.thumbnail || x.image || x.thumb || null,
    updatedAt: x.updatedAt || x.date || null,
  };
}

async function ensureUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('AUTH_REQUIRED');
  return data.user;
}

/* ---------------- Queries ---------------- */

export async function getSection(section) {
  const user = await ensureUser();

  const { data, error } = await supabase
    .from('library_items')
    .select('slug,title,cover,updated_at_text,created_at')
    .eq('user_id', user.id)
    .eq('section', section)
    .order('created_at', { ascending: section !== 'history' });

  if (error) throw error;

  return (data || []).map((d) => ({
    slug: d.slug,
    title: d.title,
    cover: d.cover,
    updatedAt: d.updated_at_text ?? null,
  }));
}

export async function getLibraryAll() {
  const [favorites, bookmarks, history] = await Promise.all([
    getSection('favorites'),
    getSection('bookmarks'),
    getSection('history'),
  ]);
  return { favorites, bookmarks, history };
}

/* ---------------- Mutations ---------------- */

export async function addToLibrary(section, item) {
  const user = await ensureUser();
  const n = normalizeItem(item);
  if (!n.slug) throw new Error('INVALID_ITEM');

  const { error } = await supabase
    .from('library_items')
    .upsert(
      {
        user_id: user.id,
        section,
        slug: n.slug,
        title: n.title,
        cover: n.cover,
        updated_at_text: n.updatedAt ?? null,
      },
      { onConflict: 'user_id,section,slug' }
    );

  if (error) throw error;
  return n;
}

export async function removeFromLibrary(section, slug) {
  const user = await ensureUser();
  const { error } = await supabase
    .from('library_items')
    .delete()
    .eq('user_id', user.id)
    .eq('section', section)
    .eq('slug', slug);

  if (error) throw error;
}

export async function clearSection(section) {
  const user = await ensureUser();
  const { error } = await supabase
    .from('library_items')
    .delete()
    .eq('user_id', user.id)
    .eq('section', section);

  if (error) throw error;
}

/* ---------------- Helpers ---------------- */

export async function isInLibrary(section, slug) {
  const user = await ensureUser();
  const { count, error } = await supabase
    .from('library_items')
    .select('slug', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('section', section)
    .eq('slug', slug);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Toggle add/remove pada section tertentu.
 * Return: { added: boolean, section, item }
 *  - added=true  → baru ditambahkan
 *  - added=false → baru dihapus
 */
export async function toggleLibrary(section, item) {
  const user = await ensureUser();
  const n = normalizeItem(item);
  if (!n.slug) throw new Error('INVALID_ITEM');

  const exists = await isInLibrary(section, n.slug);

  if (exists) {
    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('user_id', user.id)
      .eq('section', section)
      .eq('slug', n.slug);
    if (error) throw error;

    // penting: kembalikan added=false
    return { added: false, action: 'removed', item: n };
  } else {
    const { error } = await supabase
      .from('library_items')
      .upsert(
        {
          user_id: user.id,
          section,
          slug: n.slug,
          title: n.title,
          cover: n.cover,
          updated_at_text: n.updatedAt ?? null,
        },
        { onConflict: 'user_id,section,slug' }
      );
    if (error) throw error;

    // penting: kembalikan added=true
    return { added: true, action: 'added', item: n };
  }
}
