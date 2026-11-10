// Generates the pixel-art SVGs used by the profile README into assets/.
// Zero dependencies. Usage:  GITHUB_TOKEN=... node scripts/generate.mjs
// (a GitHub Action runs it every day, see .github/workflows/update.yml)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGIN = process.env.PROFILE_LOGIN || 'Andrea17982';
const W = 420; // logical width in "game pixels"; rendered at 2x

// Loop Hero-like palette: dark, dusty, few colours.
const P = {
  black: '#0c0b0e', bg: '#141218', panel: '#1a1820', ink: '#26222c',
  bone: '#d8c9a3', dim: '#8b8070', ochre: '#c79a4b', gold: '#e6bd62',
  brick: '#8f3a2a', red: '#c9583a', moss: '#4f6a3a', green: '#7c9a4a',
  teal: '#4a7f7a', steel: '#5d6c82', night: '#1b2033', dusk: '#2b233a',
};

// ---------------------------------------------------------------- pixel font
const GLYPHS = Object.fromEntries(
  `A 01110 10001 10001 11111 10001 10001 10001
B 11110 10001 10001 11110 10001 10001 11110
C 01110 10001 10000 10000 10000 10001 01110
D 11110 10001 10001 10001 10001 10001 11110
E 11111 10000 10000 11110 10000 10000 11111
F 11111 10000 10000 11110 10000 10000 10000
G 01110 10001 10000 10111 10001 10001 01111
H 10001 10001 10001 11111 10001 10001 10001
I 01110 00100 00100 00100 00100 00100 01110
J 00111 00010 00010 00010 00010 10010 01100
K 10001 10010 10100 11000 10100 10010 10001
L 10000 10000 10000 10000 10000 10000 11111
M 10001 11011 10101 10101 10001 10001 10001
N 10001 11001 10101 10011 10001 10001 10001
O 01110 10001 10001 10001 10001 10001 01110
P 11110 10001 10001 11110 10000 10000 10000
Q 01110 10001 10001 10001 10101 10010 01101
R 11110 10001 10001 11110 10100 10010 10001
S 01111 10000 10000 01110 00001 00001 11110
T 11111 00100 00100 00100 00100 00100 00100
U 10001 10001 10001 10001 10001 10001 01110
V 10001 10001 10001 10001 10001 01010 00100
W 10001 10001 10001 10101 10101 11011 10001
X 10001 10001 01010 00100 01010 10001 10001
Y 10001 10001 01010 00100 00100 00100 00100
Z 11111 00001 00010 00100 01000 10000 11111
0 01110 10001 10011 10101 11001 10001 01110
1 00100 01100 00100 00100 00100 00100 01110
2 01110 10001 00001 00010 00100 01000 11111
3 11110 00001 00001 01110 00001 00001 11110
4 00010 00110 01010 10010 11111 00010 00010
5 11111 10000 11110 00001 00001 10001 01110
6 00110 01000 10000 11110 10001 10001 01110
7 11111 00001 00010 00100 01000 01000 01000
8 01110 10001 10001 01110 10001 10001 01110
9 01110 10001 10001 01111 00001 00010 01100
. 00000 00000 00000 00000 00000 01100 01100
, 00000 00000 00000 00000 01100 00100 01000
! 00100 00100 00100 00100 00100 00000 00100
? 01110 10001 00001 00010 00100 00000 00100
: 00000 01100 01100 00000 01100 01100 00000
' 00100 00100 01000 00000 00000 00000 00000
- 00000 00000 00000 11111 00000 00000 00000
+ 00000 00100 00100 11111 00100 00100 00000
/ 00001 00001 00010 00100 01000 10000 10000
% 11001 11001 00010 00100 01000 10011 10011
# 01010 01010 11111 01010 11111 01010 01010
( 00010 00100 01000 01000 01000 00100 00010
) 01000 00100 00010 00010 00010 00100 01000
> 10000 11000 11100 11110 11100 11000 10000
* 00100 10101 01110 11111 01110 10101 00100
& 01100 10010 10100 01000 10101 10010 01101
_ 00000 00000 00000 00000 00000 00000 11111
~ 00000 00000 00000 00100 00000 00000 00000`
    .split('\n')
    .map((l) => [l[0], l.slice(2).split(' ')]),
);

