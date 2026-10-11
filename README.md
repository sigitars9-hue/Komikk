
# GV Comics (Vite + React + Tailwind)

Minimal starter yang sudah siap untuk:
- Top bar
- Slider + Pengumuman
- Rekomendasi
- Update terbaru (Latest)
- Halaman Profil Komik
- Daftar Chapter
- Reading Page
- Routing (react-router-dom)

## Jalankan
```bash
npm i
npm run dev
```

> Opsional: buat file `.env` di root untuk mengubah base API:
```env
VITE_API_BASE=https://hororest-api.vercel.app
```

### Adaptasi Endpoint
File `src/lib/api.js` berperan sebagai **adapter**. Jika rute API berbeda,
cukup sesuaikan fungsi `fetch*` di sana tanpa menyentuh komponen UI.
