/* ============================================================================
   CARD DATABASE
   Every card except the four primes is discovered by fusing exactly two cards.
   `recipe: [a, b]` is unordered — the Lab normalises the pair before lookup.
   Tokens have no recipe and can never be collected; they only enter play via
   summon effects.
   ========================================================================= */

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

export const KEYWORDS = {
  taunt:     { name: 'מגן',        text: 'יריבים חייבים לתקוף אותו קודם.' },
  rush:      { name: 'הסתערות',    text: 'יכול לתקוף בתור שבו הוזמן.' },
  shield:    { name: 'חיץ',        text: 'מבטל את הנזק הראשון שסופג.' },
  lifesteal: { name: 'מציצת חיים', text: 'הנזק שהוא גורם מרפא את הגיבור שלך.' },
  poison:    { name: 'ארס',        text: 'כל יצור שהוא פוגע בו מושמד.' },
  stealth:   { name: 'הסוואה',     text: 'לא ניתן לבחור בו עד שיתקוף.' },
};

export const TIER_NAMES = [
  'יסוד', 'ראשוני', 'מורכב', 'מגובש', 'נדיר', 'עתיק', 'אגדי',
];

/* --------------------------------------------------------------------------
   c() — terse constructor so the table below stays readable.
   -------------------------------------------------------------------------- */
function c(id, name, el, tier, cost, atk, hp, recipe, extra = {}) {
  return {
    id, name, el, tier, cost, atk, hp,
    recipe: recipe || null,
    kw: extra.kw || [],
    battlecry: extra.battlecry || null,
    deathrattle: extra.deathrattle || null,
    aura: extra.aura || null,
    token: !!extra.token,
    text: extra.text || '',
  };
}

