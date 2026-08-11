/* ============================================================================
   CARD DATABASE
   Every card except the four primes is discovered by fusing exactly two cards.
   `recipe: [a, b]` is unordered — the Lab normalises the pair before lookup.

   Each card carries exactly two combat numbers: `atk` and `def`. There is no
   board and no persistent life pool — every duel round is a single clash
   between the card each side commits, so `def` is compared once, not worn
   down over time. Whatever attack clears the opposing defense hits the rival
   alchemist directly.
   ========================================================================= */

import { ARENA_ART, ART_BASE } from './art.js';

export const ELEMENTS = {
  fire:   { id: 'fire',   name: 'אש',    glyph: 'fire'   },
  water:  { id: 'water',  name: 'מים',   glyph: 'water'  },
  earth:  { id: 'earth',  name: 'אדמה',  glyph: 'earth'  },
  air:    { id: 'air',    name: 'אוויר', glyph: 'air'    },
  life:   { id: 'life',   name: 'חיים',  glyph: 'life'   },
  arcane: { id: 'arcane', name: 'נסתר',  glyph: 'arcane' },
  shadow: { id: 'shadow', name: 'צל',    glyph: 'shadow' },
  metal:  { id: 'metal',  name: 'מתכת',  glyph: 'metal'  },
};

export const TIER_NAMES = [
  'יסוד', 'ראשוני', 'מורכב', 'מגובש', 'נדיר', 'עתיק', 'אגדי',
];

/* --------------------------------------------------------------------------
   c() — terse constructor so the table below stays readable.
   -------------------------------------------------------------------------- */
function c(id, name, el, tier, atk, def, recipe) {
  return { id, name, el, tier, atk, def, recipe: recipe || null };
}

