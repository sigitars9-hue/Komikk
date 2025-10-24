// src/App.jsx
import { Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Series from './pages/Series';
import Reader from './pages/Reader';
import SearchPage from './pages/Search';
import Explore from './pages/Explore';
import Library from './pages/Library';
import NotFound from './pages/NotFound';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ApiGenerator from './pages/ApiGenerator';
import SiteFooter from './components/SiteFooter';

export default function App() {
  const loc = useLocation();
  const isReader = loc.pathname.startsWith('/read/');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-display">
      <main className="mx-auto w-full px-4 md:px-6 py-6 max-w-[1480px] 2xl:max-w-[1600px]">
        <Routes>
          <Route path="/generator" element={<ApiGenerator />} />
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<Library />} />
          <Route path="/series/:slug" element={<Series />} />
          <Route path="/read/:chapterId" element={<Reader />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isReader && <BottomNav />}

      {/* Footer baru: compact saat halaman reader */}
      <SiteFooter compact={isReader} />
    </div>
  );
}
