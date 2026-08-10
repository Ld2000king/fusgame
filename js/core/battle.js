/* ============================================================================
   BATTLE ENGINE — simultaneous, secret card duels.
   No board, no mana. Each round both sides choose ONE action in secret —
   attack with a hand card, or fuse two hand cards into a stronger one — then
   both are revealed and resolved together. A side that fuses presents no
   card to defend with, so it eats the full force of an opposing attack that
   round: growing your hand costs you the exchange.

   Fusion reuses the exact recipe tree the Lab uses (`fuse()` from
   data/cards.js). Fusing a base prime into something costs orbs ("Final
   Form"); fusing two already-fused cards together is free ("Mega") and
   carries a small stat bonus. Orbs also power each class's per-round trick:
   Elementalist stacks a free attack bonus for every round spent fusing
   instead of attacking; Enchanter spends orbs to buff the card it plays;
   Healer spends orbs to heal.

   Every mutation appends to `log`, and the renderer replays that log for the
   reveal animation and the round feed.
   ========================================================================= */

import { CARD_BY_ID, fuse, isMegaFusion } from '../data/cards.js';

export const HAND_SIZE = 5;
export const MAX_ORBS = 5;
export const MAX_STREAK = 5;
export const FUSE_COST = 3;
export const HEAL_PER_ORB = 1;
export const MEGA_BONUS = { a: 1, d: 1 };
/* index 0 = 1 orb spent … index 4 = 5 orbs spent */
export const ENCHANT_TABLE = [
  { a: 1, d: 1 }, { a: 2, d: 1 }, { a: 2, d: 2 }, { a: 3, d: 2 }, { a: 3, d: 3 },
];
export const CLASS_NAMES = {
  elementalist: 'יסודן',
  enchanter: 'מכשף חפצים',
  healer: 'מרפא',
};

let uidCounter = 1;
const nextUid = () => 'h' + uidCounter++;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const other = (key) => (key === 'player' ? 'enemy' : 'player');

const shuffle = (arr, rand = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function instantiate(cardId, levels = {}) {
  const card = CARD_BY_ID[cardId];
  const lvl = levels[cardId] || 0;
  return {
    uid: nextUid(),
    id: card.id,
    card,
    atk: card.atk + lvl,
    def: card.def + lvl,
    lvl,
  };
}

function say(state, msg, kind = 'info') {
  state.log.push({ t: 'text', kind, msg });
}
function ev(state, entry) {
  state.log.push(entry);
}

/* -------------------------------------------------------------------------
   Construction
   ------------------------------------------------------------------------- */
export function createBattle({
  playerDeck, playerLevels = {}, playerClass = 'elementalist',
  enemy, playerName = 'האלכימאי', rand = Math.random,
}) {
  const mk = (name, deckIds, hp, levels, cls) => ({
    name,
    cls,
    hero: { hp, maxHp: hp },
    deck: shuffle(deckIds, rand).map((id) => instantiate(id, levels)),
    hand: [],
    orbs: 0,
    streak: 0,
    fatigue: 0,
    levels,
    pending: null,
  });

  const state = {
    round: 1,
    over: null,
    log: [],
    rand,
    sides: {
      player: mk(playerName, playerDeck, 30, playerLevels, playerClass),
      enemy: mk(enemy.name, enemy.deck, enemy.hp || 30, enemy.levels || {}, enemy.class || 'elementalist'),
    },
  };

  fillHand(state, 'player', true);
  fillHand(state, 'enemy', true);
  ev(state, { t: 'round', n: 1 });
  return state;
}

function fillHand(state, key, silent = false) {
  const side = state.sides[key];
  while (side.hand.length < HAND_SIZE) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      damageHero(state, key, side.fatigue, 'תשישות');
      if (!silent) say(state, `${side.name} שולף מקופה ריקה וסופג ${side.fatigue} נזק תשישות.`, 'bad');
      break;
    }
    side.hand.push(side.deck.pop());
  }
}

/* -------------------------------------------------------------------------
   Committing a round's action — hidden from the other side until reveal.
   ------------------------------------------------------------------------- */
