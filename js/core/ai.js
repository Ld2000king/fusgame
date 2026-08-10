/* ============================================================================
   OPPONENT AI
   Deliberately readable rather than deep: it takes lethal when lethal exists,
   trades when a trade is profitable, and otherwise pushes damage at the hero.
   `nextAction` returns one move at a time so the UI can pace the turn.
   ========================================================================= */

import {
  statsOf, legalTargets, canAttack, canPlay, tauntsOn, other, BOARD_MAX,
} from './battle.js';

/** Rough "how much board does this minion represent" score. */
function threat(state, key, m) {
  const s = statsOf(state, key, m);
  let v = s.atk * 1.4 + s.hp;
  if (m.kw.includes('taunt')) v += 2;
  if (m.kw.includes('poison')) v += 4;
  if (m.kw.includes('lifesteal')) v += 2;
  if (m.kw.includes('shield')) v += 2;
  if (m.card.aura) v += 5;
  return v;
}

function cardValue(state, key, handCard) {
  const c = handCard.card;
  let v = (c.atk + c.hp) * 1.0 + c.cost * 0.5;
  if (c.kw.includes('taunt')) v += 2;
  if (c.kw.includes('rush')) v += 1.5;
  if (c.kw.includes('lifesteal')) v += 1.5;
  if (c.battlecry) v += 2;
  if (c.deathrattle) v += 1.5;
  if (c.aura) v += 4;
  // Prefer spending the turn's mana fully.
  return v;
}

/**
 * @param {object} state
 * @param {number} skill 0..1 — lower skill occasionally skips a good line.
 * @returns {{type:'play'|'attack'|'end', uid?:string, target?:string}}
 */
export function nextAction(state, skill = 1) {
  const key = state.active;
  if (state.over) return { type: 'end' };
  const side = state.sides[key];
  const foeKey = other(key);
  const foe = state.sides[foeKey];

  /* ---- 1. Lethal check: can the board finish the enemy hero right now? --- */
  const taunts = tauntsOn(state, foeKey);
  if (!taunts.length) {
    let swing = 0;
    for (const m of side.board) {
      if (canAttack(state, key, m.uid).ok) swing += statsOf(state, key, m).atk;
    }
    if (swing >= foe.hero.hp) {
      const ready = side.board.find((m) => canAttack(state, key, m.uid).ok);
      if (ready) return { type: 'attack', uid: ready.uid, target: 'face' };
    }
  }

  /* ---- 2. Develop the board while mana lasts ---------------------------- */
  if (side.board.length < BOARD_MAX) {
    const playable = side.hand
      .filter((h) => canPlay(state, key, h.uid).ok)
      .sort((a, b) => {
        const d = b.card.cost - a.card.cost;
        return d !== 0 ? d : cardValue(state, key, b) - cardValue(state, key, a);
      });
    if (playable.length) {
      // A weaker opponent sometimes plays the wrong card first.
      const idx = state.rand() > skill && playable.length > 1
        ? Math.floor(state.rand() * playable.length)
        : 0;
      return { type: 'play', uid: playable[idx].uid };
    }
  }

  /* ---- 3. Attack ---------------------------------------------------------*/
  const attackers = side.board.filter((m) => canAttack(state, key, m.uid).ok);
  if (attackers.length) {
    let best = null;

    for (const a of attackers) {
      const aStats = statsOf(state, key, a);
      const targets = legalTargets(state, key, a.uid);

      for (const t of targets) {
        let score;
        if (t === 'face') {
          score = aStats.atk * 1.1;
          // Rushing face is worse while an enemy board is developing.
          if (foe.board.length >= 3) score -= 2;
          if (aStats.atk >= foe.hero.hp) score += 100;
        } else {
          const d = foe.board.find((m) => m.uid === t);
          if (!d) continue;
          const dStats = statsOf(state, foeKey, d);
          const kills = a.kw.includes('poison') || aStats.atk >= dStats.hp;
          const dies = dStats.atk >= aStats.hp && !a.shield;
          score = 0;
          if (kills) score += threat(state, foeKey, d) * 1.2;
          else score += Math.min(aStats.atk, dStats.hp) * 0.5;
          if (dies) score -= threat(state, key, a) * 0.9;
          if (d.kw.includes('taunt')) score += 1.5;
        }
        if (!best || score > best.score) best = { score, uid: a.uid, target: t };
      }
    }

    if (best && best.score > -1.5) {
      return { type: 'attack', uid: best.uid, target: best.target };
    }
    // Everything left is a bad trade; if the face is open, hit it anyway.
    for (const a of attackers) {
      if (legalTargets(state, key, a.uid).includes('face')) {
        return { type: 'attack', uid: a.uid, target: 'face' };
      }
    }
  }

  return { type: 'end' };
}
