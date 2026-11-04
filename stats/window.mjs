const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

export function computeWindow(now) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 11 + i, 1));
    return { key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`, label: MONTH_LABELS[d.getUTCMonth()], year: d.getUTCFullYear() };
  });
  const from = new Date(Date.UTC(year, month - 11, 1));
  const first = months[0];
  const last = months[11];
  return {
    from,
    to: new Date(now.getTime()),
    months: months.map(({ key, label }) => ({ key, label })),
    rangeLabel: `${first.label} ${first.year} – ${last.label} ${last.year}`,
    updated: `${year}-${pad(month + 1)}-${pad(now.getUTCDate())}`,
  };
}
