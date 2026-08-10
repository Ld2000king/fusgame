/* ============================================================================
   BATTLE SCREEN
   Tap a card in hand to summon it. Tap your minion to raise it, then tap an
   enemy minion — or the enemy's bar — to strike.
   ========================================================================= */

import { h, clear, toast, modal, floatNumber, shake, wait } from '../ui/dom.js';
import { renderCard, cardDetail } from '../ui/card.js';
import { sigil } from '../ui/sigil.js';
import {
  createBattle, playCard, attack, endTurn, canPlay, canAttack,
  legalTargets, view, MANA_MAX,
} from '../core/battle.js';
import { nextAction } from '../core/ai.js';
import { save, recordWin, levelOf } from '../core/state.js';

let state = null;
let stage = null;
let selected = null;      // uid of the raised attacker
let cursor = 0;           // log replay position
let busy = false;
let host = null;
let ctxRef = null;

/* The opponent's turn is asynchronous, so it can outlive the battle that
   started it — leaving the screen mid-turn would otherwise leave a loop
   reading a torn-down state. Every battle gets an epoch; the loop stops the
   moment its own epoch is superseded. */
let epoch = 0;
const stale = (mine) => mine !== epoch || !state;

export function startBattle(root, ctx, stageDef) {
  epoch += 1;
  host = root;
  ctxRef = ctx;
  stage = stageDef;
  selected = null;
  cursor = 0;
  busy = false;

  const levels = {};
  for (const id of save.discovered) if (levelOf(id)) levels[id] = levelOf(id);

  state = createBattle({
    playerDeck: save.deck.slice(),
    playerLevels: levels,
    enemy: { name: stageDef.name, deck: stageDef.deck, hp: stageDef.hp, el: stageDef.el },
  });

  cursor = state.log.length;
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
    boardRow('enemy'),
    boardRow('player'),
    heroBar('player'),
    controlBar(),
    handRail(),
  );
}

function heroBar(key) {
  const side = state.sides[key];
  const mine = key === 'player';
  const el = mine ? 'arcane' : (stage.el || 'shadow');
  const isTarget = !mine && selected && legalTargets(state, 'player', selected).includes('face');

  const bar = h('div', {
    class: 'hero-bar'
      + (state.active === key && !state.over ? ' is-active' : '')
      + (isTarget ? ' is-target' : ''),
    'data-el': el,
    'data-hero': key,
    onclick: isTarget ? () => doAttack(selected, 'face') : null,
  }, [
    h('div', { class: 'hero-sigil', html: sigil({ id: 'hero-' + key + '-' + (stage.id || 'x'), el, tier: mine ? 4 : 5 }, { size: 40 }) }),
    h('div', { class: 'hero-meta' }, [
      h('b', { text: mine ? 'אתה' : side.name }),
      h('span', {
        class: 'hint',
        text: `${side.hand.length} ביד · ${side.deck.length} בקופה`,
      }),
    ]),
    h('div', { style: 'display:grid;justify-items:end;gap:4px' }, [
      h('div', { class: 'hero-hp' }, [
        h('span', { text: String(Math.max(0, side.hero.hp)) }),
        h('span', { class: 'ic', text: '♥' }),
      ]),
      h('div', { class: 'mana', title: `${side.mana}/${side.maxMana} מאנה` },
        Array.from({ length: MANA_MAX }, (_, i) =>
          h('i', {
            class: i < side.mana ? 'on' : i < side.maxMana ? 'off' : 'lock',
          }))),
    ]),
  ]);
  return bar;
}

function boardRow(key) {
  const side = state.sides[key];
  const mine = key === 'player';
  const row = h('div', { class: 'board ' + (mine ? 'is-mine' : 'is-theirs') });

  if (!side.board.length) {
    row.append(h('span', { class: 'board-empty', text: mine ? 'הזירה שלך ריקה' : 'הזירה של היריב ריקה' }));
    return row;
  }

  const targets = selected ? legalTargets(state, 'player', selected) : [];

  for (const m of side.board) {
    const v = view(state, key, m);
    const canAct = mine && !state.over && state.active === 'player' && canAttack(state, 'player', m.uid).ok;
    const isTarget = !mine && targets.includes(m.uid);

    const node = renderCard(m.card, {
      size: 'xs',
      atk: v.atk,
      hp: v.hp,
      maxHp: v.maxHp,
      lvl: v.lvl,
      buffed: v.buffed,
      animate: true,
      onClick: () => {
        if (isTarget) return doAttack(selected, m.uid);
        if (mine) return raise(m.uid);
        showMinion(key, m);
      },
    });

    const wrap = h('div', {
      class: 'minion'
        + (canAct ? ' can-act' : '')
        + (selected === m.uid ? ' is-attacker' : '')
        + (isTarget ? ' is-target' : '')
        + (v.frozen ? ' is-frozen' : '')
        + (v.stealth ? ' is-stealth' : ''),
      'data-uid': m.uid,
    }, [node]);

    const badges = [];
    if (v.taunt) badges.push(h('span', { class: 'badge taunt', text: '⛨', title: 'מגן' }));
    if (v.shield) badges.push(h('span', { class: 'badge shield', text: '◇', title: 'חיץ' }));
    if (v.frozen) badges.push(h('span', { class: 'badge frozen', text: '❄', title: 'קפוא' }));
    if (v.kw.includes('poison')) badges.push(h('span', { class: 'badge poison', text: '☣', title: 'ארס' }));
    if (v.kw.includes('lifesteal')) badges.push(h('span', { class: 'badge life', text: '♥', title: 'מציצת חיים' }));
    if (v.stealth) badges.push(h('span', { class: 'badge steal', text: '◐', title: 'הסוואה' }));
    if (badges.length) wrap.append(h('div', { class: 'badges' }, badges));

    row.append(wrap);
  }
  return row;
}

