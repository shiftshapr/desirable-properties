#!/usr/bin/env node
/**
 * Build the Version 1.0 PDF of "The Layered Web: The Desirable Properties of a Meta-Layer".
 *
 * Reads the published chapters (DP1–DP24) and front/back matter from Gov Hub
 * (https://interfacehub.net/api/doc/draft/<ML-Draft>/chapter-passages/), lays the
 * book out as HTML, paginates it with Paged.js in headless Chrome and prints one PDF:
 *
 *   cover · title page · edition notice · contents · foreword · preface (About) · introduction
 *   · DP1–DP24 (opener page with the illustration, then the text) · acknowledgements
 *
 * with running heads, page numbers, a linked table of contents, in-book DP cross-references,
 * PDF bookmarks, and links back to each chapter in the online book.
 *
 * Usage (from the repo root):
 *   cd scripts/v1-book-pdf && npm install          # once
 *   node scripts/v1-book-pdf/build.mjs              # review copy -> scripts/v1-book-pdf/out/
 *   node scripts/v1-book-pdf/build.mjs --final \
 *        --out challenge-site/public/downloads/desirable-properties-v1.0.pdf
 *
 * Options:
 *   --final              Final V1.0 edition (no "review copy" notice).
 *   --out <file>         Output PDF (default scripts/v1-book-pdf/out/desirable-properties-v1.0[-review].pdf).
 *   --offline            Reuse the passages cached by the last run instead of calling Gov Hub.
 *   --only DP1,DP2       Limit chapters (for quick layout checks).
 *   --html-only          Write the HTML and stop (open it in Chrome to debug the layout).
 *   --cover-image <file> Use a flat, full-bleed cover image instead of the typeset cover.
 *   --cover-png <file>   Where to save the cover as flat art (PNG, about 2570 x 3690 px; default out/cover.png).
 *   --chrome <path>      Chrome/Chromium binary (or CHROME_PATH).
 *   --hub <url>          Gov Hub base URL (default https://interfacehub.net).
 *   --preview <pages>    Also save PNGs of these pages (e.g. 1-8,40,end) to out/preview/ for a layout check.
 *
 * The Introduction (ML-Draft-026) comes from Gov Hub when Gov Hub serves it, otherwise from its Bitcoin
 * inscription (the copy the online book shows in Onchain mode).
 *
 * Gov Hub's API is fetched with curl: it answers non-browser clients such as Python urllib with 403.
 * MTPs (Massive Transformational Purposes) are not part of V1.0 and are never pulled in.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const BOOK_DIR = path.join(REPO, 'desirableproperties-book');
const SOURCES_SAT = path.join(BOOK_DIR, 'json', 'sources-sat.json');
const FULL_ILLUSTRATIONS = path.join(REPO, 'challenge-site', 'public', 'images', 'dps', 'full');
const BOOK_ASSETS = path.join(BOOK_DIR, 'content', 'local', 'assets', 'dp');
const CACHE_DIR = path.join(HERE, 'cache');
const BOOK_URL = 'https://book.desirableproperties.org';
const SITE_URL = 'https://desirableproperties.org';
const TITLE = 'The Layered Web';
const SUBTITLE = 'The Desirable Properties of a Meta-Layer';
const EDITION = 'Version 1.0';
const EDITION_DATE = 'November 13, 2026';
// Mirrors that serve an inscription's raw content (ordinals.com blocks scripted clients).
const INSCRIPTION_MIRRORS = ['https://static.unisat.io/content/', 'https://cdn.ordiscan.com/inscriptions/', 'https://ordinals.com/content/'];

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const a = { final: false, offline: false, htmlOnly: false, only: null, out: null, coverImage: null, coverPng: null,
    chrome: process.env.CHROME_PATH || null, preview: null, hub: 'https://interfacehub.net' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--final') a.final = true;
    else if (k === '--offline') a.offline = true;
    else if (k === '--html-only') a.htmlOnly = true;
    else if (k === '--only') a.only = next().split(',').map((s) => s.trim().toUpperCase());
    else if (k === '--out') a.out = path.resolve(next());
    else if (k === '--cover-image') a.coverImage = path.resolve(next());
    else if (k === '--cover-png') a.coverPng = path.resolve(next());
    else if (k === '--chrome') a.chrome = next();
    else if (k === '--preview') a.preview = next();
    else if (k === '--hub') a.hub = next().replace(/\/$/, '');
    else if (k === '-h' || k === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(0); }
    else throw new Error(`Unknown option ${k}`);
  }
  a.out ||= path.join(HERE, 'out', a.final ? 'desirable-properties-v1.0.pdf' : 'desirable-properties-v1.0-review.pdf');
  return a;
}

function findChrome(explicit) {
  const candidates = [explicit,
    ...globSync(path.join(os.homedir(), '.cache', 'puppeteer', 'chrome'), /chrome-linux64[/\\]chrome$/),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error('Chrome not found: pass --chrome or set CHROME_PATH');
  return hit;
}

function globSync(dir, re) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const v of fs.readdirSync(dir).sort().reverse()) {
    const p = path.join(dir, v, 'chrome-linux64', 'chrome');
    if (re.test(p) && fs.existsSync(p)) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- Gov Hub

function fetchPassages(hub, ml, offline) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cache = path.join(CACHE_DIR, `${ml}.json`);
  if (offline) {
    if (!fs.existsSync(cache)) throw new Error(`--offline: no cached passages for ${ml}`);
    return JSON.parse(fs.readFileSync(cache, 'utf8')).passages;
  }
  const url = `${hub}/api/doc/draft/${encodeURIComponent(ml)}/chapter-passages/`;
  let body;
  for (let attempt = 1; ; attempt++) {
    try {
      body = execFileSync('curl', ['-sS', '--fail', '-m', '60', url], { maxBuffer: 64 << 20 }).toString('utf8');
      break;
    } catch (e) {
      if (attempt >= 3) throw new Error(`Gov Hub fetch failed for ${ml}: ${url}\n${e.message}`);
    }
  }
  const data = JSON.parse(body);
  if (!Array.isArray(data.passages) || data.passages.length === 0) throw new Error(`No passages for ${ml}`);
  fs.writeFileSync(cache, JSON.stringify(data, null, 1));
  return data.passages;
}

/**
 * The rail's passages from Gov Hub, or, when Gov Hub cannot serve the draft, from the rail's inscription
 * (its markdown split into blocks). Returns { passages, source }.
 */
