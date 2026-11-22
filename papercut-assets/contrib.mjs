// Builds the paper-cut contribution graph from the public GitHub calendar (no token needed).
//  - papercut-assets/contrib.svg (+ -mobile): one card with 7 Days / 30 Days / All Time tabs that switch on their own
//  - docs/contrib.json: data for the interactive page (docs/index.html) with clickable tabs and hover tooltips
// Run: node papercut-assets/contrib.mjs   (the GitHub Action runs it daily)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = process.env.GH_USER || "Vaibhav-12521";
const SINCE_YEAR = 2024;
const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, "..", "docs");
const FONT = `'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif`;
const C = { paper: "#f6efe3", white: "#fffaf2", mustard: "#e9c46a", orange: "#f4a261", coral: "#e76f51", teal: "#2a9d8f", deep: "#264653", ink: "#1f2d33", muted: "#6b5a48" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmt = (n) => n.toLocaleString("en-US");

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

/* ---------- one chart, drawn into a box ---------- */
function spacedPeaks(values, count, gap) {
  const order = values.map((v, i) => [v, i]).filter(([v]) => v > 0).sort((a, b) => b[0] - a[0]);
  const picked = [];
  for (const [, i] of order) if (picked.length < count && picked.every((j) => Math.abs(j - i) >= gap)) picked.push(i);
  return new Set(picked);
}

function chartGroup({ points, stats, x0, y0, w, h, font, xEvery }) {
  const padL = w * 0.06, padR = w * (w < 800 ? 0.08 : 0.05);
  const statsY = y0 + font * 2.2, top = y0 + font * 6.2, base = y0 + h - font * 3;
  const plotW = w - padL - padR, plotH = base - top;
  const max = Math.max(1, ...points.map((p) => p.v));
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const X = (i) => x0 + padL + i * step;
  const Y = (v) => top + plotH - (v / max) * plotH;
  const pts = points.map((p, i) => [X(i), Y(p.v)]);
  let line = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [xa, ya] = pts[i - 1], [xb, yb] = pts[i], mx = (xa + xb) / 2;
    line += ` C ${mx} ${ya}, ${mx} ${yb}, ${xb} ${yb}`;
  }
  const area = `${line} L ${pts.at(-1)[0]} ${base} L ${pts[0][0]} ${base} Z`;
  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<line x1="${x0 + padL}" x2="${x0 + w - padR}" y1="${base - f * plotH}" y2="${base - f * plotH}" stroke="${C.muted}" stroke-opacity=".14" stroke-dasharray="4 6"/>`).join("");
  const layers = [[-16, C.mustard, 1], [-8, C.orange, 1], [0, C.coral, 0.92]].map(([dy, col, op]) => `<g transform="translate(0 ${dy})" filter="url(#sh)"><path d="${area}" fill="${col}" opacity="${op}"/></g>`).join("");

  const marks = points.map((p, i) => {
    const [x, y] = pts[i];
    const dot = p.v > 0 || p.label
      ? `<circle cx="${x}" cy="${y}" r="${font * 0.42}" fill="${C.white}" stroke="${C.deep}" stroke-width="${font * 0.16}"/>`
      : `<circle cx="${x}" cy="${y}" r="${font * 0.22}" fill="${C.deep}" opacity=".35"/>`;
    if (!p.label) return dot;
    const txt = fmt(p.v), tw = txt.length * font * 0.62 + font * 0.9, th = font * 1.45;
    const ty = Math.max(y - font * 1.1 - th, top - th - 6);
    const hot = p.v === max;
    return `${dot}<g filter="url(#shs)"><rect x="${x - tw / 2}" y="${ty}" width="${tw}" height="${th}" rx="${font * 0.3}" fill="${hot ? C.coral : C.white}"/></g><text x="${x}" y="${ty + th * 0.7}" text-anchor="middle" font-size="${font}" font-weight="800" fill="${hot ? C.white : C.deep}">${txt}</text>`;
  }).join("");

  const last = points.length - 1;
  const xl = points.map((p, i) => {
    if (!((i % xEvery === 0 && last - i >= (xEvery === 1 ? 1 : Math.max(2, xEvery / 2))) || i === last)) return "";
    const anchor = i === last && points.length > 8 ? "end" : "middle";
    return `<text x="${X(i)}" y="${base + font * 1.5}" text-anchor="${anchor}" font-size="${font * 0.85}" font-weight="700" fill="${C.deep}">${esc(p.x)}</text>${p.sub ? `<text x="${X(i)}" y="${base + font * 2.55}" text-anchor="${anchor}" font-size="${font * 0.72}" fill="${C.muted}">${esc(p.sub)}</text>` : ""}`;
  }).join("");

  const sw = plotW / stats.length;
  const statRow = stats.map(([k, v], i) => `<text x="${x0 + padL + sw * i}" y="${statsY + font * 0.6}" font-size="${font * 1.55}" font-weight="800" fill="${i === 0 ? C.coral : C.deep}">${esc(v)}</text><text x="${x0 + padL + sw * i}" y="${statsY + font * 1.85}" font-size="${font * 0.8}" fill="${C.muted}">${esc(k)}</text>`).join("");

  return `${statRow}${grid}${layers}<path d="${line}" fill="none" stroke="${C.deep}" stroke-width="${font * 0.16}" stroke-linecap="round"/>${marks}${xl}`;
}

/* ---------- the card with self-switching tabs ---------- */
function tabbedCard({ ranges, w, h, font, tabW, tabH, tabsX, tabsY, title, titleY, period = 5 }) {
  const n = ranges.length, T = period * n, f = 0.4 / T;
  const kt = (k) => [k / n, (k + 1) / n];
  // visibility of range k across one full cycle (0.4 s cross-fades)
  const vis = (k) => {
    const [a, b] = kt(k);
    if (k === 0) return { values: "1;1;0;0;1", keyTimes: `0;${(b - f).toFixed(4)};${b.toFixed(4)};${(1 - f).toFixed(4)};1` };
    if (k === n - 1) return { values: "0;0;1;1;0", keyTimes: `0;${(a - f).toFixed(4)};${a.toFixed(4)};${(1 - f).toFixed(4)};1` };
    return { values: "0;0;1;1;0;0", keyTimes: `0;${(a - f).toFixed(4)};${a.toFixed(4)};${(b - f).toFixed(4)};${b.toFixed(4)};1` };
  };
  const anim = (attr, k, on, off) => {
    const v = vis(k);
    return `<animate attributeName="${attr}" values="${v.values.split(";").map((x) => (x === "1" ? on : off)).join(";")}" keyTimes="${v.keyTimes}" dur="${T}s" repeatCount="indefinite"/>`;
  };
  const tabX = (k) => tabsX + k * (tabW + 10);
  const pillKeys = [0], pillVals = [tabX(0)];
  for (let k = 0; k < n; k++) {
    const b = kt(k)[1];
    pillKeys.push(+(b - f).toFixed(4), +b.toFixed(4));
    pillVals.push(tabX(k), tabX((k + 1) % n));
  }
  pillKeys[pillKeys.length - 1] = 1;

  const tabs = ranges.map((r, k) => `<g filter="url(#shs)"><rect x="${tabX(k)}" y="${tabsY}" width="${tabW}" height="${tabH}" rx="${tabH / 2}" fill="${C.white}"/></g>`).join("");
  const pill = `<g filter="url(#shs)"><rect x="${tabX(0)}" y="${tabsY}" width="${tabW}" height="${tabH}" rx="${tabH / 2}" fill="${C.coral}"><animate attributeName="x" values="${pillVals.join(";")}" keyTimes="${pillKeys.join(";")}" dur="${T}s" repeatCount="indefinite"/></rect></g>`;
  const labels = ranges.map((r, k) => `<text x="${tabX(k) + tabW / 2}" y="${tabsY + tabH * 0.66}" text-anchor="middle" font-size="${font * 0.95}" font-weight="800" fill="${k === 0 ? C.white : C.deep}">${anim("fill", k, C.white, C.deep)}${esc(r.tab)}</text>`).join("");
  const progress = `<rect x="${tabsX}" y="${tabsY + tabH + 10}" height="4" rx="2" width="0" fill="${C.teal}" opacity=".7"><animate attributeName="width" values="0;${n * tabW + (n - 1) * 10}" dur="${period}s" repeatCount="indefinite"/></rect>`;
  const charts = ranges.map((r, k) => `<g opacity="${k === 0 ? 1 : 0}">${anim("opacity", k, "1", "0")}${r.body}</g>`).join("\n    ");
  const label = ranges.map((r) => `${r.tab}: ${r.summary}`).join("; ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`GitHub contributions. ${label}`)}">
  <defs>
    <filter id="sh" x="-5%" y="-20%" width="110%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#3b2a1a" flood-opacity=".28"/></filter>
    <filter id="shs" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3b2a1a" flood-opacity=".3"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .08 0"/></filter>
    <clipPath id="card"><rect width="${w}" height="${h}" rx="22"/></clipPath>
  </defs>
  <g clip-path="url(#card)" font-family="${FONT}">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    <text x="${title.x}" y="${titleY}" font-size="${font * 1.05}" font-weight="800" fill="${C.teal}" letter-spacing="2">CONTRIBUTIONS</text>
    <text x="${title.x}" y="${titleY + font * 1.25}" font-size="${font * 0.72}" fill="${C.muted}">click to explore · updates daily</text>
    ${tabs}${pill}${labels}${progress}
    ${charts}
    <rect width="${w}" height="${h}" filter="url(#grain)"/>
  </g>
</svg>
`;
}

