// src/components/Card.jsx
import { Link } from 'react-router-dom'

export default function Card({ item, hideTitle = false }) {
  return (
    <Link to={`/series/${item.slug}`} className="group block w-full" title={item.title}>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-white/10 bg-zinc-900">
        <div className="aspect-[130/200] w-full">
          {item.cover ? (
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
      </div>

      {/* judul hanya jika tidak disembunyikan */}
      {!hideTitle && (
        <div className="mt-1.5 text-center">
          <div className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</div>
        </div>
      )}
    </Link>
  )
}
