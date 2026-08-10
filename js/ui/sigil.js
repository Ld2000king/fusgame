/* ============================================================================
   CREATURE PORTRAIT — procedural monster art
   Every card owns a deterministic monster derived from its id: same input,
   same beast, forever. Body silhouette, horns, wings, eyes and mouth are all
   computed from a seeded RNG — no image assets, no hand-authored path data.

   Element decides the creature's temperament (a smooth, round body for
   water/life/earth; an angular, faceted one for fire/arcane/metal/air) so a
   player can still read a card's element from its silhouette alone, the way
   the old alchemical sigils read from color. Tier decides how elaborate the
   beast is — more silhouette detail, more horns, better odds of wings or a
   third eye, and only the rarest creatures earn a crown. A small chest rune,
   reusing the classical elemental glyph, is the one thread kept from this
   file's previous life as an alchemical-diagram generator: these are
   alchemically grown things, and they carry their maker's mark.
   ========================================================================= */

const TAU = Math.PI * 2;

/* xmur3 string hash -> mulberry32 PRNG. Same id, same monster, forever. */
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h ^= h >>> 16) >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, lo, hi) => lo + r() * (hi - lo);
const intBetween = (r, lo, hi) => Math.floor(between(r, lo, hi + 1));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const pt = (cx, cy, radius, angle) => [
  cx + Math.cos(angle) * radius,
  cy + Math.sin(angle) * radius,
];
const fx = (n) => Number(n).toFixed(2);

/* -- Classical elemental glyphs — kept as a small chest rune. --------------- */
function elementGlyph(el, cx, cy, s) {
  const up = `${fx(cx)},${fx(cy - s)} ${fx(cx - s * 0.92)},${fx(cy + s * 0.62)} ${fx(cx + s * 0.92)},${fx(cy + s * 0.62)}`;
  const dn = `${fx(cx)},${fx(cy + s)} ${fx(cx - s * 0.92)},${fx(cy - s * 0.62)} ${fx(cx + s * 0.92)},${fx(cy - s * 0.62)}`;
  const bar = (y) => `<line x1="${fx(cx - s * 0.5)}" y1="${fx(y)}" x2="${fx(cx + s * 0.5)}" y2="${fx(y)}"/>`;

  switch (el) {
    case 'fire':   return `<polygon points="${up}"/>`;
    case 'water':  return `<polygon points="${dn}"/>`;
    case 'air':    return `<polygon points="${up}"/>${bar(cy + s * 0.02)}`;
    case 'earth':  return `<polygon points="${dn}"/>${bar(cy - s * 0.02)}`;
    case 'life':
      return `<circle cx="${fx(cx)}" cy="${fx(cy - s * 0.34)}" r="${fx(s * 0.5)}"/>` +
             `<line x1="${fx(cx)}" y1="${fx(cy + s * 0.16)}" x2="${fx(cx)}" y2="${fx(cy + s)}"/>` +
             `<line x1="${fx(cx - s * 0.42)}" y1="${fx(cy + s * 0.58)}" x2="${fx(cx + s * 0.42)}" y2="${fx(cy + s * 0.58)}"/>`;
    case 'metal':
      return `<circle cx="${fx(cx)}" cy="${fx(cy - s * 0.2)}" r="${fx(s * 0.52)}"/>` +
             `<line x1="${fx(cx + s * 0.34)}" y1="${fx(cy - s * 0.56)}" x2="${fx(cx + s * 0.95)}" y2="${fx(cy - s)}"/>` +
             `<line x1="${fx(cx + s * 0.95)}" y1="${fx(cy - s)}" x2="${fx(cx + s * 0.42)}" y2="${fx(cy - s)}"/>` +
             `<line x1="${fx(cx + s * 0.95)}" y1="${fx(cy - s)}" x2="${fx(cx + s * 0.95)}" y2="${fx(cy - s * 0.46)}"/>`;
    case 'arcane':
      return `<polygon points="${up}"/><polygon points="${dn}"/>`;
    case 'shadow':
      return `<circle cx="${fx(cx)}" cy="${fx(cy)}" r="${fx(s * 0.86)}"/>` +
             `<path d="M ${fx(cx)} ${fx(cy - s * 0.86)} A ${fx(s * 0.86)} ${fx(s * 0.86)} 0 0 0 ${fx(cx)} ${fx(cy + s * 0.86)} Z" fill="currentColor" stroke="none"/>`;
    default:       return `<circle cx="${fx(cx)}" cy="${fx(cy)}" r="${fx(s * 0.8)}"/>`;
  }
}