function fetchRail(hub, rail, offline) {
  try {
    return { passages: fetchPassages(hub, rail.mlNumber, offline), source: 'gov-hub' };
  } catch (e) {
    if (!rail.inscriptionId) throw e;
    const cache = path.join(CACHE_DIR, `${rail.inscriptionId}.md`);
    let md = null;
    if (offline) {
      if (!fs.existsSync(cache)) throw new Error(`--offline: no cached copy of ${rail.mlNumber} or its inscription`);
      md = fs.readFileSync(cache, 'utf8');
    } else {
      for (const base of INSCRIPTION_MIRRORS) {
        try {
          md = execFileSync('curl', ['-sS', '--fail', '-L', '-m', '60', '-A', 'Mozilla/5.0', base + rail.inscriptionId], { maxBuffer: 64 << 20 }).toString('utf8');
          if (/^#\s/m.test(md)) break;
          md = null;
        } catch { /* next mirror */ }
      }
      if (!md) throw new Error(`${rail.mlNumber}: Gov Hub failed and no mirror served inscription ${rail.inscriptionId}`);
      fs.writeFileSync(cache, md);
    }
    console.warn(`  ! ${rail.mlNumber}: Gov Hub could not serve it, using its inscription ${rail.inscriptionId.slice(0, 12)}…`);
    return { passages: md.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), source: `inscription ${rail.inscriptionId}` };
  }
}

// ---------------------------------------------------------------- Markdown → HTML

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function stripComments(md) {
  return md.replace(/<!--[\s\S]*?-->/g, '').trim();
}