/* ---------- build ---------- */
const all = {};
const today = todayIST();
for (let y = SINCE_YEAR; y <= Number(today.slice(0, 4)); y++) Object.assign(all, await year(y));
const dates = Object.keys(all).filter((d) => d <= today).sort();
const firstActive = dates.find((d) => all[d] > 0) ?? dates[0];
const series = dates.filter((d) => d >= firstActive).map((d) => ({ d, v: all[d] }));
const sum = (a) => a.reduce((t, p) => t + p.v, 0);
const dayPoint = ({ d, v }) => {
  const dt = new Date(`${d}T12:00:00Z`);
  return { x: `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`, sub: DAYS[dt.getUTCDay()], v };
};

const d7 = series.slice(-7), d30 = series.slice(-30);
const monthMap = new Map();
for (const p of series) monthMap.set(p.d.slice(0, 7), (monthMap.get(p.d.slice(0, 7)) ?? 0) + p.v);
const mKeys = [...monthMap.keys()];
const months = mKeys.map((k) => {
  const [y, m] = k.split("-").map(Number);
  return { x: MONTHS[m - 1], sub: m === 1 || k === mKeys[0] ? String(y) : undefined, v: monthMap.get(k), key: k };
});
const bestMonth = months.reduce((b, p) => (p.v > b.v ? p : b), months[0]);
const active = (a) => a.filter((p) => p.v > 0).length;
const bestDay = (a) => Math.max(0, ...a.map((p) => p.v));

