// Generates the paper-cut SVGs used by papercut.md.  Run: node papercut-assets/build.mjs
// Desktop and mobile variants are swapped with <picture media="(max-width: 600px)"> in the README.
// Cards, buttons and ribbons have a fixed natural size so they wrap 3 / 2 / 1 per row on their own.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const FONT = `'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif`;
const C = { paper: "#f6efe3", white: "#fffaf2", mustard: "#e9c46a", orange: "#f4a261", coral: "#e76f51", teal: "#2a9d8f", deep: "#264653", ink: "#1f2d33", muted: "#6b5a48" };

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ---------- shared pieces ---------- */
const defs = (id = "") => `
  <defs>
    <filter id="sh${id}" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3b2a1a" flood-opacity=".32"/></filter>
    <filter id="shs${id}" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#3b2a1a" flood-opacity=".3"/></filter>
    <filter id="grain${id}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .09 0"/></filter>
  </defs>`;
const grain = (w, h, id = "") => `<rect width="${w}" height="${h}" filter="url(#grain${id})" pointer-events="none"/>`;
const ease = `calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"`;
const float = (dy, dur) => `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy};0 0" dur="${dur}s" repeatCount="indefinite" ${ease}/>`;
const bob = (dy, dur, delay = 0) => `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy};0 0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" ${ease}/>`;
const drift = (dx, dur) => `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} 3;0 0" dur="${dur}s" repeatCount="indefinite" ${ease}/>`;
const sway = (deg, cx, cy, dur, delay = 0) => `<animateTransform attributeName="transform" type="rotate" values="${-deg} ${cx} ${cy};${deg} ${cx} ${cy};${-deg} ${cx} ${cy}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" ${ease}/>`;

function hill(w, h, baseY, amp, waves, color) {
  const n = waves * 2;
  const pts = Array.from({ length: n + 1 }, (_, i) => [(w / n) * i, baseY + (i % 2 ? -1 : 1) * amp * (0.5 + rnd() * 0.6)]);
  let d = `M -20 ${h + 20} L -20 ${pts[0][1]} `;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += `C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1} `;
  }
  return `<path d="${d} L ${w + 20} ${pts[n][1]} L ${w + 20} ${h + 20} Z" fill="${color}"/>`;
}
const hills = (w, h, layers) => layers.map(([y, a, wv, col, dy, dur]) => `<g filter="url(#sh)"><g>${float(dy, dur)}${hill(w, h, y, a, wv, col)}</g></g>`).join("\n    ");
const cloud = (x, y, s) => `<g filter="url(#shs)" transform="translate(${x} ${y}) scale(${s})"><g>${drift(26, 9 + s * 3)}<path d="M0 30 a22 22 0 0 1 30-22 a30 30 0 0 1 52 4 a20 20 0 0 1 22 18 z" fill="${C.white}"/></g></g>`;

function sun(cx, cy, r) {
  const ray = (i) => {
    const a1 = ((i * 30 - 6) * Math.PI) / 180, a2 = ((i * 30 + 6) * Math.PI) / 180, R = r * 1.5;
    return `<path d="M ${cx} ${cy} L ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} L ${cx + R * Math.cos(a2)} ${cy + R * Math.sin(a2)} Z" fill="${C.mustard}" opacity=".55"/>`;
  };
  return `<g filter="url(#shs)"><g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="60s" repeatCount="indefinite"/>${Array.from({ length: 12 }, (_, i) => ray(i)).join("")}</g></g>
    <g filter="url(#sh)"><g>${float(6, 9)}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.mustard}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="${C.orange}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="${C.coral}"/>
    </g></g>`;
}
const plane = (path, dur) => `<g filter="url(#shs)"><g>
      <animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto" path="${path}"/>
      <path d="M 0 0 L -34 -12 L -24 0 L -34 12 Z" fill="${C.white}"/><path d="M 0 0 L -24 0 L -34 12 Z" fill="#e6dccb"/>
    </g></g>`;
