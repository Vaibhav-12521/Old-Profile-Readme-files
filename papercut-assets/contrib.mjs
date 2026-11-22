// Builds paper-cut contribution graphs (7 days, 30 days, all time) from the public GitHub calendar.
// No token needed. Run: node papercut-assets/contrib.mjs   (the GitHub Action runs it daily)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = process.env.GH_USER || "Vaibhav-12521";
const SINCE_YEAR = 2024; // account created Sep 2024
const OUT = dirname(fileURLToPath(import.meta.url));
const FONT = `'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif`;
const C = { paper: "#f6efe3", white: "#fffaf2", mustard: "#e9c46a", orange: "#f4a261", coral: "#e76f51", teal: "#2a9d8f", deep: "#264653", ink: "#1f2d33", muted: "#6b5a48" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------- data ---------- */
async function year(y) {
  const res = await fetch(`https://github.com/users/${USER}/contributions?from=${y}-01-01&to=${y}-12-31`, { headers: { "User-Agent": "papercut-readme" } });
  if (!res.ok) throw new Error(`GitHub calendar ${y}: HTTP ${res.status}`);
  const html = await res.text();
  const dates = new Map();
  for (const m of html.matchAll(/<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="([^"]+)"/g)) dates.set(m[2], m[1]);
  for (const m of html.matchAll(/<td[^>]*id="([^"]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"/g)) dates.set(m[1], m[2]);
  const days = {};
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const date = dates.get(m[1]);
    if (!date) continue;
    const n = /^(\d+) contribution/.exec(m[2].trim());
    days[date] = n ? Number(n[1]) : 0;
  }
  if (!Object.keys(days).length) throw new Error(`No contribution days parsed for ${y}`);
  return days;
}

const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmt = (n) => n.toLocaleString("en-US");

/* ---------- chart ---------- */
// points: [{ x: label, sub?: label, v: number, label?: boolean }]
function chart({ title, points, stats, w, h, font, xEvery, file, labelAll }) {
  const padL = Math.round(w * 0.06), padR = Math.round(w * (w < 800 ? 0.07 : 0.045)), top = Math.round(h * 0.34), bottom = Math.round(h * 0.17);
  const plotW = w - padL - padR, plotH = h - top - bottom;
  const max = Math.max(1, ...points.map((p) => p.v));
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const X = (i) => padL + i * step;
  const Y = (v) => top + plotH - (v / max) * plotH;
  const base = top + plotH;

  // Smooth path through points (monotone-ish cubic), so it reads like cut paper rather than a spreadsheet line.
  const pts = points.map((p, i) => [X(i), Y(p.v)]);
  let line = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    line += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  const area = `${line} L ${pts.at(-1)[0]} ${base} L ${pts[0][0]} ${base} Z`;
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="${padL}" x2="${w - padR}" y1="${top + plotH - f * plotH}" y2="${top + plotH - f * plotH}" stroke="${C.muted}" stroke-opacity=".14" stroke-dasharray="4 6"/>`).join("");

  const grow = `<animateTransform attributeName="transform" type="scale" from="1 0" to="1 1" dur="1.1s" fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1" keyTimes="0;1"/>`;
  const layer = (dy, col, op = 1) => `<g transform="translate(0 ${base})"><g>${grow}<g transform="translate(0 ${-base + dy})" filter="url(#sh)"><path d="${area}" fill="${col}" opacity="${op}"/></g></g></g>`;

  const labels = points.map((p, i) => {
    const show = labelAll || p.label;
    const [x, y] = pts[i];
    const delay = (0.6 + i * (1.2 / points.length)).toFixed(2);
    const pop = `<animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur=".3s" fill="freeze"/>`;
    const dot = p.v > 0 || show
      ? `<g opacity="0">${pop}<circle cx="${x}" cy="${y}" r="${font * 0.42}" fill="${C.white}" stroke="${C.deep}" stroke-width="${font * 0.16}"/></g>`
      : `<g opacity="0">${pop}<circle cx="${x}" cy="${y}" r="${font * 0.22}" fill="${C.deep}" opacity=".35"/></g>`;
    if (!show) return dot;
    const txt = fmt(p.v), tw = txt.length * font * 0.62 + font * 0.9, th = font * 1.45;
    const ty = Math.max(y - font * 1.1 - th, top - th - 4);
    return `${dot}<g opacity="0">${pop}<g filter="url(#shs)"><rect x="${x - tw / 2}" y="${ty}" width="${tw}" height="${th}" rx="${font * 0.3}" fill="${p.v === max ? C.coral : C.white}"/></g><text x="${x}" y="${ty + th * 0.7}" text-anchor="middle" font-family="${FONT}" font-size="${font}" font-weight="800" fill="${p.v === max ? C.white : C.deep}">${txt}</text></g>`;
  }).join("\n  ");

  const last = points.length - 1;
  const xlabels = points.map((p, i) => ((i % xEvery === 0 && last - i >= (xEvery === 1 ? 1 : Math.max(2, xEvery / 2))) || i === last)
    ? `<text x="${X(i)}" y="${base + font * 1.5}" text-anchor="${i === last && points.length > 8 ? "end" : "middle"}" font-family="${FONT}" font-size="${font * 0.85}" font-weight="700" fill="${C.deep}">${esc(p.x)}</text>${p.sub ? `<text x="${X(i)}" y="${base + font * 2.6}" text-anchor="${i === last && points.length > 8 ? "end" : "middle"}" font-family="${FONT}" font-size="${font * 0.72}" fill="${C.muted}">${esc(p.sub)}</text>` : ""}`
    : "").join("");

  const statW = (w - padL - padR) / stats.length;
  const statRow = stats.map(([k, v], i) => `<text x="${padL + statW * i}" y="${h * 0.2}" font-family="${FONT}" font-size="${font * 1.55}" font-weight="800" fill="${i === 0 ? C.coral : C.deep}">${esc(v)}</text><text x="${padL + statW * i}" y="${h * 0.2 + font * 1.2}" font-family="${FONT}" font-size="${font * 0.8}" fill="${C.muted}">${esc(k)}</text>`).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}: ${esc(stats.map(([k, v]) => `${v} ${k}`).join(", "))}">
  <defs>
    <filter id="sh" x="-5%" y="-20%" width="110%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#3b2a1a" flood-opacity=".28"/></filter>
    <filter id="shs" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3b2a1a" flood-opacity=".3"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .08 0"/></filter>
    <clipPath id="card"><rect width="${w}" height="${h}" rx="22"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <text x="${w - padR}" y="${h * 0.09}" text-anchor="end" font-family="${FONT}" font-size="${font * 0.9}" font-weight="800" fill="${C.teal}" letter-spacing="1.5">${esc(title.toUpperCase())}</text>
    ${statRow}
    ${grid}
    ${layer(-16, C.mustard)}
    ${layer(-8, C.orange)}
    ${layer(0, C.coral, 0.92)}
    <path d="${line}" fill="none" stroke="${C.deep}" stroke-width="${font * 0.16}" stroke-linecap="round" stroke-dasharray="4000" stroke-dashoffset="4000"><animate attributeName="stroke-dashoffset" from="4000" to="0" dur="1.6s" begin=".3s" fill="freeze"/></path>
    ${labels}
    ${xlabels}
    <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </g>
</svg>
`;
  writeFileSync(join(OUT, file), svg);
}

/* ---------- build ---------- */
const all = {};
const thisYear = Number(todayIST().slice(0, 4));
for (let y = SINCE_YEAR; y <= thisYear; y++) Object.assign(all, await year(y));
const today = todayIST();
const dates = Object.keys(all).filter((d) => d <= today).sort();
const firstActive = dates.find((d) => all[d] > 0) ?? dates[0];
const series = dates.filter((d) => d >= firstActive).map((d) => ({ d, v: all[d] }));

const dayPoint = (d, v) => {
  const dt = new Date(`${d}T12:00:00Z`);
  return { x: `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`, sub: DAYS[dt.getUTCDay()], v };
};
const sum = (a) => a.reduce((t, p) => t + p.v, 0);
const best = (a) => a.reduce((b, p) => (p.v > b.v ? p : b), a[0]);

function spacedPeaks(values, count, gap = 3) {
  const order = values.map((v, i) => [v, i]).filter(([v]) => v > 0).sort((a, b) => b[0] - a[0]);
  const picked = [];
  for (const [, i] of order) if (picked.length < count && picked.every((j) => Math.abs(j - i) >= gap)) picked.push(i);
  return new Set(picked);
}

function range(n) {
  const slice = series.slice(-n);
  const pts = slice.map((p) => dayPoint(p.d, p.v));
  const total = sum(slice), active = slice.filter((p) => p.v > 0).length, top = best(slice);
  return { slice, pts, total, active, top };
}

// 7 days
{
  const r = range(7);
  const stats = [["contributions", fmt(r.total)], ["active days", `${r.active}/7`], ["best day", fmt(r.top.v)]];
  for (const [file, w, h, font] of [["contrib-7d.svg", 1200, 420, 22], ["contrib-7d-mobile.svg", 600, 460, 22]]) {
    chart({ title: "Last 7 days", points: r.pts.map((p) => ({ ...p, sub: p.sub })), stats, w, h, font, xEvery: 1, file, labelAll: true });
  }
}
// 30 days
{
  const r = range(30);
  const stats = [["contributions", fmt(r.total)], ["active days", `${r.active}/30`], ["best day", fmt(r.top.v)]];
  const desk = r.pts.map((p) => ({ ...p, sub: undefined, label: p.v > 0 }));
  const peaks = spacedPeaks(r.slice.map((p) => p.v), 5, 2);
  const mob = r.pts.map((p, i) => ({ ...p, sub: undefined, label: peaks.has(i) }));
  chart({ title: "Last 30 days", points: desk, stats, w: 1200, h: 420, font: 18, xEvery: 5, file: "contrib-30d.svg" });
  chart({ title: "Last 30 days", points: mob, stats, w: 600, h: 460, font: 20, xEvery: 10, file: "contrib-30d-mobile.svg" });
}
// All time, grouped by month
{
  const months = new Map();
  for (const p of series) months.set(p.d.slice(0, 7), (months.get(p.d.slice(0, 7)) ?? 0) + p.v);
  const keys = [...months.keys()];
  const pts = keys.map((k) => {
    const [y, m] = k.split("-").map(Number);
    return { x: MONTHS[m - 1], sub: m === 1 || k === keys[0] ? String(y) : undefined, v: months.get(k) };
  });
  const total = sum(series), activeDays = series.filter((p) => p.v > 0).length, topMonth = best(pts.map((p, i) => ({ ...p, i })));
  const stats = [["total contributions", fmt(total)], ["active days", fmt(activeDays)], ["best month", `${topMonth.x} ${keys[topMonth.i].slice(0, 4)}`]];
  const peaks = spacedPeaks(pts.map((p) => p.v), 4, 3);
  chart({ title: "All time", points: pts.map((p) => ({ ...p, label: p.v > 0 })), stats, w: 1200, h: 420, font: 16, xEvery: 1, file: "contrib-all.svg" });
  chart({
    title: "All time",
    points: pts.map((p, i) => ({ ...p, label: peaks.has(i) || (i === pts.length - 1 && ![...peaks].some((j) => pts.length - 1 - j < 3)), sub: p.sub })),
    stats: [["total", fmt(total)], ["active days", fmt(activeDays)], ["best month", `${topMonth.x} '${keys[topMonth.i].slice(2, 4)}`]],
    w: 600, h: 460, font: 20, xEvery: Math.ceil(pts.length / 6), file: "contrib-all-mobile.svg",
  });
  console.log(`total ${total} since ${firstActive}, ${keys.length} months, last 7 days ${sum(series.slice(-7))}, last 30 days ${sum(series.slice(-30))}`);
}