export const CARDS = [
  /* ---- Tier 0 — the four primes ---------------------------------------- */
  c('fire',  'אש',    'fire',  0, 1, 2, 1, null, { kw: ['rush'] }),
  c('water', 'מים',   'water', 0, 1, 1, 3, null),
  c('earth', 'אדמה',  'earth', 0, 1, 0, 4, null, { kw: ['taunt'] }),
  c('air',   'אוויר', 'air',   0, 1, 1, 2, null, { kw: ['rush'] }),

  /* ---- Tier 1 — the first fusions -------------------------------------- */
  c('steam',    'קיטור',    'water', 1, 2, 2, 2, ['fire', 'water']),
  c('lava',     'לבה',      'fire',  1, 2, 3, 2, ['fire', 'earth']),
  c('energy',   'אנרגיה',   'arcane', 1, 2, 2, 2, ['fire', 'air'],
    { battlecry: { type: 'dmgFace', n: 1 }, text: 'זעקת קרב: גרום נזק 1 לגיבור היריב.' }),
  c('mud',      'בוץ',      'earth', 1, 2, 1, 5, ['water', 'earth'], { kw: ['taunt'] }),
  c('rain',     'גשם',      'water', 1, 2, 1, 3, ['water', 'air'],
    { battlecry: { type: 'healHero', n: 3 }, text: 'זעקת קרב: רפא לגיבור שלך 3.' }),
  c('dust',     'אבק',      'air',   1, 1, 1, 1, ['earth', 'air']),
  c('inferno',  'תופת',     'fire',  1, 3, 4, 2, ['fire', 'fire']),
  c('ocean',    'אוקיינוס', 'water', 1, 3, 2, 5, ['water', 'water']),
  c('mountain', 'הר',       'earth', 1, 3, 1, 7, ['earth', 'earth'], { kw: ['taunt'] }),
  c('storm',    'סופה',     'air',   1, 3, 4, 1, ['air', 'air'], { kw: ['rush'] }),

  /* ---- Tier 2 — matter ------------------------------------------------- */
  c('stone',    'אבן',      'earth', 2, 2, 2, 3, ['lava', 'water']),
  c('obsidian', 'אובסידיאן', 'shadow', 2, 3, 4, 3, ['lava', 'ocean']),
  c('cloud',    'ענן',      'air',   2, 2, 1, 4, ['steam', 'air']),
  c('life',     'חיים',     'life',  2, 3, 2, 2, ['mud', 'energy'],
    { battlecry: { type: 'draw', n: 1 }, text: 'זעקת קרב: שלוף קלף.' }),
  c('sand',     'חול',      'earth', 2, 2, 2, 2, ['mountain', 'dust']),
  c('glass',    'זכוכית',   'metal', 2, 3, 5, 1, ['sand', 'inferno']),
  c('lightning', 'ברק',     'arcane', 2, 3, 3, 2, ['storm', 'energy'],
    { kw: ['rush'], battlecry: { type: 'dmgRandomEnemy', n: 2 },
      text: 'זעקת קרב: גרום נזק 2 ליצור אויב אקראי.' }),
  c('volcano',  'הר געש',   'fire',  2, 5, 5, 5, ['mountain', 'lava'],
    { battlecry: { type: 'dmgAllEnemyMinions', n: 1 },
      text: 'זעקת קרב: גרום נזק 1 לכל יצורי האויב.' }),
  c('swamp',    'ביצה',     'life',  2, 3, 2, 4, ['mud', 'rain'], { kw: ['poison'] }),
  c('metal',    'מתכת',     'metal', 2, 3, 3, 4, ['stone', 'inferno']),
  c('ice',      'קרח',      'water', 2, 3, 2, 4, ['ocean', 'storm'],
    { battlecry: { type: 'freezeRandomEnemy' }, text: 'זעקת קרב: הקפא יצור אויב אקראי.' }),
  c('snow',     'שלג',      'water', 2, 2, 1, 3, ['ice', 'cloud'],
    { battlecry: { type: 'freezeRandomEnemy' }, text: 'זעקת קרב: הקפא יצור אויב אקראי.' }),

  /* ---- Tier 3 — the living world --------------------------------------- */
  c('plant',   'צמח',    'life',  3, 2, 1, 4, ['life', 'rain']),
  c('beast',   'חיה',    'life',  3, 4, 4, 4, ['life', 'mountain']),
  c('fish',    'דג',     'water', 3, 2, 3, 1, ['life', 'ocean']),
  c('bird',    'ציפור',  'air',   3, 3, 3, 2, ['life', 'storm'], { kw: ['rush'] }),
  c('golem',   'גולם',   'earth', 3, 5, 4, 7, ['life', 'stone'], { kw: ['taunt'] }),
  c('blade',   'להב',    'metal', 3, 3, 5, 2, ['metal', 'inferno']),
  c('armor',   'שריון',  'metal', 3, 4, 2, 8, ['metal', 'stone'], { kw: ['taunt'] }),
  c('crystal', 'גביש',   'arcane', 3, 4, 3, 3, ['glass', 'energy'],
    { battlecry: { type: 'draw', n: 1 }, text: 'זעקת קרב: שלוף קלף.' }),
  c('tree',    'עץ',     'life',  3, 4, 2, 7, ['plant', 'earth'], { kw: ['taunt'] }),
  c('forest',  'יער',    'life',  3, 5, 3, 6, ['tree', 'rain'],
    { battlecry: { type: 'summon', id: 'plant', n: 1 }, text: 'זעקת קרב: הזמן צמח.' }),
  c('human',   'אדם',    'life',  3, 2, 2, 3, ['life', 'energy'],
    { battlecry: { type: 'draw', n: 1 }, text: 'זעקת קרב: שלוף קלף.' }),
  c('glacier', 'קרחון',  'water', 3, 5, 3, 8, ['ice', 'mountain'], { kw: ['taunt'] }),
  c('desert',  'מדבר',   'earth', 3, 4, 4, 4, ['sand', 'lava']),
  c('shadow',  'צל',     'shadow', 3, 3, 3, 3, ['cloud', 'obsidian'], { kw: ['stealth'] }),

  /* ---- Tier 4 — the peopled world -------------------------------------- */
  c('warrior', 'לוחם',    'life',  4, 4, 5, 4, ['human', 'blade']),
  c('knight',  'אביר',    'metal', 4, 6, 6, 6, ['warrior', 'armor'], { kw: ['taunt', 'shield'] }),
  c('wizard',  'קוסם',    'arcane', 4, 5, 4, 4, ['human', 'crystal'],
    { battlecry: { type: 'dmgRandomEnemy', n: 3 },
      text: 'זעקת קרב: גרום נזק 3 ליצור אויב אקראי.' }),
  c('dragon',  'דרקון',   'fire',  4, 7, 7, 7, ['beast', 'inferno'], { kw: ['rush'] }),
  c('phoenix', 'עוף החול', 'fire', 4, 6, 5, 4, ['bird', 'inferno'],
    { deathrattle: { type: 'summon', id: 'ash', n: 1 }, text: 'צוואה: הזמן אפר לוהט.' }),
  c('kraken',  'קראקן',   'water', 4, 7, 6, 8, ['fish', 'ocean']),
  c('shark',   'כריש',    'water', 4, 4, 5, 3, ['fish', 'blade'], { kw: ['rush'] }),
  c('wolf',    'זאב',     'life',  4, 3, 3, 3, ['beast', 'forest'],
    { battlecry: { type: 'buffRandomFriendly', a: 2, h: 0 },
      text: 'זעקת קרב: תן ליצור ידידותי אקראי ‎+2/+0.' }),
  c('bear',    'דוב',     'life',  4, 5, 5, 6, ['beast', 'mountain'], { kw: ['taunt'] }),
  c('ent',     'ענט',     'life',  4, 6, 5, 8, ['tree', 'life'], { kw: ['taunt'] }),
  c('mammoth', 'ממותה',   'earth', 4, 6, 6, 7, ['beast', 'glacier']),
  c('vampire', 'ערפד',    'shadow', 4, 4, 4, 3, ['human', 'shadow'], { kw: ['lifesteal'] }),
  c('ghost',   'רוח',     'shadow', 4, 3, 4, 2, ['shadow', 'steam'], { kw: ['stealth'] }),
  c('demon',   'שד',      'shadow', 4, 5, 6, 4, ['shadow', 'inferno'],
    { battlecry: { type: 'dmgOwnFace', n: 2 }, text: 'זעקת קרב: גרום נזק 2 לגיבור שלך.' }),
  c('angel',   'מלאך',    'arcane', 4, 5, 4, 5, ['bird', 'human'],
    { kw: ['shield'], battlecry: { type: 'healHero', n: 5 },
      text: 'זעקת קרב: רפא לגיבור שלך 5.' }),
  c('zombie',  'זומבי',   'shadow', 4, 3, 3, 3, ['human', 'swamp'],
    { deathrattle: { type: 'summon', id: 'fleshHeap', n: 1 }, text: 'צוואה: הזמן גוש בשר.' }),
  c('skeleton', 'שלד',    'shadow', 4, 2, 3, 1, ['zombie', 'desert']),

  /* ---- Tier 5 — the greater beasts -------------------------------------- */
  c('griffin',  'גריפון',    'air',   5, 5, 5, 5, ['bird', 'beast'], { kw: ['rush'] }),
  c('hydra',    'הידרה',     'water', 5, 8, 8, 8, ['dragon', 'ocean'],
    { deathrattle: { type: 'summon', id: 'hydraHead', n: 2 }, text: 'צוואה: הזמן שני ראשים.' }),
  c('lich',     "ליץ'",      'shadow', 5, 7, 6, 6, ['wizard', 'skeleton'],
    { battlecry: { type: 'dmgAllEnemyMinions', n: 3 },
      text: 'זעקת קרב: גרום נזק 3 לכל יצורי האויב.' }),
  c('archmage', 'ארכימאג',   'arcane', 5, 7, 5, 6, ['wizard', 'crystal'],
    { battlecry: { type: 'draw', n: 2 }, text: 'זעקת קרב: שלוף שני קלפים.' }),
  c('paladin',  'פלאדין',    'metal', 5, 8, 7, 7, ['knight', 'angel'],
    { kw: ['taunt', 'shield', 'lifesteal'] }),
  c('titan',    'טיטאן',     'earth', 5, 9, 9, 9, ['golem', 'volcano'], { kw: ['taunt'] }),
  c('leviathan', 'לווייתן',  'water', 5, 9, 8, 10, ['kraken', 'glacier'],
    { battlecry: { type: 'freezeAllEnemies' }, text: 'זעקת קרב: הקפא את כל יצורי האויב.' }),
  c('werewolf', 'איש זאב',   'shadow', 5, 5, 5, 4, ['wolf', 'shadow'], { kw: ['rush', 'lifesteal'] }),
  c('chimera',  'כימרה',     'fire',  5, 8, 8, 6, ['dragon', 'griffin'], { kw: ['rush'] }),
  c('djinn',    "ג'יני",     'air',   5, 6, 5, 5, ['wizard', 'storm'],
    { battlecry: { type: 'draw', n: 2 }, text: 'זעקת קרב: שלוף שני קלפים.' }),
  c('elemental', 'יסודון',   'arcane', 5, 6, 6, 5, ['golem', 'energy'],
    { battlecry: { type: 'dmgAllEnemyMinions', n: 2 },
      text: 'זעקת קרב: גרום נזק 2 לכל יצורי האויב.' }),
  c('behemoth', 'בהמות',     'earth', 5, 10, 10, 10, ['bear', 'titan'], { kw: ['taunt'] }),
  c('sphinx',   'ספינקס',    'arcane', 5, 6, 5, 7, ['griffin', 'desert'],
    { kw: ['taunt'], battlecry: { type: 'draw', n: 1 }, text: 'זעקת קרב: שלוף קלף.' }),
  c('thunderbird', 'ציפור הרעם', 'air', 5, 7, 6, 5, ['phoenix', 'lightning'],
    { kw: ['rush'], battlecry: { type: 'dmgRandomEnemy', n: 3 },
      text: 'זעקת קרב: גרום נזק 3 ליצור אויב אקראי.' }),

  /* ---- Tier 6 — the great work ------------------------------------------ */
  c('ancientDragon', 'דרקון קדמון', 'fire', 6, 10, 10, 10, ['dragon', 'titan'],
    { kw: ['rush'] }),
  c('worldTree', 'עץ העולם', 'life', 6, 9, 5, 14, ['ent', 'forest'],
    { kw: ['taunt'], aura: { a: 1, h: 1 },
      text: 'שאר היצורים הידידותיים מקבלים ‎+1/+1.' }),
  c('death',   'המוות',   'shadow', 6, 9, 8, 8, ['lich', 'shadow'],
    { battlecry: { type: 'destroyRandomEnemy', n: 1 },
      text: 'זעקת קרב: השמד יצור אויב אקראי.' }),
  c('sun',     'שמש',     'fire',  6, 8, 7, 7, ['phoenix', 'energy'],
    { battlecry: { type: 'sunburst' },
      text: 'זעקת קרב: נזק 3 לכל יצורי האויב, ורפא לגיבור שלך 5.' }),
  c('moon',    'ירח',     'shadow', 6, 6, 4, 8, ['ice', 'shadow'],
    { battlecry: { type: 'freezeAllEnemies' }, text: 'זעקת קרב: הקפא את כל יצורי האויב.' }),
  c('star',    'כוכב',    'arcane', 6, 9, 8, 8, ['sun', 'moon'],
    { battlecry: { type: 'draw', n: 3 }, text: 'זעקת קרב: שלוף שלושה קלפים.' }),
  c('void',    'תהום',    'shadow', 6, 9, 9, 6, ['shadow', 'star'],
    { battlecry: { type: 'destroyAllOthers' },
      text: 'זעקת קרב: השמד את כל שאר היצורים בזירה.' }),
  c('genesis', 'בראשית',  'life',  6, 10, 6, 6, ['life', 'star'],
    { battlecry: { type: 'summonRandom', n: 3, maxTier: 3 },
      text: 'זעקת קרב: הזמן שלושה יצורים אקראיים מדרגה 3 ומטה.' }),
  c('chaos',   'כאוס',    'fire',  6, 10, 12, 6, ['void', 'inferno'], { kw: ['rush'] }),
  c('philosopherStone', 'אבן החכמים', 'arcane', 6, 10, 8, 8, ['crystal', 'genesis'],
    { kw: ['shield', 'lifesteal'], aura: { a: 1, h: 1 },
      text: 'שאר היצורים הידידותיים מקבלים ‎+1/+1.' }),

  /* ---- Tokens — summoned only ------------------------------------------- */
  c('ash',       'אפר לוהט', 'fire',   3, 3, 3, 3, null, { token: true }),
  c('fleshHeap', 'גוש בשר',  'shadow', 2, 2, 2, 2, null, { token: true }),
  c('hydraHead', 'ראש הידרה', 'water', 3, 3, 3, 3, null, { token: true }),
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((k) => [k.id, k]));

export const BASE_IDS = ['fire', 'water', 'earth', 'air'];

/** Craftable cards, in discovery-friendly order. */
export const CRAFTABLE = CARDS.filter((k) => !k.token);

/** Normalised recipe key so [a,b] and [b,a] resolve identically. */
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
 * Deck-building limit. Common matter is cheap and plentiful; legendaries are
 * singletons. The generous low end also keeps a 20-card deck buildable from a
 * very small early collection.
 */
export function copyLimit(card) {
  if (card.tier >= 6) return 1;
  if (card.tier >= 3) return 2;
  if (card.tier >= 1) return 3;
  return 4;
}