/** SVG path data for one glyph (horizontal runs merged). */
function glyph(ch, x, y, s = 1) {
  const rows = GLYPHS[ch];
  if (!rows) return '';
  let d = '';
  rows.forEach((row, r) => {
    for (let c = 0; c < 5; c++) {
      if (row[c] !== '1') continue;
      let len = 1;
      while (row[c + len] === '1') len++;
      d += `M${x + c * s} ${y + r * s}h${len * s}v${s}h${-len * s}z`;
      c += len;
    }
  });
  return d;
}
const textWidth = (str, s = 1) => str.length * 6 * s - s;
/** Pixel text. align: 'l' | 'c' | 'r' relative to x. */
function text(str, x, y, fill, s = 1, align = 'l') {
  str = String(str).toUpperCase();
  if (align === 'c') x -= Math.round(textWidth(str, s) / 2);
  if (align === 'r') x -= textWidth(str, s);
  let d = '';
  [...str].forEach((ch, i) => (d += glyph(ch, x + i * 6 * s, y, s)));
  return `<path fill="${fill}" d="${d}"/>`;
}
const shadowText = (str, x, y, fill, shadow, s = 1, align = 'l') =>
  text(str, x + s, y + s, shadow, s, align) + text(str, x, y, fill, s, align);

// ------------------------------------------------------------------ helpers
const R = (x, y, w, h, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${extra}/>`;

/** Text box in the shape of a GBA Pokémon window, in Loop Hero colours. */
function frame(x, y, w, h, { band = P.ochre, fill = P.panel } = {}) {
  return (
    R(x + 2, y, w - 4, h, P.black) + R(x, y + 2, w, h - 4, P.black) + R(x + 1, y + 1, w - 2, h - 2, P.black) +
    R(x + 2, y + 1, w - 4, h - 2, band) + R(x + 1, y + 2, w - 2, h - 4, band) +
    R(x + 3, y + 3, w - 6, h - 6, P.black) + R(x + 4, y + 4, w - 8, h - 8, fill)
  );
}
function bar(x, y, w, ratio, color) {
  const fillW = Math.max(0, Math.min(w - 2, Math.round((w - 2) * ratio)));
  return R(x, y, w, 7, P.black) + R(x + 1, y + 1, w - 2, 5, P.ink) + R(x + 1, y + 1, fillW, 5, color) +
    (fillW > 1 ? R(x + 1, y + 1, fillW, 1, 'rgba(255,255,255,.25)') : '');
}
function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ sprites
const FRAME = 101; // every Rodent Heroes sprite frame is 101x101
const spriteCache = new Map();
function sprite(name) {
  if (!spriteCache.has(name)) {
    const buf = readFileSync(join(ROOT, 'sprites', `${name}.png`));
    spriteCache.set(name, { b64: buf.toString('base64'), w: buf.readUInt32BE(16), frames: buf.readUInt32BE(16) / FRAME });
  }
  return spriteCache.get(name);
}
/** <defs> entries + frame-stepping keyframes for the sprites a file uses. */
function spriteDefs(names) {
  const counts = new Set();
  const defs = names.map((n) => {
    const s = sprite(n);
    if (s.frames > 1) counts.add(s.frames);
    return `<image id="s-${n}" width="${s.w}" height="${FRAME}" href="data:image/png;base64,${s.b64}" style="image-rendering:pixelated"/>`;
  });
  const css = [...counts].map((n) => `@keyframes f${n}{to{transform:translateX(-${n * FRAME}px)}}`).join('');
  return { defs: `<defs>${defs.join('')}</defs>`, css };
}
/** One (animated) sprite, top-left of its 101x101 frame at x,y. */
function put(name, x, y, { fps = 9, delay = 0, flip = false, scale = 1 } = {}) {
  const s = sprite(name);
  const anim = s.frames > 1
    ? ` style="animation:f${s.frames} ${(s.frames / fps).toFixed(2)}s steps(${s.frames}) ${-delay}s infinite"`
    : '';
  const inner = `<svg x="${flip ? 0 : x}" y="${flip ? 0 : y}" width="${FRAME * scale}" height="${FRAME * scale}" viewBox="0 0 ${FRAME} ${FRAME}"><use href="#s-${name}"${anim}/></svg>`;
  return flip ? `<g transform="translate(${x + FRAME} ${y}) scale(-1 1)">${inner}</g>` : inner;
}

function svg(h, body, css = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W * 2}" height="${h * 2}" shape-rendering="crispEdges">` +
    `<style>@media (prefers-reduced-motion:reduce){*{animation:none!important}}${css}</style>${body}</svg>\n`;
}

