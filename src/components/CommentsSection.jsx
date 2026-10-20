import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  SendHorizontal,
  Loader2,
  SmilePlus,
  X,
  Pin,
  PinOff,
  MoreHorizontal,
  ThumbsUp,
  ChevronDown,
  EyeOff,
} from "lucide-react";
import clsx from "clsx";

/** ===== Helpers kecil ===== */
function hashToIndex(s, mod) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}
function avatarGradient(name) {
  const palettes = [
    "from-violet-600 to-indigo-500",
    "from-indigo-600 to-sky-500",
    "from-fuchsia-600 to-violet-500",
    "from-sky-600 to-cyan-500",
    "from-blue-600 to-violet-500",
    "from-pink-600 to-rose-500",
  ];
  const idx = hashToIndex((name || "guest").toLowerCase(), palettes.length);
  return `bg-gradient-to-br ${palettes[idx]}`;
}
const initial = (n) => ((n || "Guest").trim()[0] || "G").toUpperCase();
const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE"); // 2026-09-11
};

/** ===== Stickers di /public/stickers ===== */
const STICKERS = [
  { id: "think", url: "/stickers/yurathinking.png" },
  { id: "cry", url: "/stickers/yuracry.png" },
  { id: "fun", url: "/stickers/proudyura.png" },
  { id: "sad", url: "/stickers/sadyura.png" },
  { id: "derp", url: "/stickers/stupidyura.png" },
  { id: "yay", url: "/stickers/horeyura.png" },
];

/** ===== UI Reactions ===== */
const UI_REACTIONS = [
  { ui: "Berpikir", img: "/stickers/yurathinking.png", db: "upvote" },
  { ui: "Lucu", img: "/stickers/stupidyura.png", db: "suki" },
  { ui: "Hore", img: "/stickers/horeyura.png", db: "apsih" },
];

/** ===== Isi/pin util ===== */
const PIN_TAG = "[pin]";
const isPinned = (c) =>
  typeof c.content === "string" && c.content.startsWith(PIN_TAG);
const visibleText = (c) =>
  isPinned(c) ? c.content.slice(PIN_TAG.length) : c.content;

const isSticker = (c) =>
  c.kind === "sticker" ||
  !!c.sticker_url ||
  (typeof c.content === "string" && c.content.startsWith("[sticker]"));
const stickerUrl = (c) =>
  c.sticker_url ||
  (typeof c.content === "string" && c.content.startsWith("[sticker]")
    ? c.content.slice(9)
    : null);

const SPOILER_RE = /^\s*\[spoiler[^\]]*\]\s*/i;
const RULES_KEY = "gv:comment-rules:collapsed";

