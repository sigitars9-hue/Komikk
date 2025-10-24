export default function SiteFooter({ compact = false }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 py-10 text-center">
      <div className="space-y-3">
        {/* Logo */}
        <div className="text-2xl font-extrabold">
          GV<span className="text-brand">Comics</span>
        </div>

        {/* Deskripsi */}
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Baca komik favoritmu dengan pengalaman yang cepat, bersih,
          dan nyaman.
        </p>

        {/* Sosial media */}
        <div className="flex justify-center gap-3 pt-3">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-9 h-9 rounded-full bg-zinc-900 ring-1 ring-white/10 hover:bg-zinc-800 grid place-items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2C6.48 2 2 6.48 2 12a9.996 9.996 0 006.84 9.47c.5.09.68-.22.68-.48v-1.68c-2.78.6-3.37-1.34-3.37-1.34-.45-1.17-1.1-1.48-1.1-1.48-.9-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02A9.59 9.59 0 0112 6.84c.85.01 1.7.11 2.5.32 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.41.1 2.66.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.68.93.68 1.87v2.77c0 .26.18.58.69.48A10.004 10.004 0 0022 12c0-5.52-4.48-10-10-10z"
              />
            </svg>
          </a>
          <a
            href="https://twitter.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-9 h-9 rounded-full bg-zinc-900 ring-1 ring-white/10 hover:bg-zinc-800 grid place-items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-5 h-5"
            >
              <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.26 4.26 0 001.88-2.36 8.44 8.44 0 01-2.68 1.03 4.22 4.22 0 00-7.19 3.85A12 12 0 013 4.77a4.22 4.22 0 001.31 5.63 4.22 4.22 0 01-1.91-.53v.05a4.23 4.23 0 003.38 4.13 4.24 4.24 0 01-1.9.07 4.23 4.23 0 003.95 2.94A8.47 8.47 0 012 19.54a12 12 0 006.5 1.91c7.8 0 12.07-6.47 12.07-12.07l-.01-.55A8.65 8.65 0 0022.46 6z" />
            </svg>
          </a>
          <a
            href="mailto:hello@gvcomics.example"
            className="inline-flex w-9 h-9 rounded-full bg-zinc-900 ring-1 ring-white/10 hover:bg-zinc-800 grid place-items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75l-9.75 6.75-9.75-6.75M3 6.75h18A2.25 2.25 0 0123.25 9v10.5A2.25 2.25 0 0121 21.75H3A2.25 2.25 0 01.75 19.5V9a2.25 2.25 0 012.25-2.25z"
              />
            </svg>
          </a>
        </div>

        {/* Credit */}
        <p className="text-xs text-zinc-600 pt-5">
          © {year} GV Comics
        </p>
      </div>
    </footer>
  );
}
