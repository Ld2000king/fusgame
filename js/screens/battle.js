/* ============================================================================
   BATTLE SCREEN — simultaneous secret duels.
   Pick one card to attack, or two cards to fuse, then commit. Your choice is
   hidden until the opponent has also committed — then both reveal together
   and the round resolves at once.
   ========================================================================= */

import { h, clear, modal, floatNumber, shake, wait } from '../ui/dom.js';
import { renderCard } from '../ui/card.js';
import { sigil } from '../ui/sigil.js';
import {
  createBattle, commitAttack, commitFuse, commitPass, resolveRound,
  legalActions, view, CLASS_NAMES, MAX_ORBS, MAX_STREAK, FUSE_COST,
  HEAL_PER_ORB, ENCHANT_TABLE,
} from '../core/battle.js';
import { fuse, isMegaFusion, CARD_BY_ID } from '../data/cards.js';
import { nextAction } from '../core/ai.js';
import { save, recordWin, levelOf } from '../core/state.js';

let state = null;
let stage = null;
let picked = [];       // up to 2 uids from the player's hand
let spend = 0;          // orbs to spend on the committed attack
let busy = false;
let host = null;
let ctxRef = null;
let lastReveal = null;  // {player:{...}|null, enemy:{...}|null} for the duel row
let verdict = '';

/* Every battle gets an epoch; async steps bail out the moment the epoch the
   UI left changes (leaving the screen, or starting a fresh battle). */
let epoch = 0;
const stale = (mine) => mine !== epoch || !state;

export function startBattle(root, ctx, stageDef, playerClass) {
  epoch += 1;
  host = root;
  ctxRef = ctx;
  stage = stageDef;
  picked = [];
  spend = 0;
  busy = false;
  lastReveal = null;
  verdict = '';
  finished = false;

  const levels = {};
  for (const id of save.discovered) if (levelOf(id)) levels[id] = levelOf(id);

  state = createBattle({
    playerDeck: save.deck.slice(),
    playerLevels: levels,
    playerClass,
    enemy: { name: stageDef.name, deck: stageDef.deck, hp: stageDef.hp, class: stageDef.class, el: stageDef.el },
  });

  paint();
}

/* -------------------------------------------------------------------------
   Painting
   ------------------------------------------------------------------------- */
function paint() {
  clear(host);
  host.className = 'screen is-battle';

  const arena = h('div', { class: 'arena' });
  host.append(arena);

  arena.append(
    heroBar('enemy'),
    duelRow(),
    heroBar('player'),
    actionPanel(),
    handRail(),
  );
}

function meters(side) {
  return h('div', { class: 'meters' }, [
    h('div', {
      class: 'meter meter--orb',
      title: `${side.orbs}/${MAX_ORBS} אורבים`,
    }, Array.from({ length: MAX_ORBS }, (_, i) => h('i', { class: i < side.orbs ? 'on' : '' }))),
    h('div', {
      class: 'meter meter--streak',
      title: `${side.streak}/${MAX_STREAK} רצף קומבו`,
    }, Array.from({ length: MAX_STREAK }, (_, i) => h('i', { class: i < side.streak ? 'on' : '' }))),
  ]);
}

function heroBar(key) {
  const side = state.sides[key];
  const mine = key === 'player';
  const el = mine ? 'arcane' : (stage.el || 'shadow');

  return h('div', {
    class: 'hero-bar' + (!state.over ? ' is-active' : ''),
    'data-el': el,
    'data-hero': key,
  }, [
    h('div', {
      class: 'hero-sigil',
      html: sigil({ id: 'hero-' + key + '-' + (stage.id || 'x'), el, tier: mine ? 4 : 5 }, { size: 40 }),
    }),
    h('div', { class: 'hero-meta' }, [
      h('b', { text: mine ? 'אתה' : side.name }),
      h('span', { class: 'hint' }, [
        h('span', { class: 'class-badge', text: CLASS_NAMES[side.cls] }),
        h('span', { text: `${side.hand.length} ביד · ${side.deck.length} בקופה` }),
      ]),
    ]),
    h('div', {}, [
      h('div', { class: 'hero-hp' }, [
        h('span', { text: String(Math.max(0, side.hero.hp)) }),
        h('span', { class: 'ic', text: '♥' }),
      ]),
      meters(side),
    ]),
  ]);
}

