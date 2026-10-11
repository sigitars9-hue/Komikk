// src/pages/Generator.jsx  (Vite/React Router)
// atau app/generator/page.jsx (Next.js App Router)
import React, { useEffect, useMemo, useState } from 'react';

function makeSlug(s = '') {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SECRET =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUBMIT_SECRET) ||
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUBMIT_SECRET) ||
  '';

export default function GeneratorPage() {
  const [type, setType] = useState('series'); // 'series' | 'chapter' | 'announcement'
  const [mode, setMode] = useState('pr');     // 'pr' | 'direct'
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [cover, setCover] = useState('');
  const [authors, setAuthors] = useState('');
  const [genres, setGenres] = useState('');

  // khusus chapter
  const [seriesSlug, setSeriesSlug] = useState('');
  const [chapterSlug, setChapterSlug] = useState('');
  const [pages, setPages] = useState('');

  // khusus announcement
  const [annBody, setAnnBody] = useState('');
  const [annPublishedAt, setAnnPublishedAt] = useState('');

  // umum
  const [idempotencyKey, setIdempotencyKey] = useState(uid());
  const [commitMessage, setCommitMessage] = useState('');
  const [pathOverride, setPathOverride] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // auto generate slug dari title (sekali saat slug kosong)
  useEffect(() => {
    if (!slug && title) setSlug(makeSlug(title));
  }, [title]); // eslint-disable-line

  function buildPayload() {
    if (type === 'series') {
      if (!slug) throw new Error('Slug series wajib.');
      if (!title) throw new Error('Judul series wajib.');
      const data = {
        title: title || null,
        cover: cover || null,
        authors: authors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        genres: genres
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      return {
        type: 'series',
        slug,
        title,
        cover,
        data,
        mode,
        idempotencyKey,
        ...(commitMessage ? { commitMessage } : {}),
        ...(pathOverride ? { pathOverride } : {}),
      };
    }

    if (type === 'chapter') {
      if (!seriesSlug) throw new Error('seriesSlug wajib (slug series induk).');
      if (!chapterSlug) throw new Error('chapterSlug wajib.');
      const pageList = pages
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (pageList.length === 0) throw new Error('Minimal 1 halaman (URL) untuk chapter.');
      const data = {
        title: title || chapterSlug,
        pages: pageList,
      };
      return {
        type: 'chapter',
        slug: chapterSlug, // ikutkan untuk meta
        seriesSlug,
        chapterSlug,
        title: title || chapterSlug,
        data,
        mode,
        idempotencyKey,
        ...(commitMessage ? { commitMessage } : {}),
        ...(pathOverride ? { pathOverride } : {}),
      };
    }

    if (type === 'announcement') {
      const s = slug || makeSlug(title) || `announcement-${Date.now()}`;
      if (!title) throw new Error('Judul announcement wajib.');
      const data = {
        title,
        body: annBody || '',
        publishedAt: annPublishedAt || new Date().toISOString(),
      };
      return {
        type: 'announcement',
        slug: s,
        title,
        data,
        mode,
        idempotencyKey,
        ...(commitMessage ? { commitMessage } : {}),
        ...(pathOverride ? { pathOverride } : {}),
      };
    }

    throw new Error('Tipe tidak dikenal.');
  }

  async function submit() {
    setError('');
    setResult(null);
    let payload;
    try {
      payload = buildPayload();
    } catch (e) {
      setError(e.message || 'Validasi gagal.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-submit-secret': SECRET || '<ISI-SAAT-DEV>',
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setResult(json);
    } catch (e) {
      setError(e.message || 'Gagal submit.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle('');
    setSlug('');
    setCover('');
    setAuthors('');
    setGenres('');
    setSeriesSlug('');
    setChapterSlug('');
    setPages('');
    setAnnBody('');
    setAnnPublishedAt('');
    setCommitMessage('');
    setPathOverride('');
    setIdempotencyKey(uid());
    setResult(null);
    setError('');
  }

  const previewPayload = useMemo(() => {
    try {
      return JSON.stringify(buildPayload(), null, 2);
    } catch {
      return '// Lengkapi field wajib untuk melihat preview payload…';
    }
  }, [type, mode, title, slug, cover, authors, genres, seriesSlug, chapterSlug, pages, annBody, annPublishedAt, idempotencyKey, commitMessage, pathOverride]);

  return (
    <div style={{ maxWidth: 920, margin: '24px auto', padding: 16, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Generator → Submit → GitHub</h1>
      <p style={{ color: '#555', marginBottom: 16 }}>
        Isi data di bawah, lalu klik <b>Submit</b>. Mode default <code>PR</code> (aman).
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 16,
      }}>
        {/* BARIS 1: TIPE & MODE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Tipe Konten</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="series">Series</option>
              <option value="chapter">Chapter</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Mode Commit</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
              <option value="pr">PR (recommended)</option>
              <option value="direct">Direct to branch</option>
            </select>
          </div>
        </div>

        {/* FIELD UMUM (title, slug) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Judul</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth: Solo Leveling / Hotfix 25 Oct" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Slug (opsional utk announcement)</label>
            <input value={slug} onChange={(e) => setSlug(makeSlug(e.target.value))} placeholder="solo-leveling" style={inputStyle} />
          </div>
        </div>

        {/* KHUSUS SERIES */}
        {type === 'series' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Cover URL</label>
                <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://img.xx/cover.jpg" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Authors (pisahkan koma)</label>
                <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Chugong, Dubu" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Genres (pisahkan koma)</label>
              <input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Action, Fantasy" style={inputStyle} />
            </div>
          </>
        )}

        {/* KHUSUS CHAPTER */}
        {type === 'chapter' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Series Slug</label>
                <input value={seriesSlug} onChange={(e) => setSeriesSlug(makeSlug(e.target.value))} placeholder="solo-leveling" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Chapter Slug</label>
                <input value={chapterSlug} onChange={(e) => setChapterSlug(makeSlug(e.target.value))} placeholder="ch-001" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Halaman (URL per baris)</label>
              <textarea value={pages} onChange={(e) => setPages(e.target.value)} placeholder={'https://cdn.xx/001.jpg\nhttps://cdn.xx/002.jpg'} style={taStyle} rows={6} />
            </div>
          </>
        )}

        {/* KHUSUS ANNOUNCEMENT */}
        {type === 'announcement' && (
          <>
            <div>
              <label style={labelStyle}>Isi (Body)</label>
              <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Pengumuman…." style={taStyle} rows={4} />
            </div>
            <div>
              <label style={labelStyle}>Published At (ISO, opsional)</label>
              <input value={annPublishedAt} onChange={(e) => setAnnPublishedAt(e.target.value)} placeholder={new Date().toISOString()} style={inputStyle} />
            </div>
          </>
        )}

        {/* OPSIONAL */}
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>Opsi Lanjutan</summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>Idempotency Key</label>
              <input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Commit Message (opsional)</label>
              <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder="[generator] ..." style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Path Override (opsional)</label>
            <input value={pathOverride} onChange={(e) => setPathOverride(e.target.value)} placeholder="data/series/solo-leveling.json" style={inputStyle} />
          </div>
        </details>

        {/* PREVIEW PAYLOAD */}
        <div>
          <label style={labelStyle}>Preview Payload</label>
          <pre style={preStyle}>{previewPayload}</pre>
        </div>

        {/* AKSI */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={submit} disabled={loading} style={btnPrimary}>
            {loading ? 'Mengirim…' : 'Submit'}
          </button>
          <button onClick={resetForm} disabled={loading} style={btnGhost}>
            Reset
          </button>
        </div>

        {/* HASIL */}
        {error && <div style={errBox}>❌ {error}</div>}
        {result && (
          <div style={okBox}>
            <div>✅ Submit OK</div>
            {result.pr_url && (
              <div>
                PR: <a href={result.pr_url} target="_blank" rel="noreferrer">{result.pr_url}</a>
              </div>
            )}
            {result.html_url && (
              <div>
                File: <a href={result.html_url} target="_blank" rel="noreferrer">{result.html_url}</a>
              </div>
            )}
            {result.path && <div>Path: <code>{result.path}</code></div>}
            {result.branch && <div>Branch: <code>{result.branch}</code></div>}
            {result.skipped && <div>Info: <i>{result.reason || 'No changes'}</i></div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Styles kecil ───────── */
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 };
const inputStyle = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14 };
const taStyle = { ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' };
const preStyle = { background: '#0b1220', color: '#e6edf3', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 360, border: '1px solid #0f1b34' };
const btnPrimary = { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' };
const btnGhost = { background: 'transparent', color: '#0ea5e9', border: '1px solid #0ea5e9', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' };
const okBox = { background: '#ecfeff', border: '1px solid #a5f3fc', padding: 12, borderRadius: 8, color: '#0c4a6e' };
const errBox = { background: '#fff1f2', border: '1px solid #fecdd3', padding: 12, borderRadius: 8, color: '#9f1239' };
