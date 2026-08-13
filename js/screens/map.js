/* ============================================================================
   THE ROAD — twelve stages of the Great Work.
   ========================================================================= */

import { h, clear, toast, modal } from '../ui/dom.js';
import { sigil } from '../ui/sigil.js';
import { renderCard } from '../ui/card.js';
import { CAMPAIGN, gateFor } from '../data/campaign.js';
import { CARD_BY_ID } from '../data/cards.js';
import { CLASS_NAMES } from '../core/battle.js';
import {
  save, isCleared, stageUnlocked, deckIsLegal, DECK_SIZE, autoDeck, progressPercent, setClass,
} from '../core/state.js';

const CLASSES = ['elementalist', 'enchanter', 'healer'];

export function renderMap(root, ctx) {
  clear(root);
  root.className = 'screen';

  root.append(h('div', { class: 'head' }, [
    h('div', {}, [
      h('p', { class: 'eyebrow', text: 'Via Magna' }),
      h('h1', { text: 'המסע' }),
      h('p', {
        class: 'sub',
        text: `${save.cleared.length}/${CAMPAIGN.length} יריבים הובסו · ${save.gold} זהב · ${progressPercent()}% מהקודקס`,
      }),
    ]),
  ]));

  if (!deckIsLegal()) {
    root.append(h('div', {
      class: 'shop-row',
      style: 'border-color:var(--gold-lo);margin-bottom:14px',
    }, [
      h('div', {}, [
        h('h4', { text: 'החפיסה אינה שלמה' }),
        h('p', { text: `נדרשים ${DECK_SIZE} קלפים כדי לצאת לקרב. יש לך ${save.deck.length}.` }),
      ]),
      h('button', {
        class: 'btn btn--gold btn--sm',
        text: 'בנה אוטומטית',
        onclick: () => { autoDeck(); toast('נבנתה חפיסה מהאוסף שלך.', 'good'); renderMap(root, ctx); },
      }),
    ]));
  }

  const list = h('div', { class: 'map-list' });
  root.append(list);

  CAMPAIGN.forEach((st, i) => {
    const unlocked = stageUnlocked(i);
    const cleared = isCleared(st.id);
    const mark = sigil({ id: 'stage-' + st.id, el: st.el, tier: Math.min(6, 1 + Math.floor(i / 2)) }, { size: 54 });

    list.append(h('button', {
      class: 'stage',
      type: 'button',
      'data-el': st.el,
      disabled: !unlocked,
      onclick: () => openStage(st, i, ctx),
    }, [
      h('div', { class: 'stage-mark', html: mark }),
      h('div', { style: 'min-width:0' }, [
        h('p', { class: 'st', text: `${String(i + 1).padStart(2, '0')} · ${st.title} · ${CLASS_NAMES[st.class]}` }),
        h('h3', { text: st.name }),
        h('p', { class: 'sb', text: st.blurb }),
      ]),
      h('span', {
        class: 'stage-flag ' + (cleared ? 'is-clear' : unlocked ? '' : 'is-lock'),
        text: cleared ? 'הובס' : unlocked ? `${st.gold} ◈` : 'נעול',
      }),
    ]));
  });
}

function openStage(st, index, ctx) {
  const gate = gateFor(index);
  const thin = save.discovered.length < gate;
  let chosenClass = save.preferredClass;

  modal((api) => {
    const body = h('div', { class: 'modal-body' }, [
      h('div', {
        style: 'width:88px;height:88px;color:var(--el-' + st.el + ')',
        html: sigil({ id: 'stage-' + st.id, el: st.el, tier: Math.min(6, 1 + Math.floor(index / 2)) }, { size: 88 }),
      }),
      h('p', { text: st.blurb }),
      h('div', { class: 'stat-strip' }, [
        h('div', {}, [h('b', { text: String(st.hp) }), h('span', { text: 'חיי גיבור' })]),
        h('div', {}, [h('b', { text: CLASS_NAMES[st.class] }), h('span', { text: 'מחלקת היריב' })]),
        h('div', {}, [h('b', { text: String(st.gold) }), h('span', { text: 'זהב בניצחון' })]),
      ]),

      h('p', { class: 'eyebrow', style: 'text-align:center', text: 'יריבים בולטים' }),
      h('div', { style: 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap' },
        topThreats(st).map((c) => renderCard(c, { size: 'xs', lvl: 0 }))),

      h('p', { class: 'eyebrow', style: 'text-align:center', text: 'המחלקה שלך' }),
      classPicker(),

      thin
        ? h('p', {
            style: 'color:#e0a06a;font-size:12.5px',
            text: `אזהרה: האוסף שלך קטן (${save.discovered.length} קלפים). מומלץ להגיע לכ-${gate} לפני הקרב הזה.`,
          })
        : null,

      !deckIsLegal()
        ? h('p', { style: 'color:#e08a98;font-size:12.5px', text: `החפיסה חייבת להכיל ${DECK_SIZE} קלפים.` })
        : null,

      h('div', { class: 'modal-actions' }, [
        h('button', {
          class: 'btn btn--gold',
          'data-action': 'launch',
          text: 'צא לקרב',
          disabled: !deckIsLegal(),
          onclick: () => { setClass(chosenClass); api.close(); ctx.startBattle(st, chosenClass); },
        }),
        h('button', { class: 'btn', text: 'בטל', onclick: api.close }),
      ]),
    ]);

    function classPicker() {
      const row = h('div', { style: 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap' },
        CLASSES.map((cls) => h('button', {
          type: 'button',
          class: 'btn btn--sm' + (cls === chosenClass ? ' btn--pick-on' : ' btn--ghost'),
          text: CLASS_NAMES[cls],
          onclick: () => { chosenClass = cls; refreshPicker(); },
        })));
      row.dataset.role = 'class-picker';
      return row;
    }

    function refreshPicker() {
      const old = body.querySelector('[data-role="class-picker"]');
      if (old) old.replaceWith(classPicker());
    }

    return [
      h('p', { class: 'eyebrow', text: st.title }),
      h('h2', { text: st.name }),
      body,
    ];
  });
}

/** The three scariest cards in the opponent's deck, for the briefing. */
function topThreats(st) {
  const uniq = [...new Set(st.deck)].map((id) => CARD_BY_ID[id]).filter(Boolean);
  return uniq
    .sort((a, b) => (b.tier * 4 + b.atk + b.def) - (a.tier * 4 + a.atk + a.def))
    .slice(0, 3);
}