/* -- Per-element temperament: how the body silhouette behaves. ------------- */
const PROFILE = {
  fire:   { smooth: false, jitter: 0.30, spikes: [1, 3], spikeLen: [0.38, 0.6],  wing: 0.10 },
  water:  { smooth: true,  jitter: 0.14, spikes: [0, 1], spikeLen: [0.16, 0.26], wing: 0.10 },
  earth:  { smooth: true,  jitter: 0.12, spikes: [0, 2], spikeLen: [0.12, 0.2],  wing: 0.02 },
  air:    { smooth: false, jitter: 0.18, spikes: [0, 1], spikeLen: [0.14, 0.24], wing: 0.60 },
  life:   { smooth: true,  jitter: 0.16, spikes: [0, 2], spikeLen: [0.14, 0.28], wing: 0.08 },
  arcane: { smooth: false, jitter: 0.22, spikes: [1, 3], spikeLen: [0.2, 0.4],   wing: 0.22 },
  shadow: { smooth: true,  jitter: 0.28, spikes: [1, 3], spikeLen: [0.22, 0.42], wing: 0.24 },
  metal:  { smooth: false, jitter: 0.09, spikes: [1, 2], spikeLen: [0.12, 0.2],  wing: 0.05 },
};

/* Organic silhouette: two seeded sine harmonics, not per-point noise, so the
   outline reads as a body rather than a scribble. */
function bodyPoints(r, cx, cy, R, jitter, n) {
  const h1 = { amp: between(r, 0.55, 1) * jitter, freq: intBetween(r, 2, 3), phase: r() * TAU };
  const h2 = { amp: between(r, 0.25, 0.6) * jitter, freq: intBetween(r, 3, 5), phase: r() * TAU };
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const wobble = Math.sin(a * h1.freq + h1.phase) * h1.amp + Math.sin(a * h2.freq + h2.phase) * h2.amp;
    const rad = R * (1 + wobble);
    pts.push({ a, rad, p: pt(cx, cy, rad, a) });
  }
  return pts;
}

/* Smooth closed silhouette — quadratic curve through each edge's midpoint. */
function smoothClosedPath(pts) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${fx(mid(pts[n - 1].p, pts[0].p)[0])} ${fx(mid(pts[n - 1].p, pts[0].p)[1])} `;
  for (let i = 0; i < n; i++) {
    const cur = pts[i].p;
    const next = pts[(i + 1) % n].p;
    const m = mid(cur, next);
    d += `Q ${fx(cur[0])} ${fx(cur[1])} ${fx(m[0])} ${fx(m[1])} `;
  }
  return d + 'Z';
}

/* Angular silhouette — straight edges through the same points (faceted). */
function facetedClosedPath(pts) {
  return 'M ' + pts.map((pt2) => `${fx(pt2.p[0])} ${fx(pt2.p[1])}`).join(' L ') + ' Z';
}

/* A horn/spike growing outward from one silhouette point along its normal. */
function spike(cx, cy, ptData, R, len, width) {
  const { a, rad, p } = ptData;
  const tip = pt(cx, cy, rad + R * len, a);
  const baseA1 = a - width;
  const baseA2 = a + width;
  const b1 = pt(cx, cy, rad * 0.95, baseA1);
  const b2 = pt(cx, cy, rad * 0.95, baseA2);
  return `<polygon points="${fx(b1[0])},${fx(b1[1])} ${fx(tip[0])},${fx(tip[1])} ${fx(b2[0])},${fx(b2[1])}" fill="currentColor" opacity="0.92"/>`;
}

/* A membrane wing flanking the body. side: -1 (left) or 1 (right). */
function wing(cx, cy, R, side, size, droop) {
  const root = [cx + side * R * 0.5, cy - R * 0.05];
  const tip = [cx + side * (R * (1.15 + size)), cy - R * (0.5 + size * 0.3)];
  const belly = [cx + side * (R * (0.95 + size * 0.6)), cy + R * droop];
  const inner = [cx + side * R * 0.55, cy + R * 0.35];
  const d = `M ${fx(root[0])} ${fx(root[1])} ` +
    `Q ${fx(tip[0])} ${fx(tip[1])} ${fx(belly[0])} ${fx(belly[1])} ` +
    `Q ${fx(inner[0])} ${fx(inner[1])} ${fx(root[0])} ${fx(root[1])} Z`;
  return `<path d="${d}" fill="currentColor" opacity="0.5" stroke="var(--deep)" stroke-width="0.6" stroke-opacity="0.4"/>`;
}

function eye(x, y, r) {
  const glint = [x - r * 0.32, y - r * 0.32];
  return (
    `<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(r)}" fill="var(--deep)" stroke="none"/>` +
    `<circle cx="${fx(glint[0])}" cy="${fx(glint[1])}" r="${fx(r * 0.32)}" fill="#fff" opacity="0.85" stroke="none"/>`
  );
}

