/* Validates the card database: recipe reachability, duplicate recipes,
   dangling references and stat sanity. Run with `node tools/validate.mjs`. */

import {
  CARDS, CARD_BY_ID, BASE_IDS, RECIPE_INDEX, recipeKey, copyLimit,
} from '../js/data/cards.js';
import { CAMPAIGN } from '../js/data/campaign.js';

let errors = 0;
let warnings = 0;
const fail = (m) => { errors++; console.error('  ✗ ' + m); };
const warn = (m) => { warnings++; console.warn('  ! ' + m); };

console.log('\n── ids & references ────────────────────────────────');
const seen = new Set();
for (const k of CARDS) {
  if (seen.has(k.id)) fail(`duplicate card id: ${k.id}`);
  seen.add(k.id);
  if (!k.name) fail(`${k.id} has no name`);
  if (k.recipe) {
    for (const p of k.recipe) {
      if (!CARD_BY_ID[p]) fail(`${k.id} references unknown parent "${p}"`);
    }
  } else if (!BASE_IDS.includes(k.id)) {
    fail(`${k.id} is craftable but has no recipe`);
  }
}

console.log('── recipe collisions ───────────────────────────────');
const byKey = new Map();
for (const k of CARDS) {
  if (!k.recipe) continue;
  const key = recipeKey(k.recipe[0], k.recipe[1]);
  if (byKey.has(key)) fail(`recipe ${key} produces both ${byKey.get(key)} and ${k.id}`);
  byKey.set(key, k.id);
}

console.log('── reachability from the four primes ───────────────');
const known = new Set(BASE_IDS);
let grew = true;
let passes = 0;
while (grew) {
  grew = false;
  passes++;
  for (const k of CARDS) {
    if (known.has(k.id) || !k.recipe) continue;
    if (known.has(k.recipe[0]) && known.has(k.recipe[1])) {
      known.add(k.id);
      grew = true;
    }
  }
}
const unreachable = CARDS.filter((k) => !known.has(k.id));
for (const k of unreachable) {
  fail(`${k.id} (${k.name}) unreachable — needs ${k.recipe.join(' + ')}`);
}

console.log('── duel stat sanity ─────────────────────────────────');
for (const k of CARDS) {
  if (k.def < 1) fail(`${k.id} has def ${k.def}`);
  if (k.atk < 1) fail(`${k.id} has atk ${k.atk}`);
  const power = k.atk + k.def;
  const budget = 3 + k.tier * 3.4;
  if (power > budget + 6) warn(`${k.id} is stat-heavy for tier ${k.tier}: ${k.atk}/${k.def}`);
  if (power < budget - 6 && k.tier > 0) warn(`${k.id} is stat-light for tier ${k.tier}: ${k.atk}/${k.def}`);
}

console.log('── campaign decks ──────────────────────────────────');
for (const st of CAMPAIGN) {
  if (st.deck.length < 12) warn(`${st.id} deck has only ${st.deck.length} cards`);
  for (const id of st.deck) {
    if (!CARD_BY_ID[id]) fail(`${st.id} deck references unknown card "${id}"`);
  }
  if (!(st.hp > 0)) fail(`${st.id} has no hero hp`);
  if (!(st.skill > 0 && st.skill <= 1)) fail(`${st.id} skill out of range`);
  if (!['elementalist', 'enchanter', 'healer'].includes(st.class)) {
    fail(`${st.id} has invalid class "${st.class}"`);
  }
}

console.log('── deck-building feasibility ────────────────────────');
{
  const withTier1 = CARDS.filter((k) => k.tier <= 1).reduce((n, k) => n + copyLimit(k), 0);
  if (withTier1 < 20) fail(`tiers 0-1 allow only ${withTier1} deck slots; 20 needed`);
}

const tiers = {};
for (const k of CARDS) tiers[k.tier] = (tiers[k.tier] || 0) + 1;

console.log('\n────────────────────────────────────────────────────');
console.log(`cards: ${CARDS.length} total`);
console.log('per tier: ' + Object.entries(tiers).map(([t, n]) => `T${t}=${n}`).join('  '));
console.log(`recipes: ${Object.keys(RECIPE_INDEX).length} · resolved in ${passes} passes`);
console.log(`${errors} error(s), ${warnings} warning(s)\n`);

process.exit(errors ? 1 : 0);