// ------------------------------------------------------------------- header
function header() {
  const H = 150, HORIZON = 100;
  const rand = rng(11);
  let b = '';
  const sky = ['#0c0b12', '#100e19', '#151322', '#1a182c', '#201c34', '#282038', '#32243a'];
  const bh = HORIZON / sky.length;
  sky.forEach((c, i) => {
    const y = Math.floor(i * bh);
    b += R(0, y, W, Math.ceil(bh) + 1, c);
    if (i) for (let x = 0; x < W; x += 4) b += R(x, y - 1, 2, 1, c); // dither between bands
  });
  // stars
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * W), y = Math.floor(rand() * rand() * 80);
    b += R(x, y, 1, 1, rand() > 0.6 ? '#9fa7c9' : P.bone, ` class="tw" style="animation-delay:${-(rand() * 6).toFixed(1)}s"`);
  }
  // moon
  const disc = (cx, cy, r, f) => {
    let s = '';
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      s += R(cx - half, cy + y, half * 2 + 1, 1, f);
    }
    return s;
  };
  b += disc(372, 28, 10, P.bone) + disc(368, 25, 2, '#b9ab88') + disc(377, 33, 1, '#b9ab88') + R(374, 22, 2, 1, '#b9ab88');
  // far mountains + a volcano (hello, Mt. Chimney)
  let d = `M0 ${HORIZON}`;
  for (let x = 0; x <= W; x += 2) {
    const ridge = 12 + 7 * Math.sin(x * 0.04 + 1) + 4 * Math.sin(x * 0.11 + 2) + 2 * Math.sin(x * 0.3);
    const cone = Math.min(34, 38 - Math.abs(x - 300) * 0.7);
    d += `V${HORIZON - Math.round(Math.max(ridge, cone))}h2`;
  }
  b += `<path fill="#15131d" d="${d}V${HORIZON}z"/>` + R(295, HORIZON - 34, 11, 1, P.red) + R(296, HORIZON - 33, 9, 1, P.brick);
  for (let i = 0; i < 3; i++)
    b += `<g class="smoke" style="animation-delay:${-i * 2}s">${disc(300, HORIZON - 40, 3, '#2a2636')}</g>`;
  // ground
  ['#131b15', '#162018', '#19251b', '#1c2a1e', '#1f2f21'].forEach((c, i) => (b += R(0, HORIZON + i * 10, W, 11, c)));
  b += R(0, 127, W, 13, '#2c261d') + R(0, 127, W, 1, '#1a1712') + R(0, 139, W, 1, '#1a1712');
  for (let i = 0; i < 60; i++) b += R(Math.floor(rand() * W), 128 + Math.floor(rand() * 11), 2, 1, rand() > 0.5 ? '#3a3226' : '#221d16');
  // tree line
  for (let x = -4; x < W + 8; x += 9 + Math.floor(rand() * 5)) {
    const h = 12 + Math.floor(rand() * 10), base = HORIZON + 2 + Math.floor(rand() * 2);
    for (let r = 0; r < h; r++) {
      const half = 1 + Math.floor((r % 5) * 0.7 + r * 0.2);
      b += R(x - half, base - h + r, half * 2 + 1, 1, '#0d1713') + R(x - half, base - h + r, Math.max(1, half - 1), 1, '#14231b');
    }
  }
  // grass tufts (half of them sway)
  let still = '', sway = '';
  for (let i = 0; i < 150; i++) {
    const t = Math.pow(rand(), 1.3), x = Math.floor(rand() * W), y = Math.round(HORIZON + 6 + t * 42);
    if (y > 122 && y < 142) continue; // keep the path clear
    const s = 1 + Math.floor(t * 2.5), c = rand() > 0.5 ? '#3d5a34' : '#0f1a12';
    const g = R(x, y - s, 1, s + 1, c) + R(x - s, y - s - 1, 1, s, c) + R(x + s, y - s - 1, 1, s, c) + R(x - 1, y - 1, 3, 1, c);
    if (rand() > 0.5) sway += g; else still += g;
  }
  b += still + `<g class="sway">${sway}</g>`;
  // fireflies
  for (let i = 0; i < 9; i++)
    b += R(Math.floor(rand() * W), 104 + Math.floor(rand() * 40), 1, 1, '#d9e27a', ` class="fly" style="animation-delay:${-(rand() * 5).toFixed(1)}s"`);
  // the encounter
  b += put('warrior-idle', 26, 48) + put('slime-fire-idle', 292, 51, { delay: 0.3 }) +
    `<g class="bob">${put('bat-idle', 222, 22, { fps: 11 })}</g>`;
  // title
  b += shadowText('Andrea Nastro', W / 2, 12, P.gold, P.brick, 3, 'c');
  b += shadowText('Software developer ~ Indie game dev', W / 2, 42, P.bone, P.black, 1, 'c');

  const names = ['warrior-idle', 'slime-fire-idle', 'bat-idle'];
  const { defs, css } = spriteDefs(names);
  return svg(H, defs + b, css +
    `.tw{animation:tw 6s step-end infinite}@keyframes tw{0%{opacity:1}80%{opacity:.25}90%{opacity:1}}` +
    `.sway{animation:sway 1.2s steps(2) infinite}@keyframes sway{to{transform:translateX(2px)}}` +
    `.fly{animation:fly 5s step-end infinite}@keyframes fly{0%{opacity:1}35%{opacity:0}70%{opacity:1;transform:translate(3px,-2px)}}` +
    `.bob{animation:bob 1.6s steps(4) infinite alternate}@keyframes bob{to{transform:translateY(6px)}}` +
    `.smoke{animation:smoke 6s steps(12) infinite}@keyframes smoke{from{opacity:.9}to{transform:translate(22px,-26px);opacity:0}}`);
}

