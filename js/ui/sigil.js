/* ============================================================================
   SIGIL — procedural alchemical mark
   Every card owns a deterministic diagram derived from its id. The vocabulary
   is fixed: concentric rules, a counted polygon, radial spokes, a ring of
   observation ticks, and the element's classical glyph at the centre. Density
   rises with tier, so the rarest objects simply look like they took longest to
   draw.
   ========================================================================= */

const TAU = Math.PI * 2;

/* xmur3 string hash -> mulberry32 PRNG. Same id, same diagram, forever. */
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

const pt = (cx, cy, radius, angle) => [
  (cx + Math.cos(angle) * radius).toFixed(2),
  (cy + Math.sin(angle) * radius).toFixed(2),
];

/* -- Classical elemental glyphs, drawn rather than typed. ------------------ */
function elementGlyph(el, cx, cy, s) {
  const up = `${cx},${cy - s} ${cx - s * 0.92},${cy + s * 0.62} ${cx + s * 0.92},${cy + s * 0.62}`;
  const dn = `${cx},${cy + s} ${cx - s * 0.92},${cy - s * 0.62} ${cx + s * 0.92},${cy - s * 0.62}`;
  const bar = (y) => `<line x1="${cx - s * 0.5}" y1="${y}" x2="${cx + s * 0.5}" y2="${y}"/>`;

  switch (el) {
    case 'fire':   return `<polygon points="${up}"/>`;
    case 'water':  return `<polygon points="${dn}"/>`;
    case 'air':    return `<polygon points="${up}"/>${bar(cy + s * 0.02)}`;
    case 'earth':  return `<polygon points="${dn}"/>${bar(cy - s * 0.02)}`;
    case 'life':
      return `<circle cx="${cx}" cy="${cy - s * 0.34}" r="${s * 0.5}"/>` +
             `<line x1="${cx}" y1="${cy + s * 0.16}" x2="${cx}" y2="${cy + s}"/>` +
             `<line x1="${cx - s * 0.42}" y1="${cy + s * 0.58}" x2="${cx + s * 0.42}" y2="${cy + s * 0.58}"/>`;
    case 'metal':
      return `<circle cx="${cx}" cy="${cy - s * 0.2}" r="${s * 0.52}"/>` +
             `<line x1="${cx + s * 0.34}" y1="${cy - s * 0.56}" x2="${cx + s * 0.95}" y2="${cy - s}"/>` +
             `<line x1="${cx + s * 0.95}" y1="${cy - s}" x2="${cx + s * 0.42}" y2="${cy - s}"/>` +
             `<line x1="${cx + s * 0.95}" y1="${cy - s}" x2="${cx + s * 0.95}" y2="${cy - s * 0.46}"/>`;
    case 'arcane':
      return `<polygon points="${up}"/><polygon points="${dn}"/>`;
    case 'shadow':
      return `<circle cx="${cx}" cy="${cy}" r="${s * 0.86}"/>` +
             `<path d="M ${cx} ${cy - s * 0.86} A ${s * 0.86} ${s * 0.86} 0 0 0 ${cx} ${cy + s * 0.86} Z" fill="currentColor" stroke="none"/>`;
    default:       return `<circle cx="${cx}" cy="${cy}" r="${s * 0.8}"/>`;
  }
}

/**
 * Build the SVG mark for a card.
 * @param {object} card  card record from the database
 * @param {object} [opt] { size = 100, detail = 1 } — detail scales mark counts
 * @returns {string} standalone <svg> markup
 */
