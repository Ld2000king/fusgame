/* Headless self-play for the simultaneous-duel engine. Runs every campaign
   deck against every other (each in its own class), checking the engine
   terminates, never throws, and produces a sane difficulty curve.
   Run with `node tools/sim.mjs [gamesPerPair]`. */

import {
  createBattle, commitAttack, commitFuse, commitPass, resolveRound,
} from '../js/core/battle.js';
import { nextAction } from '../js/core/ai.js';
import { CAMPAIGN } from '../js/data/campaign.js';

const PER_PAIR = Number(process.argv[2] || 3);
const MAX_ROUNDS = 200;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function actOn(state, key, action) {
  if (!action) throw new Error(`${key} had no legal action`);
  if (action.type === 'attack') {
    const r = commitAttack(state, key, action.uid, action.spendOrbs || 0);
    if (!r.ok) throw new Error(`${key} attack rejected: ${r.why}`);
  } else if (action.type === 'fuse') {
    const r = commitFuse(state, key, action.uidA, action.uidB);
    if (!r.ok) throw new Error(`${key} fuse rejected: ${r.why}`);
  } else {
    const r = commitPass(state, key);
    if (!r.ok) throw new Error(`${key} pass rejected: ${r.why}`);
  }
}

function playOut(deckA, deckB, clsA, clsB, skillA, skillB, hpA, hpB, seed) {
  const state = createBattle({
    playerDeck: deckA, playerClass: clsA,
    enemy: { name: 'B', deck: deckB, hp: hpB, class: clsB },
    rand: mulberry32(seed),
  });
  state.sides.player.hero.hp = hpA;
  state.sides.player.hero.maxHp = hpA;

  let rounds = 0;
  while (!state.over && rounds < MAX_ROUNDS) {
    rounds++;
    actOn(state, 'player', nextActionAsPlayer(state, skillA));
    actOn(state, 'enemy', nextAction(state, skillB));
    resolveRound(state);
  }
  return { winner: state.over, rounds, logLen: state.log.length };
}

/* Reuse the enemy AI's heuristic for the "player" side too, by swapping
   perspective — sim has no human, both sides need a policy. */
function nextActionAsPlayer(state, skill) {
  const swapped = {
    ...state,
    sides: { player: state.sides.enemy, enemy: state.sides.player },
  };
  const act = nextAction(swapped, skill);
  return act;
}

let games = 0;
let errors = 0;
let stalls = 0;
let totalRounds = 0;
let seed = 12345;
const wins = {};

console.log(`\nsimulating ${PER_PAIR} game(s) per ordered pair of ${CAMPAIGN.length} decks…\n`);
const t0 = Date.now();

for (const a of CAMPAIGN) {
  for (const b of CAMPAIGN) {
    if (a === b) continue;
    for (let i = 0; i < PER_PAIR; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      try {
        const r = playOut(a.deck, b.deck, a.class, b.class, a.skill, b.skill, a.hp, b.hp, seed);
        games++;
        totalRounds += r.rounds;
        if (!r.winner) { stalls++; console.warn(`  ! stall: ${a.id} vs ${b.id} (seed ${seed})`); }
        if (r.winner === 'player') wins[a.id] = (wins[a.id] || 0) + 1;
        if (r.winner === 'enemy') wins[b.id] = (wins[b.id] || 0) + 1;
      } catch (err) {
        errors++;
        console.error(`  ✗ ${a.id} vs ${b.id} (seed ${seed}): ${err.message}`);
        if (errors > 5) { console.error(err.stack); process.exit(1); }
      }
    }
  }
}

const played = CAMPAIGN.length * (CAMPAIGN.length - 1) * PER_PAIR;
console.log('\nwin counts (each deck plays ' + (CAMPAIGN.length - 1) * PER_PAIR * 2 + ' games):');
for (const st of CAMPAIGN) {
  const w = wins[st.id] || 0;
  const total = (CAMPAIGN.length - 1) * PER_PAIR * 2;
  const pct = Math.round((w / total) * 100);
  console.log(`  ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 3)).padEnd(34)} ${st.id} (${st.class})`);
}

console.log(`\n${games}/${played} games completed in ${Date.now() - t0}ms`);
console.log(`avg ${(totalRounds / Math.max(1, games)).toFixed(1)} rounds · ${stalls} stall(s) · ${errors} error(s)\n`);
process.exit(errors || stalls ? 1 : 0);