function build(mobile) {
  const w = mobile ? 600 : 1200, h = mobile ? 600 : 500, font = mobile ? 19 : 18;
  const chartY = mobile ? 150 : 86;
  const box = { x0: 0, y0: chartY, w, h: h - chartY, font };
  const peaks30 = spacedPeaks(d30.map((p) => p.v), mobile ? 5 : 12, mobile ? 2 : 1);
  const peaksAll = spacedPeaks(months.map((p) => p.v), mobile ? 4 : 30, mobile ? 3 : 1);
  const ranges = [
    {
      tab: "7 Days", summary: `${sum(d7)} contributions`,
      body: chartGroup({ ...box, xEvery: 1, points: d7.map((p) => ({ ...dayPoint(p), label: true })), stats: [["contributions", fmt(sum(d7))], ["active days", `${active(d7)}/7`], ["best day", fmt(bestDay(d7))]] }),
    },
    {
      tab: "1 Month", summary: `${sum(d30)} contributions`,
      body: chartGroup({ ...box, xEvery: mobile ? 10 : 5, points: d30.map((p, i) => ({ ...dayPoint(p), sub: undefined, label: peaks30.has(i) })), stats: [["contributions", fmt(sum(d30))], ["active days", `${active(d30)}/30`], ["best day", fmt(bestDay(d30))]] }),
    },
    {
      tab: "All Time", summary: `${sum(series)} contributions since ${firstActive}`,
      body: chartGroup({ ...box, xEvery: mobile ? Math.ceil(months.length / 6) : 1, points: months.map((p, i) => ({ ...p, label: peaksAll.has(i) })), stats: [[mobile ? "total" : "total contributions", fmt(sum(series))], ["active days", fmt(active(series))], ["best month", `${bestMonth.x} '${bestMonth.key.slice(2, 4)}`]] }),
    },
  ];
  return mobile
    ? tabbedCard({ ranges, w, h, font, tabW: 160, tabH: 44, tabsX: 40, tabsY: 84, title: { x: 40 }, titleY: 48 })
    : tabbedCard({ ranges, w, h, font, tabW: 130, tabH: 40, tabsX: w - 60 - 3 * 130 - 20, tabsY: 24, title: { x: 60 }, titleY: 46 });
}

writeFileSync(join(HERE, "contrib.svg"), build(false));
writeFileSync(join(HERE, "contrib-mobile.svg"), build(true));
mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, "contrib.json"), JSON.stringify({ user: USER, generated: new Date().toISOString(), today, days: series.map((p) => [p.d, p.v]) }) + "\n");
console.log(`total ${sum(series)} since ${firstActive} · 7d ${sum(d7)} · 30d ${sum(d30)} · ${months.length} months`);
