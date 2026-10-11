// src/components/Card.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { List } from "lucide-react";
import LatestChaptersPopup from "./LatestChaptersPopup";

export default function Card({ item, hideTitle = false }) {
  const [openChapters, setOpenChapters] = useState(false);

  const togglePopup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenChapters((v) => !v);
  };

  const closePopup = () => setOpenChapters(false);

  return (
    <div className="relative">
      {/* ✅ Link hanya untuk card visual */}
      <Link
        to={`/series/${item.slug}`}
        className="group block w-full"
        title={item.title}
        onClick={() => {
          if (openChapters) setOpenChapters(false);
        }}
      >
        <div className="relative overflow-visible">
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

            {/* tombol popup */}
            <button
              type="button"
              onClick={togglePopup}
              onPointerDown={(e) => {
                // ✅ penting untuk mobile
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                // ✅ penting untuk mobile
                e.preventDefault();
                e.stopPropagation();
              }}
              className="
                absolute top-2 right-2 z-20
                w-8 h-8 rounded-full
                bg-black/60 hover:bg-black/70
                ring-1 ring-white/15
                inline-flex items-center justify-center
                backdrop-blur
              "
              title="Lihat 3 chapter terakhir"
            >
              <List className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {!hideTitle && (
          <div className="mt-1.5 text-center">
            <div className="line-clamp-2 text-sm font-medium leading-snug">
              {item.title}
            </div>
          </div>
        )}
      </Link>

      {/* opup ditempatkan DI LUAR Link */}
<LatestChaptersPopup
  slug={item?.slug}
  title={item?.title}
  format={item?.format}
  type={item?.type}
  tags={item?.tags}
  open={openChapters}
  onClose={closePopup}
  anchor="right"
/>

    </div>
  );
}
