import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, SUPABASE_READY } from '../lib/supabaseClient';

const Ctx = createContext({
  user: null,
  loading: true,
  signInGoogle: async () => {},
  signOutApp: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Jika Supabase belum siap (ENV kosong), jangan panggil API
    if (!SUPABASE_READY || !supabase) {
      setLoading(false);
      return;
    }

    let unsub = () => {};

    // Initial getUser
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.error('[Supabase] getUser error:', error.message);
      setUser(data?.user ?? null);
      setLoading(false);
    });

    // Subscribe auth state changes
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    unsub = () => sub?.data?.subscription?.unsubscribe?.();

    return () => unsub();
  }, []);

  const signInGoogle = async () => {
    if (!SUPABASE_READY || !supabase) {
      alert('Login belum bisa: ENV Supabase belum diisi.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOutApp = async () => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, loading, signInGoogle, signOutApp }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