function duelRow() {
  const row = h('div', { class: 'duel-row' });
  row.append(
    duelSlot('player'),
    h('div', { class: 'duel-vs', text: String(state.round) }),
    duelSlot('enemy'),
  );
  return row;
}

function duelSlot(key) {
  const info = lastReveal && lastReveal[key];
  const committed = !lastReveal && state.sides[key].pending;

  if (info === undefined && !committed) {
    return h('div', { class: 'duel-slot', 'data-hero-slot': key }, [
      h('span', { class: 'hint', text: 'ממתין\nלבחירה' }),
    ]);
  }
  if (committed) {
    return h('div', { class: 'duel-slot is-locked', 'data-hero-slot': key }, [
      h('span', { class: 'hint', text: key === 'player' ? 'בחרת' : 'היריב\nבוחר…' }),
    ]);
  }
  if (info === null) {
    return h('div', { class: 'duel-slot is-undefended', 'data-hero-slot': key }, [
      h('span', { class: 'hint', text: 'ללא\nהגנה' }),
    ]);
  }
  return h('div', { class: 'duel-slot is-revealed', 'data-hero-slot': key }, [
    renderCard(info.card, { atk: info.atk, def: info.def, mega: info.mega, animate: true }),
  ]);
}

function actionPanel() {
  const panel = h('div', { class: 'action-panel' });
  const side = state.sides.player;

  if (state.over || busy) {
    panel.append(h('p', { class: 'action-hint battle-verdict', text: verdict || (state.over ? 'הקרב הסתיים.' : 'מיישב סיבוב…') }));
    return panel;
  }

  const { mustPass } = legalActions(state, 'player');
  if (mustPass) {
    panel.append(h('div', { class: 'action-row' }, [
      h('p', { class: 'action-hint', text: 'אין לך קלפים ביד — הסיבוב הזה יידלג.' }),
      h('button', { class: 'btn btn--gold btn--sm', text: 'המשך', onclick: () => runRound({ type: 'pass' }) }),
    ]));
    return panel;
  }

  if (picked.length === 0) {
    panel.append(h('p', { class: 'action-hint', text: 'בחר קלף אחד כדי לתקוף, או שניים כדי להתיך.' }));
    return panel;
  }

  if (picked.length === 1) {
    const card = side.hand.find((c) => c.uid === picked[0]);
    panel.append(attackRow(side, card));
    return panel;
  }

  const a = side.hand.find((c) => c.uid === picked[0]);
  const b = side.hand.find((c) => c.uid === picked[1]);
  panel.append(fuseRow(side, a, b));
  return panel;
}

function attackRow(side, card) {
  const row = h('div', { class: 'action-row' });
  const canSpend = side.cls !== 'elementalist' && side.orbs > 0;
  const maxSpend = Math.min(side.orbs, 5);

  let atk = card.atk;
  let def = card.def;
  let note = '';
  if (side.cls === 'elementalist') {
    atk += side.streak;
    note = side.streak ? ` (+${side.streak} מרצף)` : '';
  } else if (side.cls === 'enchanter' && spend > 0) {
    const buff = ENCHANT_TABLE[spend - 1];
    atk += buff.a; def += buff.d;
    note = ` (+${buff.a}/+${buff.d})`;
  } else if (side.cls === 'healer' && spend > 0) {
    note = ` (+${spend * HEAL_PER_ORB} ריפוי)`;
  }

  if (canSpend) {
    row.append(h('div', { class: 'spend-stepper' }, [
      h('button', {
        text: '−', disabled: spend <= 0,
        onclick: () => { spend = Math.max(0, spend - 1); paintAction(); },
      }),
      h('b', { text: String(spend) }),
      h('button', {
        text: '+', disabled: spend >= maxSpend,
        onclick: () => { spend = Math.min(maxSpend, spend + 1); paintAction(); },
      }),
    ]));
  }

  row.append(
    h('button', {
      class: 'btn btn--gold',
      text: `התקף · ${card.card.name} (${atk}/${def})${note}`,
      onclick: () => runRound({ type: 'attack', uid: card.uid, spendOrbs: spend }),
    }),
    h('button', { class: 'btn btn--sm btn--ghost', text: 'נקה', onclick: clearPick }),
  );
  return row;
}

