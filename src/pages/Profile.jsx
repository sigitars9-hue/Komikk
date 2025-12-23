'use client';

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Crown,
  PenSquare,
  BookOpen,
  BarChart3,
  Medal,
  Trophy,
  Plus,
  LogIn,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

const ROLE_LABEL = {
  admin: "Admin",
  membership: "Membership",
  creator: "Kreator",
  user: "User",
  guest: "Tamu",
};

export default function Profile() {
  const { user, loading, signInGoogle } = useAuth();
  const nav = useNavigate();

  // === role user (sementara baca dari user.role / app_metadata.role) ===
  const role = useMemo(() => {
    if (!user) return "guest";
    return (
      user.role ||
      user.app_metadata?.role ||
      "user"
    );
  }, [user]);

  // === mock data stats (nanti bisa diganti dari API / Supabase) ===
  const readingStats = {
    manga: 12,
    manhwa: 8,
    manhua: 3,
  };
  const totalRead =
    readingStats.manga + readingStats.manhwa + readingStats.manhua;

  const leaderboard = [
    { id: 1, creator: "Yura Naomi", title: "Hope", views: 128_430 },
    { id: 2, creator: "Ryuu", title: "Starlight Re:Code", views: 96_210 },
    { id: 3, creator: "Elysia", title: "Petals in the Void", views: 73_900 },
  ];

  const isCreator =
    role === "creator" || role === "admin";

  const isMembership =
    role === "membership" || role === "admin";

  const handleLogin = async () => {
    try {
      await signInGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewNovel = () => {
    // nanti diarahkan ke form upload novel
    nav("/creator/novel/new");
  };

  // ================ UI ================
  if (!user && !loading) {
    // tampilan kalau belum login
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-black text-white">
        <div className="max-w-md mx-auto pt-24 px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/20 ring-1 ring-brand mb-4">
            <UserRound className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">
            Masuk untuk lihat profilmu
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            Simpan history bacaan, ikuti leaderboard, dan mulai jadi kreator
            novel di Gachaverse.
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-dark via-brand to-brand-light
                       text-sm font-semibold hover:brightness-110"
          >
            <LogIn className="w-4 h-4" />
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero full-bleed */}
      <div
        className="
          relative w-screen max-w-none
          ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]
          bg-gradient-to-b from-brand-dark via-brand to-black
          pt-10 pb-8
        "
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-4 sm:gap-6">
          {/* avatar */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/20 ring-2 ring-white/30 overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserRound className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
              )}
            </div>
            {/* role badge */}
            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-black/70 text-[10px] flex items-center gap-1">
              {role === "admin" && (
                <Crown className="w-3 h-3 text-amber-400" />
              )}
              {role === "creator" && (
                <PenSquare className="w-3 h-3 text-emerald-400" />
              )}
              <span className="uppercase tracking-wide">
                {ROLE_LABEL[role] || "User"}
              </span>
            </div>
          </div>

          {/* name + small info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold truncate">
              {user?.displayName || "User"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-200 mt-1">
              {user?.email}
            </p>
            {isMembership && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-black/40 ring-1 ring-emerald-500/60 text-emerald-300">
                <Crown className="w-3 h-3" />
                <span>Membership aktif — akses fitur premium</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt- -mt-4 space-y-5 sm:space-y-6">
        {/* kartu statistik bacaan */}
        <section className="rounded-2xl bg-zinc-950/80 ring-1 ring-white/10 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand" />
              <h2 className="text-sm sm:text-base font-semibold">
                Statistik Bacaan
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              Total baca:{" "}
              <span className="font-semibold text-white">
                {totalRead} judul
              </span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
            <StatPill label="Manga" value={readingStats.manga} />
            <StatPill label="Manhwa" value={readingStats.manhwa} />
            <StatPill label="Manhua" value={readingStats.manhua} />
          </div>
        </section>

        {/* panel kreator (hanya kreator / admin) */}
        {isCreator && (
          <section className="rounded-2xl bg-zinc-950/80 ring-1 ring-emerald-500/40 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <PenSquare className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm sm:text-base font-semibold">
                  Panel Kreator
                </h2>
              </div>

              <button
                onClick={handleNewNovel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                           bg-emerald-500 text-xs sm:text-sm font-semibold text-black
                           hover:brightness-110"
              >
                <Plus className="w-4 h-4" />
                Novel Baru
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-2">
              Kelola novelmu, lihat performa, dan naik ke puncak leaderboard.
            </p>

            {/* nanti di sini bisa ditambah list "Novelku" */}
          </section>
        )}

        {/* Leaderboard kreator (semua user bisa lihat) */}
        <section className="rounded-2xl bg-zinc-950/80 ring-1 ring-white/10 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm sm:text-base font-semibold">
                Leaderboard Kreator Novel
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              Top berdasarkan total views
            </span>
          </div>

          <div className="space-y-2">
            {leaderboard.map((row, index) => (
              <div
                key={row.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900/70"
              >
                {/* ranking icon */}
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold">
                  {index === 0 ? (
                    <Trophy className="w-4 h-4 text-amber-400" />
                  ) : index === 1 ? (
                    <Medal className="w-4 h-4 text-zinc-200" />
                  ) : index === 2 ? (
                    <Medal className="w-4 h-4 text-amber-800" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="font-semibold truncate">
                      {row.creator}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      {row.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {row.views.toLocaleString("en-US")} views
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-zinc-900/80 ring-1 ring-white/10 py-3">
      <div className="text-[11px] text-zinc-400 mb-1">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