const svg = (w, h, label, body, size = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${size || `width="${w}" height="${h}"`} role="img" aria-label="${esc(label)}">${body}
</svg>`;

/* ---------- header ---------- */
function nameCard(x, y, w, h, nameSize, lines, px, py) {
  return `<g transform="rotate(-2.5 ${px} ${py})" filter="url(#sh)"><g>${sway(1.2, px, y, 7)}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.white}"/>
      <rect x="${x + w / 2 - 75}" y="${y - 16}" width="150" height="34" fill="${C.mustard}" opacity=".75" transform="rotate(4 ${x + w / 2} ${y})"/>
      <text x="${x + 30}" y="${y + nameSize + 26}" font-family="${FONT}" font-size="${nameSize}" font-weight="800" fill="${C.deep}" letter-spacing="1">Vaibhav Singh</text>
      ${lines.map(([t, size, col, weight], i) => `<text x="${x + 32}" y="${y + nameSize + 72 + i * (size + 12)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${col}">${t}</text>`).join("\n      ")}
    </g></g>`;
}
function header() {
  const w = 1200, h = 380;
  seed = 11;
  return svg(w, h, "Vaibhav Singh, full-stack developer", `
  ${defs()}
  <clipPath id="clip"><rect width="${w}" height="${h}" rx="22"/></clipPath>
  <g clip-path="url(#clip)">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    ${sun(960, 128, 74)}
    ${cloud(760, 70, 1.1)}${cloud(1060, 200, 0.8)}${cloud(560, 40, 0.7)}
    ${plane("M -80 150 C 200 40, 420 230, 640 110 S 1000 30, 1300 120", 14)}
    ${hills(w, h, [[250, 26, 3, "#f3d9a4", 3, 9], [278, 30, 4, C.mustard, 4, 8], [300, 26, 3, C.orange, 5, 10], [325, 22, 5, C.coral, 6, 7], [345, 18, 4, C.teal, 4, 11], [366, 12, 6, C.deep, 3, 9]])}
    ${nameCard(70, 78, 520, 190, 64, [["full-stack developer · lucknow, in", 25, C.coral, 600], ["next.js · typescript · postgres · ai", 19, C.muted, 400]], 330, 170)}
    ${grain(w, h)}
  </g>`);
}
function headerMobile() {
  const w = 600, h = 600;
  seed = 12;
  return svg(w, h, "Vaibhav Singh, full-stack developer", `
  ${defs()}
  <clipPath id="clip"><rect width="${w}" height="${h}" rx="26"/></clipPath>
  <g clip-path="url(#clip)">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    ${sun(470, 112, 62)}
    ${cloud(60, 70, 1.1)}${cloud(250, 30, 0.8)}
    ${plane("M -60 200 C 120 120, 300 260, 420 180 S 620 120, 700 170", 11)}
    ${hills(w, h, [[430, 26, 2, "#f3d9a4", 3, 9], [460, 28, 3, C.mustard, 4, 8], [490, 24, 2, C.orange, 5, 10], [520, 20, 3, C.coral, 6, 7], [548, 16, 3, C.teal, 4, 11], [574, 10, 4, C.deep, 3, 9]])}
    ${nameCard(46, 214, 508, 222, 66, [["full-stack developer", 30, C.coral, 700], ["lucknow, in · next.js · ai", 25, C.muted, 400]], 300, 320)}
    ${grain(w, h)}
  </g>`);
}

/* ---------- about note ---------- */
function torn(x, y, w, h, teeth) {
  const step = w / teeth;
  let d = `M ${x} ${y + 6}`;
  for (let i = 1; i <= teeth; i++) d += ` L ${x + i * step} ${y + (i % 2 ? 0 : 9) + rnd() * 3}`;
  d += ` L ${x + w} ${y + h - 6}`;
  for (let i = teeth - 1; i >= 0; i--) d += ` L ${x + i * step} ${y + h - (i % 2 ? 0 : 9) - rnd() * 3}`;
  return d + " Z";
}
// Each item: [emoji, visual lines], each line is a list of [text, highlight?] segments.
const ABOUT_WIDE = [
  ["🛠️", [[["Freelance full-stack dev building "], ["Medstocksy", 1], [", a pharmacy SaaS used daily"]]]],
  ["⚡", [[["2 live client apps, 13+ builds: "], ["real-time, multi-tenant, AI-powered", 1]]]],
  ["🏆", [[["Technex '25 runner-up · Techfest '25 winner · "], ["Google GenAI Exchange", 1]]]],
  ["🟢", [[["BCA grad (May 2026), open to full-time roles, "], ["ready now", 1]]]],
];
const ABOUT_TALL = [
  ["🛠️", [[["Freelance full-stack dev building"]], [["Medstocksy", 1], [", a pharmacy SaaS"]]]],
  ["⚡", [[["2 live client apps, 13+ builds"]], [["real-time · multi-tenant · AI", 1]]]],
  ["🏆", [[["Technex '25 🥈 · Techfest '25 🥇"]], [["Google GenAI Exchange", 1]]]],
  ["🟢", [[["BCA grad 2026, open to work,"]], [["ready now", 1]]]],
];
function aboutNote(w, h, items, size, lineGap, itemGap, teeth, top, label) {
  seed = 23;
  let y = top, rows = "", k = 0;
  for (const [emoji, lines] of items) {
    lines.forEach((segs, li) => {
      const spans = segs.map(([t, hi]) => (hi ? `<tspan font-weight="800" fill="${C.coral}">${esc(t)}</tspan>` : `<tspan>${esc(t)}</tspan>`)).join("");
      rows += li === 0
        ? `<text x="70" y="${y}"><tspan>${emoji}<animate attributeName="dy" values="0;-3;0" dur="2.4s" begin="${k * 0.4}s" repeatCount="indefinite"/></tspan><tspan dx="14">${spans}</tspan></text>\n    `
        : `<text x="${70 + size * 1.6}" y="${y}">${spans}</text>\n    `;
      y += li === lines.length - 1 ? itemGap : lineGap;
    });
    k++;
  }
  const note = torn(24, 22, w - 48, h - 44, teeth);
  return svg(w, h, label, `
  ${defs()}
  <g filter="url(#sh)"><path d="${note}" fill="${C.coral}" transform="translate(7 7)"/></g>
  <g filter="url(#sh)"><path id="note" d="${note}" fill="${C.white}"/></g>
  <clipPath id="noteclip"><use href="#note"/></clipPath>
  <g transform="rotate(-6 120 25)"><rect x="60" y="10" width="120" height="30" fill="${C.teal}" opacity=".6"/></g>
  <g transform="rotate(5 ${w - 120} 25)"><rect x="${w - 180}" y="10" width="120" height="30" fill="${C.mustard}" opacity=".7"/></g>
  <g font-family="${FONT}" font-size="${size}" fill="${C.ink}">
    ${rows}
  </g>
  <g clip-path="url(#noteclip)">${grain(w, h)}</g>`);
}
const ABOUT_LABEL = "About Vaibhav: freelance full-stack developer building Medstocksy, 2 live client apps, Technex and Techfest hackathon awards, open to full-time roles";
const about = () => aboutNote(1200, 250, ABOUT_WIDE, 27, 0, 46, 46, 78, ABOUT_LABEL);
const aboutMobile = () => aboutNote(600, 560, ABOUT_TALL, 29, 40, 66, 24, 92, ABOUT_LABEL);

/* ---------- ribbon (tight, natural width) ---------- */
function ribbon(text, color) {
  const tw = text.length * 21 + 80, w = tw + 150, h = 100, x = 75, cx = w / 2;
  return svg(w, h, text, `
  ${defs()}
  <g>${sway(1.4, cx, 50, 6)}
  <g filter="url(#sh)">
    <path d="M ${x - 60} 30 L ${x + 10} 30 L ${x + 10} 82 L ${x - 60} 82 L ${x - 36} 56 Z" fill="${C.deep}"/>
    <path d="M ${x + tw + 60} 30 L ${x + tw - 10} 30 L ${x + tw - 10} 82 L ${x + tw + 60} 82 L ${x + tw + 36} 56 Z" fill="${C.deep}"/>
  </g>
  <g filter="url(#sh)"><rect x="${x}" y="18" width="${tw}" height="56" rx="4" fill="${color}" transform="rotate(-1 ${cx} 46)"/></g>
  <text x="${cx}" y="57" text-anchor="middle" font-family="${FONT}" font-size="31" font-weight="800" fill="${C.white}" letter-spacing="2" transform="rotate(-1 ${cx} 46)">${esc(text)}</text>
  </g>`, `width="${Math.round(w * 0.8)}" height="${Math.round(h * 0.8)}"`);
}

/* ---------- project cards (natural 264px wide; a "hover" lift runs card by card) ---------- */
const PROJECTS = [
  ["card-medstocksy", "💊", "Medstocksy", "pharmacy SaaS · RLS", "live", C.coral],
  ["card-drone", "🛰️", "Drone Survey", "live telemetry map", "live", C.teal],
  ["card-sortmyscene", "🎟️", "SortMyScene", "real-time seat booking", "live", C.orange],
  ["card-bookleaf", "🤖", "BookLeaf AI", "AI drafts replies", "code", C.deep],
  ["card-fleet", "🚌", "Fleet Tracker", "FastAPI · MQTT · Flutter", "code", C.mustard],
  ["card-birdie", "⛳", "Birdie & Cause", "Stripe subscriptions", "live", C.coral],
];
function card([, emoji, title, desc, tag, color], i) {
  const w = 400, h = 260, id = String(i);
  seed = 100 + i * 13;
  const cols = color === C.deep ? [C.teal, C.deep] : color === C.mustard ? [C.orange, C.mustard] : [C.mustard, color];
  const cycle = 7.2, start = i * 1.2;
  const lift = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -9;0 -9;0 0;0 0" keyTimes="0;.06;.16;.22;1" dur="${cycle}s" begin="${start}s" repeatCount="indefinite"/>`;
  const glow = `<animate attributeName="stdDeviation" values="5;10;10;5;5" keyTimes="0;.06;.16;.22;1" dur="${cycle}s" begin="${start}s" repeatCount="indefinite"/>`;
  return svg(w, h, `${title}: ${desc}`, `
  <defs>
    <filter id="lift${id}" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#3b2a1a" flood-opacity=".34">${glow}</feDropShadow></filter>
    <filter id="sh${id}" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#3b2a1a" flood-opacity=".3"/></filter>
    <filter id="grain${id}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .09 0"/></filter>
    <clipPath id="c${id}"><rect x="16" y="22" width="${w - 32}" height="${h - 48}" rx="18"/></clipPath>
  </defs>
  <g>${lift}
    <g filter="url(#lift${id})"><rect x="16" y="22" width="${w - 32}" height="${h - 48}" rx="18" fill="${C.white}"/></g>
    <g clip-path="url(#c${id})">
      <g filter="url(#sh${id})"><g>${float(5, 6 + i * 0.7)}${hill(w, h, 180, 14, 2, cols[0])}</g></g>
      <g filter="url(#sh${id})"><g>${float(4, 5 + i * 0.5)}${hill(w, h, 204, 12, 3, cols[1])}</g></g>
      ${grain(w, h, id)}
    </g>
    <g filter="url(#sh${id})"><circle cx="70" cy="76" r="32" fill="${C.paper}"/></g>
    <text x="70" y="88" text-anchor="middle" font-size="34">${emoji}${bob(-4, 2.6, i * 0.3)}</text>
    <text x="118" y="72" font-family="${FONT}" font-size="31" font-weight="800" fill="${C.ink}">${esc(title)}</text>
    <text x="118" y="104" font-family="${FONT}" font-size="21" fill="${C.muted}">${esc(desc)}</text>
    <g>${sway(3, 320, 132, 3.2, i * 0.25)}
      <g filter="url(#sh${id})" transform="rotate(-4 320 150)"><rect x="268" y="130" width="100" height="38" rx="6" fill="${C.paper}"/></g>
      <text x="318" y="156" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="800" fill="${C.deep}" transform="rotate(-4 320 150)">${tag} ↗</text>
    </g>
  </g>`, `width="264" height="172"`);
}