function fuseRow(side, a, b) {
  const row = h('div', { class: 'action-row' });
  const resultId = fuse(a.id, b.id);

  if (!resultId) {
    row.append(
      h('p', { class: 'action-hint', text: `אין מתכון לצירוף ${a.card.name} + ${b.card.name}.` }),
      h('button', { class: 'btn btn--sm btn--ghost', text: 'נקה', onclick: clearPick }),
    );
    return row;
  }

  const mega = isMegaFusion(a.id, b.id);
  const result = CARD_BY_ID[resultId];
  const affordable = mega || side.orbs >= FUSE_COST;

  row.append(
    h('button', {
      class: 'btn btn--gold',
      disabled: !affordable,
      text: mega
        ? `Mega · ${a.card.name} + ${b.card.name} → ${result.name} (חינם)`
        : `התך · ${a.card.name} + ${b.card.name} → ${result.name} (${FUSE_COST} אורבים)`,
      onclick: () => runRound({ type: 'fuse', uidA: a.uid, uidB: b.uid }),
    }),
    h('button', { class: 'btn btn--sm btn--ghost', text: 'נקה', onclick: clearPick }),
  );
  if (!affordable) {
    row.append(h('p', { class: 'action-hint', text: `נדרשים ${FUSE_COST} אורבים (יש לך ${side.orbs}).` }));
  }
  return row;
}

function handRail() {
  const side = state.sides.player;
  const rail = h('div', { class: 'hand-rail' });

  if (!side.hand.length) {
    rail.append(h('span', { class: 'action-hint', text: 'אין קלפים ביד' }));
    return rail;
  }

  const fusibleWith = picked.length === 1
    ? new Set(side.hand.filter((c) => c.uid !== picked[0] && fuse(c.id, side.hand.find((x) => x.uid === picked[0]).id)).map((c) => c.uid))
    : null;

  for (const card of side.hand) {
    rail.append(renderCard(card.card, {
      atk: card.atk,
      def: card.def,
      lvl: card.lvl,
      selected: picked.includes(card.uid),
      className: (fusibleWith && fusibleWith.has(card.uid)) ? 'is-fusible' : '',
      animate: true,
      onClick: () => pick(card.uid),
    }));
  }
  return rail;
}

function paintAction() {
  const arena = host.querySelector('.arena');
  if (!arena) return;
  const old = arena.querySelector('.action-panel');
  const fresh = actionPanel();
  if (old) old.replaceWith(fresh); else arena.append(fresh);
}

/* -------------------------------------------------------------------------
   Selection
   ------------------------------------------------------------------------- */
function pick(uid) {
  if (busy || state.over) return;
  if (picked.includes(uid)) {
    picked = picked.filter((u) => u !== uid);
  } else if (picked.length < 2) {
    picked = [...picked, uid];
  } else {
    picked = [uid];
  }
  spend = 0;
  paint();
}

function clearPick() {
  picked = [];
  spend = 0;
  paint();
}

/* -------------------------------------------------------------------------
   Committing & resolving a round
   ------------------------------------------------------------------------- */
async function runRound(action) {
  if (busy || state.over) return;
  const mine = epoch;
  busy = true;

  let res;
  if (action.type === 'attack') res = commitAttack(state, 'player', action.uid, action.spendOrbs || 0);
  else if (action.type === 'fuse') res = commitFuse(state, 'player', action.uidA, action.uidB);
  else res = commitPass(state, 'player');

  if (!res.ok) {
    busy = false;
    paintAction();
    return;
  }

  picked = [];
  spend = 0;
  lastReveal = null;
  paint();

  await wait(550);
  if (stale(mine)) return;

  const { mustPass } = legalActions(state, 'enemy');
  const enemyAction = mustPass ? { type: 'pass' } : nextAction(state, stage.skill);
  if (enemyAction.type === 'attack') commitAttack(state, 'enemy', enemyAction.uid, enemyAction.spendOrbs || 0);
  else if (enemyAction.type === 'fuse') commitFuse(state, 'enemy', enemyAction.uidA, enemyAction.uidB);
  else commitPass(state, 'enemy');

  const before = state.log.length;
  resolveRound(state);
  lastReveal = extractReveal(state.log.slice(before));
  verdict = roundVerdict(state.log.slice(before));

  paint();
  replay(state.log.slice(before));

  await wait(state.over ? 3200 : 2400);
  if (stale(mine)) return;

  lastReveal = null;
  busy = false;

  if (state.over) {
    paint();
    await wait(1200);
    if (!stale(mine)) finish();
    return;
  }
  paint();
}

