      {/* ── Komentar per chapter ── */}
      {chapterKey && (
        <div className="mt-6 px-4 sm:px-6 md:px-8 pb-10">
          {/* Rules, reaksi, input, dan daftar komentar semuanya ada di dalam CommentsSection */}
          <CommentsSection
            chapterId={String(current?.id || current?.number || `${slug}-${cid}`)}
            isAuthor={false}
          />

          {/* ── Banner Auto Next Chapter: di bawah komentar ── */}
          {nextPending && next && (
            <div className="mt-8 flex justify-center">
              <div
                className="
                  w-full max-w-[960px]
                  rounded-3xl bg-zinc-950/90 ring-1 ring-white/10 shadow-xl
                  px-4 sm:px-6 py-5 sm:py-6
                "
              >
                <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
                  {/* Gambar Yura */}
                  <div className="flex items-center justify-center">
                    <img
                      src="/yura-next-ch.png"
                      alt="Yura"
                      className="w-40 sm:w-44 h-auto shadow-lg"
                      draggable={false}
                    />
                  </div>

                  {/* Teks */}
                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-semibold">
                      Sebentar, Yura bantu pindah ke chapter selanjutnya ya kak
                    </p>
                    <p className="text-[11px] sm:text-xs text-zinc-400">
                      Auto lanjut ke{" "}
                      <span className="font-semibold">Chapter {next.number}</span>{" "}
                      dalam{" "}
                      <span className="font-semibold">
                        {Math.ceil(nextCountdown || 0)}
                      </span>{" "}
                      detik…
                    </p>
                  </div>
                </div>

                {/* Progress bar 5 detik */}
                <div className="mt-4 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-brand transition-[width] duration-200 ease-out"
                    style={{
                      width: `${
                        ((AUTO_NEXT_DELAY / 1000 - nextCountdown) /
                          (AUTO_NEXT_DELAY / 1000)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