export function legalActions(state, key) {
  const side = state.sides[key];
  if (side.hand.length === 0) return { attacks: [], fusions: [], mustPass: true };
  const fusions = [];
  for (let i = 0; i < side.hand.length; i++) {
    for (let j = i + 1; j < side.hand.length; j++) {
      const a = side.hand[i];
      const b = side.hand[j];
      const resultId = fuse(a.id, b.id);
      if (!resultId) continue;
      const mega = isMegaFusion(a.id, b.id);
      if (!mega && side.orbs < FUSE_COST) continue;
      fusions.push({ uidA: a.uid, uidB: b.uid, resultId, mega });
    }
  }
  return { attacks: side.hand.map((h) => h.uid), fusions, mustPass: false };
}

export function hasCommitted(state, key) {
  return !!state.sides[key].pending;
}

export function cancelCommit(state, key) {
  state.sides[key].pending = null;
}

export function commitAttack(state, key, uid, spendOrbs = 0) {
  if (state.over) return { ok: false, why: 'הקרב הסתיים.' };
  const side = state.sides[key];
  if (side.pending) return { ok: false, why: 'כבר בחרת פעולה לסיבוב הזה.' };
  const card = side.hand.find((h) => h.uid === uid);
  if (!card) return { ok: false, why: 'הקלף אינו ביד.' };
  const spend = clamp(spendOrbs, 0, Math.min(side.orbs, MAX_ORBS));
  side.pending = { type: 'attack', uid, spend };
  return { ok: true };
}

/** Only legal when the hand is empty — both deck and hand exhausted by fatigue. */
export function commitPass(state, key) {
  if (state.over) return { ok: false, why: 'הקרב הסתיים.' };
  const side = state.sides[key];
  if (side.pending) return { ok: false, why: 'כבר בחרת פעולה לסיבוב הזה.' };
  if (side.hand.length > 0) return { ok: false, why: 'יש לך קלפים ביד — עליך לשחק אחד מהם.' };
  side.pending = { type: 'pass' };
  return { ok: true };
}

