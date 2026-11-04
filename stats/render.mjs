const THEMES = {
  light: { bg: '#ffffff', border: '#d0d7de', text: '#1f2328', muted: '#59636e', title: '#0969da', bar: '#2da44e', track: '#eff2f5' },
  dark: { bg: '#0d1117', border: '#3d444d', text: '#e6edf3', muted: '#9198a1', title: '#4493f8', bar: '#3fb950', track: '#151b23' },
};

const WIDTH = 480;
const PAD = 20;
const INNER = WIDTH - PAD * 2;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const CHART_HEIGHT = 70;
const BAR_GAP = 4;
const AXIS_LABEL_INDEXES = [0, 3, 6, 9, 11];
const LEGEND_FONT_SIZE = 12;
const MAX_LANGUAGE_NAME = 11;

const truncate = (name) => (name.length > MAX_LANGUAGE_NAME ? `${name.slice(0, MAX_LANGUAGE_NAME - 1)}…` : name);

const formatNumber = new Intl.NumberFormat('en-US').format;

const escapeXml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const round = (n) => Math.round(n * 100) / 100;

export function renderCard(card, theme) {
  const t = THEMES[theme];
  const parts = [];
  const text = (x, y, content, { size = 12, fill = t.muted, weight, anchor } = {}) =>
    parts.push(
      `<text x="${round(x)}" y="${round(y)}" font-size="${size}" fill="${fill}"${weight ? ` font-weight="${weight}"` : ''}${anchor ? ` text-anchor="${anchor}"` : ''}>${escapeXml(content)}</text>`,
    );

  text(PAD, 36, 'Last 12 months', { size: 16, fill: t.title, weight: 600 });
  text(PAD, 56, card.rangeLabel);

  const totals = [
    [card.totals.commits, 'commits'],
    [card.totals.prs, 'PRs opened'],
    [card.totals.reviews, 'PRs reviewed'],
    [card.totals.issues, 'issues'],
  ];
  const column = INNER / totals.length;
  totals.forEach(([value, label], i) => {
    text(PAD + i * column, 96, formatNumber(value), { size: 22, fill: t.text, weight: 600 });
    text(PAD + i * column, 114, label, { size: 11.5 });
  });

  const chartTop = 132;
  const chartBottom = chartTop + CHART_HEIGHT;
  const barWidth = (INNER - BAR_GAP * (card.monthly.length - 1)) / card.monthly.length;
  const max = Math.max(0, ...card.monthly);
  card.monthly.forEach((value, i) => {
    const x = PAD + i * (barWidth + BAR_GAP);
    const height = max > 0 && value > 0 ? Math.max(2, (value / max) * CHART_HEIGHT) : 0;
    parts.push(`<rect x="${round(x)}" y="${chartTop}" width="${round(barWidth)}" height="${CHART_HEIGHT}" rx="2" fill="${t.track}"/>`);
    parts.push(`<rect class="bar" x="${round(x)}" y="${round(chartBottom - height)}" width="${round(barWidth)}" height="${round(height)}" rx="2" fill="${t.bar}"/>`);
  });
  for (const i of AXIS_LABEL_INDEXES) {
    text(PAD + i * (barWidth + BAR_GAP) + barWidth / 2, chartBottom + 16, card.monthLabels[i], { size: 10.5, anchor: 'middle' });
  }

  let y = chartBottom + 36;
  if (card.languages.length === 0) {
    text(PAD, y + 8, 'No language data');
    y += 24;
  } else {
    parts.push(`<clipPath id="lang-bar"><rect x="${PAD}" y="${y}" width="${INNER}" height="8" rx="4"/></clipPath>`);
    parts.push('<g clip-path="url(#lang-bar)">');
    let x = PAD;
    for (const lang of card.languages) {
      const width = (lang.percent / 100) * INNER;
      parts.push(`<rect class="lang" x="${round(x)}" y="${y}" width="${round(width)}" height="8" fill="${escapeXml(lang.color)}"/>`);
      x += width;
    }
    parts.push('</g>');

    y += 30;
    card.languages.forEach((lang, i) => {
      const x = PAD + i * column;
      parts.push(`<circle cx="${round(x + 4)}" cy="${y - 4}" r="4" fill="${escapeXml(lang.color)}"/>`);
      text(x + 14, y, `${truncate(lang.name)} ${lang.percent}%`, { size: LEGEND_FONT_SIZE });
    });
    y += 12;
  }

  y += 18;
  text(WIDTH - PAD, y, `Includes private contributions · Updated ${card.updated}`, { size: 10.5, anchor: 'end' });
  const height = y + 16;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" font-family="${FONT}" role="img" aria-label="GitHub activity in the last 12 months">`,
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="6" fill="${t.bg}" stroke="${t.border}"/>`,
    ...parts,
    '</svg>',
    '',
  ].join('\n');
}