/** Clean a rail's passages: drop sync markers, pull out title / subtitle / illustration, drop structural rules. */
function prepareRail(passages) {
  // Headings written as `## **Title**` are bold already; drop the extra markers.
  let ps = passages.map(stripComments).filter((p) => p.length > 0)
    .map((p) => p.replace(/^(#{1,6}\s+)\*\*([^*]+)\*\*\s*$/gm, '$1$2'));
  let title = null; let subtitle = null; let image = null;
  if (ps[0] && /^#\s/.test(ps[0])) title = ps.shift().replace(/^#\s+/, '').trim();
  const sub = ps[0] && ps[0].match(/^(\*{1,2})([^*][\s\S]*?)\1$/);
  // Working-draft version tags such as "(V2)" are not part of the published subtitle.
  if (sub) { ps.shift(); subtitle = sub[2].trim().replace(/\s*\(V\d+\)/g, ''); }
  if (ps[0] && /^!\[[^\]]*\]\([^)]+\)$/.test(ps[0])) image = ps.shift();
  // A horizontal rule next to a heading or at either end only repeats the structure the heading already shows.
  const isRule = (p) => /^(-{3,}|\*{3,}|_{3,})$/.test(p);
  const isHeading = (p) => /^#{1,6}\s/.test(p || '');
  ps = ps.filter((p, i) => !(isRule(p) && (i === 0 || i === ps.length - 1 || isHeading(ps[i + 1]) || isRule(ps[i + 1]))));
  while (ps.length && isRule(ps[ps.length - 1])) ps.pop();
  return { title, subtitle, image, body: ps.join('\n\n') };
}

function resolveImage(src) {
  const base = path.basename(src.split('?')[0]);
  const dp = base.match(/^DP(\d{1,2})\.webp$/i);
  const tries = [];
  if (dp) tries.push(path.join(FULL_ILLUSTRATIONS, `DP${dp[1]}.webp`));
  tries.push(path.join(BOOK_ASSETS, base), path.join(BOOK_DIR, src.replace(/^\//, '')));
  const hit = tries.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`Image not found locally: ${src}`);
  return pathToFileURL(hit).href;
}

function absolutize(href) {
  if (!href || /^(https?:|mailto:|#)/i.test(href)) return href;
  if (href.startsWith('/viewer/') || href.startsWith('/content/')) return BOOK_URL + href;
  if (href.startsWith('/')) return SITE_URL + href;
  return href;
}

const renderer = new marked.Renderer();
renderer.image = ({ href, title, text }) => {
  const t = title ? ` title="${esc(title)}"` : '';
  return `<img src="${esc(resolveImage(href))}" alt="${esc(text)}"${t}>`;
};
renderer.link = function ({ href, title, tokens }) {
  const inner = this.parser.parseInline(tokens);
  const t = title ? ` title="${esc(title)}"` : '';
  return `<a href="${esc(absolutize(href))}"${t}>${inner}</a>`;
};
marked.use({ renderer, gfm: true });

/** Link inline DPn mentions to the chapter in this PDF (outside links, code and headings). */
function linkDpRefs(html, selfDp, validDps) {
  const parts = html.split(/(<[^>]+>)/);
  let skip = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('<')) {
      const m = p.match(/^<(\/?)(a|code|pre|h[1-6])\b/i);
      if (m) skip += m[1] ? -1 : 1;
      continue;
    }
    if (skip > 0 || !p) continue;
    parts[i] = p.replace(/\bDP(\d{1,2})\b/g, (all, n) => {
      const id = `DP${Number(n)}`;
      return id !== selfDp && validDps.has(id) ? `<a class="xref" href="#${id.toLowerCase()}">${all}</a>` : all;
    });
  }
  return parts.join('');
}

/** Typographic touches marked leaves alone. */
function polish(html, { signature = false } = {}) {
  if (signature) html = html.replace(/<p><em>([^<]{2,40})<\/em><\/p>\s*$/, '<p class="signature">$1</p>');
  return html.replace(/<p><em>(Figure:[\s\S]*?)<\/em><\/p>/g, '<p class="caption">$1</p>');
}

// ---------------------------------------------------------------- Cover art

/**
 * The cover's geodesic globe: a frequency-2 geodesic sphere (42 nodes) seen in orthographic projection, with
 * every edge drawn (the far side dimmer), chords between opposite nodes running through a bright core,
 * and glowing nodes. `emblem` draws the small outline version used under the kicker.
 */
function geodesic() {
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const norm = (p) => { const l = Math.hypot(...p); return p.map((x) => x / l); };
  v = v.map(norm);
  const mid = new Map(); const edges = new Set();
  const m = (a, b) => { const k = a < b ? `${a}_${b}` : `${b}_${a}`; if (!mid.has(k)) { v.push(norm(v[a].map((x, i) => (x + v[b][i]) / 2))); mid.set(k, v.length - 1); } return mid.get(k); };
  const e = (a, b) => edges.add(a < b ? `${a}_${b}` : `${b}_${a}`);
  for (const [a, b, c] of f) { const ab = m(a, b); const bc = m(b, c); const ca = m(c, a); for (const [x, y] of [[a, ab], [ab, b], [b, bc], [bc, c], [c, ca], [ca, a], [ab, bc], [bc, ca], [ca, ab]]) e(x, y); }
  return { v, edges: [...edges].map((k) => k.split('_').map(Number)) };
}

function sphereSvg(size = 520, cls = 'sphere') {
  const id = cls; const emblem = cls === 'emblem';
  const c = size / 2; const r = size * (emblem ? 0.44 : 0.4);
  const { v, edges } = geodesic();
  // Turn the globe so a node faces the viewer and the silhouette reads as the cover's star pattern.
  // Look straight down a five-fold axis (node 0 at the centre) so the pattern is symmetric, node at top.
  const axis = v[0];
  const rot = (p) => {
    const z = p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2];
    // orthonormal frame: u = up (towards node 5), w = u x axis
    const ref = v[5]; const d = ref[0] * axis[0] + ref[1] * axis[1] + ref[2] * axis[2];
    let u = ref.map((x, i) => x - d * axis[i]); const ul = Math.hypot(...u); u = u.map((x) => x / ul);
    const w = [u[1] * axis[2] - u[2] * axis[1], u[2] * axis[0] - u[0] * axis[2], u[0] * axis[1] - u[1] * axis[0]];
    const y = -(p[0] * u[0] + p[1] * u[1] + p[2] * u[2]);
    const x = p[0] * w[0] + p[1] * w[1] + p[2] * w[2];
    const tilt = emblem ? 0.5 : 0.18; // a slight tilt keeps front and back nodes from stacking
    return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
  };
  const pts = v.map(rot).map(([x, y, z]) => ({ x: c + x * r, y: c + y * r, z }));
  const f1 = (n) => n.toFixed(1);
  const lines = edges.map(([a, b]) => {
    const p = pts[a]; const q = pts[b]; const depth = ((p.z + q.z) / 2 + 1) / 2;
    return `<line x1="${f1(p.x)}" y1="${f1(p.y)}" x2="${f1(q.x)}" y2="${f1(q.y)}" stroke-opacity="${(emblem ? 0.55 + depth * 0.45 : 0.35 + depth * 0.65).toFixed(2)}"/>`;
  });
  if (!emblem) {
    // chords between opposite nodes: the long lines that cross through the core
    const done = new Set();
    v.forEach((p, i) => {
      if (done.has(i)) return;
      const j = v.findIndex((q) => Math.abs(q[0] + p[0]) + Math.abs(q[1] + p[1]) + Math.abs(q[2] + p[2]) < 1e-6);
      done.add(i); done.add(j);
      lines.push(`<line x1="${f1(pts[i].x)}" y1="${f1(pts[i].y)}" x2="${f1(pts[j].x)}" y2="${f1(pts[j].y)}" stroke-opacity="0.5" stroke-width="0.9"/>`);
    });
  }
  const dots = emblem ? pts.filter((p) => p.z > -0.2).map((p) => `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(size * 0.018)}"/>`).join('')
    : pts.map((p) => {
      const d = (p.z + 1) / 2;
      return `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(size * (0.005 + d * 0.007))}" fill-opacity="${(0.45 + d * 0.55).toFixed(2)}"/>`;
    }).join('');
  const halo = emblem ? '' : pts.filter((p) => p.z > -0.35).map((p) => `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(size * (0.022 + 0.014 * (p.z + 1) / 2))}" fill="url(#node-${id})"/>`).join('');
  const rings = emblem ? '' : [1.12, 1.24, 1.36].map((k) => `<circle cx="${c}" cy="${c}" r="${f1(r * k)}" fill="none" stroke="#3b6f8f" stroke-opacity="0.22" stroke-width="0.8" stroke-dasharray="0.8 4.2"/>`).join('');
  const star = emblem ? '' : `<circle cx="${c}" cy="${c}" r="${f1(r * 0.7)}" fill="url(#core-${id})"/>
  <g stroke="#fff3c8" stroke-linecap="round">${[0, 90].map((d) => `<line x1="${f1(c - r * 0.22)}" y1="${c}" x2="${f1(c + r * 0.22)}" y2="${c}" stroke-width="1.1" stroke-opacity="0.8" transform="rotate(${d} ${c} ${c})"/>`).join('')}</g>
  <circle cx="${c}" cy="${c}" r="${f1(size * 0.05)}" fill="url(#node-${id})"/><circle cx="${c}" cy="${c}" r="${f1(size * 0.011)}" fill="#fffbe8"/>`;
  return `<svg class="${cls}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="core-${id}"><stop offset="0%" stop-color="#ffd77a" stop-opacity="1"/><stop offset="18%" stop-color="#f0a62a" stop-opacity="0.6"/><stop offset="55%" stop-color="#e09a22" stop-opacity="0.15"/><stop offset="100%" stop-color="#e09a22" stop-opacity="0"/></radialGradient>
    <radialGradient id="node-${id}"><stop offset="0%" stop-color="#fff0b8" stop-opacity="0.95"/><stop offset="25%" stop-color="#ffc24d" stop-opacity="0.55"/><stop offset="100%" stop-color="#f2a52b" stop-opacity="0"/></radialGradient>
  </defs>
  ${rings}
  <g stroke="${emblem ? '#c9973a' : '#f2b84b'}" stroke-width="${emblem ? size * 0.012 : 1.5}" stroke-linecap="round">${lines.join('')}</g>
  ${halo}
  <g fill="${emblem ? '#d9a84a' : '#ffd27a'}">${dots}</g>
  ${star}
</svg>`;
}

/** A gold starburst seal ("Foreword by Vint Cerf"). */
function sealSvg() {
  const n = 36; const c = 60; const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? 51 : 58; const a = (Math.PI * i) / n;
    pts.push(`${(c + r * Math.sin(a)).toFixed(2)},${(c - r * Math.cos(a)).toFixed(2)}`);
  }
  return `<svg class="cover-seal" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="Foreword by Vint Cerf">
  <defs>
    <radialGradient id="sealGold" cx="38%" cy="32%" r="75%"><stop offset="0%" stop-color="#fff4b8"/><stop offset="45%" stop-color="#f0c33c"/><stop offset="100%" stop-color="#b8860b"/></radialGradient>
  </defs>
  <polygon points="${pts.join(' ')}" fill="url(#sealGold)" stroke="#8c6a12" stroke-width="0.8"/>
  <circle cx="60" cy="60" r="44" fill="none" stroke="#8c6a12" stroke-width="1.1"/>
  <circle cx="60" cy="60" r="41" fill="none" stroke="#fff1a8" stroke-opacity="0.7" stroke-width="0.6"/>
  <text x="60" y="44" text-anchor="middle" font-family="Montserrat, Inter, sans-serif" font-weight="700" font-size="7.4" letter-spacing="1.3" fill="#1a1408">FOREWORD BY</text>
  <text x="60" y="66" text-anchor="middle" font-family="Montserrat, Inter, sans-serif" font-weight="800" font-size="21" fill="#1a1408">VINT</text>
  <text x="60" y="86" text-anchor="middle" font-family="Montserrat, Inter, sans-serif" font-weight="800" font-size="21" fill="#1a1408">CERF</text>
</svg>`;
}

/** Line icons for the four pillars, drawn in the cover's gold. */
const PILLAR_ICONS = {
  people: '<circle cx="24" cy="15" r="5"/><circle cx="12" cy="18" r="4"/><circle cx="36" cy="18" r="4"/><path d="M14 38v-6a10 10 0 0 1 20 0v6z"/><path d="M4 38v-4a8 8 0 0 1 9-8"/><path d="M44 38v-4a8 8 0 0 0-9-8"/>',
  trust: '<path d="M24 5l15 6v11c0 9-6.5 15.5-15 19-8.5-3.5-15-10-15-19V11z"/><circle cx="24" cy="22" r="6"/><path d="M19 27l10-10"/>',
  coordination: '<circle cx="24" cy="24" r="4.5"/><circle cx="24" cy="7" r="3.5"/><circle cx="9" cy="35" r="3.5"/><circle cx="39" cy="35" r="3.5"/><circle cx="41" cy="14" r="2.8"/><path d="M24 11v8.5M20.3 26.6l-8.4 6.2M27.7 26.6l8.4 6.2M27.8 21.8l10.6-6"/>',
  regeneration: '<path d="M24 42V22"/><path d="M24 26c0-9-6-14-15-14 0 9 6 14 15 14z"/><path d="M24 22c0-8 5-13 14-13 0 8-5 13-14 13z"/><path d="M15 42h18"/>',
};
const icon = (k) => `<svg class="pillar-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="#e7b74a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PILLAR_ICONS[k]}</svg>`;

function coverHtml(coverImage) {
  if (coverImage) return `<section class="cover cover-image"><img src="${pathToFileURL(coverImage).href}" alt="${esc(TITLE)} cover"></section>`;
  return `<section class="cover">
  <div class="cover-kicker">Building the civic layer<br>of a trustworthy Internet</div>
  <div class="cover-emblem-row"><span class="cover-rule"></span>${sphereSvg(120, 'emblem')}<span class="cover-rule"></span></div>
  <h1 class="cover-title"><span class="the">The</span>Layered Web</h1>
  <svg class="cover-glow" viewBox="0 0 600 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="glowLine"><stop offset="0" stop-color="#c98a1e" stop-opacity="0"/><stop offset="0.25" stop-color="#d89a2a"/><stop offset="0.5" stop-color="#fff1c4"/><stop offset="0.75" stop-color="#d89a2a"/><stop offset="1" stop-color="#c98a1e" stop-opacity="0"/></linearGradient>
    <radialGradient id="glowDot"><stop offset="0" stop-color="#fffbe8"/><stop offset="0.3" stop-color="#ffd27a" stop-opacity="0.9"/><stop offset="1" stop-color="#f2a52b" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="6.2" width="600" height="1.6" fill="url(#glowLine)"/><ellipse cx="300" cy="7" rx="40" ry="7" fill="url(#glowDot)"/></svg>
  <div class="cover-sub"><span class="small dash">The</span>Desirable Properties<span class="small dash">of a</span>Meta-Layer</div>
  ${sphereSvg()}
  ${sealSvg()}
  <div class="cover-pillars">
    <div>${icon('people')}<b>People</b>Empowered communities</div>
    <div>${icon('trust')}<b>Trust</b>Transparent &amp; accountable</div>
    <div>${icon('coordination')}<b>Coordination</b>Shared intelligence</div>
    <div>${icon('regeneration')}<b>Regeneration</b>Sustainable futures</div>
  </div>
  <div class="cover-foot"><span class="cover-rule"></span><span>Meta-Layer Initiative</span><span class="cover-rule"></span></div>
</section>`;
}

// ---------------------------------------------------------------- Book HTML

function chapterHtml(ch, validDps, first) {
  const n = Number(ch.dp.slice(2));
  const anchor = ch.dp.toLowerCase();
  const shortTitle = ch.title.replace(/^DP\d+\s*[–\-:]\s*/, '');
  const online = `${BOOK_URL}/viewer/${ch.railKey}`;
  const img = ch.image ? ch.image.match(/^!\[([^\]]*)\]\(([^)]+)\)$/) : null;
  const body = polish(linkDpRefs(marked.parse(ch.body), ch.dp, validDps));
  return `<section class="chapter${first ? ' first' : ''}" id="${anchor}" data-dp="${ch.dp}">
  <div class="opener">
    <div class="running">${esc(`${ch.dp} · ${shortTitle}`)}</div>
    <div class="dp-label">Desirable Property ${n}</div>
    <h1 class="chapter-title"><span class="dp-num">${ch.dp}</span>${esc(shortTitle)}</h1>
    ${ch.subtitle ? `<p class="chapter-sub">${marked.parseInline(ch.subtitle)}</p>` : ''}
    ${img ? `<figure class="illustration"><img src="${esc(resolveImage(img[2]))}" alt="${esc(img[1])}"></figure>` : ''}
    <p class="online">Read, annotate and discuss this chapter online:<br><a href="${online}">${online.replace(/^https:\/\//, '')}</a></p>
  </div>
  <div class="chapter-body">${body}</div>
  <p class="chapter-end"><a href="${online}">Continue the conversation on ${ch.dp} online →</a></p>
</section>`;
}