export function commitFuse(state, key, uidA, uidB) {
  if (state.over) return { ok: false, why: 'הקרב הסתיים.' };
  const side = state.sides[key];
  if (side.pending) return { ok: false, why: 'כבר בחרת פעולה לסיבוב הזה.' };
  const a = side.hand.find((h) => h.uid === uidA);
  const b = side.hand.find((h) => h.uid === uidB);
  if (!a || !b || a === b) return { ok: false, why: 'בחר שני קלפים שונים מהיד.' };
  const resultId = fuse(a.id, b.id);
  if (!resultId) return { ok: false, why: 'אין מתכון לצירוף הזה.' };
  const mega = isMegaFusion(a.id, b.id);
  if (!mega && side.orbs < FUSE_COST) {
    return { ok: false, why: `נדרשים ${FUSE_COST} אורבים לצורה סופית (יש לך ${side.orbs}).` };
  }
  side.pending = { type: 'fuse', uidA, uidB, mega, resultId };
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Resolution — both sides revealed and resolved together.
   ------------------------------------------------------------------------- */
function doFuse(state, key, act) {
  const side = state.sides[key];
  const a = side.hand.find((h) => h.uid === act.uidA);
  const b = side.hand.find((h) => h.uid === act.uidB);
  side.hand = side.hand.filter((h) => h !== a && h !== b);
  if (!act.mega) side.orbs -= FUSE_COST;

  const result = instantiate(act.resultId, side.levels);
  if (act.mega) { result.atk += MEGA_BONUS.a; result.def += MEGA_BONUS.d; }
  side.hand.push(result);

  ev(state, { t: 'fuse', side: key, a: a.id, b: b.id, result: result.id, mega: act.mega, uid: result.uid });
  say(state,
    act.mega
      ? `${side.name} מתיך ${a.card.name} + ${b.card.name} ל-${result.card.name} (Mega, ללא עלות).`
      : `${side.name} מתיך ${a.card.name} + ${b.card.name} ל-${result.card.name} (צורה סופית).`,
    key === 'player' ? 'good' : 'bad');
}

function resolvePlay(state, key, act) {
  const side = state.sides[key];
  const card = side.hand.find((h) => h.uid === act.uid);
  side.hand.splice(side.hand.indexOf(card), 1);

  let atk = card.atk;
  let def = card.def;

  if (side.cls === 'elementalist') {
    atk += side.streak;
  } else if (side.cls === 'enchanter' && act.spend > 0) {
    const buff = ENCHANT_TABLE[clamp(act.spend, 1, 5) - 1];
    atk += buff.a; def += buff.d;
    side.orbs -= act.spend;
  } else if (side.cls === 'healer' && act.spend > 0) {
    healHero(state, key, act.spend * HEAL_PER_ORB);
    side.orbs -= act.spend;
  }

  ev(state, { t: 'play', side: key, id: card.id, uid: card.uid, atk, def, spend: act.spend || 0 });
  say(state, `${side.name} משחק את ${card.card.name} (${atk}/${def}).`, key === 'player' ? 'good' : 'bad');
  return { atk, def, card };
}

export function damageHero(state, key, n, label = '') {
  if (n <= 0) return 0;
  const side = state.sides[key];
  side.hero.hp -= n;
  ev(state, { t: 'heroDamage', side: key, n, label });
  return n;
}

export function healHero(state, key, n) {
  const side = state.sides[key];
  const before = side.hero.hp;
  side.hero.hp = Math.min(side.hero.maxHp, side.hero.hp + n);
  const healed = side.hero.hp - before;
  if (healed > 0) ev(state, { t: 'heroHeal', side: key, n: healed });
  return healed;
}

/** Resolves the round once both sides have committed. */
export function resolveRound(state) {
  const p = state.sides.player;
  const e = state.sides.enemy;
  if (!p.pending || !e.pending) return { ok: false, why: 'שני הצדדים חייבים לבחור פעולה.' };

  ev(state, { t: 'reveal', player: p.pending, enemy: e.pending });

  const played = {};
  for (const key of ['player', 'enemy']) {
    const side = state.sides[key];
    const act = side.pending;
    if (act.type === 'fuse') {
      doFuse(state, key, act);
      played[key] = null;
      side.streak = Math.min(MAX_STREAK, side.streak + 1);
    } else if (act.type === 'pass') {
      played[key] = null;
      side.streak = 0;
      say(state, `${side.name} מחוסר קלפים ומדלג על הסיבוב.`, key === 'player' ? 'bad' : 'good');
    } else {
      played[key] = resolvePlay(state, key, act);
      side.streak = 0;
    }
  }

  for (const key of ['player', 'enemy']) {
    const foeKey = other(key);
    const mine = played[key];
    if (!mine) continue;
    const foeDef = played[foeKey] ? played[foeKey].def : 0;
    const dmg = Math.max(0, mine.atk - foeDef);
    if (dmg > 0) damageHero(state, foeKey, dmg, 'התקפה');
    else if (played[foeKey]) say(state, `${state.sides[key].name} נבלם לגמרי.`, 'info');
  }

  checkOver(state);

  for (const key of ['player', 'enemy']) {
    const side = state.sides[key];
    side.orbs = Math.min(MAX_ORBS, side.orbs + 1);
    side.pending = null;
    if (!state.over) fillHand(state, key);
  }

  if (!state.over) {
    state.round += 1;
    ev(state, { t: 'round', n: state.round });
  }
  return { ok: true };
}

export function checkOver(state) {
  if (state.over) return state.over;
  const p = state.sides.player.hero.hp <= 0;
  const e = state.sides.enemy.hero.hp <= 0;
  if (p || e) {
    state.over = p && e ? 'draw' : p ? 'enemy' : 'player';
    ev(state, { t: 'over', winner: state.over });
    say(state,
      state.over === 'player' ? 'הניצחון שלך.' : state.over === 'enemy' ? 'הובסת.' : 'תיקו.',
      state.over === 'player' ? 'good' : 'bad');
  }
  return state.over;
}

/** Everything the UI needs about one hand card, in one call. */
export function view(card) {
  return { uid: card.uid, card: card.card, atk: card.atk, def: card.def, lvl: card.lvl };
}