function roundVerdict(events) {
  const playerHit = events.filter((e) => e.t === 'heroDamage' && e.side === 'enemy').reduce((n, e) => n + e.n, 0);
  const enemyHit = events.filter((e) => e.t === 'heroDamage' && e.side === 'player').reduce((n, e) => n + e.n, 0);
  if (playerHit > enemyHit) return `הסיבוב שלך · גרמת ${playerHit} נזק`;
  if (enemyHit > playerHit) return `היריב ניצח בסיבוב · ספגת ${enemyHit} נזק`;
  if (playerHit || enemyHit) return `שוויון בסיבוב · ${playerHit} נזק לכל צד`;
  return 'שני הלוחמים עצרו זה את זה';
}

/** Reads the round's log slice into {player, enemy} for the duel row. */
function extractReveal(events) {
  const out = { player: null, enemy: null };
  for (const e of events) {
    if (e.t === 'play') out[e.side] = { card: CARD_BY_ID[e.id], atk: e.atk, def: e.def, mega: false };
    if (e.t === 'fuse') out[e.side] = null; // undefended
  }
  return out;
}

function replay(events) {
  for (const e of events) {
    if (e.t === 'heroDamage') {
      const node = host.querySelector(`[data-hero="${e.side}"]`);
      floatNumber(node, '-' + e.n, 'dmg');
      shake(node);
    } else if (e.t === 'heroHeal') {
      const node = host.querySelector(`[data-hero="${e.side}"]`);
      floatNumber(node, '+' + e.n, 'heal');
    }
  }
}

/* -------------------------------------------------------------------------
   Result
   ------------------------------------------------------------------------- */
let finished = false;
function finish() {
  if (finished || !state) return;
  finished = true;

  const won = state.over === 'player';
  const reward = won ? recordWin(stage.id) : { gold: 0 };

  modal((api) => [
    h('p', { class: 'eyebrow', text: won ? 'Solve et Coagula' : 'Nigredo' }),
    h('h2', { text: won ? 'ניצחון' : state.over === 'draw' ? 'תיקו' : 'תבוסה' }),
    h('div', { class: 'modal-body' }, [
      h('p', {
        text: won
          ? `${stage.name} הובס. ${reward.first ? 'המפגש הראשון הושלם — השלב הבא נפתח.' : 'תגמול חוזר.'}`
          : `${stage.name} עמד בפניך. חזק את האוסף ונסה שוב.`,
      }),
      won
        ? h('div', { class: 'stat-strip' }, [
            h('div', {}, [h('b', { text: '+' + reward.gold }), h('span', { text: 'זהב' })]),
            reward.shard
              ? h('div', {}, [
                  h('b', { text: reward.shard.leveled ? '↑' : '+1' }),
                  h('span', { text: 'רסיס ' + reward.shard.card.name }),
                ])
              : null,
          ])
        : null,
      won && reward.shard && reward.shard.leveled
        ? h('p', {
            style: 'color:var(--gold-hi)',
            text: `${reward.shard.card.name} עלה לדרגה ${levelOf(reward.shard.id)}.`,
          })
        : null,
      h('div', { class: 'modal-actions' }, [
        h('button', {
          class: 'btn btn--gold',
          text: 'חזרה למסע',
          onclick: () => { api.close(); finished = false; ctxRef.go('map'); },
        }),
        h('button', {
          class: 'btn',
          text: 'קרב חוזר',
          onclick: () => { api.close(); finished = false; startBattle(host, ctxRef, stage, save.preferredClass); },
        }),
        h('button', {
          class: 'btn btn--sm btn--ghost',
          text: 'למעבדה',
          onclick: () => { api.close(); finished = false; ctxRef.go('lab'); },
        }),
      ]),
    ]),
  ], { dismissible: false });
}

/** Battle screens are re-entrant; the router calls this to repaint. */
export function repaintBattle() {
  if (state) paint();
}

export function inBattle() {
  return !!state && !state.over;
}

export function exitBattle() {
  epoch += 1;
  state = null;
  stage = null;
  picked = [];
  spend = 0;
  busy = false;
  lastReveal = null;
  verdict = '';
  finished = false;
}