function matterHtml(kind, rail, extra = '') {
  const body = polish(marked.parse(rail.body), { signature: kind === 'foreword' });
  return `<section class="matter ${kind}" id="${kind}">
  <div class="running">${esc(rail.title)}</div>
  <h1 class="matter-title">${esc(rail.title)}</h1>
  ${body}
  ${extra}
</section>`;
}

/** The Introduction opens the main matter: page 1, with its own opener-style title. */
function introHtml(rail, validDps) {
  const body = polish(linkDpRefs(marked.parse(rail.body), null, validDps));
  return `<section class="matter intro main-start" id="introduction">
  <div class="running">Introduction</div>
  <div class="dp-label">Introduction</div>
  <h1 class="matter-title">${esc(rail.title || SUBTITLE)}</h1>
  ${body}
  <p class="chapter-end"><a href="${BOOK_URL}/viewer/ml-draft-026">Read the Introduction online →</a></p>
</section>`;
}

function tocHtml(chapters) {
  const row = (href, label, title, cls = '') => `<li class="${cls}"><a href="#${href}"><span class="toc-id">${label}</span><span class="toc-title">${esc(title)}</span><span class="toc-pg"></span></a></li>`;
  return `<section class="toc" id="contents">
  <div class="running">Contents</div>
  <h1 class="matter-title">Contents</h1>
  <ol>
    ${row('foreword', '', 'Foreword by Vint Cerf', 'front')}
    ${row('preface', '', 'About This Digital Monument', 'front')}
    ${row('introduction', '', 'Introduction', 'front')}
    <li class="toc-part">The Desirable Properties</li>
    ${chapters.map((c) => row(c.dp.toLowerCase(), c.dp, c.title.replace(/^DP\d+\s*[–\-:]\s*/, ''))).join('\n    ')}
    <li class="toc-part"></li>
    ${row('acknowledgements', '', 'Acknowledgements', 'noid')}
  </ol>
  <p class="toc-online">Every chapter is also published online at <a href="${BOOK_URL}">${BOOK_URL.replace('https://', '')}</a>, where it can be annotated and discussed.</p>
</section>`;
}

