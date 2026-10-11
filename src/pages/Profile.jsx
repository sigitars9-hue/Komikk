// src/pages/Profile.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Gem,
  PenSquare,
  UserRound,
  BookOpen,
  Flame,
  ArrowUpRight,
  Sparkles,
  Plus,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

/** --- Helper: deteksi role user dari metadata / custom claims --- */
function resolveRole(user) {
  const raw =
    user?.role ||
    user?.app_metadata?.role ||
    user?.metadata?.role ||
    user?.customClaims?.role ||
    "basic";

  const v = String(raw).toLowerCase();

  if (["admin", "owner", "super"].includes(v)) return "admin";
  if (["member", "membership", "premium", "plus", "vip"].includes(v))
    return "membership";
  if (["creator", "author", "writer"].includes(v)) return "creator";

  return "basic";
}

/** --- Info style untuk tiap role (badge premium + efek mengkilap) --- */
function getRoleStyle(role) {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        desc: "Kontrol penuh panel & moderasi.",
        icon: Crown,
        badgeClass:
          "from-amber-400 via-orange-500 to-rose-500 border-amber-300/80",
        glowClass: "bg-amber-400/50",
      };
    case "membership":
      return {
        label: "Membership",
        desc: "Akses tanpa iklan & fitur premium.",
        icon: Gem,
        badgeClass:
          "from-sky-400 via-cyan-400 to-emerald-400 border-cyan-300/80",
        glowClass: "bg-cyan-400/50",
      };
    case "creator":
      return {
        label: "Kreator",
        desc: "Bisa upload & kelola novel sendiri.",
        icon: PenSquare,
        badgeClass:
          "from-violet-400 via-fuchsia-400 to-pink-400 border-fuchsia-300/80",
        glowClass: "bg-fuchsia-400/50",
      };
    default:
      return {
        label: "Pembaca",
        desc: "Akun standar untuk membaca komik & novel.",
        icon: UserRound,
        badgeClass:
          "from-zinc-600 via-zinc-500 to-zinc-400 border-zinc-300/80",
        glowClass: "bg-zinc-400/40",
      };
  }
}

/** --- Dummy data sementara: ganti dengan API nanti --- */
const dummyStats = {
  manga: 24,
  manhwa: 12,
  manhua: 8,
  totalSeries: 33,
  totalChapters: 417,
  minutes: 920,
};

const dummyLeaderboard = [
  {
    id: "1",
    name: "Nara Hoshizora",
    title: "Re:Zero to Real Life Gacha",
    views: 128_400,
  },
  {
    id: "2",
    name: "Akira Moonlight",
    title: "Chronicles of Broken World",
    views: 98_230,
  },
  {
    id: "3",
    name: "Velia Frost",
    title: "Snowfall in Another Timeline",
    views: 72_110,
  },
  {
    id: "4",
    name: "Yuuto A.",
    title: "Shadow of Stardust",
    views: 54_980,
  },
];

