import { useParams } from "react-router-dom";
import { ANNOUNCEMENTS } from "../data/announcements";

export default function AnnouncementDetail() {
  const { id } = useParams();

  const item = ANNOUNCEMENTS.find(x => String(x.id) === String(id));

  if (!item) return <div className="text-center py-20">Pengumuman tidak ditemukan.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
      <p className="text-zinc-400 text-sm mb-6">{item.createdAt}</p>

      <img
        src={item.avatar}
        alt=""
        className="w-24 h-24 rounded-xl object-cover mb-6"
      />

      <p className="whitespace-pre-line">
        {item.content}
      </p>
    </div>
  );
}
