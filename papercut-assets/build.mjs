// Generates the paper-cut SVGs used by papercut.md.  Run: node papercut-assets/build.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const FONT = `'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif`;
const C = { paper: "#f6efe3", white: "#fffaf2", mustard: "#e9c46a", orange: "#f4a261", coral: "#e76f51", teal: "#2a9d8f", deep: "#264653", ink: "#1f2d33" };

// Deterministic randomness so rebuilding gives the same art.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Shared defs: soft drop shadow (the "cut paper" depth) and subtle paper grain.
const defs = (id = "") => `
  <defs>
    <filter id="sh${id}" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3b2a1a" flood-opacity=".32"/>
    </filter>
    <filter id="shs${id}" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#3b2a1a" flood-opacity=".3"/>
    </filter>
    <filter id="grain${id}">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .09 0"/>
    </filter>
  </defs>`;
const grain = (w, h, id = "") => `<rect width="${w}" height="${h}" filter="url(#grain${id})" pointer-events="none"/>`;

// A smooth wavy hill across the full width, filled down to the bottom.
function hill(w, h, baseY, amp, waves, color, extra = "") {
  const n = waves * 2;
  const pts = Array.from({ length: n + 1 }, (_, i) => [(w / n) * i, baseY + (i % 2 ? -1 : 1) * amp * (0.5 + rnd() * 0.6)]);
  let d = `M -20 ${h + 20} L -20 ${pts[0][1]} `;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += `C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1} `;
  }
  d += `L ${w + 20} ${pts[n][1]} L ${w + 20} ${h + 20} Z`;
  return `<path d="${d}" fill="${color}" ${extra}/>`;
}

const float = (dy, dur) => `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy};0 0" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`;
const cloud = (x, y, s) => `<g filter="url(#shs)" transform="translate(${x} ${y}) scale(${s})"><g>${float(4, 7 + s * 2)}<path d="M0 30 a22 22 0 0 1 30-22 a30 30 0 0 1 52 4 a20 20 0 0 1 22 18 z" fill="${C.white}"/></g></g>`;

