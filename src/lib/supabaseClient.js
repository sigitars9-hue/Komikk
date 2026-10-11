// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Flag supaya komponen lain bisa tahu statusnya
export const SUPABASE_READY = Boolean(url && anon);

if (!SUPABASE_READY) {
  // Jangan throw; cukup log biar dev server tidak blank
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] ENV tidak lengkap. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env'
  );
}

// Kalau env belum siap, export null; AuthProvider akan handle
export const supabase = SUPABASE_READY
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