// ------------------------------------------------------------------- dialog
function dialog(lines) {
  const H = 58, PER = 6, STEP = 0.04, T = lines.length * PER;
  let b = frame(4, 2, W - 8, H - 4);
  lines.forEach((msg, m) => {
    let i = 0, g = '';
    msg.forEach((line, row) => {
      [...line.toUpperCase()].forEach((ch, c) => {
        const d = glyph(ch, 18 + c * 6, 15 + row * 15);
        if (d) g += `<path class="t" style="animation-delay:${(m * PER + i * STEP).toFixed(2)}s" d="${d}"/>`;
        i++;
      });
    });
    b += `<g class="t" fill="${P.bone}" style="animation-delay:${m * PER}s">${g}</g>`;
  });
  b += `<path class="cur" fill="${P.red}" d="M392 40h7v1h-7zM393 41h5v1h-5zM394 42h3v1h-3zM395 43h1v1h-1z"/>`;
  // .t: hidden, then visible for PER seconds starting at its own delay, once per cycle
  return svg(H, b,
    `.t{opacity:0;animation:t ${T}s step-end infinite}@keyframes t{0%{opacity:1}${(100 / lines.length).toFixed(3)}%{opacity:0}}` +
    `.cur{animation:cur .8s steps(2) infinite}@keyframes cur{to{transform:translateY(2px)}}`);
}