/* ---------- "currently" sticky note (sits next to the streak card) ---------- */
function now() {
  const w = 600, h = 390;
  const rows = [["🧪", "building client SaaS"], ["🤖", "exploring AI agents"], ["🗄️", "ask me: Postgres RLS"], ["🚀", "open to full-time roles"]];
  return svg(w, h, "Currently: building client SaaS, exploring AI agents, ask me about Postgres RLS, open to full-time roles", `
  ${defs()}
  <g>${sway(1.2, 300, 40, 8)}
    <g filter="url(#sh)"><path d="M 40 46 L 560 36 L 566 340 L 500 368 L 46 360 Z" fill="${C.teal}" transform="translate(8 8)" opacity=".7"/></g>
    <g filter="url(#sh)"><path d="M 40 46 L 560 36 L 566 312 L 512 362 L 46 360 Z" fill="${C.mustard}"/></g>
    <path d="M 566 312 L 512 362 L 520 318 Z" fill="#d4ab4e"/>
    <g transform="rotate(-4 300 34)"><rect x="230" y="18" width="140" height="36" fill="${C.white}" opacity=".7"/></g>
    <text x="80" y="112" font-family="${FONT}" font-size="34" font-weight="800" fill="${C.deep}" letter-spacing="2">CURRENTLY</text>
    <g font-family="${FONT}" font-size="30" fill="${C.ink}">
      ${rows.map(([e, t], i) => `<text x="80" y="${170 + i * 50}"><tspan>${e}</tspan><tspan dx="14">${esc(t)}</tspan></text>`).join("\n      ")}
    </g>
  </g>`, `width="300" height="195"`);
}