function titlePagesHtml(final, builtAt) {
  const status = final
    ? `<p>${EDITION} · ${EDITION_DATE}</p>`
    : `<p class="review">Review copy, built ${builtAt} from the Gov Hub text at that time.<br>This is not the final ${EDITION} text.</p>`;
  return `<section class="titlepage">
  <div class="tp-title">${TITLE}</div>
  <div class="tp-sub">${SUBTITLE}</div>
  <div class="tp-rule"></div>
  <div class="tp-fore">With a foreword by Vint Cerf</div>
  <div class="tp-edition">${EDITION}</div>
  <div class="tp-pub">Meta-Layer Initiative</div>
</section>
<section class="edition">
  <p><i>${TITLE}: ${SUBTITLE}</i></p>
  ${status}
  <p>Developed in the open by the Meta-Layer community through the Desirable Properties Challenge and its workgroups, and approved by the Desirable Properties steering committee.</p>
  <p>The online edition: <a href="${BOOK_URL}">${BOOK_URL.replace('https://', '')}</a><br>
  The Desirable Properties Challenge: <a href="${SITE_URL}">${SITE_URL.replace('https://', '')}</a><br>
  Workgroups and drafts: <a href="https://interfacehub.net">interfacehub.net</a></p>
  <p>© 2026 the contributors to the Desirable Properties of a Meta-Layer. This book is licensed under the <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License (CC BY 4.0)</a>: you may share and adapt it for any purpose, provided you give appropriate credit and indicate if changes were made.</p>
  <p>The chapters of this book are inscribed on Bitcoin as part of a BRC333 digital monument. The online edition is the living reference; this PDF is a snapshot of ${EDITION}.</p>
</section>`;
}

const CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,600&family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700;800&family=JetBrains+Mono:wght@400&display=block');

