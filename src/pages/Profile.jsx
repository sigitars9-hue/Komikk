// src/pages/Profile.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Gem,
  UserRound,
  BookOpen,
  Bookmark,
  History,
  MessageSquare,
  CornerDownRight,
  Heart,
  Flame,
  Megaphone,
  LogOut,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchPopular,
  fetchAnnouncements,
  fetchUserComments,
} from "../lib/api";

/* =============================== ROLE =============================== */

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
  return "basic"; // creator/author/writer ikut jadi pembaca biasa
}

const ROLE_STYLE = {
  admin: {
    label: "Admin",
    desc: "Kontrol penuh panel dan moderasi.",
    icon: Crown,
    badge: "from-amber-400 via-orange-500 to-rose-500",
  },
  membership: {
    label: "Membership",
    desc: "Bebas iklan dan akses fitur premium.",
    icon: Gem,
    badge: "from-sky-400 via-cyan-400 to-emerald-400",
  },
  basic: {
    label: "Pembaca",
    desc: "Akun standar untuk membaca komik dan novel.",
    icon: UserRound,
    badge: "from-zinc-600 via-zinc-500 to-zinc-400",
  },
};

/* ============================== HELPERS ============================= */

// Riwayat & bookmark disimpan lokal. Sesuaikan key kalau di app kamu beda.
const LS_HISTORY_KEY = "gv:history";
const LS_BOOKMARK_KEY = "gv:bookmarks";

function readLocalCount(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
  } catch {
    /* abaikan */
  }
  return 0;
}

