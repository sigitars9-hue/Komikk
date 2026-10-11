// src/components/AnimeCursorSparkle.jsx
import { useEffect } from 'react';

export default function AnimeCursorSparkle({
  sprite = '/pointer/cursor.png', // pastikan file ada di /public/pointer/
  sizeDesktop = 28,               // ukuran desktop (px)
  sizeMobile = 22,                // ukuran mobile (px)
  particles = 16,
  particleSize = [3, 6],
  colors = ['#67e8f9', '#60a5fa', '#f472b6', '#a78bfa'],
  lifeMs = [350, 700],
  speed = [0.6, 1.4],
  blur = true,
  zIndex = 9999,
  hideOnMobile = true,
  hotspot = { x: 0.35, y: 0.65 }, // offset titik klik relatif ke size
} = {}) {
  useEffect(() => {
    const isTouch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReduce =
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if ((hideOnMobile && isTouch) || prefersReduce) return;

    // Tentukan size berdasarkan viewport
    const isMobile = window.innerWidth < 768;
    const size = isMobile ? sizeMobile : sizeDesktop;

    // ── PRELOAD sprite ──
let cancelled = false;
let stop = null; // ⬅️ buat nyimpen cleanup dari start()

const pre = new Image();
pre.decoding = 'async';
pre.referrerPolicy = 'no-referrer';

pre.onload = () => {
  if (cancelled) return;
  stop = start(); // ⬅️ simpan cleanup
};

pre.onerror = () => {
  console.warn('[AnimeCursorSparkle] sprite not found:', sprite);
  if (cancelled) return;
  // tetap jalankan efek supaya event listener & partikel tetap ada
  stop = start();
};

pre.src = sprite;


    function start() {
      // ── Cursor sprite ──
      const cursor = document.createElement('img');
      cursor.src = sprite;
      cursor.alt = ''; // kosong supaya tidak ada teks alt saat 404
      cursor.draggable = false;
      Object.assign(cursor.style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-9999px,-9999px)',
        pointerEvents: 'none',
        zIndex: String(zIndex),
        willChange: 'transform',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))',
      });
      document.body.appendChild(cursor);

      // ── Layer partikel ──
      const layer = document.createElement('div');
      Object.assign(layer.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: String(zIndex - 1),
        overflow: 'hidden',
      });
      document.body.appendChild(layer);

      // Pool partikel
      const pool = [];
      const active = new Set();
      const state = new Map();

      const rand = (a, b) => a + Math.random() * (b - a);
      const pick = (arr) => arr[(Math.random() * arr.length) | 0];

      function getDot() {
        if (pool.length) return pool.pop();
        const dot = document.createElement('div');
        Object.assign(dot.style, {
          position: 'fixed',
          left: '0px',
          top: '0px',
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          mixBlendMode: 'screen',
        });
        if (blur) dot.style.filter = 'blur(0.3px)';
        layer.appendChild(dot);
        return dot;
      }

      let rafId = 0;
      let last = performance.now();
      const animate = (now) => {
        const dt = Math.min(32, now - last);
        last = now;

        state.forEach((s, dot) => {
          s.t += dt;
          const p = Math.min(1, s.t / s.life);
          const ease = 1 - (1 - p) * (1 - p);
          s.x += s.vx * (dt * 0.06);
          s.y += s.vy * (dt * 0.06);

          dot.style.transform = `translate(${s.x}px, ${s.y}px) scale(${1 - p * 0.4})`;
          dot.style.opacity = String(1 - ease);

          if (s.t >= s.life) {
            dot.style.opacity = '0';
            active.delete(dot);
            state.delete(dot);
            pool.push(dot);
          }
        });

        rafId = requestAnimationFrame(animate);
      };

      function spawn(x, y) {
        if (active.size >= particles) return;
        const dot = getDot();
        active.add(dot);

        const ps = rand(particleSize[0], particleSize[1]);
        dot.style.width = `${ps}px`;
        dot.style.height = `${ps}px`;
        dot.style.background = pick(colors);

        const ang = rand(0, Math.PI * 2);
        const spd = rand(speed[0], speed[1]);
        const vx = Math.cos(ang) * spd;
        const vy = Math.sin(ang) * spd;

        const x0 = x + rand(-2, 2);
        const y0 = y + rand(-2, 2);
        dot.style.transform = `translate(${x0}px, ${y0}px)`;
        dot.style.opacity = '1';

        state.set(dot, { x: x0, y: y0, vx, vy, t: 0, life: rand(lifeMs[0], lifeMs[1]) });
      }

      const move = (e) => {
        const x = e.clientX;
        const y = e.clientY;
        // offset hotspot agar “titik klik” terasa tepat
        cursor.style.transform =
          `translate(${x - size * hotspot.x}px, ${y - size * hotspot.y}px)`;
        spawn(x, y);
        if (Math.random() > 0.6) spawn(x, y);
      };

      const leave = () => {
        cursor.style.transform = 'translate(-9999px,-9999px)';
      };

      window.addEventListener('mousemove', move, { passive: true });
      window.addEventListener('mouseleave', leave, { passive: true });

      last = performance.now();
      rafId = requestAnimationFrame(animate);

      // cleanup
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseleave', leave);
        try { cursor.remove(); } catch {}
        try { layer.remove(); } catch {}
      };
    }

return () => {
  cancelled = true;
  if (typeof stop === 'function') {
    stop(); // ⬅️ bersihkan cursor, layer, event listener, raf
  }
};

  }, [
    sprite, sizeDesktop, sizeMobile, particles, particleSize, colors,
    lifeMs, speed, blur, zIndex, hideOnMobile, hotspot.x, hotspot.y
  ]);

  return null;
}