// -------------------------------------------------------------- trainer card
function card(s) {
  const H = 178;
  let b = frame(4, 2, W - 8, H - 4);
  b += text('Trainer card', 16, 12, P.ochre) + text(`ID no. ${s.id}`, W - 16, 12, P.dim, 1, 'r');
  b += R(14, 22, W - 28, 1, P.ink);
  // portrait
  b += frame(14, 28, 112, 112, { band: P.steel, fill: P.night });
  for (let i = 0; i < 4; i++) b += R(18, 110 + i * 7, 104, 7, ['#1f2a22', '#243024', '#293627', '#2e3c2a'][i]);
  b += put('mage-idle', 19, 30);
  b += text(s.login, 70, 146, P.bone, 1, 'c') + text(s.title, 70, 158, P.ochre, 1, 'c');
  // level + bars
  const x = 138;
  b += shadowText(`LV ${s.level}`, x, 30, P.gold, P.brick, 2);
  b += text('EXP', x + 76, 30, P.dim) + bar(x + 98, 30, 168, s.expRatio, P.teal);
  b += text(`${s.exp} / ${s.expNext} to next level`, x + 266, 40, P.dim, 1, 'r');
  b += text('HP', x, 56, P.red) + bar(x + 16, 56, 110, s.hpRatio, P.red) + text(`${s.streak} day streak`, x + 132, 56, P.bone);
  b += text('MP', x, 68, P.steel) + bar(x + 16, 68, 110, s.mpRatio, P.steel) + text(`${s.week} this week`, x + 132, 68, P.bone);
  b += R(x, 81, 268, 1, P.ink);
  // stats
  s.stats.forEach(([label, value], i) => {
    const cx = x + (i % 2) * 138, cy = 88 + Math.floor(i / 2) * 12;
    b += text(label, cx, cy, P.dim) + text(value, cx + 124, cy, P.bone, 1, 'r');
  });
  b += R(x, 124, 268, 1, P.ink);
  // moves = most used languages
  b += text('Moves', x, 130, P.ochre);
  s.langs.forEach((l, i) => {
    const cx = x + (i % 2) * 138, cy = 142 + Math.floor(i / 2) * 13;
    b += text(l.name.slice(0, 10), cx, cy, P.bone) + bar(cx + 64, cy, 36, l.ratio, l.color) +
      text(`${Math.round(l.ratio * 100)}%`, cx + 124, cy, P.dim, 1, 'r');
  });
  const { defs, css } = spriteDefs(['mage-idle']);
  return svg(H, defs + b, css);
}