:root { --gold: #b8892a; --gold-bright: #d4af37; --ink: #1b1c1f; --muted: #5d6066; --rule: #d9d3c4; --night: #0d1117; }
@page { size: 6.69in 9.61in; margin: 0.85in 0.7in 0.8in 0.8in; }
@page :left { margin-left: 0.7in; margin-right: 0.8in;
  @top-left { content: var(--folio); }
  @top-center { content: "The Layered Web"; } }
@page :right {
  @top-right { content: var(--folio); }
  @top-center { content: string(running); } }
@page :blank { @top-left { content: none; } @top-right { content: none; } @top-center { content: none; } }
@page cover { size: 6.69in 9.61in; margin: 0; background: var(--night);
  @top-left { content: none; } @top-right { content: none; } @top-center { content: none; } }
@page bare { @top-left { content: none; } @top-right { content: none; } @top-center { content: none; } }
@page opener { @top-left { content: none; } @top-right { content: none; } @top-center { content: none; }
  @bottom-center { content: var(--folio); } }
.pagedjs_margin-top-left, .pagedjs_margin-top-right, .pagedjs_margin-top-center, .pagedjs_margin-bottom-center {
  font: 500 7.4pt/1 Inter, sans-serif; letter-spacing: 0.03em; color: var(--muted); }
.pagedjs_margin-top-center, .pagedjs_margin-top-center .pagedjs_margin-content, .pagedjs_margin-top-center .pagedjs_margin-content::after { white-space: nowrap; overflow: visible; }

html { font-family: 'Source Serif 4', 'Bitstream Charter', Georgia, serif; font-size: 10.4pt; line-height: 1.5; color: var(--ink);
  font-optical-sizing: auto; font-variant-numeric: oldstyle-nums proportional-nums; }
body { margin: 0; }
p { margin: 0 0 0.62em; text-align: justify; hyphens: auto; orphans: 2; widows: 2; }
a { color: inherit; text-decoration: none; }
a.xref { color: #7a5b16; }
.chapter-body a[href^="http"], .matter a[href^="http"], .edition a, .online a, .toc-online a { color: #7a5b16; }
strong { font-weight: 600; }
.running { string-set: running content(text); height: 0; overflow: hidden; font-size: 0; line-height: 0; margin: 0; }

h2, h3, h4 { font-family: Inter, sans-serif; color: var(--ink); break-after: avoid; line-height: 1.25; text-align: left; hyphens: manual; }
h2 { font-size: 12.6pt; font-weight: 700; margin: 1.6em 0 0.55em; }
h3 { font-size: 10.6pt; font-weight: 600; margin: 1.3em 0 0.4em; }
h4 { font-size: 9.8pt; font-weight: 600; font-style: normal; color: #3a3d42; margin: 1.1em 0 0.3em; }
h2 + p > em:only-child, h3 + p > em:only-child { color: var(--muted); }
ul, ol { margin: 0.2em 0 0.8em; padding-left: 1.25em; }
li { margin: 0.18em 0; text-align: left; }
li > p { margin: 0.2em 0; }
blockquote { margin: 0.9em 0 0.9em 0.2em; padding: 0.1em 0 0.1em 0.9em; border-left: 2px solid var(--gold-bright); color: #33363b; font-style: italic; }
blockquote p { text-align: left; }
hr { border: 0; text-align: center; margin: 1.1em 0; height: 1em; }
hr::before { content: "·  ·  ·"; color: var(--gold); letter-spacing: 0.3em; }
code { font-family: 'JetBrains Mono', 'DejaVu Sans Mono', monospace; font-size: 0.84em; background: #f4f1ea; padding: 0.05em 0.25em; border-radius: 2px; }
pre { background: #f6f3ec; border-left: 2px solid var(--rule); padding: 0.7em 0.9em; font-size: 8.4pt; line-height: 1.35; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
table { width: 100%; border-collapse: collapse; margin: 0.9em 0 1.1em; font: 8.4pt/1.35 Inter, sans-serif; break-inside: auto; }
th, td { border-bottom: 1px solid var(--rule); padding: 0.4em 0.45em; text-align: left; vertical-align: top; }
th { font-weight: 600; border-bottom: 1.5px solid #9d9580; }
tr { break-inside: avoid; }
img { max-width: 100%; }
.matter img, .chapter-body img { display: block; margin: 0.9em auto 0.4em; max-height: 3.6in; }
.caption { font: italic 8.6pt/1.4 'Source Serif 4', serif; color: var(--muted); text-align: left; margin-bottom: 1.1em; }

/* cover */
.cover { page: cover; height: 9.61in; width: 6.69in; box-sizing: border-box; padding: 0.52in 0.5in 0.4in; background: radial-gradient(ellipse at 50% 66%, #142230 0%, #0d1117 55%, #080b10 100%);
  color: #f3f0e8; text-align: center; font-family: Montserrat, Inter, sans-serif; position: relative; overflow: hidden; break-after: page; }
.cover-image { padding: 0; background: var(--night); }
.cover-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-kicker { color: var(--gold-bright); font-weight: 600; font-size: 9.2pt; letter-spacing: 0.26em; text-transform: uppercase; line-height: 1.65; }
.cover-rule { display: block; height: 1px; background: linear-gradient(90deg, transparent, #b8892a 30%, #b8892a 70%, transparent); }
.cover-emblem-row { display: flex; align-items: center; gap: 0.1in; margin: 0.08in 0.6in 0.02in; }
.cover-emblem-row .cover-rule { flex: 1; }
.cover-emblem-row .cover-rule:first-child { background: linear-gradient(90deg, transparent, #b8892a); }
.cover-emblem-row .cover-rule:last-child { background: linear-gradient(90deg, #b8892a, transparent); }
.cover .emblem { width: 0.36in; height: 0.36in; }
.cover-glow { display: block; width: 92%; height: 0.13in; margin: 0.08in auto 0.1in; }
.cover-title { font-weight: 700; font-size: 47pt; line-height: 0.95; letter-spacing: 0.02em; text-transform: uppercase; margin: 0.14in 0 0; color: #fbfaf6; string-set: none; }
.cover-title .the { display: block; font-size: 25pt; letter-spacing: 0.1em; margin-bottom: 0.08in; }
.cover-sub { color: var(--gold-bright); font-weight: 700; font-size: 19.5pt; line-height: 1.15; letter-spacing: 0.07em; text-transform: uppercase; }
.cover-sub .small { display: block; font-size: 10.5pt; font-weight: 600; letter-spacing: 0.2em; margin: 0.04in 0; color: #e8d7a6; }
.cover-sub .small.dash::before, .cover-sub .small.dash::after { content: ""; display: inline-block; width: 0.32in; height: 1px; background: #b8892a; vertical-align: middle; margin: 0 0.1in; }
.cover .sphere { width: 3.5in; height: 3.5in; display: block; margin: 0.04in auto 0; }
.cover .cover-seal { position: absolute; right: 0.28in; top: 5.35in; width: 1.22in; height: 1.22in; transform: rotate(-6deg); filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6)); }
.cover-pillars { display: flex; justify-content: space-between; margin: 0.02in 0.02in 0; font-size: 7.4pt; line-height: 1.35; color: #d9d4c7; }
.cover-pillars div { flex: 1; padding: 0 0.04in; }
.cover-pillars .pillar-icon { display: block; width: 0.38in; height: 0.38in; margin: 0 auto 0.05in; }
.cover-pillars b { display: block; color: #f3f0e8; font-weight: 600; font-size: 7.6pt; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 2px; }
.cover-foot { position: absolute; left: 0.5in; right: 0.5in; bottom: 0.4in; display: flex; align-items: center; gap: 0.14in; color: var(--gold-bright); font-weight: 600; font-size: 10pt; letter-spacing: 0.28em; text-transform: uppercase; white-space: nowrap; }
.cover-foot .cover-rule { flex: 1; }

/* title + edition pages */
.titlepage { page: bare; break-after: page; text-align: center; padding-top: 1.6in; font-family: Montserrat, Inter, sans-serif; }
.tp-title { font-size: 30pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; }
.tp-sub { font-size: 13pt; font-weight: 600; color: var(--gold); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.12in; }
.tp-rule { width: 1.2in; height: 1px; background: var(--gold); margin: 0.35in auto; }
.tp-fore { font: italic 12pt 'Source Serif 4', serif; }
.tp-edition { margin-top: 1.9in; font-size: 9.5pt; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: var(--muted); }
.tp-pub { margin-top: 0.12in; font-size: 10pt; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; }
.edition { page: bare; break-after: page; padding-top: 4.4in; font-size: 8.6pt; line-height: 1.5; color: #3a3d42; }
.edition p { text-align: left; margin-bottom: 0.9em; }
.edition .review { color: #9b2c1f; font-weight: 600; }

/* contents */
.toc, .matter { page: front; break-before: right; }
.matter.back, .matter.intro { page: auto; }
.matter.intro .dp-label { margin-top: 0.9in; }
.matter.intro .matter-title { margin-top: 0.12in; }
.matter-title { font: 700 20pt/1.15 Montserrat, Inter, sans-serif; letter-spacing: 0.02em; margin: 0.9in 0 0.45in; color: var(--ink); }
.matter-title::after { content: ""; display: block; width: 0.6in; height: 2px; background: var(--gold-bright); margin-top: 0.18in; }
.toc ol { list-style: none; padding: 0; margin: 0; font: 9.4pt/1.3 Inter, sans-serif; }
.toc li { margin: 0; padding: 0.3em 0; }
.toc li a { display: flex; align-items: baseline; gap: 0.6em; }
.toc .toc-id { flex: 0 0 2.6em; font-weight: 700; color: var(--gold); }
.toc li.front .toc-id, .toc li.noid .toc-id { display: none; }
.toc .toc-title { flex: 1; }
.toc .toc-pg { flex: 0 0 2.4em; text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); }
.toc .toc-part { font: 600 7.6pt/1 Inter, sans-serif; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); padding: 1.1em 0 0.4em; }
.toc-online { font: italic 8.6pt/1.45 'Source Serif 4', serif; color: var(--muted); margin-top: 1.4em; text-align: left; }

.signature { text-align: right; font-style: italic; margin-top: 1.2em; }

/* chapters */
.chapter { break-before: right; }
.opener { page: opener; break-after: page; text-align: left; }
.dp-label { font: 600 8pt/1 Inter, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); margin-top: 0.2in; }
.chapter-title { font: 700 21pt/1.12 Montserrat, Inter, sans-serif; margin: 0.12in 0 0.16in; color: var(--ink); }
.chapter-title .dp-num { display: block; font-size: 40pt; line-height: 1; color: var(--gold-bright); margin-bottom: 0.08in; letter-spacing: -0.01em; }
.chapter-sub { font: italic 11pt/1.45 'Source Serif 4', serif; color: #3a3d42; text-align: left; margin-bottom: 0.2in; }
.illustration { margin: 0.1in 0 0.14in; text-align: center; }
.illustration img { width: 3.55in; height: 3.55in; object-fit: cover; border-radius: 3px; }
.online { font: 7.8pt/1.45 Inter, sans-serif; color: var(--muted); text-align: left; margin: 0; }
.chapter-body > h2:first-child { margin-top: 0; }
.chapter-end { font: 500 8pt/1.4 Inter, sans-serif; text-align: right; margin-top: 1.6em; color: #7a5b16; }
.chapter-end a { color: #7a5b16; }
`;

function buildHtml({ chapters, foreword, preface, intro, acknowledgements, final, builtAt, coverImage }) {
  const validDps = new Set(chapters.map((c) => c.dp));
  const ackRail = { ...acknowledgements, body: linkDpRefs(acknowledgements.body, null, validDps) };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${TITLE}: ${SUBTITLE} (${EDITION})</title>
<meta name="author" content="Meta-Layer Initiative">
<meta name="description" content="${EDITION} of ${TITLE}: ${SUBTITLE}, with a foreword by Vint Cerf.">
<meta name="keywords" content="Meta-Layer, Desirable Properties, Layered Web, Overweb">
<style>${CSS}</style>
</head>
<body>
${coverHtml(coverImage)}
${titlePagesHtml(final, builtAt)}
${tocHtml(chapters)}
${matterHtml('foreword', foreword)}
${matterHtml('preface', preface)}
${introHtml(intro, validDps)}
${chapters.map((c, i) => chapterHtml(c, validDps, i === 0)).join('\n')}
${matterHtml('acknowledgements back', ackRail).replace('id="acknowledgements back"', 'id="acknowledgements"')}
</body>
</html>`;
}

/**
 * Runs in the page after Paged.js has laid the book out. Paged.js 0.4 resets the page counter only on the
 * page that carries counter-reset, so folios are computed here instead: lower-case roman numerals for the
 * front matter (the cover counts as i), arabic from the Introduction. Each page gets its folio as --folio
 * (the margin boxes print var(--folio)), and the contents page gets the folio of each entry's target.
 */
const FOLIO_SCRIPT = String.raw`
function toRoman(n) {
  const t = [[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s;
}
window.PagedConfig = { auto: true, after: () => {
  const pages = Array.from(document.querySelectorAll('.pagedjs_page'));
  const first = document.querySelector('.main-start') || document.querySelector('.chapter.first');
  const mainStart = first ? pages.indexOf(first.closest('.pagedjs_page')) : pages.length;
  const folio = (i) => (i < mainStart ? toRoman(i + 1) : String(i - mainStart + 1));
  pages.forEach((p, i) => p.style.setProperty('--folio', JSON.stringify(folio(i))));
  document.querySelectorAll('.toc a[href^="#"]').forEach((a) => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    const pg = target && target.closest('.pagedjs_page');
    const slot = a.querySelector('.toc-pg');
    if (pg && slot) slot.textContent = folio(pages.indexOf(pg));
  });
  window.__folios = pages.map((p, i) => folio(i));
  window.__pagedDone = true;
} };
`;

// ---------------------------------------------------------------- PDF

async function savePreviews(page, spec, total) {
  const want = new Set();
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-').map((x) => (x === 'end' ? total : Number(x)));
    for (let i = a; i <= (b || a); i++) if (i >= 1 && i <= total) want.add(i);
  }
  const dir = path.join(HERE, 'out', 'preview');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^page-\d+\.png$/.test(f)) fs.unlinkSync(path.join(dir, f));
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1.4 });
  const handles = await page.$$('.pagedjs_page');
  for (const i of want) {
    await handles[i - 1].screenshot({ path: path.join(dir, `page-${String(i).padStart(3, '0')}.png`) });
  }
  console.log(`Saved ${want.size} preview PNGs to ${path.relative(REPO, dir)}`);
}

async function renderPdf(htmlFile, outFile, chromePath, preview) {
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--font-render-hinting=none'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    // Chrome embeds WebP as lossless Flate (a 1200 px illustration costs ~4 MB); re-encode as JPEG,
    // which Chrome passes through to the PDF as-is.
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img[src$=".webp"]')) {
        await img.decode();
        // 1000 px covers the 3.55 in opener illustration at ~280 dpi.
        const k = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        img.src = c.toDataURL('image/jpeg', 0.86);
        await img.decode();
      }
    });
    await page.addScriptTag({ path: path.join(HERE, 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js') });
    const t0 = Date.now();
    await page.waitForFunction(() => document.querySelector('.pagedjs_pages') && window.__pagedDone === true, { timeout: 0, polling: 1000 });
    const pages = await page.evaluate(() => document.querySelectorAll('.pagedjs_page').length);
    console.log(`Paginated ${pages} pages in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if (preview) await savePreviews(page, preview, pages);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    await page.pdf({ path: outFile, preferCSSPageSize: true, printBackground: true, outline: true, tagged: process.env.PDF_TAGGED !== '0', timeout: 0 });
    return pages;
  } finally {
    await browser.close();
  }
}

/**
 * Save the typeset cover as flat art: a PNG at the trim size (6.69 x 9.61 in) and about 384 dpi, plus a JPEG
 * beside it that the PDF uses as its cover page (PDF viewers draw the SVG glows and gradients unevenly, so the
 * cover goes into the PDF as the same image every time).
 */
async function renderCoverPng(outPng, chromePath) {
  const { default: puppeteer } = await import('puppeteer-core');
  const htmlFile = path.join(HERE, 'out', 'cover.html');
  fs.writeFileSync(htmlFile, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}\nhtml,body{margin:0;background:#0d1117}</style></head><body>${coverHtml(null)}</body></html>`);
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 643, height: 923, deviceScaleFactor: 4 });
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(outPng), { recursive: true });
    const el = await page.$('.cover');
    await el.screenshot({ path: outPng });
    await el.screenshot({ path: outPng.replace(/\.png$/i, '') + '.jpg', type: 'jpeg', quality: 92 });
  } finally {
    await browser.close();
  }
  console.log(`Wrote ${outPng}`);
  return outPng.replace(/\.png$/i, '') + '.jpg';
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sat = JSON.parse(fs.readFileSync(SOURCES_SAT, 'utf8'));
  const byKey = Object.fromEntries(sat.sources.filter((s) => s.railKey).map((s) => [s.railKey, s]));
  const ml = (key) => { const m = byKey[key]?.mlNumber; if (!m) throw new Error(`No ML-Draft for rail ${key} in sources-sat.json`); return m; };

  const dpRails = sat.articleRails.filter((k) => /^dp\d{2}$/.test(k)).map((k) => byKey[k])
    .filter((s) => s && (!args.only || args.only.includes(s.dp)));
  const manifest = { builtAt: new Date().toISOString(), hub: args.hub, final: args.final, rails: {} };
  const load = (key) => {
    ml(key);
    const { passages, source } = fetchRail(args.hub, byKey[key], args.offline);
    manifest.rails[key] = { ml: byKey[key].mlNumber, source, passages: passages.length, sha256: createHash('sha256').update(JSON.stringify(passages)).digest('hex').slice(0, 16) };
    return passages;
  };

  console.log(`${args.offline ? 'Reading cached' : 'Fetching'} ${dpRails.length} chapters + front/back matter from ${args.hub}`);
  const foreword = prepareRail(load('foreword'));
  const preface = prepareRail(load('about'));
  const intro = prepareRail(load('ml-draft-026'));
  const acknowledgements = prepareRail(load('acknowledgements'));
  const chapters = dpRails.map((s) => {
    const r = prepareRail(load(s.railKey));
    if (!r.title) throw new Error(`${s.dp}: chapter has no title passage`);
    if (!r.image) console.warn(`  ! ${s.dp}: no illustration passage found`);
    if (/massive transformati/i.test(r.body)) console.warn(`  ! ${s.dp}: mentions an MTP — MTPs are out of V1.0, check the text`);
    return { ...r, dp: s.dp, railKey: s.railKey };
  });

  // The cover is rendered once as an image and placed in the PDF as that image (unless --cover-image is given).
  let coverImage = args.coverImage;
  if (!coverImage && !args.htmlOnly) coverImage = await renderCoverPng(args.coverPng || path.join(HERE, 'out', 'cover.png'), findChrome(args.chrome));
  else if (args.coverPng) await renderCoverPng(args.coverPng, findChrome(args.chrome));
  const builtAt = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'long', timeStyle: 'short' }) + ' PT';
  const html = buildHtml({ chapters, foreword, preface, intro, acknowledgements, final: args.final, builtAt, coverImage })
    .replace('</head>', `<script>${FOLIO_SCRIPT}</script>\n</head>`);

  const workDir = path.join(HERE, 'out');
  fs.mkdirSync(workDir, { recursive: true });
  const htmlFile = path.join(workDir, 'book.html');
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${path.relative(REPO, htmlFile)}`);
  if (args.htmlOnly) return;

  const pages = await renderPdf(htmlFile, args.out, findChrome(args.chrome), args.preview);
  const mb = (fs.statSync(args.out).size / 1e6).toFixed(1);
  console.log(`Wrote ${args.out} (${pages} pages, ${mb} MB)`);
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
