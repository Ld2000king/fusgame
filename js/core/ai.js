/* ============================================================================
   OPPONENT AI — one blind decision per round.
   Choices are simultaneous and secret, so the AI never sees the player's
   pending action (nothing in this file reads state.sides.player.pending) —
   it can only reason about its own hand, its own resources, and what it
   knows of both hero totals. `skill` (0..1) is the chance it takes its best
   line at all; otherwise it picks a plausible but weaker option, so low-skill
   opponents still make legal, sane moves — just not sharp ones.
   ========================================================================= */

import { CARD_BY_ID } from '../data/cards.js';
import {
  legalActions, ENCHANT_TABLE, FUSE_COST, MAX_ORBS, HEAL_PER_ORB,
} from './battle.js';

function powerOf(card) {
  return card.atk + card.def * 0.7;
}

/** Rough read on how hard the enemy's hand could hit this round, for risk-sizing a fuse. */
function handThreat(hand) {
  if (!hand.length) return 0;
  return hand.reduce((sum, h) => sum + h.atk, 0) / hand.length;
}

function scoreAttack(state, key, h, spend) {
  const side = state.sides[key];
  let atk = h.atk;
  let def = h.def;
  if (side.cls === 'elementalist') atk += side.streak;
  if (side.cls === 'enchanter' && spend > 0) {
    const buff = ENCHANT_TABLE[Math.min(5, spend) - 1];
    atk += buff.a; def += buff.d;
  }
  let score = atk * 1.1 + def * 0.6;
  // A near-lethal hit is worth chasing even off a middling card.
  const foeHp = state.sides[key === 'player' ? 'enemy' : 'player'].hero.hp;
  if (atk >= foeHp) score += 50;
  // Healing has zero effect on atk/def, so it must be scored explicitly or
  // every spend amount ties and the AI silently never bothers to heal.
  if (side.cls === 'healer' && spend > 0) {
    const missing = side.hero.maxHp - side.hero.hp;
    score += Math.min(spend * HEAL_PER_ORB, missing) * 0.9;
  }
  return { score, atk, def };
}

function scoreFuse(state, key, f) {
  const side = state.sides[key];
  const result = CARD_BY_ID[f.resultId];
  let score = powerOf(result) * (f.mega ? 1.3 : 1.0);
  // Undefended this round — riskier while low on hp, cheaper while ahead.
  const foeHand = state.sides[key === 'player' ? 'enemy' : 'player'].hand;
  const risk = handThreat(foeHand) * (1 - side.hero.hp / side.hero.maxHp) * 1.4;
  score -= risk;
  if (!f.mega) score -= FUSE_COST * 0.8; // orb cost has to be worth it
  return score;
}

/**
 * @param {object} state
 * @param {number} skill 0..1 — chance of taking the strongest available line.
 * @returns {{type:'attack', uid:string, spendOrbs:number}|{type:'fuse', uidA:string, uidB:string}}
 */
export function nextAction(state, skill = 1) {
  const key = 'enemy';
  const side = state.sides[key];
  const { attacks, fusions, mustPass } = legalActions(state, key);
  if (mustPass) return { type: 'pass' };

  const candidates = [];

  for (const uid of attacks) {
    const h = side.hand.find((x) => x.uid === uid);
    const spendOptions = side.cls === 'elementalist' ? [0] : range(0, Math.min(side.orbs, MAX_ORBS));
    for (const spend of spendOptions) {
      if (side.cls === 'healer' && spend > 0 && side.hero.hp >= side.hero.maxHp) continue; // no point healing at full hp
      const { score } = scoreAttack(state, key, h, spend);
      candidates.push({ type: 'attack', uid, spendOrbs: spend, score });
    }
  }

  for (const f of fusions) {
    candidates.push({ type: 'fuse', uidA: f.uidA, uidB: f.uidB, score: scoreFuse(state, key, f) });
  }

  // A non-empty hand always yields at least one attack candidate (one per
  // card), so `candidates` is never empty here — `mustPass` above is the
  // only true dead end.
  candidates.sort((a, b) => b.score - a.score);

  const pick = state.rand() < skill
    ? candidates[0]
    : candidates[Math.floor(state.rand() * candidates.length)];

  return pick;
}

function range(lo, hi) {
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}