// ------------------------------------------------------- contribution "loop"
function loop(s) {
  const H = 152, CELL = 7, X0 = Math.round((W - s.weeks.length * CELL + 1) / 2), Y0 = 96, T = 26, WALK = 0.72;
  const LEVEL = { NONE: P.ink, FIRST_QUARTILE: '#4a4a30', SECOND_QUARTILE: P.moss, THIRD_QUARTILE: P.ochre, FOURTH_QUARTILE: P.red };
  let b = frame(4, 2, W - 8, H - 4);
  b += text('The loop ~ last 12 months', 16, 12, P.ochre) + text(`${s.total} contributions`, W - 16, 12, P.bone, 1, 'r');
  const from = -FRAME, to = W, speed = (to - from) / (T * WALK); // px per second
  s.weeks.forEach((week, c) => {
    const x = X0 + c * CELL;
    week.forEach((day) => (b += R(x, Y0 + day.weekday * CELL, CELL - 1, CELL - 1, LEVEL[day.level] ?? P.ink)));
    // the column flashes when the hero walks over it
    const at = (x + 3 - (from + FRAME / 2)) / speed;
    b += R(x, Y0, CELL - 1, 7 * CELL - 1, '#fff', ` class="hit" style="animation-delay:${at.toFixed(2)}s"`);
  });
  b += text('less', X0, 86, P.dim);
  Object.values(LEVEL).forEach((c, i) => (b += R(X0 + 28 + i * 8, 86, 6, 6, c)));
  b += text('more', X0 + 72, 86, P.dim);
  b += `<g class="walk">${put('warrior-idle', 0, 4, { fps: 12 })}</g>`;
  b += `<g class="flyby">${put('bat-idle', 0, -12, { fps: 11 })}</g>`;
  const { defs, css } = spriteDefs(['warrior-idle', 'bat-idle']);
  return svg(H, `<clipPath id="in"><rect x="6" y="4" width="${W - 12}" height="${H - 8}"/></clipPath>${defs}<g clip-path="url(#in)">${b}</g>`, css +
    `.walk{animation:walk ${T}s linear infinite}@keyframes walk{0%{transform:translateX(${from}px)}${WALK * 100}%,100%{transform:translateX(${to}px)}}` +
    `.hit{opacity:0;animation:hit ${T}s linear infinite}@keyframes hit{0%{opacity:.6}2.5%,100%{opacity:0}}` +
    `.flyby{animation:flyby ${T * 0.6}s linear infinite}@keyframes flyby{from{transform:translateX(${W}px)}to{transform:translateX(${-FRAME}px)}}`);
}

// ----------------------------------------------------------- small pieces
function title(label) {
  const H = 22, w = textWidth(label, 2) + 22;
  let b = text('>', 2, 4, P.red, 2) + shadowText(label, 16, 4, P.gold, P.brick, 2);
  for (let x = w + 4; x < W - 2; x += 6) b += R(x, 12, 3, 2, P.dim);
  return svg(H, b);
}
function questRodent() {
  const H = 140, SCALE = 0.7, SIZE = FRAME * SCALE;
  let b = frame(4, 2, W - 8, H - 4);
  b += shadowText('Rodent Heroes', 16, 12, P.gold, P.brick, 2) + text('In development', W - 16, 16, P.red, 1, 'r');
  b += text('A 2D pixel art RPG about small heroes and very large slimes.', 16, 32, P.bone);
  b += text('Godot 2D client ~ authoritative TypeScript backend', 16, 44, P.dim);
  for (let i = 0; i < 3; i++) b += R(8, 104 + i * 6, W - 16, 6, ['#19251b', '#1c2a1e', '#1f2f21'][i]);
  const party = [['warrior', 'Warrior'], ['mage', 'Mage'], ['assassin', 'Assassin'], ['barbarian', 'Barbarian'], ['reaper', 'Reaper']];
  party.forEach(([name, label], i) => {
    const cx = Math.round((W * (i + 1)) / (party.length + 1)); // evenly spaced, symmetric
    b += put(name, Math.round(cx - SIZE / 2), 54, { scale: SCALE }) + text(label, cx, 124, P.bone, 1, 'c');
  });
  const { defs, css } = spriteDefs(party.map((p) => p[0]));
  return svg(H, defs + b, css);
}
function questLumen() {
  const H = 66;
  let b = frame(4, 2, W - 8, H - 4, { band: P.steel });
  b += shadowText('Lumen', 16, 12, P.gold, P.brick, 2) + text('Early alpha', W - 16, 16, P.red, 1, 'r');
  b += text('A desktop workspace for Claude Code and Codex, written by AI.', 16, 32, P.bone);
  b += text('Tauri 2 ~ Rust ~ React', 16, 46, P.dim) + text('> Open repo', W - 16, 46, P.ochre, 1, 'r');
  return svg(H, b);
}

