/* ============================================================================
   ROUTER + BOOT
   ========================================================================= */

import { $, h, toast, modal } from './ui/dom.js';
import { sigil } from './ui/sigil.js';
import { renderLab } from './screens/lab.js';
import { renderCodex } from './screens/codex.js';
import { renderDeck } from './screens/deck.js';
import { renderMap } from './screens/map.js';
import { startBattle as launchBattle, inBattle, exitBattle } from './screens/battle.js';
import {
  save, subscribe, addToDeck, autoDeck, deckIsLegal, resetSave, persist, DECK_SIZE,
} from './core/state.js';

const screenEl = $('#screen');
const tabbar = $('#tabbar');

let route = 'lab';

const ctx = {
  go,
  rerender: () => go(route, true),
  refreshPurse,
  startBattle: (stageDef, playerClass) => {
    route = 'battle';
    paintTabs();
    tabbar.hidden = true;
    launchBattle(screenEl, ctx, stageDef, playerClass || save.preferredClass);
    window.scrollTo({ top: 0 });
  },
  addToDeckFromUI(id) {
    const res = addToDeck(id);
    toast(res.ok ? 'נוסף לחפיסה.' : res.why, res.ok ? 'good' : 'bad');
  },
};

function go(next, silent = false) {
  if (inBattle() && next !== 'battle' && !silent) {
    return confirmLeaveBattle(next);
  }
  if (route === 'battle' && next !== 'battle') exitBattle();

  route = next;
  tabbar.hidden = next === 'battle';
  paintTabs();

  switch (next) {
    case 'lab':   renderLab(screenEl, ctx); break;
    case 'codex': renderCodex(screenEl, ctx); break;
    case 'deck':  renderDeck(screenEl, ctx); break;
    case 'map':   renderMap(screenEl, ctx); break;
    default:      renderLab(screenEl, ctx); break;
  }
  refreshPurse();
  if (!silent) {
    screenEl.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  try { history.replaceState(null, '', '#' + next); } catch { /* file:// */ }
}

function confirmLeaveBattle(next) {
  modal((api) => [
    h('h2', { text: 'לנטוש את הקרב?' }),
    h('div', { class: 'modal-body' }, [
      h('p', { text: 'הקרב הנוכחי יימחק ולא יזוכה בתגמול.' }),
      h('div', { class: 'modal-actions' }, [
        h('button', {
          class: 'btn btn--danger',
          text: 'נטוש',
          onclick: () => { api.close(); exitBattle(); go(next); },
        }),
        h('button', { class: 'btn btn--gold', text: 'הישאר', onclick: api.close }),
      ]),
    ]),
  ]);
}

function paintTabs() {
  for (const btn of tabbar.querySelectorAll('[data-nav]')) {
    btn.classList.toggle('is-on', btn.dataset.nav === route);
    btn.setAttribute('aria-current', btn.dataset.nav === route ? 'page' : 'false');
  }
}

function refreshPurse() {
  $('#goldOut').textContent = String(save.gold);
  $('#discOut').textContent = String(save.discovered.length);
}

/* -------------------------------------------------------------------------
   First run
   ------------------------------------------------------------------------- */
function intro() {
  modal((api) => [
    h('p', { class: 'eyebrow', text: 'Opus Alchemicum' }),
    h('h2', { text: 'קלפי היסודות' }),
    h('div', { class: 'modal-body' }, [
      h('div', {
        style: 'width:96px;height:96px;color:var(--gold)',
        html: sigil({ id: 'opus-magnum', el: 'arcane', tier: 6 }, { size: 96 }),
      }),
      h('p', {
        text: 'התחלת עם ארבעה יסודות. במעבדה מצרפים שניים ומקבלים שלישי — ' +
              'כך נבנה אוסף של 81 קלפים. מהאוסף בונים חפיסה של 20, ' +
              'ובמסע יוצאים איתה לקרבות מול שנים־עשר יריבים.',
      }),
      h('p', {
        style: 'color:var(--ink-3);font-size:12.5px',
        text: 'קרב: כל סיבוב שני הצדדים בוחרים בסתר קלף לתקיפה — או שני קלפים להיתוך לקלף חזק יותר — ואז נחשפים יחד. מי שמתיך לא מגן על עצמו באותו סיבוב.',
      }),
      h('div', { class: 'modal-actions' }, [
        h('button', {
          class: 'btn btn--gold',
          text: 'אל המעבדה',
          onclick: () => { save.seenIntro = true; persist(); api.close(); },
        }),
      ]),
    ]),
  ], { dismissible: false });
}

/* -------------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------------- */
function boot() {
  // brand mark
  $('#brandMark').innerHTML = sigil({ id: 'fusgame-brand', el: 'arcane', tier: 5 }, { size: 34 });

  $('#brandBtn').addEventListener('click', () => go('lab'));
  $('#brandBtn').addEventListener('dblclick', openSettings);

  for (const btn of tabbar.querySelectorAll('[data-nav]')) {
    btn.addEventListener('click', () => go(btn.dataset.nav));
  }

  subscribe(refreshPurse);

  const hash = (location.hash || '').replace('#', '');
  go(['lab', 'codex', 'deck', 'map'].includes(hash) ? hash : 'lab', true);

  if (!save.seenIntro) intro();
  else if (!deckIsLegal() && save.discovered.length >= 8) {
    autoDeck();
    toast(`נבנתה חפיסה של ${DECK_SIZE} קלפים מהאוסף שלך.`, '', 3000);
  }
}

function openSettings() {
  modal((api) => [
    h('h2', { text: 'הגדרות' }),
    h('div', { class: 'modal-body' }, [
      h('div', { class: 'stat-strip' }, [
        h('div', {}, [h('b', { text: String(save.discovered.length) }), h('span', { text: 'קלפים' })]),
        h('div', {}, [h('b', { text: String(save.battlesWon) }), h('span', { text: 'ניצחונות' })]),
        h('div', {}, [h('b', { text: String(save.fusionsTried) }), h('span', { text: 'צירופים' })]),
        h('div', {}, [h('b', { text: String(save.gold) }), h('span', { text: 'זהב' })]),
      ]),
      h('p', { style: 'font-size:12.5px', text: 'ההתקדמות נשמרת מקומית בדפדפן הזה בלבד.' }),
      h('div', { class: 'modal-actions' }, [
        h('button', { class: 'btn', text: 'סגור', onclick: api.close }),
        h('button', {
          class: 'btn btn--danger btn--sm',
          text: 'אפס התקדמות',
          onclick: () => {
            if (!confirm('לאפס את כל ההתקדמות? הפעולה בלתי הפיכה.')) return;
            resetSave();
            api.close();
            go('lab');
            toast('ההתקדמות אופסה.', '', 2400);
          },
        }),
      ]),
    ]),
  ]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