function controlBar() {
  const last = [...state.log].reverse().find((e) => e.t === 'text');
  return h('div', { class: 'battle-bar' }, [
    h('p', { class: 'battle-feed' }, [
      h('span', { class: last ? last.kind : '', text: last ? last.msg : 'הקרב מתחיל.' }),
    ]),
    state.over
      ? h('button', { class: 'btn btn--gold btn--sm', text: 'סיכום', onclick: finish })
      : h('button', {
          class: 'btn btn--gold btn--sm',
          text: state.active === 'player' ? 'סיים תור' : 'תור היריב…',
          disabled: busy || state.active !== 'player',
          onclick: playerEndTurn,
        }),
  ]);
}

function handRail() {
  const side = state.sides.player;
  const rail = h('div', { class: 'hand-rail' });

  if (!side.hand.length) {
    rail.append(h('span', { class: 'board-empty', text: 'אין קלפים ביד' }));
    return rail;
  }

  for (const card of side.hand) {
    const ok = canPlay(state, 'player', card.uid).ok;
    rail.append(renderCard(card.card, {
      atk: card.baseAtk + card.buffA,
      hp: card.baseHp + card.buffH - card.dmg,
      maxHp: card.baseHp + card.buffH,
      lvl: card.lvl,
      playable: ok,
      dim: !ok && state.active === 'player',
      animate: true,
      onClick: () => tryPlay(card.uid),
    }));
  }
  return rail;
}

/* -------------------------------------------------------------------------
   Player actions
   ------------------------------------------------------------------------- */
function tryPlay(uid) {
  if (busy || state.over) return;
  const check = canPlay(state, 'player', uid);
  if (!check.ok) return toast(check.why, 'bad', 1700);
  selected = null;
  runAction(() => playCard(state, 'player', uid));
}

function raise(uid) {
  if (busy || state.over) return;
  if (selected === uid) { selected = null; paint(); return; }
  const check = canAttack(state, 'player', uid);
  if (!check.ok) return toast(check.why, 'bad', 1700);
  selected = uid;
  paint();
}

function doAttack(uid, target) {
  if (busy || state.over) return;
  selected = null;
  runAction(() => attack(state, 'player', uid, target));
}

function playerEndTurn() {
  if (busy || state.over) return;
  selected = null;
  busy = true;
  const before = cursor;
  endTurn(state);
  paint();
  replay(before);
  if (state.over) { busy = false; return void finish(); }
  enemyTurn();
}

function runAction(fn) {
  const before = cursor;
  const res = fn();
  if (res && res.ok === false) {
    toast(res.why, 'bad', 1700);
    return;
  }
  paint();
  replay(before);
  if (state.over) {
    const mine = epoch;
    setTimeout(() => { if (!stale(mine)) finish(); }, 700);
  }
}

/* -------------------------------------------------------------------------
   Opponent turn
   ------------------------------------------------------------------------- */
async function enemyTurn() {
  const mine = epoch;
  busy = true;
  let guard = 0;

  while (!state.over && state.active === 'enemy' && guard++ < 40) {
    await wait(620);
    if (stale(mine)) return;
    const act = nextAction(state, stage.skill);
    if (act.type === 'end') break;

    const before = cursor;
    if (act.type === 'play') playCard(state, 'enemy', act.uid);
    else if (act.type === 'attack') attack(state, 'enemy', act.uid, act.target);
    paint();
    replay(before);
  }

  if (!state.over) {
    await wait(420);
    if (stale(mine)) return;
    endTurn(state);
  }
  busy = false;
  paint();
  if (state.over) setTimeout(() => { if (!stale(mine)) finish(); }, 700);
}

/* -------------------------------------------------------------------------
   Log replay — floating numbers and screen shakes
   ------------------------------------------------------------------------- */
function replay(from) {
  const events = state.log.slice(from);
  cursor = state.log.length;

  for (const e of events) {
    switch (e.t) {
      case 'damage': {
        const node = host.querySelector(`[data-uid="${e.uid}"]`);
        floatNumber(node, '-' + e.n, 'dmg');
        shake(node);
        break;
      }
      case 'heroDamage': {
        const node = host.querySelector(`[data-hero="${e.side}"]`);
        floatNumber(node, '-' + e.n, 'dmg');
        shake(node);
        break;
      }
      case 'heroHeal': {
        const node = host.querySelector(`[data-hero="${e.side}"]`);
        floatNumber(node, '+' + e.n, 'heal');
        break;
      }
      case 'buff': {
        const node = host.querySelector(`[data-uid="${e.uid}"]`);
        floatNumber(node, `+${e.a}/+${e.h}`, 'heal');
        break;
      }
      default:
        break;
    }
  }
}

/* -------------------------------------------------------------------------
   Inspector
   ------------------------------------------------------------------------- */
function showMinion(key, m) {
  const v = view(state, key, m);
  modal((api) => [
    h('h2', { text: m.card.name }),
    h('div', { class: 'modal-body' }, [
      renderCard(m.card, { size: 'lg', atk: v.atk, hp: v.hp, maxHp: v.maxHp, lvl: v.lvl }),
      ...cardDetail(m.card),
      h('div', { class: 'modal-actions' }, [
        h('button', { class: 'btn', text: 'סגור', onclick: api.close }),
      ]),
    ]),
  ]);
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
          onclick: () => { api.close(); finished = false; startBattle(host, ctxRef, stage); },
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
  epoch += 1;          // invalidates any in-flight opponent turn
  state = null;
  stage = null;
  selected = null;
  busy = false;
  finished = false;
}