// --------------------------------------------------------------------- data
async function fetchStats() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const query = `query($login:String!){user(login:$login){databaseId login followers{totalCount}
    pullRequests{totalCount} issues{totalCount}
    repositories(first:100,ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC){totalCount nodes{stargazerCount
      languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}
    contributionsCollection{totalCommitContributions contributionCalendar{totalContributions
      weeks{contributionDays{contributionCount contributionLevel date weekday}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'profile-readme-generator' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${JSON.stringify(json.errors ?? json)}`);
  const u = json.data.user;
  const cal = u.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);

  // streaks (an empty "today" does not break the current streak yet)
  let streak = 0, longest = 0, run = 0;
  days.forEach((d) => { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); });
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount) streak++;
    else if (i !== days.length - 1) break;
  }
  const weekSums = cal.weeks.map((w) => w.contributionDays.reduce((a, d) => a + d.contributionCount, 0));
  const week = weekSums.at(-1), bestWeek = Math.max(1, ...weekSums);

  // languages by bytes across public, non-fork repositories
  const sizes = new Map();
  for (const repo of u.repositories.nodes)
    for (const e of repo.languages.edges) {
      const cur = sizes.get(e.node.name) ?? { name: e.node.name, color: e.node.color ?? P.ochre, size: 0 };
      cur.size += e.size;
      sizes.set(e.node.name, cur);
    }
  const all = [...sizes.values()].sort((a, b) => b.size - a.size);
  const totalSize = all.reduce((a, l) => a + l.size, 0) || 1;

  // level: 1 + floor(sqrt(contributions in the last year)); EXP = progress to the next one
  const total = cal.totalContributions;
  const level = 1 + Math.floor(Math.sqrt(total));
  const floor = (level - 1) ** 2, next = level ** 2;
  const titles = ['Rookie', 'Code squire', 'Code knight', 'Code mage', 'Archmage', 'Legend'];
  return {
    id: u.databaseId, login: u.login, total, level,
    title: titles[Math.min(titles.length - 1, Math.floor(level / 8))],
    exp: total - floor, expNext: next - floor, expRatio: (total - floor) / (next - floor),
    streak, hpRatio: longest ? streak / longest : 0, week, mpRatio: week / bestWeek,
    stats: [
      ['Commits (1y)', u.contributionsCollection.totalCommitContributions],
      ['Stars', u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0)],
      ['Pull requests', u.pullRequests.totalCount],
      ['Public repos', u.repositories.totalCount],
      ['Issues', u.issues.totalCount],
      ['Followers', u.followers.totalCount],
    ],
    langs: all.slice(0, 4).map((l) => ({ name: l.name, color: l.color, ratio: l.size / totalSize })),
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ weekday: d.weekday, level: d.contributionLevel }))),
  };
}

// --------------------------------------------------------------------- main
const out = join(ROOT, 'assets');
mkdirSync(out, { recursive: true });
const save = (name, content) => { writeFileSync(join(out, name), content); console.log(`${name.padEnd(18)} ${(content.length / 1024).toFixed(1)} kB`); };

save('header.svg', header());
save('dialog.svg', dialog([
  ['A wild ANDREA appeared!', 'It seems to be writing code...'],
  ['ANDREA used GIT PUSH --FORCE!', "It's not very effective..."],
  ['ANDREA is building RODENT HEROES,', 'an RPG about very brave mice.'],
  ['Scroll down to check the party,', 'the quests and the inventory.'],
]));
save('title-about.svg', title('About'));
save('title-status.svg', title('Status'));
save('title-quests.svg', title('Quests'));
save('title-inventory.svg', title('Inventory'));
save('title-contact.svg', title('Contact'));
save('quest-rodent.svg', questRodent());
save('quest-lumen.svg', questLumen());

const stats = await fetchStats();
save('card.svg', card(stats));
save('loop.svg', loop(stats));