export const CARDS = [
  /* ---- Tier 0 — the four primes ---------------------------------------- */
  c('fire',  'אש',    'fire',  0, 2, 1, null),
  c('water', 'מים',   'water', 0, 1, 3, null),
  c('earth', 'אדמה',  'earth', 0, 1, 4, null),
  c('air',   'אוויר', 'air',   0, 2, 2, null),

  /* ---- Tier 1 — the first fusions -------------------------------------- */
  c('steam',    'קיטור',    'water',  1, 4, 3, ['fire', 'water']),
  c('lava',     'לבה',      'fire',   1, 4, 2, ['fire', 'earth']),
  c('energy',   'אנרגיה',   'arcane', 1, 4, 2, ['fire', 'air']),
  c('mud',      'בוץ',      'earth',  1, 3, 3, ['water', 'earth']),
  c('rain',     'גשם',      'water',  1, 4, 3, ['water', 'air']),
  c('dust',     'אבק',      'air',    1, 4, 2, ['earth', 'air']),
  c('inferno',  'תופת',     'fire',   1, 4, 2, ['fire', 'fire']),
  c('ocean',    'אוקיינוס', 'water',  1, 3, 3, ['water', 'water']),
  c('mountain', 'הר',       'earth',  1, 4, 3, ['earth', 'earth']),
  c('storm',    'סופה',     'air',    1, 4, 2, ['air', 'air']),

  /* ---- Tier 2 — matter ------------------------------------------------- */
  c('stone',    'אבן',       'earth',  2, 5, 5, ['lava', 'water']),
  c('obsidian', 'אובסידיאן', 'shadow', 2, 6, 3, ['lava', 'ocean']),
  c('cloud',    'ענן',       'air',    2, 6, 4, ['steam', 'air']),
  c('life',     'חיים',      'life',   2, 6, 4, ['mud', 'energy']),
  c('sand',     'חול',       'earth',  2, 5, 4, ['mountain', 'dust']),
  c('glass',    'זכוכית',    'metal',  2, 6, 4, ['sand', 'inferno']),
  c('lightning', 'ברק',      'arcane', 2, 6, 3, ['storm', 'energy']),
  c('volcano',  'הר געש',    'fire',   2, 6, 3, ['mountain', 'lava']),
  c('swamp',    'ביצה',      'life',   2, 6, 4, ['mud', 'rain']),
  c('metal',    'מתכת',      'metal',  2, 5, 4, ['stone', 'inferno']),
  c('ice',      'קרח',       'water',  2, 6, 4, ['ocean', 'storm']),
  c('snow',     'שלג',       'water',  2, 5, 4, ['ice', 'cloud']),

  /* ---- Tier 3 — the living world --------------------------------------- */
  c('plant',   'צמח',    'life',   3, 7, 6, ['life', 'rain']),
  c('beast',   'חיה',    'life',   3, 7, 5, ['life', 'mountain']),
  c('fish',    'דג',     'water',  3, 8, 5, ['life', 'ocean']),
  c('bird',    'ציפור',  'air',    3, 9, 4, ['life', 'storm']),
  c('golem',   'גולם',   'earth',  3, 7, 6, ['life', 'stone']),
  c('blade',   'להב',    'metal',  3, 6, 7, ['metal', 'inferno']),
  c('armor',   'שריון',  'metal',  3, 6, 6, ['metal', 'stone']),
  c('crystal', 'גביש',   'arcane', 3, 8, 5, ['glass', 'energy']),
  c('tree',    'עץ',     'life',   3, 7, 6, ['plant', 'earth']),
  c('forest',  'יער',    'life',   3, 7, 5, ['tree', 'rain']),
  c('human',   'אדם',    'life',   3, 8, 5, ['life', 'energy']),
  c('glacier', 'קרחון',  'water',  3, 7, 6, ['ice', 'mountain']),
  c('desert',  'מדבר',   'earth',  3, 7, 5, ['sand', 'lava']),
  c('shadow',  'צל',     'shadow', 3, 8, 5, ['cloud', 'obsidian']),

  /* ---- Tier 4 — the peopled world -------------------------------------- */
  c('warrior', 'לוחם',    'life',   4, 9, 8, ['human', 'blade']),
  c('knight',  'אביר',    'metal',  4, 9, 8, ['warrior', 'armor']),
  c('wizard',  'קוסם',    'arcane', 4, 10, 6, ['human', 'crystal']),
  c('dragon',  'דרקון',   'fire',   4, 11, 5, ['beast', 'inferno']),
  c('phoenix', 'עוף החול', 'fire',  4, 12, 5, ['bird', 'inferno']),
  c('kraken',  'קראקן',   'water',  4, 9, 7, ['fish', 'ocean']),
  c('shark',   'כריש',    'water',  4, 9, 7, ['fish', 'blade']),
  c('wolf',    'זאב',     'life',   4, 9, 7, ['beast', 'forest']),
  c('bear',    'דוב',     'life',   4, 8, 8, ['beast', 'mountain']),
  c('ent',     'ענט',     'life',   4, 10, 6, ['tree', 'life']),
  c('mammoth', 'ממותה',   'earth',  4, 8, 8, ['beast', 'glacier']),
  c('vampire', 'ערפד',    'shadow', 4, 10, 7, ['human', 'shadow']),
  c('ghost',   'רוח',     'shadow', 4, 11, 6, ['shadow', 'steam']),
  c('demon',   'שד',      'shadow', 4, 11, 5, ['shadow', 'inferno']),
  c('angel',   'מלאך',    'arcane', 4, 11, 5, ['bird', 'human']),
  c('zombie',  'זומבי',   'shadow', 4, 9, 7, ['human', 'swamp']),
  c('skeleton', 'שלד',    'shadow', 4, 9, 7, ['zombie', 'desert']),

  /* ---- Tier 5 — the greater beasts -------------------------------------- */
  c('griffin',  'גריפון',    'air',    5, 12, 7, ['bird', 'beast']),
  c('hydra',    'הידרה',     'water',  5, 11, 9, ['dragon', 'ocean']),
  c('lich',     "ליץ'",      'shadow', 5, 11, 8, ['wizard', 'skeleton']),
  c('archmage', 'ארכימאג',   'arcane', 5, 12, 7, ['wizard', 'crystal']),
  c('paladin',  'פלאדין',    'metal',  5, 11, 8, ['knight', 'angel']),
  c('titan',    'טיטאן',     'earth',  5, 11, 9, ['golem', 'volcano']),
  c('leviathan', 'לווייתן',  'water',  5, 12, 8, ['kraken', 'glacier']),
  c('werewolf', 'איש זאב',   'shadow', 5, 11, 8, ['wolf', 'shadow']),
  c('chimera',  'כימרה',     'fire',   5, 13, 7, ['dragon', 'griffin']),
  c('djinn',    "ג'יני",     'air',    5, 13, 6, ['wizard', 'storm']),
  c('elemental', 'יסודון',   'arcane', 5, 13, 7, ['golem', 'energy']),
  c('behemoth', 'בהמות',     'earth',  5, 11, 9, ['bear', 'titan']),
  c('sphinx',   'ספינקס',    'arcane', 5, 12, 8, ['griffin', 'desert']),
  c('thunderbird', 'ציפור הרעם', 'air', 5, 13, 6, ['phoenix', 'lightning']),

  /* ---- Tier 6 — the great work ------------------------------------------ */
  c('ancientDragon', 'דרקון קדמון', 'fire', 6, 16, 7, ['dragon', 'titan']),
  c('worldTree', 'עץ העולם', 'life',   6, 13, 10, ['ent', 'forest']),
  c('death',   'המוות',   'shadow', 6, 13, 10, ['lich', 'shadow']),
  c('sun',     'שמש',     'fire',   6, 16, 7, ['phoenix', 'energy']),
  c('moon',    'ירח',     'shadow', 6, 14, 9, ['ice', 'shadow']),
  c('star',    'כוכב',    'arcane', 6, 15, 8, ['sun', 'moon']),
  c('void',    'תהום',    'shadow', 6, 15, 8, ['shadow', 'star']),
  c('genesis', 'בראשית',  'life',   6, 14, 9, ['life', 'star']),
  c('chaos',   'כאוס',    'fire',   6, 15, 8, ['void', 'inferno']),
  c('philosopherStone', 'אבן החכמים', 'arcane', 6, 14, 8, ['crystal', 'genesis']),
];