/* Jagged-top mouth, filled — reads as a row of teeth at card scale. */
function toothyMouth(cx, y, halfW, teeth, h) {
  const step = (halfW * 2) / teeth;
  let d = `M ${fx(cx - halfW)} ${fx(y)} `;
  for (let i = 0; i <= teeth; i++) {
    const x = cx - halfW + i * step;
    const ty = i % 2 === 0 ? y : y + h;
    d += `L ${fx(x)} ${fx(ty)} `;
  }
  d += `L ${fx(cx + halfW)} ${fx(y + h * 0.4)} L ${fx(cx - halfW)} ${fx(y + h * 0.4)} Z`;
  return `<path d="${d}" fill="var(--deep)" stroke="none"/>`;
}

function calmMouth(cx, y, halfW, curve) {
  return `<path d="M ${fx(cx - halfW)} ${fx(y)} Q ${fx(cx)} ${fx(y + curve)} ${fx(cx + halfW)} ${fx(y)}" fill="none" stroke="var(--deep)" stroke-width="1.4" opacity="0.75"/>`;
}

/**
 * Build the SVG portrait for a card.
 * @param {object} card  card record (only .id, .el, .tier are read)
 * @param {object} [opt] { size = 100 }
 * @returns {string} standalone <svg> markup
 */
