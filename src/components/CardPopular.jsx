import { Link } from 'react-router-dom';

const TYPE_FLAG = {
  manhwa: '🇰🇷', // Korea Selatan
  manga:  '🇯🇵', // Jepang
  manhua: '🇨🇳', // China
};

export default function CardPopular({ item }) {
  const typeKey = (item?.type || '').toLowerCase();
  const flag = TYPE_FLAG[typeKey] || null;

  return (
    <Link to={`/series/${item.slug}`} className="group block w-full" title={item.title}>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-white/10 bg-zinc-900 shadow-[0_14px_32px_rgba(0,0,0,.35)]">
        {/* Poster 130:200 seperti referensi */}
        <div className="aspect-[130/200] w-full">
          {item?.cover ? (
            <img
              src={item.cover}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-zinc-500 text-sm">
              No Image
            </div>
          )}
        </div>

        {/* gradient bawah agar teks terbaca saat hover */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

        {/* badge negara */}
        {flag && (
          <div
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full
                       bg-black/70 text-base ring-1 ring-white/15"
            title={item?.type}
          >
            <span aria-hidden>{flag}</span>
          </div>
        )}
      </div>

      {/* Judul (wajib tampil di Populer) */}
      <div className="mt-2 text-center">
        <div className="line-clamp-2 text-sm font-medium  leading-snug">{item.title}</div>
      </div>
    </Link>
  );
}
