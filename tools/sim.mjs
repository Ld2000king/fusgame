/* Headless self-play. Runs every campaign deck against every other, checking
   that the engine terminates, never throws, and produces sane win rates.
   Run with `node tools/sim.mjs [gamesPerPair]`. */

import { createBattle, playCard, attack, endTurn } from '../js/core/battle.js';
import { nextAction } from '../js/core/ai.js';
import { CAMPAIGN } from '../js/data/campaign.js';

const PER_PAIR = Number(process.argv[2] || 3);
const MAX_TURNS = 120;

/* Deterministic PRNG so a failure can be reproduced from its seed. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playOut(deckA, deckB, skillA, skillB, hpA, hpB, seed) {
  const state = createBattle({
    playerDeck: deckA,
    enemy: { name: 'B', deck: deckB, hp: hpB },
    rand: mulberry32(seed),
  });
  state.sides.player.hero.hp = hpA;
  state.sides.player.hero.maxHp = hpA;

  let turns = 0;
  while (!state.over && turns < MAX_TURNS) {
    turns++;
    let steps = 0;
    while (!state.over && steps++ < 40) {
      const act = nextAction(state, state.active === 'player' ? skillA : skillB);
      if (act.type === 'end') break;
      if (act.type === 'play') playCard(state, state.active, act.uid);
      else if (act.type === 'attack') attack(state, state.active, act.uid, act.target);
    }
    if (steps >= 40) throw new Error('AI failed to end its turn');
    if (state.over) break;
    endTurn(state);
  }
  return { winner: state.over, turns, logLen: state.log.length };
}

let games = 0;
let errors = 0;
let stalls = 0;
let totalTurns = 0;
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
        const r = playOut(a.deck, b.deck, a.skill, b.skill, a.hp, b.hp, seed);
        games++;
        totalTurns += r.turns;
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

const played = (CAMPAIGN.length * (CAMPAIGN.length - 1)) * PER_PAIR;
console.log('\nwin counts (each deck plays ' + ((CAMPAIGN.length - 1) * PER_PAIR * 2) + ' games):');
for (const st of CAMPAIGN) {
  const w = wins[st.id] || 0;
  const total = (CAMPAIGN.length - 1) * PER_PAIR * 2;
  const pct = Math.round((w / total) * 100);
  console.log(`  ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 3)).padEnd(34)} ${st.id}`);
}

console.log(`\n${games}/${played} games completed in ${Date.now() - t0}ms`);
console.log(`avg ${(totalTurns / Math.max(1, games)).toFixed(1)} turns · ${stalls} stall(s) · ${errors} error(s)\n`);
process.exit(errors || stalls ? 1 : 0);
