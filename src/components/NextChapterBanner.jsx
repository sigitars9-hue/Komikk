// src/components/NextChapterBanner.jsx
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Banner auto-lanjut ke chapter berikutnya.
 * Tanpa kartu pembungkus: elemen langsung berada di halaman.
 *
 * Props:
 *  - chapterNumber : nomor chapter tujuan
 *  - countdown     : sisa detik (dari Reader, untuk teks)
 *  - duration      : total waktu dalam ms (AUTO_NEXT_DELAY)
 *  - onNow         : lanjut sekarang
 *  - onCancel      : batalkan auto-lanjut
 */
export default function NextChapterBanner({
  chapterNumber,
  countdown = 0,
  duration = 5000,
  onNow,
  onCancel,
}) {
  // Bar diisi mulus selama `duration` (bukan lompat per detik).
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const seconds = Math.max(1, Math.ceil(countdown || 0));

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-10 flex flex-col items-center text-center"
    >
      {/* Yura + cahaya lembut di belakangnya */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 scale-110 rounded-full bg-brand/30 blur-3xl motion-safe:animate-pulse"
        />
        <img
          src="/yura-next-ch.png"
          alt="Yura"
          className="h-auto w-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] sm:w-44"
          draggable={false}
        />
      </div>

      {/* Teks */}
      <h3 className="mt-4 text-xl font-extrabold tracking-tight sm:text-2xl">
        Lanjut ke{" "}
        <span className="bg-gradient-to-r from-brand via-brand-light to-white bg-clip-text text-transparent">
          Chapter {chapterNumber}
        </span>
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Yura bantu pindah dalam{" "}
        <span className="font-semibold tabular-nums text-white">{seconds}</span>{" "}
        detik
      </p>

      {/* Progress: tipis, bergradien, dengan cahaya */}
      <div
        className="mt-5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Waktu menuju chapter berikutnya"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-dark via-brand to-brand-light shadow-[0_0_14px] shadow-brand/60"
          style={{
            width: go ? "100%" : "0%",
            transition: `width ${duration}ms linear`,
          }}
        />
      </div>

      {/* Aksi */}
      <div className="mt-5 flex w-full max-w-sm items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-xl bg-white/5 text-sm font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onNow}
          className="inline-flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-dark via-brand to-brand-light text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Lanjut sekarang
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
