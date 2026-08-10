/* ============================================================================
   BATTLE ENGINE
   A deterministic, UI-free state machine. Every mutation appends to `log`, and
   the renderer replays that log for floating numbers and the combat feed.
   ========================================================================= */

import { CARD_BY_ID } from '../data/cards.js';

export const BOARD_MAX = 6;
export const HAND_MAX = 8;
export const MANA_MAX = 10;

let uidCounter = 1;
const nextUid = () => 'm' + uidCounter++;

const shuffle = (arr, rand = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* -------------------------------------------------------------------------
   Minion instances
   ------------------------------------------------------------------------- */
function instantiate(cardId, levels = {}) {
  const card = CARD_BY_ID[cardId];
  const lvl = levels[cardId] || 0;
  return {
    uid: nextUid(),
    id: card.id,
    card,
    baseAtk: card.atk + lvl,
    baseHp: card.hp + lvl,
    lvl,
    buffA: 0,
    buffH: 0,
    dmg: 0,
    kw: card.kw.slice(),
    frozen: false,
    shield: card.kw.includes('shield'),
    ready: card.kw.includes('rush'),
    attacksLeft: 0,
    dead: false,
  };
}

/** Aura bonus contributed by *other* friendly minions. */
function auraFor(side, minion) {
  let a = 0;
  let h = 0;
  for (const m of side.board) {
    if (m === minion || m.dead || !m.card.aura) continue;
    a += m.card.aura.a;
    h += m.card.aura.h;
  }
  return { a, h };
}

export function statsOf(state, sideKey, minion) {
  const side = state.sides[sideKey];
  const bonus = auraFor(side, minion);
  const atk = Math.max(0, minion.baseAtk + minion.buffA + bonus.a);
  const maxHp = Math.max(1, minion.baseHp + minion.buffH + bonus.h);
  return { atk, maxHp, hp: maxHp - minion.dmg, aura: bonus };
}

const sideOf = (state, key) => state.sides[key];
export const other = (key) => (key === 'player' ? 'enemy' : 'player');

/* -------------------------------------------------------------------------
   Construction
   ------------------------------------------------------------------------- */
export function createBattle({ playerDeck, playerLevels = {}, enemy, playerName = 'האלכימאי', rand = Math.random }) {
  const mk = (name, deckIds, hp, levels) => ({
    name,
    hero: { hp, maxHp: hp },
    mana: 0,
    maxMana: 0,
    deck: shuffle(deckIds, rand).map((id) => instantiate(id, levels)),
    hand: [],
    board: [],
    fatigue: 0,
    levels,
  });

  const state = {
    turn: 0,
    active: 'player',
    over: null,
    log: [],
    rand,
    sides: {
      player: mk(playerName, playerDeck, 30, playerLevels),
      enemy: mk(enemy.name, enemy.deck, enemy.hp || 30, enemy.levels || {}),
    },
    enemyMeta: enemy,
  };

  for (let i = 0; i < 3; i++) draw(state, 'player', true);
  for (let i = 0; i < 4; i++) draw(state, 'enemy', true);

  beginTurn(state, 'player');
  return state;
}

/* -------------------------------------------------------------------------
   Logging
   ------------------------------------------------------------------------- */
function say(state, msg, kind = 'info') {
  state.log.push({ t: 'text', kind, msg });
}
function ev(state, entry) {
  state.log.push(entry);
}

/* -------------------------------------------------------------------------
   Cards & turns
   ------------------------------------------------------------------------- */
export function draw(state, key, silent = false) {
  const side = sideOf(state, key);
  if (side.deck.length === 0) {
    side.fatigue += 1;
    damageHero(state, key, side.fatigue, 'תשישות');
    if (!silent) say(state, `${side.name} שולף מקופה ריקה וסופג ${side.fatigue} נזק תשישות.`, 'bad');
    return null;
  }
  const card = side.deck.pop();
  if (side.hand.length >= HAND_MAX) {
    if (!silent) say(state, `היד של ${side.name} מלאה — ${card.card.name} נשרף.`, 'bad');
    ev(state, { t: 'burn', side: key, id: card.id });
    return null;
  }
  side.hand.push(card);
  if (!silent) ev(state, { t: 'draw', side: key, uid: card.uid });
  return card;
}

export function beginTurn(state, key) {
  state.active = key;
  state.turn += 1;
  const side = sideOf(state, key);
  side.maxMana = Math.min(MANA_MAX, side.maxMana + 1);
  side.mana = side.maxMana;

  for (const m of side.board) {
    if (m.frozen) {
      m.frozen = false;
      m.attacksLeft = 0;
      ev(state, { t: 'thaw', uid: m.uid });
    } else {
      m.attacksLeft = 1;
    }
    m.ready = true;
  }

  ev(state, { t: 'turn', side: key, turn: state.turn });
  if (state.turn > 1) draw(state, key);
  checkOver(state);
}

export function endTurn(state) {
  if (state.over) return;
  beginTurn(state, other(state.active));
}

/* -------------------------------------------------------------------------
   Playing a card
   ------------------------------------------------------------------------- */
export function canPlay(state, key, uid) {
  const side = sideOf(state, key);
  const card = side.hand.find((h) => h.uid === uid);
  if (!card) return { ok: false, why: 'הקלף אינו ביד.' };
  if (state.active !== key) return { ok: false, why: 'לא תורך.' };
  if (side.mana < card.card.cost) return { ok: false, why: 'אין מספיק מאנה.' };
  if (side.board.length >= BOARD_MAX) return { ok: false, why: 'הזירה מלאה.' };
  return { ok: true, card };
}

export function playCard(state, key, uid) {
  const check = canPlay(state, key, uid);
  if (!check.ok) return check;

  const side = sideOf(state, key);
  const card = check.card;
  side.hand.splice(side.hand.indexOf(card), 1);
  side.mana -= card.card.cost;
  card.attacksLeft = card.kw.includes('rush') ? 1 : 0;
  side.board.push(card);

  ev(state, { t: 'play', side: key, uid: card.uid, id: card.id });
  say(state, `${side.name} מזמן את ${card.card.name}.`, key === 'player' ? 'good' : 'bad');

  if (card.card.battlecry) resolveEffect(state, key, card, card.card.battlecry, 'זעקת קרב');
  cleanup(state);
  checkOver(state);
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Effects
   ------------------------------------------------------------------------- */
function livingTargets(state, key, { excludeStealth = true } = {}) {
  return sideOf(state, key).board.filter(
    (m) => !m.dead && !(excludeStealth && m.kw.includes('stealth'))
  );
}

function randomOf(state, arr) {
  if (!arr.length) return null;
  return arr[Math.floor(state.rand() * arr.length)];
}

function resolveEffect(state, key, source, effect, label) {
  const foe = other(key);
  const side = sideOf(state, key);

  switch (effect.type) {
    case 'dmgFace':
      damageHero(state, foe, effect.n, label);
      break;

    case 'dmgOwnFace':
      damageHero(state, key, effect.n, label);
      break;

    case 'dmgRandomEnemy': {
      const t = randomOf(state, livingTargets(state, foe));
      if (t) damageMinion(state, foe, t, effect.n, key, label);
      break;
    }

    case 'dmgAllEnemyMinions':
      for (const m of livingTargets(state, foe, { excludeStealth: false })) {
        damageMinion(state, foe, m, effect.n, key, label);
      }
      break;

    case 'healHero':
      healHero(state, key, effect.n);
      break;

    case 'draw':
      for (let i = 0; i < effect.n; i++) draw(state, key);
      break;

    case 'buffRandomFriendly': {
      const t = randomOf(state, side.board.filter((m) => !m.dead && m !== source));
      const target = t || source;
      target.buffA += effect.a;
      target.buffH += effect.h;
      ev(state, { t: 'buff', uid: target.uid, a: effect.a, h: effect.h });
      say(state, `${target.card.name} מקבל +${effect.a}/+${effect.h}.`, 'good');
      break;
    }

    case 'summon':
      for (let i = 0; i < effect.n; i++) summon(state, key, effect.id);
      break;

    case 'summonRandom': {
      const pool = Object.values(CARD_BY_ID).filter(
        (k) => !k.token && k.tier > 0 && k.tier <= effect.maxTier
      );
      for (let i = 0; i < effect.n; i++) {
        const k = randomOf(state, pool);
        if (k) summon(state, key, k.id);
      }
      break;
    }

    case 'freezeRandomEnemy': {
      const t = randomOf(state, livingTargets(state, foe));
      if (t) freeze(state, t);
      break;
    }

    case 'freezeAllEnemies':
      for (const m of livingTargets(state, foe, { excludeStealth: false })) freeze(state, m);
      break;

    case 'destroyRandomEnemy': {
      const t = randomOf(state, livingTargets(state, foe));
      if (t) destroy(state, foe, t, label);
      break;
    }

    case 'destroyAllOthers':
      for (const k of ['player', 'enemy']) {
        for (const m of sideOf(state, k).board.slice()) {
          if (m !== source && !m.dead) destroy(state, k, m, label);
        }
      }
      break;

    case 'sunburst':
      for (const m of livingTargets(state, foe, { excludeStealth: false })) {
        damageMinion(state, foe, m, 3, key, label);
      }
      healHero(state, key, 5);
      break;

    default:
      break;
  }
}

function summon(state, key, cardId) {
  const side = sideOf(state, key);
  if (side.board.length >= BOARD_MAX) return null;
  const m = instantiate(cardId, side.levels);
  m.attacksLeft = m.kw.includes('rush') ? 1 : 0;
  side.board.push(m);
  ev(state, { t: 'play', side: key, uid: m.uid, id: m.id, summoned: true });
  say(state, `${m.card.name} מוזמן לזירה.`, key === 'player' ? 'good' : 'bad');
  return m;
}

function freeze(state, m) {
  m.frozen = true;
  m.attacksLeft = 0;
  ev(state, { t: 'freeze', uid: m.uid });
}

/* -------------------------------------------------------------------------
   Damage & death
   ------------------------------------------------------------------------- */
export function damageHero(state, key, n, label = '') {
  if (n <= 0) return 0;
  const side = sideOf(state, key);
  side.hero.hp -= n;
  ev(state, { t: 'heroDamage', side: key, n, label });
  return n;
}

export function healHero(state, key, n) {
  const side = sideOf(state, key);
  const before = side.hero.hp;
  side.hero.hp = Math.min(side.hero.maxHp, side.hero.hp + n);
  const healed = side.hero.hp - before;
  if (healed > 0) ev(state, { t: 'heroHeal', side: key, n: healed });
  return healed;
}

export function damageMinion(state, key, m, n, sourceKey, label = '', source = null) {
  if (m.dead || n <= 0) return 0;

  if (m.shield) {
    m.shield = false;
    ev(state, { t: 'shieldPop', uid: m.uid });
    say(state, `החיץ של ${m.card.name} נופץ.`, 'info');
    return 0;
  }

  m.dmg += n;
  ev(state, { t: 'damage', side: key, uid: m.uid, n, label });

  if (source && source.kw.includes('poison')) {
    m.dmg = 9999;
    ev(state, { t: 'poison', uid: m.uid });
  }
  return n;
}

function destroy(state, key, m, label = '') {
  if (m.dead) return;
  m.dmg = 9999;
  ev(state, { t: 'destroy', uid: m.uid, label });
  cleanup(state);
}

/** Removes minions at or below 0 hp and fires deathrattles until stable. */
export function cleanup(state) {
  let again = true;
  let guard = 0;
  while (again && guard++ < 12) {
    again = false;
    for (const key of ['player', 'enemy']) {
      const side = sideOf(state, key);
      for (const m of side.board.slice()) {
        if (m.dead) continue;
        const { hp } = statsOf(state, key, m);
        if (hp > 0) continue;

        m.dead = true;
        side.board.splice(side.board.indexOf(m), 1);
        ev(state, { t: 'death', side: key, uid: m.uid, id: m.id });
        say(state, `${m.card.name} נופל.`, key === 'player' ? 'bad' : 'good');

        if (m.card.deathrattle) {
          resolveEffect(state, key, m, m.card.deathrattle, 'צוואה');
          again = true;
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------
   Attacking
   ------------------------------------------------------------------------- */
export function tauntsOn(state, key) {
  return sideOf(state, key).board.filter(
    (m) => !m.dead && m.kw.includes('taunt') && !m.kw.includes('stealth')
  );
}

export function canAttack(state, key, uid) {
  if (state.active !== key || state.over) return { ok: false, why: 'לא תורך.' };
  const m = sideOf(state, key).board.find((x) => x.uid === uid);
  if (!m) return { ok: false, why: 'היצור אינו בזירה.' };
  if (m.frozen) return { ok: false, why: 'היצור קפוא.' };
  if (m.attacksLeft <= 0) return { ok: false, why: 'היצור כבר תקף בתור הזה.' };
  if (statsOf(state, key, m).atk <= 0) return { ok: false, why: 'אין לו כוח התקפה.' };
  return { ok: true, minion: m };
}

export function legalTargets(state, key, uid) {
  const check = canAttack(state, key, uid);
  if (!check.ok) return [];
  const foe = other(key);
  const taunts = tauntsOn(state, foe);
  if (taunts.length) return taunts.map((m) => m.uid);
  const open = livingTargets(state, foe).map((m) => m.uid);
  return open.concat(['face']);
}

export function attack(state, key, uid, targetUid) {
  const check = canAttack(state, key, uid);
  if (!check.ok) return check;
  if (!legalTargets(state, key, uid).includes(targetUid)) {
    return { ok: false, why: 'יש להתמודד קודם עם יצורי המגן.' };
  }

  const foe = other(key);
  const attacker = check.minion;
  const aStats = statsOf(state, key, attacker);
  attacker.attacksLeft -= 1;

  // Attacking breaks stealth.
  if (attacker.kw.includes('stealth')) {
    attacker.kw = attacker.kw.filter((k) => k !== 'stealth');
    ev(state, { t: 'reveal', uid: attacker.uid });
  }

  if (targetUid === 'face') {
    ev(state, { t: 'attack', from: attacker.uid, to: 'face', side: key });
    const dealt = damageHero(state, foe, aStats.atk, 'התקפה');
    if (attacker.kw.includes('lifesteal')) healHero(state, key, dealt);
    say(state, `${attacker.card.name} מכה בגיבור היריב ל-${aStats.atk} נזק.`,
      key === 'player' ? 'good' : 'bad');
  } else {
    const defender = sideOf(state, foe).board.find((m) => m.uid === targetUid);
    if (!defender) return { ok: false, why: 'המטרה כבר אינה בזירה.' };
    const dStats = statsOf(state, foe, defender);

    ev(state, { t: 'attack', from: attacker.uid, to: defender.uid, side: key });
    const dealt = damageMinion(state, foe, defender, aStats.atk, key, 'התקפה', attacker);
    damageMinion(state, key, attacker, dStats.atk, foe, 'נגד', defender);

    if (attacker.kw.includes('lifesteal') && dealt > 0) healHero(state, key, dealt);
    if (defender.kw.includes('lifesteal') && dStats.atk > 0) healHero(state, foe, dStats.atk);

    say(state, `${attacker.card.name} מתנגש ב-${defender.card.name}.`, 'info');
  }

  cleanup(state);
  checkOver(state);
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Win condition
   ------------------------------------------------------------------------- */
export function checkOver(state) {
  if (state.over) return state.over;
  const p = state.sides.player.hero.hp <= 0;
  const e = state.sides.enemy.hero.hp <= 0;
  if (p || e) {
    state.over = p && e ? 'draw' : p ? 'enemy' : 'player';
    ev(state, { t: 'over', winner: state.over });
    say(state,
      state.over === 'player' ? 'הניצחון שלך.' :
      state.over === 'enemy' ? 'הובסת.' : 'תיקו.',
      state.over === 'player' ? 'good' : 'bad');
  }
  return state.over;
}

/** Everything the UI needs about one minion, in one call. */
export function view(state, key, m) {
  const s = statsOf(state, key, m);
  return {
    uid: m.uid,
    card: m.card,
    atk: s.atk,
    hp: s.hp,
    maxHp: s.maxHp,
    damaged: m.dmg > 0,
    buffed: m.buffA > 0 || m.buffH > 0 || s.aura.a > 0 || s.aura.h > 0,
    lvl: m.lvl,
    frozen: m.frozen,
    shield: m.shield,
    stealth: m.kw.includes('stealth'),
    taunt: m.kw.includes('taunt'),
    kw: m.kw,
    exhausted: m.attacksLeft <= 0,
  };
}
