/* ============================================================================
   SAVE STATE
   One localStorage record holds the whole run: what has been discovered, the
   shard counts that level cards up, gold, the working deck, and campaign
   progress. Every mutation goes through here so persistence is never forgotten.
   ========================================================================= */

import { CARD_BY_ID, BASE_IDS, fuse, copyLimit, CARDS } from '../data/cards.js';
import { CAMPAIGN } from '../data/campaign.js';

const KEY = 'fusgame:save:v1';
export const DECK_SIZE = 20;
export const SHARDS_PER_LEVEL = 3;
export const MAX_LEVEL = 3;
export const HINT_COST = 60;
export const SHARD_PACK_COST = 45;

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(save);
}

function freshSave() {
  return {
    v: 1,
    discovered: BASE_IDS.slice(),
    shards: {},
    levels: {},
    gold: 0,
    deck: [],
    cleared: [],
    lastStage: 0,
    fusionsTried: 0,
    battlesWon: 0,
    seenIntro: false,
  };
}

export let save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    const base = freshSave();
    const merged = { ...base, ...data };
    // Drop anything that no longer exists in the database.
    merged.discovered = merged.discovered.filter((id) => CARD_BY_ID[id] && !CARD_BY_ID[id].token);
    for (const id of BASE_IDS) if (!merged.discovered.includes(id)) merged.discovered.push(id);
    merged.deck = merged.deck.filter((id) => merged.discovered.includes(id));
    return merged;
  } catch {
    return freshSave();
  }
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode / quota — the run simply won't survive a reload */
  }
  emit();
}

export function resetSave() {
  save = freshSave();
  persist();
}

/* -------------------------------------------------------------------------
   Collection
   ------------------------------------------------------------------------- */
export const isDiscovered = (id) => save.discovered.includes(id);

export function discover(id) {
  if (isDiscovered(id)) return false;
  save.discovered.push(id);
  persist();
  return true;
}

export function levelOf(id) {
  return save.levels[id] || 0;
}

export function shardsOf(id) {
  return save.shards[id] || 0;
}

/** Adds a shard; every SHARDS_PER_LEVEL shards becomes a permanent +1/+1. */
export function addShard(id, n = 1) {
  if (!isDiscovered(id)) return { leveled: 0 };
  let leveled = 0;
  save.shards[id] = (save.shards[id] || 0) + n;
  while (levelOf(id) < MAX_LEVEL && save.shards[id] >= SHARDS_PER_LEVEL) {
    save.shards[id] -= SHARDS_PER_LEVEL;
    save.levels[id] = levelOf(id) + 1;
    leveled++;
  }
  if (levelOf(id) >= MAX_LEVEL) save.shards[id] = Math.min(save.shards[id], SHARDS_PER_LEVEL - 1);
  persist();
  return { leveled };
}

export function addGold(n) {
  save.gold = Math.max(0, save.gold + n);
  persist();
}

/* -------------------------------------------------------------------------
   The Lab
   ------------------------------------------------------------------------- */
/**
 * Attempt a fusion.
 * @returns {{ok:boolean, why?:string, id?:string, isNew?:boolean, card?:object}}
 */
export function attemptFusion(aId, bId) {
  if (!isDiscovered(aId) || !isDiscovered(bId)) {
    return { ok: false, why: 'עדיין לא גילית את אחד הקלפים.' };
  }
  save.fusionsTried += 1;
  const resultId = fuse(aId, bId);
  if (!resultId) {
    persist();
    return { ok: false, why: 'הצירוף הזה אינו מוליד דבר.' };
  }
  const isNew = discover(resultId);
  if (!isNew) {
    addShard(resultId, 1);
    return { ok: true, id: resultId, isNew: false, card: CARD_BY_ID[resultId] };
  }
  persist();
  return { ok: true, id: resultId, isNew: true, card: CARD_BY_ID[resultId] };
}

/** Recipes whose two parents are already known but whose result is not. */
export function availableDiscoveries() {
  const out = [];
  for (const card of CARDS) {
    if (card.token || !card.recipe) continue;
    if (isDiscovered(card.id)) continue;
    const [a, b] = card.recipe;
    if (isDiscovered(a) && isDiscovered(b)) out.push(card);
  }
  return out;
}

/** Buy a hint: reveals one currently-reachable recipe. */
export function buyHint() {
  if (save.gold < HINT_COST) return { ok: false, why: 'אין מספיק זהב.' };
  const options = availableDiscoveries();
  if (!options.length) {
    return { ok: false, why: 'אין כרגע צירוף זמין שלא גילית. הרחב את האוסף קודם.' };
  }
  addGold(-HINT_COST);
  const card = options[Math.floor(Math.random() * options.length)];
  return { ok: true, card, recipe: card.recipe };
}