export function sigilSVG(card, opt = {}) {
  const size = opt.size || 100;
  const r = rng(card.id + '::' + card.el);
  const c = size / 2;
  const tier = card.tier;

  // Density is a function of tier — labour made visible.
  const rings = 2 + Math.min(3, Math.floor(tier / 2));
  const sides = intBetween(r, 3, 8);
  const spokes = pick(r, [6, 8, 12, 12, 16, 24]);
  const ticks = 24 + tier * 12;
  const orbits = Math.min(4, 1 + Math.floor(tier / 2));

  const R = c * 0.88;
  const out = [];

  /* concentric rules ------------------------------------------------------ */
  for (let i = 0; i < rings; i++) {
    const rad = R * (1 - i * between(r, 0.11, 0.17));
    const w = i === 0 ? 1.4 : 0.6;
    const op = i === 0 ? 0.85 : 0.34;
    out.push(`<circle cx="${c}" cy="${c}" r="${rad.toFixed(2)}" stroke-width="${w}" opacity="${op}"/>`);
  }

  /* observation ticks around the outer rule -------------------------------- */
  const tickOuter = R;
  const tickInner = R - size * 0.035;
  const tickPath = [];
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * TAU;
    const long = i % 4 === 0;
    const [x1, y1] = pt(c, c, long ? tickInner - size * 0.022 : tickInner, a);
    const [x2, y2] = pt(c, c, tickOuter, a);
    tickPath.push(`M${x1} ${y1}L${x2} ${y2}`);
  }
  out.push(`<path d="${tickPath.join('')}" stroke-width="0.6" opacity="0.42"/>`);

  /* radial spokes ---------------------------------------------------------- */
  const spokeInner = R * between(r, 0.3, 0.46);
  const spokeOuter = R * between(r, 0.72, 0.86);
  const spokePath = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * TAU + Number(r().toFixed(3));
    const [x1, y1] = pt(c, c, spokeInner, a);
    const [x2, y2] = pt(c, c, spokeOuter, a);
    spokePath.push(`M${x1} ${y1}L${x2} ${y2}`);
  }
  out.push(`<path d="${spokePath.join('')}" stroke-width="0.7" opacity="0.28"/>`);

  /* counted polygon + its inscribed star ----------------------------------- */
  const polyR = R * between(r, 0.56, 0.7);
  const rot = r() * TAU;
  const poly = [];
  for (let i = 0; i < sides; i++) {
    poly.push(pt(c, c, polyR, rot + (i / sides) * TAU).join(','));
  }
  out.push(`<polygon points="${poly.join(' ')}" stroke-width="1.1" opacity="0.72"/>`);

  if (tier >= 3 && sides >= 5) {
    const step = sides === 6 ? 2 : Math.max(2, Math.floor(sides / 2));
    const star = [];
    for (let i = 0; i < sides; i++) {
      star.push(pt(c, c, polyR, rot + (((i * step) % sides) / sides) * TAU).join(','));
    }
    out.push(`<polygon points="${star.join(' ')}" stroke-width="0.6" opacity="0.34"/>`);
  }

  /* orbiting bodies -------------------------------------------------------- */
  for (let i = 0; i < orbits; i++) {
    const a = r() * TAU;
    const rad = R * between(r, 0.74, 0.92);
    const [x, y] = pt(c, c, rad, a);
    const rr = (size * between(r, 0.014, 0.028)).toFixed(2);
    const filled = r() > 0.45;
    out.push(
      `<circle cx="${x}" cy="${y}" r="${rr}" stroke-width="0.9" opacity="0.9"` +
      (filled ? ' fill="currentColor"' : '') + '/>'
    );
  }

  /* the element, at the centre --------------------------------------------- */
  out.push(
    `<g stroke-width="1.3" opacity="0.95">${elementGlyph(card.el, c, c, size * 0.15)}</g>`
  );

  return (
    `<svg class="sigil" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" ` +
    `fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${out.join('')}</svg>`
  );
}

/* Marks are pure functions of the id, so cache them. */
const cache = new Map();
export function sigil(card, opt) {
  const key = card.id + ':' + (opt && opt.size ? opt.size : 100);
  if (!cache.has(key)) cache.set(key, sigilSVG(card, opt));
  return cache.get(key);
}