/* ---------- Header ---------- */
function header() {
  const w = 1200, h = 380;
  seed = 11;
  const layers = [
    [250, 26, 3, "#f3d9a4", 3, 9],
    [278, 30, 4, C.mustard, 4, 8],
    [300, 26, 3, C.orange, 5, 10],
    [325, 22, 5, C.coral, 6, 7],
    [345, 18, 4, C.teal, 4, 11],
    [366, 12, 6, C.deep, 3, 9],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Vaibhav Singh, full-stack developer">
  ${defs()}
  <rect width="${w}" height="${h}" rx="22" fill="${C.paper}"/>
  <clipPath id="clip"><rect width="${w}" height="${h}" rx="22"/></clipPath>
  <g clip-path="url(#clip)">
    <g filter="url(#sh)"><g>${float(6, 9)}
      <circle cx="960" cy="128" r="74" fill="${C.mustard}"/>
      <circle cx="960" cy="128" r="52" fill="${C.orange}"/>
      <circle cx="960" cy="128" r="30" fill="${C.coral}"/>
    </g></g>
    ${cloud(760, 70, 1.1)}${cloud(1060, 200, 0.8)}${cloud(560, 40, 0.7)}
    ${layers.map(([y, a, wv, col, dy, dur]) => `<g filter="url(#sh)"><g>${float(dy, dur)}${hill(w, h, y, a, wv, col)}</g></g>`).join("\n    ")}
    <g transform="rotate(-2.5 330 170)" filter="url(#sh)">
      <rect x="70" y="78" width="520" height="190" rx="6" fill="${C.white}"/>
      <rect x="250" y="62" width="150" height="34" fill="${C.mustard}" opacity=".75" transform="rotate(4 325 79)"/>
      <text x="100" y="168" font-family="${FONT}" font-size="64" font-weight="800" fill="${C.deep}" letter-spacing="1">Vaibhav Singh</text>
      <text x="102" y="214" font-family="${FONT}" font-size="25" font-weight="600" fill="${C.coral}">full-stack developer · lucknow, in</text>
      <text x="102" y="246" font-family="${FONT}" font-size="19" fill="#6b5a48">next.js · typescript · postgres · ai</text>
    </g>
    ${grain(w, h)}
  </g>
</svg>`;
}

/* ---------- Torn-paper about note ---------- */
function torn(x, y, w, h, teeth = 46) {
  const step = w / teeth;
  let d = `M ${x} ${y + 6}`;
  for (let i = 1; i <= teeth; i++) d += ` L ${x + i * step} ${y + (i % 2 ? 0 : 9) + rnd() * 3}`;
  d += ` L ${x + w} ${y + h - 6}`;
  for (let i = teeth - 1; i >= 0; i--) d += ` L ${x + i * step} ${y + h - (i % 2 ? 0 : 9) - rnd() * 3}`;
  return d + " Z";
}
function about() {
  const w = 1200, h = 250;
  seed = 23;
  const lines = [
    ["🛠️", "Freelance full-stack dev building ", "Medstocksy", ", a pharmacy SaaS used daily"],
    ["⚡", "2 live client apps, 13+ builds:", " real-time, multi-tenant, AI-powered", ""],
    ["🏆", "Technex '25 runner-up · Techfest '25 winner ·", " Google GenAI Exchange", ""],
    ["🟢", "BCA grad (May 2026), open to full-time roles,", " ready now", ""],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="About Vaibhav">
  ${defs()}
  <g filter="url(#sh)"><path d="${torn(30, 22, w - 60, h - 44)}" fill="${C.coral}" transform="rotate(.8 600 125) translate(6 6)"/></g>
  <g filter="url(#sh)"><path id="note" d="${torn(30, 22, w - 60, h - 44)}" fill="${C.white}"/></g>
  <clipPath id="noteclip"><use href="#note"/></clipPath>
  <rect x="80" y="10" width="120" height="30" fill="${C.teal}" opacity=".6" transform="rotate(-6 140 25)"/>
  <rect x="1000" y="10" width="120" height="30" fill="${C.mustard}" opacity=".7" transform="rotate(5 1060 25)"/>
  <g font-family="${FONT}" font-size="27" fill="${C.ink}">
    ${lines.map(([e, a, b, c], i) => `<text x="80" y="${78 + i * 46}"><tspan>${e}</tspan><tspan dx="14">${a}</tspan><tspan font-weight="800" fill="${C.coral}">${b}</tspan><tspan>${c}</tspan></text>`).join("\n    ")}
  </g>
  <g clip-path="url(#noteclip)">${grain(w, h)}</g>
</svg>`;
}

/* ---------- Section ribbon ---------- */
function ribbon(text, color, file) {
  const w = 1200, h = 110;
  const tw = text.length * 21 + 90;
  const x = (w - tw) / 2;
  return [file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${text}">
  ${defs()}
  <g filter="url(#sh)">
    <path d="M ${x - 60} 34 L ${x + 10} 34 L ${x + 10} 86 L ${x - 60} 86 L ${x - 36} 60 Z" fill="${C.deep}"/>
    <path d="M ${x + tw + 60} 34 L ${x + tw - 10} 34 L ${x + tw - 10} 86 L ${x + tw + 60} 86 L ${x + tw + 36} 60 Z" fill="${C.deep}"/>
  </g>
  <g filter="url(#sh)"><rect x="${x}" y="22" width="${tw}" height="56" rx="4" fill="${color}" transform="rotate(-1 600 50)"/></g>
  <text x="600" y="60" text-anchor="middle" font-family="${FONT}" font-size="31" font-weight="800" fill="${C.white}" letter-spacing="2" transform="rotate(-1 600 50)">${text}</text>
</svg>`];
}

/* ---------- Project cards ---------- */
const PROJECTS = [
  ["card-medstocksy", "💊", "Medstocksy", "pharmacy SaaS · RLS tenants", "live", C.coral],
  ["card-drone", "🛰️", "Drone Survey", "live telemetry on a map", "live", C.teal],
  ["card-sortmyscene", "🎟️", "SortMyScene", "real-time seats, no doubles", "live", C.orange],
  ["card-bookleaf", "🤖", "BookLeaf AI", "AI drafts support replies", "code", C.deep],
  ["card-fleet", "🚌", "Fleet Tracker", "FastAPI · MQTT · Flutter", "code", C.mustard],
  ["card-birdie", "⛳", "Birdie & Cause", "Stripe subscriptions", "live", C.coral],
];
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function card([file, emoji, rawTitle, rawDesc, tag, color], i) {
  const title = esc(rawTitle), desc = esc(rawDesc);
  const w = 400, h = 250;
  seed = 100 + i * 13;
  const id = String(i);
  const layerCols = color === C.deep ? [C.teal, C.deep] : color === C.mustard ? [C.orange, C.mustard] : [C.mustard, color];
  return [file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}: ${desc}">
  ${defs(id)}
  <clipPath id="c${id}"><rect x="14" y="10" width="${w - 28}" height="${h - 28}" rx="16"/></clipPath>
  <g filter="url(#sh${id})"><rect x="14" y="10" width="${w - 28}" height="${h - 28}" rx="16" fill="${C.white}"/></g>
  <g clip-path="url(#c${id})">
    <g filter="url(#sh${id})">${hill(w, h, 172, 14, 2, layerCols[0])}</g>
    <g filter="url(#sh${id})">${hill(w, h, 196, 12, 3, layerCols[1])}</g>
    ${grain(w, h, id)}
  </g>
  <g filter="url(#shs${id})"><circle cx="66" cy="62" r="30" fill="${C.paper}"/></g>
  <text x="66" y="74" text-anchor="middle" font-size="32">${emoji}</text>
  <text x="112" y="58" font-family="${FONT}" font-size="27" font-weight="800" fill="${C.ink}">${title}</text>
  <text x="112" y="86" font-family="${FONT}" font-size="17" fill="#6b5a48">${desc}</text>
  <g filter="url(#shs${id})" transform="rotate(-4 330 140)"><rect x="282" y="122" width="88" height="34" rx="5" fill="${C.paper}"/></g>
  <text x="326" y="145" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="800" fill="${C.deep}" transform="rotate(-4 330 140)">${tag} ↗</text>
</svg>`];
}

/* ---------- Contact buttons ---------- */
const BUTTONS = [
  ["btn-portfolio", "🌐", "portfolio", C.coral],
  ["btn-linkedin", "💼", "linkedin", C.teal],
  ["btn-email", "✉️", "email", C.orange],
  ["btn-leetcode", "🧩", "leetcode", C.deep],
];
function button([file, emoji, label, color], i) {
  const w = 260, h = 90, id = `b${i}`;
  return [file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  ${defs(id)}
  <g filter="url(#sh${id})"><rect x="16" y="14" width="${w - 32}" height="56" rx="28" fill="${color}" transform="translate(4 5)" opacity=".55"/></g>
  <g filter="url(#sh${id})"><rect x="16" y="14" width="${w - 32}" height="56" rx="28" fill="${C.white}"/></g>
  <text x="${w / 2}" y="51" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" fill="${color === C.mustard ? C.deep : color}"><tspan>${emoji}</tspan><tspan dx="10">${label}</tspan></text>
</svg>`];
}

/* ---------- Footer ---------- */
function footer() {
  const w = 1200, h = 170;
  seed = 51;
  const cols = [[60, C.mustard, 3, 8], [88, C.orange, 4, 10], [112, C.coral, 5, 7], [136, C.teal, 3, 9], [156, C.deep, 4, 11]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Thanks for stopping by">
  ${defs()}
  <clipPath id="fc"><rect width="${w}" height="${h}" rx="22"/></clipPath>
  <g clip-path="url(#fc)">
    <rect width="${w}" height="${h}" fill="${C.paper}"/>
    ${cols.map(([y, col, dy, dur], i) => `<g filter="url(#sh)"><g>${float(dy, dur)}${hill(w, h, y, 14 + i * 2, 3 + i, col)}</g></g>`).join("\n    ")}
    <text x="600" y="40" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="${C.deep}">thanks for stopping by ✂️</text>
    ${grain(w, h)}
  </g>
</svg>`;
}

const files = [
  ["header", header()],
  ["about", about()],
  ribbon("THINGS I'VE BUILT", C.coral, "ribbon-projects"),
  ribbon("MY TOOLBOX", C.teal, "ribbon-tools"),
  ribbon("SAY HELLO", C.orange, "ribbon-contact"),
  ...PROJECTS.map(card),
  ...BUTTONS.map(button),
  ["footer", footer()],
];
for (const [name, svg] of files) writeFileSync(join(OUT, `${name}.svg`), svg.trim() + "\n");
console.log(`wrote ${files.length} SVGs`);