/* --------------------------------------------------------------------------
   Merge in THE-ARENA's monster portraits. Every matched card gains `img`,
   `imgPos` and `title`; those flagged `rename` also take the source name as
   their own. Cards with no match keep their procedurally-drawn creature.
   -------------------------------------------------------------------------- */
for (const card of CARDS) {
  const art = ARENA_ART[card.id];
  if (!art) continue;
  card.img = ART_BASE + art.img;
  card.imgPos = art.imgPos;
  card.title = art.title;
  if (art.rename) card.name = art.title;
}

export const CARD_BY_ID = Object.fromEntries(CARDS.map((k) => [k.id, k]));

export const BASE_IDS = ['fire', 'water', 'earth', 'air'];

export function recipeKey(a, b) {
  return [a, b].sort().join('+');
}

/** recipeKey -> resulting card id */
export const RECIPE_INDEX = (() => {
  const idx = {};
  for (const card of CARDS) {
    if (!card.recipe) continue;
    idx[recipeKey(card.recipe[0], card.recipe[1])] = card.id;
  }
  return idx;
})();

export function fuse(aId, bId) {
  return RECIPE_INDEX[recipeKey(aId, bId)] || null;
}

/** All recipes that produce `id`'s descendants — used by the hint system. */
export function recipesUsing(id) {
  return CARDS.filter((k) => k.recipe && k.recipe.includes(id));
}

/**
 * A fusion is a free "Mega" (no orb cost, in-battle) when neither parent is
 * a base prime — i.e. both parents are themselves already-fused matter.
 * Fusing a prime into something is always a costed "Final Form" fusion.
 */
export function isMegaFusion(aId, bId) {
  return !BASE_IDS.includes(aId) && !BASE_IDS.includes(bId);
}

/** Deck-building copy limit: commoner matter is plentiful, legends are singletons. */
export function copyLimit(card) {
  if (card.tier >= 6) return 1;
  if (card.tier >= 3) return 2;
  if (card.tier >= 1) return 3;
  return 4;
}