export function sigilSVG(card, opt = {}) {
  const size = opt.size || 100;
  const r = rng(card.id + '::' + card.el);
  const c = size / 2;
  const tier = clamp(card.tier || 0, 0, 6);
  const prof = PROFILE[card.el] || PROFILE.arcane;

  const R = size * 0.29;
  const detail = 8 + tier;                      // silhouette point count
  const pts = bodyPoints(r, c, c, R, prof.jitter, detail);

  const out = [];

  /* aura ring for well-grown creatures ------------------------------------ */
  if (tier >= 4) {
    out.push(`<circle cx="${fx(c)}" cy="${fx(c)}" r="${fx(R * 1.32)}" fill="currentColor" opacity="0.08" stroke="none"/>`);
  }

  /* wings, behind the body -------------------------------------------------- */
  const wingChance = clamp(prof.wing + tier * 0.06, 0, 0.85);
  const hasWings = r() < wingChance;
  if (hasWings) {
    const wsize = between(r, 0.18, 0.38);
    const droop = between(r, 0.15, 0.35);
    out.push(wing(c, c, R, -1, wsize, droop));
    out.push(wing(c, c, R, 1, wsize, droop));
  }

  /* body -------------------------------------------------------------------- */
  const bodyPath = prof.smooth ? smoothClosedPath(pts) : facetedClosedPath(pts);
  out.push(`<path d="${bodyPath}" fill="currentColor" stroke="var(--deep)" stroke-width="1" stroke-opacity="0.5"/>`);

  /* horns / spikes, rooted in the silhouette -------------------------------- */
  const [spikeMin, spikeMax] = prof.spikes;
  const spikeCount = clamp(intBetween(r, spikeMin, spikeMax) + Math.floor(tier / 2), 0, 6);
  if (spikeCount > 0) {
    const usedIdx = new Set();
    for (let i = 0; i < spikeCount; i++) {
      let idx;
      let guard = 0;
      do { idx = intBetween(r, 0, pts.length - 1); guard++; } while (usedIdx.has(idx) && guard < 8);
      usedIdx.add(idx);
      const len = between(r, prof.spikeLen[0], prof.spikeLen[1]);
      out.push(spike(c, c, pts[idx], R, len, between(r, 0.05, 0.1)));
    }
  }

  /* legendary crown --------------------------------------------------------- */
  if (tier >= 6) {
    const crownN = 7;
    for (let i = 0; i < crownN; i++) {
      const a = -Math.PI / 2 + (i - (crownN - 1) / 2) * 0.26;
      const base = pt(c, c, R * 0.98, a);
      const tip = pt(c, c, R * 1.42, a);
      const w1 = pt(c, c, R * 0.98, a - 0.05);
      const w2 = pt(c, c, R * 0.98, a + 0.05);
      out.push(`<polygon points="${fx(w1[0])},${fx(w1[1])} ${fx(tip[0])},${fx(tip[1])} ${fx(w2[0])},${fx(w2[1])}" fill="currentColor" opacity="0.85"/>`);
    }
  }

  /* scutes / scales for older creatures ------------------------------------- */
  const scuteCount = Math.max(0, tier - 1);
  for (let i = 0; i < scuteCount; i++) {
    const idx = Math.floor(((i + 0.5) / Math.max(1, scuteCount)) * pts.length);
    const rad = pts[idx].rad * 0.72;
    const [x, y] = pt(c, c, rad, pts[idx].a);
    out.push(`<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(size * 0.018)}" fill="var(--deep)" opacity="0.4" stroke="none"/>`);
  }

  /* face: eyes -------------------------------------------------------------- */
  const eyeRoll = r();
  const eyeY = c - R * 0.12;
  if (eyeRoll < 0.14) {
    out.push(eye(c, eyeY, R * 0.17));                                   // cyclops
  } else if (eyeRoll < 0.86 || tier < 4) {
    out.push(eye(c - R * 0.24, eyeY, R * 0.115));
    out.push(eye(c + R * 0.24, eyeY, R * 0.115));                        // standard pair
  } else {
    out.push(eye(c - R * 0.26, eyeY, R * 0.1));
    out.push(eye(c + R * 0.26, eyeY, R * 0.1));
    out.push(eye(c, eyeY - R * 0.32, R * 0.09));                         // third eye
  }

  /* face: mouth --------------------------------------------------------------- */
  const toothy = r() < clamp(0.4 + tier * 0.08, 0, 0.85);
  const mouthY = c + R * 0.24;
  if (toothy) {
    out.push(toothyMouth(c, mouthY, R * between(r, 0.22, 0.34), intBetween(r, 3, 5), R * 0.22));
  } else {
    out.push(calmMouth(c, mouthY, R * between(r, 0.16, 0.24), R * between(r, 0.08, 0.16)));
  }

  /* chest rune — the maker's mark ------------------------------------------- */
  out.push(
    `<g stroke="currentColor" fill="none" stroke-width="1" opacity="0.4">` +
    `${elementGlyph(card.el, c, c + R * 0.56, size * 0.055)}</g>`
  );

  return (
    `<svg class="creature" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" ` +
    `fill="currentColor" stroke="none" ` +
    `aria-hidden="true" focusable="false">${out.join('')}</svg>`
  );
}

/* Portraits are pure functions of the id, so cache them. */
const cache = new Map();
export function sigil(card, opt) {
  const key = card.id + ':' + (opt && opt.size ? opt.size : 100);
  if (!cache.has(key)) cache.set(key, sigilSVG(card, opt));
  return cache.get(key);
}
