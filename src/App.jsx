// src/App.jsx
import { Routes, Route, useLocation } from 'react-router-dom';

import BottomNav from './components/BottomNav';
import SiteFooter from './components/SiteFooter';

import Home from './pages/Home';
import Series from './pages/Series';
import Reader from './pages/Reader';
import NovelReader from './pages/NovelReader';

import SearchPage from './pages/Search';
import Explore from './pages/Explore';
import Library from './pages/Library';

import AnnouncementsPage from './pages/AnnouncementsPage';
import AnnouncementDetail from './pages/AnnouncementDetail';

import ApiGenerator from './pages/ApiGenerator';
import GeneratorPage from './pages/Generator'; // kalau masih dipakai

import NotFound from './pages/NotFound';

export default function App() {
  const loc = useLocation();

  // Semua route yang dianggap "reader mode"
  const isReader =
    loc.pathname.startsWith('/read/') ||    // reader komik
    loc.pathname.startsWith('/novel');      // reader novel

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-display">
      {/* MAIN CONTENT */}
      <main className="mx-auto w-full px-4 md:px-6 py-6 max-w-[1480px] 2xl:max-w-[1600px]">
        <Routes>
          {/* Halaman utama */}
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<Library />} />

          {/* Series & reader komik */}
          <Route path="/series/:slug" element={<Series />} />
          <Route path="/read/:chapterId" element={<Reader />} />

          {/* Reader novel */}
          <Route path="/novel/:slug/:cid?" element={<NovelReader />} />
          <Route path="/novel/:id" element={<NovelReader />} />

          {/* Pengumuman */}
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/announcement/:id" element={<AnnouncementDetail />} />

          {/* Generator / tools */}
          <Route path="/generator" element={<ApiGenerator />} />
          {/* Kalau GeneratorPage masih dipakai di route lain, tambahkan juga:
              <Route path="/generator-tools" element={<GeneratorPage />} />
          */}

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* BottomNav hanya di non-reader pages */}
      {!isReader && <BottomNav />}

      {/* Footer bisa dibuat lebih compact saat mode reader */}
      <SiteFooter compact={isReader} />
    </div>
  );
}