function formatViews(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

export default function ProfilePage() {
  const { user, loading, signInGoogle } = useAuth();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // sementara pakai dummy agar UI langsung hidup
  useEffect(() => {
    setStats(dummyStats);
    setLeaderboard(dummyLeaderboard);
  }, []);

  const role = useMemo(() => resolveRole(user), [user]);
  const roleStyle = useMemo(() => getRoleStyle(role), [role]);

  const RoleIcon = roleStyle.icon;

  const handleLogin = async () => {
    if (loading) return;
    try {
      await signInGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  // --- STATE: belum login ---
  if (!user) {
    return (
      <div className="min-h-[100vh] bg-gradient-to-b from-[#0b1020] via-black to-black text-white -mx-4 sm:mx-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-10">
          <div className="rounded-3xl bg-zinc-950/70 ring-1 ring-white/10 p-6 sm:p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-dark via-brand to-brand-light shadow-lg mb-4">
              <UserRound className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Masuk dulu yuk ✨
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              Setelah login, kamu bisa lihat statistik baca, status membership,
              dan leaderboard kreator favoritmu.
            </p>
            <button
              onClick={handleLogin}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl
                         bg-gradient-to-r from-brand-dark via-brand to-brand-light
                         text-sm font-semibold hover:brightness-110 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Masuk dengan Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STATE: sudah login ---
  return (
    <div className="min-h-[100vh] bg-gradient-to-b from-[#101726] via-black to-black text-white -mx-4 sm:mx-0">
      {/* HERO full-bleed */}
      <section className="relative w-screen max-w-none ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]">
        {/* background color swirl */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#3b82f6_0,_transparent_55%),_radial-gradient(circle_at_bottom,_#ec4899_0,_transparent_55%)] opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/50 to-black" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-7">
            {/* Avatar + ring */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-brand-dark via-brand to-brand-light p-[3px] shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                <div className="w-full h-full rounded-full bg-zinc-950 grid place-items-center overflow-hidden">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Avatar"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-3xl font-semibold">
                      {(user.displayName || user.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Shine ring */}
              <div className="pointer-events-none absolute inset-0 rounded-full blur-xl bg-brand/50 opacity-60" />
            </div>

            {/* Name + email + role badge */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {user.displayName || "Pengguna Gachaverse"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-300 truncate">
                {user.email}
              </p>

              {/* Role badge dengan efek mengkilap */}
              <div className="mt-3 inline-flex items-center gap-2">
                <div
                  className={`
                    relative inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl
                    text-xs sm:text-sm font-semibold
                    bg-gradient-to-r ${roleStyle.badgeClass}
                    border ${roleStyle.badgeClass.includes("border-") ? "" : ""}
                    shadow-[0_10px_30px_rgba(0,0,0,0.7)]
                    overflow-hidden
                  `}
                >
                  {/* shine bergerak */}
                  <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 bg-white/40 blur-lg transform -skew-x-12 animate-[pulse_2.2s_ease-in-out_infinite]" />

                  <RoleIcon className="w-4 h-4 drop-shadow-sm" />
                  <span>{roleStyle.label}</span>
                </div>
                <span className="text-[11px] text-zinc-300">
                  {roleStyle.desc}
                </span>
              </div>
            </div>

            {/* Small chip total series */}
            <div className="hidden sm:flex flex-col items-end gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/50 ring-1 ring-white/10 backdrop-blur">
                <BookOpen className="w-4 h-4 text-brand" />
                <div className="text-xs">
                  <div className="font-semibold">
                    {stats?.totalSeries ?? 0} series
                  </div>
                  <div className="text-zinc-400">dalam koleksimu</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BODY */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-2 space-y-6 sm:space-y-7">
        {/* STATS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Manga"
            value={stats?.manga ?? 0}
            sub="judul pernah kamu baca"
            accent="from-sky-500/80 to-sky-400/40"
          />
          <StatCard
            label="Manhwa"
            value={stats?.manhwa ?? 0}
            sub="judul berwarna favoritmu"
            accent="from-emerald-500/80 to-emerald-400/40"
          />
          <StatCard
            label="Manhua"
            value={stats?.manhua ?? 0}
            sub="judul asal Tiongkok"
            accent="from-amber-500/80 to-amber-400/40"
          />
          <StatCard
            label="Waktu Baca"
            value={`${stats?.minutes ?? 0} mnt`}
            sub="total estimasi waktu baca"
            icon={<Flame className="w-4 h-4 text-orange-400" />}
            accent="from-rose-500/80 to-orange-500/40"
          />
        </section>

        {/* MEMBERSHIP & CREATOR SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 sm:gap-5">
          {/* Membership / role detail */}
          <div className="rounded-3xl bg-zinc-950/70 ring-1 ring-white/10 p-5 sm:p-6 shadow-[0_20px_45px_rgba(0,0,0,0.75)] relative overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(circle, rgba(56,189,248,0.8), transparent)" }} />
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
                  Status Akun
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Peranmu menentukan akses fitur & panel yang tersedia.
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-brand" />
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch">
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                  Role saat ini
                </div>
                <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/60 ring-1 ring-white/10">
                  <RoleIcon className="w-4 h-4 text-brand" />
                  <span className="text-sm font-semibold">
                    {roleStyle.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                  {roleStyle.desc}
                </p>
              </div>

              {/* Info khusus Membership */}
              {role === "membership" && (
                <div className="w-full sm:w-40 rounded-2xl bg-gradient-to-b from-brand/10 to-brand/0 ring-1 ring-brand/50 px-3 py-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Gem className="w-4 h-4 text-cyan-300" />
                    <span className="font-semibold">Membership Aktif</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Terima kasih sudah mendukung GVComics. Kamu bebas iklan dan
                    dapat prioritas update.
                  </p>
                  <div className="mt-2 text-[10px] text-zinc-400">
                    *Integrasi tanggal kadaluarsa bisa diisi dari API nanti.
                  </div>
                </div>
              )}

              {/* Info khusus Basic → ajakan upgrade */}
              {role === "basic" && (
                <div className="w-full sm:w-40 rounded-2xl bg-gradient-to-b from-zinc-800/90 to-zinc-900 ring-1 ring-white/10 px-3 py-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Gem className="w-4 h-4 text-cyan-300" />
                    <span className="font-semibold">Upgrade Membership</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Buka akses tanpa iklan, antrian server prioritas, dan tema
                    eksklusif hanya dengan satu klik.
                  </p>
                  <button
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-dark via-brand to-brand-light text-[11px] font-semibold hover:brightness-110"
                    type="button"
                  >
                    <Sparkles className="w-3 h-3" />
                    Lihat paket
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Creator corner / CTA */}
          <CreatorCorner role={role} />
        </section>

        {/* LEADERBOARD KREATOR */}
        <section className="rounded-3xl bg-zinc-950/80 ring-1 ring-white/10 p-5 sm:p-6 shadow-[0_22px_55px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
                Leaderboard Kreator Novel
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                10 kreator dengan total views tertinggi. Data ini bisa kamu
                tarik dari API statistik nanti.
              </p>
            </div>
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-[11px] ring-1 ring-white/10"
            >
              Lihat semua
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-2 divide-y divide-white/5">
            {leaderboard.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                {/* Rank */}
                <div className="w-7 text-xs font-semibold text-zinc-400">
                  #{index + 1}
                </div>

                {/* Avatar kecil */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 grid place-items-center text-xs font-semibold text-white/90">
                  {item.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {item.title}
                      </div>
                    </div>
                    <div className="mt-0.5 text-[11px] text-brand font-semibold flex items-center gap-1 sm:ml-3">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {formatViews(item.views)} views
                    </div>
                  </div>
                </div>

                {/* tiny pill */}
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-900/90 text-[10px] text-zinc-300">
                  Novel
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/** --- Komponen kecil --- */

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-950/80 ring-1 ring-white/10 p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.75)]">
      <div
        className={`pointer-events-none absolute -top-10 -right-6 w-24 h-24 rounded-full blur-3xl opacity-60 bg-gradient-to-br ${accent}`}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">
            {label}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-semibold">
            {value}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">{sub}</div>
        </div>
        <div className="w-9 h-9 rounded-2xl bg-black/60 ring-1 ring-white/10 grid place-items-center">
          {icon || <BookOpen className="w-4 h-4 text-brand" />}
        </div>
      </div>
    </div>
  );
}

function CreatorCorner({ role }) {
  const isCreator = role === "creator" || role === "admin";

  if (!isCreator) {
    return (
      <div className="rounded-3xl bg-zinc-950/70 ring-1 ring-white/10 p-5 sm:p-6 shadow-[0_20px_45px_rgba(0,0,0,0.75)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
              Mode Kreator
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Punya ide cerita sendiri? Daftar sebagai kreator dan bagikan
              novelnu ke pembaca lain.
            </p>
          </div>
          <PenSquare className="w-5 h-5 text-fuchsia-300" />
        </div>

        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl
                     bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500
                     text-xs font-semibold shadow-lg hover:brightness-110"
        >
          <Sparkles className="w-4 h-4" />
          Daftar jadi kreator
        </button>

        <p className="mt-2 text-[10px] text-zinc-500">
          *Tombol ini nanti bisa diarahkan ke form pendaftaran kreator /
          dashboard kreator-mu.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600/40 via-violet-700/40 to-sky-500/40 ring-1 ring-fuchsia-300/60 p-[1px] shadow-[0_22px_55px_rgba(88,28,135,0.7)]">
      <div className="h-full w-full rounded-[1.4rem] bg-zinc-950/90 p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Kreator Corner
            </h2>
            <p className="mt-1 text-xs text-zinc-300">
              Kelola novelmu dan upload chapter baru langsung dari sini.
            </p>
          </div>
          <Flame className="w-5 h-5 text-amber-300" />
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Novelmu muncul di leaderboard publik.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span>Statistik views & pembaca bisa diambil dari API nanti.</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/creator/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-xs font-semibold text-zinc-900 shadow-lg hover:brightness-95"
          >
            <Plus className="w-4 h-4" />
            Tulis novel baru
          </Link>
          <Link
            to="/creator/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-900/80 text-[11px] text-zinc-200 ring-1 ring-white/10 hover:bg-zinc-800"
          >
            <PenSquare className="w-3 h-3" />
            Dashboard kreator
          </Link>
        </div>
      </div>
    </div>
  );
}