/** Buy a shard pack: three shards spread over discovered non-base cards. */
export function buyShardPack() {
  if (save.gold < SHARD_PACK_COST) return { ok: false, why: 'אין מספיק זהב.' };
  const pool = save.discovered.filter(
    (id) => !BASE_IDS.includes(id) && levelOf(id) < MAX_LEVEL
  );
  if (!pool.length) return { ok: false, why: 'כל הקלפים שלך כבר בדרגה מרבית.' };
  addGold(-SHARD_PACK_COST);
  const got = [];
  for (let i = 0; i < 3; i++) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    const res = addShard(id, 1);
    got.push({ id, card: CARD_BY_ID[id], leveled: res.leveled });
  }
  return { ok: true, got };
}

/* -------------------------------------------------------------------------
   Deck
   ------------------------------------------------------------------------- */
export function deckCount(id) {
  return save.deck.filter((x) => x === id).length;
}

export function addToDeck(id) {
  if (!isDiscovered(id)) return { ok: false, why: 'הקלף לא גולה.' };
  if (save.deck.length >= DECK_SIZE) return { ok: false, why: `החפיסה מלאה (${DECK_SIZE} קלפים).` };
  if (deckCount(id) >= copyLimit(CARD_BY_ID[id])) {
    return { ok: false, why: `מותר עד ${copyLimit(CARD_BY_ID[id])} עותקים מהקלף הזה.` };
  }
  save.deck.push(id);
  persist();
  return { ok: true };
}

export function removeFromDeck(id) {
  const i = save.deck.indexOf(id);
  if (i === -1) return { ok: false };
  save.deck.splice(i, 1);
  persist();
  return { ok: true };
}

export function clearDeck() {
  save.deck = [];
  persist();
}

/** Fills the deck with the strongest legal cards the collection allows. */
export function autoDeck() {
  const pool = save.discovered
    .map((id) => CARD_BY_ID[id])
    .filter(Boolean)
    .sort((a, b) => (b.atk + b.hp + b.tier * 2) - (a.atk + a.hp + a.tier * 2));

  const next = [];
  // Four one-drops keeps an opening play likely without flattening the deck.
  const curveTarget = { 1: 4, 2: 4, 3: 4, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 };
  const curve = {};

  const canTake = (card) => next.filter((x) => x === card.id).length < copyLimit(card);

  // First pass respects a mana curve so the deck is actually playable.
  for (const card of pool) {
    if (next.length >= DECK_SIZE) break;
    const bucket = Math.min(8, card.cost);
    if ((curve[bucket] || 0) >= (curveTarget[bucket] || 0)) continue;
    while (canTake(card) && next.length < DECK_SIZE && (curve[bucket] || 0) < (curveTarget[bucket] || 0)) {
      next.push(card.id);
      curve[bucket] = (curve[bucket] || 0) + 1;
    }
  }
  // Second pass tops up with anything legal.
  for (const card of pool) {
    while (next.length < DECK_SIZE && canTake(card)) next.push(card.id);
  }

  save.deck = next;
  persist();
  return next;
}

export function deckIsLegal() {
  return save.deck.length === DECK_SIZE;
}

/* -------------------------------------------------------------------------
   Campaign
   ------------------------------------------------------------------------- */
export const isCleared = (id) => save.cleared.includes(id);

export function stageUnlocked(index) {
  if (index === 0) return true;
  return isCleared(CAMPAIGN[index - 1].id);
}

export function recordWin(stageId) {
  const st = CAMPAIGN.find((s) => s.id === stageId);
  if (!st) return { gold: 0 };
  const first = !isCleared(stageId);
  const gold = first ? st.gold : Math.round(st.gold * 0.35);
  if (first) save.cleared.push(stageId);
  save.battlesWon += 1;
  save.gold += gold;

  // A win always yields one shard of a discovered card.
  const pool = save.discovered.filter((id) => !BASE_IDS.includes(id) && levelOf(id) < MAX_LEVEL);
  let shard = null;
  if (pool.length) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    const res = addShard(id, 1);
    shard = { id, card: CARD_BY_ID[id], leveled: res.leveled };
  }
  persist();
  return { gold, first, shard };
}

export function progressPercent() {
  const total = CARDS.filter((k) => !k.token).length;
  return Math.round((save.discovered.length / total) * 100);
}