function timeAgo(value) {
  const t = new Date(value).getTime();
  if (!t) return "";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} bulan lalu`;
  return `${Math.floor(mon / 12)} tahun lalu`;
}

const PAGE_SIZE = 8;

/* ================================ PAGE ============================== */

export default function ProfilePage() {
  const auth = useAuth();
  const { user, loading, signInGoogle } = auth;
  const doLogout = auth.signOut || auth.logout || null;

  const [tab, setTab] = useState("ringkasan");

  const role = useMemo(() => resolveRole(user), [user]);
  const roleStyle = ROLE_STYLE[role];
  const RoleIcon = roleStyle.icon;

  // ---- data dari API ----
  const [popular, setPopular] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [comments, setComments] = useState([]);
  const [cState, setCState] = useState("idle"); // idle | loading | ok | unavailable | error

  const localStats = useMemo(
    () => ({
      history: readLocalCount(LS_HISTORY_KEY),
      bookmarks: readLocalCount(LS_BOOKMARK_KEY),
    }),
    [user]
  );

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchPopular("weekly")
      .then((r) => alive && setPopular(r.slice(0, 5)))
      .catch(() => {});
    fetchAnnouncements()
      .then((r) => alive && setAnnouncements((r || []).slice(0, 3)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const loadComments = useCallback(async () => {
    if (!user) return;
    setCState("loading");
    try {
      const token = user.getIdToken ? await user.getIdToken() : null;
      const list = await fetchUserComments(user.uid || user.id, token);
      setComments(list);
      setCState("ok");
    } catch (e) {
      // 404 = endpoint komentar belum ada di backend
      setCState(e?.status === 404 || e?.unavailable ? "unavailable" : "error");
    }
  }, [user]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const repliesTotal = useMemo(
    () => comments.reduce((n, c) => n + (c.replies?.length || 0), 0),
    [comments]
  );

  const handleLogin = async () => {
    if (loading) return;
    try {
      await signInGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------------------- belum login ---------------------------- */
  if (!user) {
    return (
      <div className="min-h-[100vh] bg-gradient-to-b from-[#0b1020] via-black to-black text-white -mx-4 sm:mx-0">
        <div className="max-w-md mx-auto px-4 pt-24 pb-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-dark via-brand to-brand-light grid place-items-center shadow-lg">
            <UserRound className="w-8 h-8" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Masuk untuk melihat profilmu
          </h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Riwayat komentar, balasan dari pembaca lain, dan status akunmu
            tersimpan di sini.
          </p>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand-light text-sm font-semibold hover:brightness-110 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Sparkles className="w-4 h-4" />
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ sudah login ------------------------------ */
  return (
    <div className="min-h-[100vh] bg-gradient-to-b from-[#101726] via-black to-black text-white -mx-4 sm:mx-0">
      {/* HEADER */}
      <section className="relative w-screen max-w-none ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#3b82f6_0,_transparent_55%),_radial-gradient(circle_at_bottom,_#ec4899_0,_transparent_55%)] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/60 to-black" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-brand-dark via-brand to-brand-light p-[3px] shrink-0">
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

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">
                {user.displayName || "Pengguna GVComics"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400 truncate">
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${roleStyle.badge} shadow-lg`}
                >
                  <RoleIcon className="w-3.5 h-3.5" />
                  {roleStyle.label}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {roleStyle.desc}
                </span>
              </div>
            </div>

            {doLogout && (
              <button
                type="button"
                onClick={() => doLogout()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-xs ring-1 ring-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar
              </button>
            )}
          </div>

          {/* TABS */}
          <nav
            className="mt-7 flex gap-1 border-b border-white/10"
            role="tablist"
            aria-label="Bagian profil"
          >
            {[
              ["ringkasan", "Ringkasan"],
              ["komentar", `Komentar${comments.length ? ` (${comments.length})` : ""}`],
              ["dukung", "Dukung kami"],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                  tab === id
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
                {tab === id && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-5">
        {tab === "ringkasan" && (
          <Overview
            stats={{
              comments: comments.length,
              replies: repliesTotal,
              history: localStats.history,
              bookmarks: localStats.bookmarks,
            }}
            commentsReady={cState === "ok"}
            popular={popular}
            announcements={announcements}
            role={role}
            onSupport={() => setTab("dukung")}
          />
        )}

        {tab === "komentar" && (
          <CommentHistory
            comments={comments}
            state={cState}
            onReload={loadComments}
          />
        )}

        {tab === "dukung" && <SupportTab role={role} />}
      </main>
    </div>
  );
}

/* ============================== OVERVIEW ============================ */

function Overview({ stats, commentsReady, popular, announcements, role, onSupport }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={MessageSquare}
          label="Komentar"
          value={commentsReady ? stats.comments : "-"}
          sub="yang pernah kamu tulis"
        />
        <Stat
          icon={CornerDownRight}
          label="Balasan"
          value={commentsReady ? stats.replies : "-"}
          sub="dari pembaca lain"
        />
        <Stat
          icon={History}
          label="Riwayat baca"
          value={stats.history}
          sub="chapter terakhir dibuka"
        />
        <Stat
          icon={Bookmark}
          label="Bookmark"
          value={stats.bookmarks}
          sub="series tersimpan"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        <section className="rounded-3xl bg-zinc-950/80 ring-1 ring-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Lagi populer minggu ini
            </h2>
          </div>
          {popular.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              Memuat daftar populer鈥�
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {popular.map((s, i) => (
                <li key={s.id}>
                  <Link
                    to={`/series/${s.slug}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-white/[0.03] rounded-xl px-1 -mx-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span className="w-5 text-xs font-semibold text-zinc-500 text-right">
                      {i + 1}
                    </span>
                    <div className="w-9 h-12 rounded-md bg-zinc-800 overflow-hidden shrink-0">
                      {s.cover && (
                        <img
                          src={s.cover}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {s.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {s.genres.slice(0, 3).join(", ") || s.badge}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          {role !== "membership" && role !== "admin" && (
            <section className="rounded-3xl bg-gradient-to-b from-zinc-800/80 to-zinc-900 ring-1 ring-white/10 p-5">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-semibold">Bantu GVComics tetap hidup</h2>
              </div>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Dukunganmu membantu biaya server dan update chapter baru.
              </p>
              <button
                type="button"
                onClick={onSupport}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-dark via-brand to-brand-light text-xs font-semibold hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                Lihat cara mendukung
              </button>
            </section>
          )}

          <section className="rounded-3xl bg-zinc-950/80 ring-1 ring-white/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-zinc-100">Pengumuman</h2>
            </div>
            {announcements.length === 0 ? (
              <p className="text-xs text-zinc-500">Belum ada pengumuman.</p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((a, i) => (
                  <li key={a.id || i} className="text-xs">
                    <div className="font-medium text-zinc-200">
                      {a.title || "Pengumuman"}
                    </div>
                    {(a.body || a.message || a.content) && (
                      <p className="mt-0.5 text-zinc-400 leading-relaxed line-clamp-2">
                        {a.body || a.message || a.content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl bg-zinc-950/80 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Icon className="w-4 h-4 text-brand" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}

/* ========================== COMMENT HISTORY ========================= */

function CommentHistory({ comments, state, onReload }) {
  const [filter, setFilter] = useState("all"); // all | replied
  const [visible, setVisible] = useState(PAGE_SIZE);

  const list = useMemo(
    () =>
      filter === "replied"
        ? comments.filter((c) => c.replies?.length)
        : comments,
    [comments, filter]
  );

  if (state === "loading" || state === "idle") {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-zinc-900/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <EmptyBox
        title="Riwayat komentar belum aktif"
        text="Backend belum punya endpoint komentar. Setelah endpoint /users/:uid/comments dibuat, riwayatmu otomatis muncul di sini."
      />
    );
  }

  if (state === "error") {
    return (
      <EmptyBox
        title="Komentar gagal dimuat"
        text="Periksa koneksi lalu coba lagi."
        action={
          <button
            type="button"
            onClick={onReload}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs ring-1 ring-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba lagi
          </button>
        }
      />
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyBox
        title="Kamu belum pernah berkomentar"
        text="Buka chapter favoritmu dan tulis komentar pertamamu."
        action={
          <Link
            to="/"
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-dark via-brand to-brand-light text-xs font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Cari komik
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {[
          ["all", `Semua (${comments.length})`],
          [
            "replied",
            `Ada balasan (${comments.filter((c) => c.replies?.length).length})`,
          ],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setVisible(PAGE_SIZE);
            }}
            aria-pressed={filter === id}
            className={`px-3 py-1.5 rounded-full text-xs ring-1 transition-colors ${
              filter === id
                ? "bg-white text-zinc-900 ring-white"
                : "bg-zinc-900 text-zinc-300 ring-white/10 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyBox
          title="Belum ada balasan"
          text="Komentarmu belum dibalas siapa pun."
        />
      ) : (
        <ul className="space-y-3">
          {list.slice(0, visible).map((c) => (
            <CommentCard key={c.id} c={c} />
          ))}
        </ul>
      )}

      {list.length > visible && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs ring-1 ring-white/10"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Tampilkan lebih banyak
          </button>
        </div>
      )}
    </div>
  );
}

function CommentCard({ c }) {
  const [open, setOpen] = useState(false);
  const replyCount = c.replies?.length || 0;
  const target = c.chapterId
    ? `/series/${c.seriesSlug}`
    : `/series/${c.seriesSlug}`;

  return (
    <li className="rounded-2xl bg-zinc-950/80 ring-1 ring-white/10 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-14 rounded-md bg-zinc-800 overflow-hidden shrink-0">
          {c.seriesCover && (
            <img
              src={c.seriesCover}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <Link
              to={target}
              className="font-semibold text-zinc-100 hover:text-brand truncate max-w-full"
            >
              {c.seriesTitle || c.seriesSlug}
            </Link>
            {c.chapterNumber != null && (
              <span className="text-zinc-400">Chapter {c.chapterNumber}</span>
            )}
            <span className="text-zinc-500">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-200 leading-relaxed whitespace-pre-line break-words">
            {c.text}
          </p>

          {replyCount > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-brand hover:brightness-125"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              {replyCount} balasan
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : (
            <div className="mt-2.5 text-[11px] text-zinc-500">
              Belum ada balasan
            </div>
          )}
        </div>
      </div>

      {open && replyCount > 0 && (
        <ul className="mt-3 ml-6 pl-4 border-l border-white/10 space-y-3">
          {c.replies.map((r) => (
            <li key={r.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden grid place-items-center text-[11px] font-semibold shrink-0">
                {r.avatar ? (
                  <img
                    src={r.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (r.name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs">
                  <span className="font-semibold text-zinc-100">{r.name}</span>
                  <span className="ml-2 text-zinc-500">
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-300 leading-relaxed whitespace-pre-line break-words">
                  {r.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function EmptyBox({ title, text, action }) {
  return (
    <div className="rounded-3xl bg-zinc-950/70 ring-1 ring-white/10 px-6 py-12 text-center">
      <MessageSquare className="w-8 h-8 mx-auto text-zinc-600" />
      <h3 className="mt-3 text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
        {text}
      </p>
      {action}
    </div>
  );
}

/* ============================== SUPPORT ============================= */

// GANTI dua path ini dengan gambar QRIS & Trakteer-mu (taruh di /public/images).
const QRIS_IMG = "/images/qris.png";
const TRAKTEER_IMG = "/images/trakteer.png";

function SupportTab({ role }) {
  const active = role === "membership" || role === "admin";

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-zinc-950/80 ring-1 ring-white/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Gem className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-semibold">
              {active ? "Membership kamu aktif" : "Dukung GVComics"}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-prose">
              {active
                ? "Terima kasih sudah mendukung. Kamu bebas iklan dan dapat prioritas update."
                : "Pilih salah satu cara di bawah. Pendukung mendapat akses tanpa iklan dan prioritas update. Setelah membayar, kirim bukti ke admin supaya akunmu diaktifkan."}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PayCard title="QRIS" hint="Scan dengan e-wallet atau m-banking apa pun." src={QRIS_IMG} />
        <PayCard title="Trakteer" hint="Scan atau buka halaman Trakteer kami." src={TRAKTEER_IMG} />
      </div>
    </div>
  );
}

function PayCard({ title, hint, src }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="rounded-3xl bg-zinc-950/80 ring-1 ring-white/10 p-4 sm:p-5">
      <div className="aspect-square w-full max-w-[280px] mx-auto rounded-2xl bg-white overflow-hidden grid place-items-center">
        {failed ? (
          <span className="px-6 text-center text-xs text-zinc-500">
            Taruh gambar {title} di {src}
          </span>
        ) : (
          <img
            src={src}
            alt={`Kode ${title}`}
            onError={() => setFailed(true)}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <figcaption className="mt-3 text-center">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-zinc-400">{hint}</div>
      </figcaption>
    </figure>
  );
}