/* ---------- contact buttons (natural 170px: 4 per row on desktop, 2 on phones) ---------- */
const BUTTONS = [["btn-portfolio", "🌐", "portfolio", C.coral], ["btn-linkedin", "💼", "linkedin", C.teal], ["btn-email", "✉️", "email", C.orange], ["btn-leetcode", "🧩", "leetcode", C.deep]];
function button([, emoji, label, color], i) {
  const w = 260, h = 90, id = `b${i}`;
  return svg(w, h, label, `
  ${defs(id)}
  <g>${bob(-3, 2.4, i * 0.35)}
  <g filter="url(#sh${id})"><rect x="16" y="14" width="${w - 32}" height="56" rx="28" fill="${color}" transform="translate(4 5)" opacity=".55"/></g>
  <g filter="url(#sh${id})"><rect x="16" y="14" width="${w - 32}" height="56" rx="28" fill="${C.white}"/></g>
  <text x="${w / 2}" y="51" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="800" fill="${color}"><tspan>${emoji}</tspan><tspan dx="10">${label}</tspan></text>
  </g>`, `width="170" height="59"`);
}

/* ---------- footer ---------- */
function footer(w, h, size, waves) {
  seed = 51;
  const step = (h - 50) / 5;
  const layers = [C.mustard, C.orange, C.coral, C.teal, C.deep].map((col, i) => [50 + step * (i + 0.6), 12 + i * 2, waves + i, col, 3 + (i % 3), 7 + i]);
  return svg(w, h, "Thanks for stopping by", `
  ${defs()}
  <clipPath id="fc"><rect width="${w}" height="${h}" rx="22"/></clipPath>
  <g clip-path="url(#fc)">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    ${hills(w, h, layers)}
    <text x="${w / 2}" y="${size + 14}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${C.deep}">thanks for stopping by ✂️</text>
    ${grain(w, h)}
  </g>`);
}

const files = [
  ["header", header()],
  ["header-mobile", headerMobile()],
  ["about", about()],
  ["about-mobile", aboutMobile()],
  ["ribbon-projects", ribbon("THINGS I'VE BUILT", C.coral)],
  ["ribbon-tools", ribbon("MY TOOLBOX", C.teal)],
  ["ribbon-stats", ribbon("GITHUB STATS", C.coral)],
  ["ribbon-contact", ribbon("SAY HELLO", C.orange)],
  ...PROJECTS.map((p, i) => [p[0], card(p, i)]),
  ["now", now()],
  ...BUTTONS.map((b, i) => [b[0], button(b, i)]),
  ["footer", footer(1200, 170, 22, 3)],
  ["footer-mobile", footer(600, 220, 30, 2)],
];
for (const [name, out] of files) writeFileSync(join(OUT, `${name}.svg`), out.trim() + "\n");
console.log(`wrote ${files.length} SVGs`);
