const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function getRating(item) {
  return num(item?.stats?.rating ?? item?.rating);
}

// period: 'daily' | 'weekly' | 'all'
export function getViews(item, period = 'all') {
  const s = item?.stats || {};
  const total = s.views ?? item?.views;

  if (period === 'daily') return num(s.viewsDaily ?? s.views_daily ?? item?.viewsDaily ?? total);
  if (period === 'weekly') return num(s.viewsWeekly ?? s.views_weekly ?? item?.viewsWeekly ?? total);
  return num(total);
}

// Populer: views tertinggi, seri -> rating tertinggi
export function sortByViews(list = [], period = 'all') {
  return [...list].sort(
    (a, b) => getViews(b, period) - getViews(a, period) || getRating(b) - getRating(a)
  );
}

// Rekomendasi: rating tertinggi, seri -> views tertinggi
export function sortByRating(list = []) {
  return [...list].sort(
    (a, b) => getRating(b) - getRating(a) || getViews(b) - getViews(a)
  );
}

export function formatCount(n) {
  n = num(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}