/** ====== Komponen utama ====== */
export default function CommentsSection({
  chapterId,
  isAuthor = false,
  maxLength = 5000,
}) {
  /** Auth */
  const [userId, setUserId] = useState(null);
  const [displayName, setDisplayName] = useState("");

  /** State list */
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(null);
  const [order, setOrder] = useState("new"); // "new" | "old" | "top"
  const [listLoading, setListLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE = 10;

  /** Input (root) */
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);
  const remaining = maxLength - text.length;
  const spoilerOn = SPOILER_RE.test(text);

  /** Reply & edit inline */
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [expanded, setExpanded] = useState({}); // { [rootId]: true }

  /** Stickers modal */
  const [pickerOpen, setPickerOpen] = useState(null);

  /** Reactions */
  const [counts, setCounts] = useState({ upvote: 0, suki: 0, apsih: 0 });
  const [myReact, setMyReact] = useState({});
  const [loadingReact, setLoadingReact] = useState({});

  /** Likes komentar (tabel comment_likes; kalau belum ada, tombol like disembunyikan) */
  const [likeCounts, setLikeCounts] = useState({});
  const [myLikes, setMyLikes] = useState({});
  const [likesOn, setLikesOn] = useState(true);

  /** Menu titik tiga aktif untuk id komentar tertentu */
  const [menuFor, setMenuFor] = useState(null);

  // 鈹€鈹€ auth 鈹€鈹€
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setUserId(u?.id ?? null);
      setDisplayName(
        u?.user_metadata?.name ||
          u?.user_metadata?.full_name ||
          u?.email ||
          ""
      );
    })();
  }, []);

  // tutup menu titik tiga saat klik di luar
  useEffect(() => {
    if (menuFor == null) return;
    const close = (e) => {
      if (!e.target.closest?.("[data-comment-menu]")) setMenuFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuFor]);

  const signIn = () => supabase.auth.signInWithOAuth({ provider: "google" });

  /** Load comments + pagination */
  async function fetchPage(p = 0) {
    setListLoading(true);
    const from = p * PAGE;
    const to = from + PAGE - 1;

    const asc = order === "old";
    const { data, error } = await supabase
      .from("chapters_comments")
      .select(
        "id,chapter_id,user_id,display_name,content,created_at,parent_id,kind,sticker_url,edited_at"
      )
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: asc })
      .range(from, to);

    if (error) {
      setListLoading(false);
      return;
    }

    setComments(p === 0 ? data : [...comments, ...data]);
    setHasMore((data || []).length === PAGE);
    setListLoading(false);
  }

  async function loadTotal() {
    const { count } = await supabase
      .from("chapters_comments")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", chapterId);
    if (typeof count === "number") setTotal(count);
  }

  async function loadReactions() {
    const { data } = await supabase
      .from("chapters_reactions")
      .select("kind,user_id")
      .eq("chapter_id", chapterId);

    const c = { upvote: 0, suki: 0, apsih: 0 };
    const mine = {};
    (data || []).forEach((r) => {
      if (r.kind in c) c[r.kind] += 1;
      if (r.user_id === userId) mine[r.kind] = true;
    });
    setCounts(c);
    setMyReact(mine);
  }

  async function loadLikes() {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("comment_id,user_id")
      .eq("chapter_id", String(chapterId));
    if (error) {
      setLikesOn(false);
      return;
    }
    const n = {};
    const mine = {};
    (data || []).forEach((r) => {
      n[r.comment_id] = (n[r.comment_id] || 0) + 1;
      if (r.user_id === userId) mine[r.comment_id] = true;
    });
    setLikesOn(true);
    setLikeCounts(n);
    setMyLikes(mine);
  }

  useEffect(() => {
    setPage(0);
    fetchPage(0);
    loadTotal();
    loadReactions();
    loadLikes();

    const ch = supabase
      .channel(`comments_${chapterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chapters_comments",
          filter: `chapter_id=eq.${chapterId}`,
        },
        () => {
          fetchPage(0);
          loadTotal();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chapters_reactions",
          filter: `chapter_id=eq.${chapterId}`,
        },
        () => loadReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, userId, order]);

  /** CRUD text/sticker (root & reply) */
  async function createComment(payload) {
    const { error } = await supabase.from("chapters_comments").insert(payload);
    if (error) throw error;
  }

  const authorName = () =>
    userId ? displayName || "User" : displayName || "Guest";

  async function submitRoot() {
    if (!text.trim()) return;
    if (text.length > maxLength) {
      setSubmitErr(`Maks ${maxLength} karakter.`);
      return;
    }
    setSending(true);
    setSubmitErr(null);
    try {
      await createComment({
        chapter_id: chapterId,
        content: text.trim(),
        user_id: userId,
        display_name: authorName(),
        parent_id: null,
        kind: "text",
      });
      setText("");
      fetchPage(0);
    } catch (e) {
      setSubmitErr(e?.message ?? "Gagal mengirim.");
    } finally {
      setSending(false);
    }
  }

  async function submitReply(parentId) {
    if (!replyText.trim()) return;
    setSending(true);
    setSubmitErr(null);
    try {
      await createComment({
        chapter_id: chapterId,
        content: replyText.trim(),
        user_id: userId,
        display_name: authorName(),
        parent_id: parentId,
        kind: "text",
      });
      setExpanded((e) => ({ ...e, [parentId]: true }));
      setReplyFor(null);
      setReplyText("");
      fetchPage(0);
    } catch (e) {
      setSubmitErr(e?.message ?? "Gagal mengirim balasan.");
    } finally {
      setSending(false);
    }
  }

  async function sendSticker(url, parentId) {
    setSending(true);
    setSubmitErr(null);
    try {
      await createComment({
        chapter_id: chapterId,
        user_id: userId,
        display_name: userId ? displayName || "User" : "Guest",
        parent_id: parentId ?? null,
        kind: "sticker",
        sticker_url: url,
        content: "[sticker]" + url,
      });
      if (parentId) setExpanded((e) => ({ ...e, [parentId]: true }));
      setPickerOpen(null);
      fetchPage(0);
    } catch (e) {
      setSubmitErr(e?.message ?? "Gagal mengirim stiker.");
    } finally {
      setSending(false);
    }
  }

  /** Hapus komentar + konfirmasi (reply ikut terhapus via FK) */
  async function onDelete(comment) {
    const full = visibleText(comment) || "";
    const shortened =
      full.length > 80 ? full.slice(0, 80).trimEnd() + "鈥�" : full;
    const label = shortened ? `"${shortened}"` : "ini";

    if (!window.confirm(`Ingin menghapus komentar ${label}?`)) return;

    await supabase.from("chapters_comments").delete().eq("id", comment.id);

    setMenuFor(null);
    fetchPage(0);
  }

  /** Simpan edit, set edited_at */
  async function onEditSave(id) {
    if (!editText.trim()) return setEditingId(null);
    const { error } = await supabase
      .from("chapters_comments")
      .update({
        content: editText.trim(),
        kind: "text",
        sticker_url: null,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) alert(error.message);
    setEditingId(null);
    setMenuFor(null);
    fetchPage(0);
  }

  /** Pin (maks 1, only author) */
  async function pinToggle(target) {
    if (!isAuthor) return;
    const currentPinned = comments.filter(
      (c) => isPinned(c) && c.parent_id === null
    );
    for (const c of currentPinned) {
      await supabase
        .from("chapters_comments")
        .update({ content: visibleText(c) })
        .eq("id", c.id);
    }
    if (!isPinned(target)) {
      await supabase
        .from("chapters_comments")
        .update({ content: PIN_TAG + visibleText(target) })
        .eq("id", target.id);
    }
    fetchPage(0);
  }

  /** Reactions */
  async function toggleReaction(kind) {
    if (!userId) {
      await signIn();
      return;
    }
    setLoadingReact((s) => ({ ...s, [kind]: true }));
    try {
      if (myReact[kind]) {
        await supabase
          .from("chapters_reactions")
          .delete()
          .eq("chapter_id", chapterId)
          .eq("user_id", userId)
          .eq("kind", kind);
      } else {
        await supabase
          .from("chapters_reactions")
          .insert({ chapter_id: chapterId, user_id: userId, kind });
      }
      await loadReactions();
    } finally {
      setLoadingReact((s) => ({ ...s, [kind]: false }));
    }
  }

  /** Like komentar (optimistic) */
  async function toggleLike(c) {
    if (!userId) {
      await signIn();
      return;
    }
    const id = String(c.id);
    const was = !!myLikes[id];
    setMyLikes((m) => ({ ...m, [id]: !was }));
    setLikeCounts((n) => ({
      ...n,
      [id]: Math.max(0, (n[id] || 0) + (was ? -1 : 1)),
    }));

    const { error } = was
      ? await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", id)
          .eq("user_id", userId)
      : await supabase.from("comment_likes").insert({
          comment_id: id,
          chapter_id: String(chapterId),
          user_id: userId,
        });
    if (error) loadLikes();
  }

  /** Mulai balas (reply ke reply = tetap di bawah komentar utama + @mention) */
  function startReply(rootId, prefill = "") {
    setReplyFor(rootId);
    setReplyText(prefill);
    setExpanded((e) => ({ ...e, [rootId]: true }));
  }

  /** Tombol spoiler di kotak input */
  function toggleSpoiler() {
    setText((t) => (SPOILER_RE.test(t) ? t.replace(SPOILER_RE, "") : "[SPOILER] " + t));
  }

  /** Derivations */
  const repliesByParent = useMemo(() => {
    const map = {};
    comments.forEach((c) => {
      if (!c.parent_id) return;
      (map[c.parent_id] ||= []).push(c);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    );
    return map;
  }, [comments]);

  const rootComments = useMemo(() => {
    const arr = comments.filter((c) => c.parent_id === null);
    arr.sort((a, b) => {
      const pa = isPinned(a) ? 1 : 0;
      const pb = isPinned(b) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      if (order === "top") {
        const d =
          (likeCounts[String(b.id)] || 0) - (likeCounts[String(a.id)] || 0) ||
          (repliesByParent[b.id]?.length || 0) -
            (repliesByParent[a.id]?.length || 0);
        if (d) return d;
      }
      return 0; // urutan dari server (created_at) dipertahankan
    });
    return arr;
  }, [comments, order, likeCounts, repliesByParent]);

  const words = text.trim().split(/\s+/).filter(Boolean).length;

  /** Konteks untuk CommentItem */
  const ctx = {
    userId,
    isAuthor,
    menuFor,
    setMenuFor,
    editingId,
    setEditingId,
    editText,
    setEditText,
    onEditSave,
    onDelete,
    pinToggle,
    likeCounts,
    myLikes,
    likesOn,
    toggleLike,
  };

  /** UI */
  return (
    <section className="mx-auto mt-8 w-full max-w-3xl">
      {/* RULES */}
      <CommentRules />

      {/* REACTIONS */}
      <div className="mt-8 text-center">
        <h3 className="text-xl font-extrabold tracking-wide sm:text-2xl">
          Reaksi
        </h3>
        <p className="mt-1 text-sm font-semibold sm:text-base">
          {counts.upvote + counts.suki + counts.apsih} Reaksi
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-center gap-6 sm:gap-10">
          {UI_REACTIONS.map(({ ui, img, db }) => (
            <ReactionButton
              key={ui}
              label={ui}
              imgSrc={img}
              active={!!myReact[db]}
              count={counts[db]}
              busy={!!loadingReact[db]}
              onClick={() => toggleReaction(db)}
            />
          ))}
        </div>
      </div>

      {/* INPUT ROOT */}
      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/40 transition focus-within:border-brand/60">
        <textarea
          className="block h-28 w-full resize-none bg-transparent px-3 pt-3 text-[15px] outline-none placeholder:text-zinc-500 sm:h-32"
          placeholder="Komen di mari鈥�"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxLength + 1000}
          aria-label="Tulis komentar"
        />

        <div className="flex items-center gap-1 px-2 pb-2">
          <button
            type="button"
            onClick={() => setPickerOpen({})}
            aria-label="Pilih stiker"
            title="Stiker"
            className="grid h-10 w-10 place-items-center rounded-lg text-zinc-300 hover:bg-white/10"
          >
            <SmilePlus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleSpoiler}
            aria-pressed={spoilerOn}
            aria-label="Tandai sebagai spoiler"
            title="Spoiler"
            className={clsx(
              "grid h-10 w-10 place-items-center rounded-lg transition",
              spoilerOn
                ? "bg-amber-500/20 text-amber-300"
                : "text-zinc-300 hover:bg-white/10"
            )}
          >
            <EyeOff className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              {words} Kata
              {remaining < 500 && (
                <span className={clsx("ml-1", remaining < 0 && "text-red-400")}>
                  路 {remaining}
                </span>
              )}
            </span>

            {!userId && (
              <button
                type="button"
                onClick={signIn}
                className="h-9 rounded-lg border border-white/15 px-3 text-sm font-medium hover:bg-white/10"
              >
                Login
              </button>
            )}

            <button
              type="button"
              onClick={submitRoot}
              disabled={!text.trim() || sending || remaining < 0}
              className={clsx(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition",
                !text.trim() || remaining < 0
                  ? "bg-zinc-800 opacity-60"
                  : "bg-brand hover:brightness-110"
              )}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim
                </>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" />
                  Kirim
                </>
              )}
            </button>
          </div>
        </div>

        {submitErr && (
          <div className="mx-3 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {submitErr}
          </div>
        )}
      </div>

      {/* HEADER + SORT */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold sm:text-2xl">
          {total ?? comments.length} Komentar
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "new", label: "Terbaru" },
            { id: "old", label: "Terlama" },
            { id: "top", label: "Terpopuler" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOrder(s.id)}
              aria-pressed={order === s.id}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                order === s.id
                  ? "bg-brand text-white"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      {listLoading && page === 0 && comments.length === 0 ? (
        <div className="mt-4 space-y-5 animate-pulse" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-1/3 rounded bg-zinc-800" />
                <div className="h-3 w-5/6 rounded bg-zinc-800/70" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-white/5">
          {rootComments.map((c) => {
            const replies = repliesByParent[c.id] || [];
            const open = !!expanded[c.id];

            return (
              <li key={c.id} className="py-4">
                <CommentItem
                  c={c}
                  ctx={ctx}
                  onReply={() => startReply(c.id, "")}
                >
                  {replies.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))
                      }
                      aria-expanded={open}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand hover:brightness-125"
                    >
                      <ChevronDown
                        className={clsx(
                          "h-4 w-4 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                      {open ? "Sembunyikan balasan" : `${replies.length} balasan`}
                    </button>
                  )}

                  {open && replies.length > 0 && (
                    <ul className="mt-3 space-y-4 border-l border-white/10 pl-3 sm:pl-4">
                      {replies.map((r) => (
                        <li key={r.id}>
                          <CommentItem
                            c={r}
                            isReply
                            ctx={ctx}
                            onReply={() =>
                              startReply(c.id, `@${r.display_name || "Guest"} `)
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {replyFor === c.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        autoFocus
                        className="h-20 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60"
                        placeholder="Tulis balasan鈥�"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => submitReply(c.id)}
                          disabled={!replyText.trim() || sending}
                          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                        >
                          Balas
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerOpen({ parentId: c.id })}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
                        >
                          <SmilePlus className="h-4 w-4" />
                          Stiker
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyFor(null);
                            setReplyText("");
                          }}
                          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </CommentItem>
              </li>
            );
          })}

          {!listLoading && rootComments.length === 0 && (
            <li className="py-10 text-center text-sm text-zinc-400">
              Belum ada komentar. Jadilah yang pertama!
            </li>
          )}
        </ul>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              const np = page + 1;
              setPage(np);
              fetchPage(np);
            }}
            className="mx-auto block rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Tampilkan lebih banyak
          </button>
        </div>
      )}

      {/* STICKER MODAL */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setPickerOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih stiker"
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl border border-white/10 bg-zinc-900 p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] sm:max-w-[680px] sm:rounded-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Pilih Stiker</div>
              <button
                type="button"
                onClick={() => setPickerOpen(null)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-800 hover:bg-zinc-700"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {STICKERS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() =>
                    sendSticker(s.url, pickerOpen?.parentId ?? undefined)
                  }
                  className="group rounded-xl border border-white/10 bg-zinc-800/50 p-2 hover:bg-zinc-800"
                >
                  <img
                    src={s.url}
                    alt={s.id}
                    className="mx-auto h-20 object-contain transition-transform group-hover:scale-105 sm:h-24"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** ==== Satu komentar (dipakai untuk komentar utama & balasan) ==== */
function CommentItem({ c, isReply = false, ctx, onReply, children }) {
  const id = String(c.id);
  const mine = !!ctx.userId && ctx.userId === c.user_id;
  const canManage = mine || ctx.isAuthor;
  const likeN = ctx.likeCounts[id] || 0;
  const liked = !!ctx.myLikes[id];
  const editing = ctx.editingId === c.id;

  return (
    <article className="flex gap-3">
      <Avatar name={c.display_name} small={isReply} />

      <div className="min-w-0 flex-1">
        {/* header */}
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate font-semibold text-brand">
              {c.display_name || "Guest"}
            </span>
            {isPinned(c) && (
              <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                馃搶 Disematkan
              </span>
            )}
            <time
              className="text-xs text-zinc-500"
              title={new Date(c.created_at).toLocaleString()}
            >
              {fmtDate(c.created_at)}
            </time>
            {c.edited_at && (
              <span className="text-[11px] italic text-zinc-500">(diedit)</span>
            )}
          </div>

          {canManage && (
            <div className="relative -mt-1 shrink-0" data-comment-menu>
              <button
                type="button"
                onClick={() =>
                  ctx.setMenuFor((prev) => (prev === c.id ? null : c.id))
                }
                aria-label="Menu komentar"
                aria-haspopup="menu"
                aria-expanded={ctx.menuFor === c.id}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {ctx.menuFor === c.id && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      ctx.setEditingId(c.id);
                      ctx.setEditText(visibleText(c));
                      ctx.setMenuFor(null);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => ctx.onDelete(c)}
                    className="block w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-red-900/40"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* isi */}
        <div className="mt-1">
          {editing ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                className="h-24 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60"
                value={ctx.editText}
                onChange={(e) => ctx.setEditText(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => ctx.onEditSave(c.id)}
                  className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => ctx.setEditingId(null)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : isSticker(c) ? (
            <img
              src={stickerUrl(c)}
              alt="stiker"
              className={clsx(
                "select-none",
                isReply ? "max-h-28 sm:max-h-32" : "max-h-36 sm:max-h-44"
              )}
              draggable={false}
            />
          ) : (
            <SpoilerText text={visibleText(c)} />
          )}
        </div>

        {/* aksi */}
        {!editing && (
          <div className="mt-2 flex items-center gap-5 text-sm text-zinc-400">
            {ctx.likesOn && (
              <button
                type="button"
                onClick={() => ctx.toggleLike(c)}
                aria-pressed={liked}
                aria-label="Suka"
                className={clsx(
                  "inline-flex items-center gap-1.5 transition hover:text-white",
                  liked && "text-brand hover:text-brand"
                )}
              >
                <ThumbsUp className={clsx("h-5 w-5", liked && "fill-current")} />
                {likeN > 0 && <span className="tabular-nums">{likeN}</span>}
              </button>
            )}

            <button
              type="button"
              onClick={onReply}
              className="font-medium hover:text-white"
            >
              Balas
            </button>

            {ctx.isAuthor && !isReply && (
              <button
                type="button"
                onClick={() => ctx.pinToggle(c)}
                aria-label={isPinned(c) ? "Lepas sematan" : "Sematkan"}
                title={isPinned(c) ? "Lepas sematan" : "Sematkan"}
                className="hover:text-white"
              >
                {isPinned(c) ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </article>
  );
}

/** ==== Avatar ==== */
function Avatar({ name, small = false }) {
  return (
    <div
      className={clsx(
        "grid shrink-0 place-items-center rounded-full font-bold uppercase text-white",
        small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm",
        avatarGradient(name)
      )}
    >
      {initial(name)}
    </div>
  );
}

/** ==== Rules komentar (bisa dilipat, ingat pilihan di perangkat) ==== */
function CommentRules() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(RULES_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const toggle = () =>
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(RULES_KEY, next ? "0" : "1");
      } catch {}
      return next;
    });

  const items = [
    {
      icon: "馃毇",
      head: "Dilarang Toxic, Rasis, atau menimbulkan kerusuhan!",
      body: (
        <>
          Yang ikut kerusuhan bakal{" "}
          <b className="text-rose-400">kena ban juga!</b> Jadi diemin aja,
          cukup <b className="text-rose-400">laporin ke admin!</b>
        </>
      ),
    },
    { icon: "馃檲", head: "Dilarang pakai photo profil cabul!" },
    { icon: "馃敒", head: "Dilarang mengirim photo atau gif cabul/tidak senonoh!" },
    { icon: "馃彌锔�", head: "DILARANG KOMENTAR SOAL POLITIK!!" },
    {
      icon: "馃摎",
      head: "Yang belum tau cara spoiler, tolong lihat tutorial dulu yaa saudaraku!",
    },
    {
      icon: "馃か",
      head: "DILARANG SPOILER ENDING!!",
      body: "Cukup 1鈥�2 chapter ke depan aja!",
    },
    {
      icon: "馃挰",
      head: "DILARANG SPAM KOMENTAR BUAT LEVELING!",
      body: (
        <>
          Yang cuma spam emot atau komen hal yang sama tiap chapter juga{" "}
          <b className="text-rose-400">kena ban!</b> Intinya,{" "}
          <b className="text-rose-400">leveling nggak wajar = auto ban!</b>{" "}
          Tolong yaa, yang normal aja 馃檹
        </>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-white/15 bg-zinc-900/50">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span aria-hidden="true">鈿狅笍</span>
        <span className="flex-1 text-base font-bold sm:text-lg">
          Rules Komentar Web Shinigami ID
        </span>
        <ChevronDown
          className={clsx(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4 text-sm leading-relaxed">
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.head} className="flex gap-2.5">
                <span aria-hidden="true" className="shrink-0">
                  {it.icon}
                </span>
                <div>
                  <p className="font-bold text-rose-400">{it.head}</p>
                  {it.body && <p className="mt-0.5 text-zinc-200">{it.body}</p>}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10 pt-4">
            <p className="flex gap-2.5">
              <span aria-hidden="true">馃摙</span>
              <b className="text-rose-400">Noted:</b>
            </p>
            <p className="mt-1 text-zinc-200">
              Yang melanggar rules di atas akan langsung{" "}
              <b className="text-rose-400">kena BAN! Tanpa peringatan!</b>
            </p>
            <p className="mt-3 flex gap-2.5 text-zinc-200">
              <span aria-hidden="true">馃敀</span>
              <span>
                Akun komentarmu akan{" "}
                <b className="text-rose-400">dibanned permanen</b> dan{" "}
                <b className="text-rose-400">tidak bisa balik lagi!!!</b>
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** ==== Tombol Reaksi ==== */
function ReactionButton({ label, imgSrc, active, count, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative flex flex-col items-center"
    >
      <span
        className={clsx(
          "absolute -right-3 -top-2 z-10 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-2 ring-brand",
          active ? "bg-brand text-white" : "bg-zinc-950 text-zinc-100"
        )}
      >
        {busy ? "鈥�" : count ?? 0}
      </span>

      <div
        className={clsx(
          "h-16 w-16 overflow-hidden rounded-full ring-1 transition group-hover:scale-105 sm:h-20 sm:w-20",
          active ? "bg-brand/20 ring-brand" : "bg-zinc-800/50 ring-white/10"
        )}
      >
        <img
          src={imgSrc}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div className="mt-2 text-sm font-semibold sm:text-base">{label}</div>
    </button>
  );
}

/** ==== Teks komentar + spoiler (tombol "Spoiler 鈱�") ==== */
function SpoilerText({ text }) {
  const [open, setOpen] = useState(false);
  const isSpoiler = SPOILER_RE.test(text || "");

  const body = (t) => (
    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {t}
    </div>
  );

  if (!isSpoiler) return body(text);

  const cleaned = (text || "").replace(SPOILER_RE, "");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-700"
      >
        Spoiler
        <ChevronDown
          className={clsx("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="mt-2">{body(cleaned)}</div>}
    </div>
  );
     }
