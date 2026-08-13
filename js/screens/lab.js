/* ============================================================================
   THE LAB — where two things become a third.
   ========================================================================= */

import { h, clear, toast, modal, wait } from '../ui/dom.js';
import { renderCard, recipeLine } from '../ui/card.js';
import { CARD_BY_ID, CARDS, TIER_NAMES, ELEMENTS } from '../data/cards.js';
import { abilityFor, characterDescription } from '../data/abilities.js';
import {
  save, isDiscovered, attemptFusion, availableDiscoveries,
  buyHint, buyShardPack, HINT_COST, SHARD_PACK_COST, levelOf, shardsOf,
  SHARDS_PER_LEVEL, MAX_LEVEL,
} from '../core/state.js';

const bench = [null, null];
let filter = { q: '', el: '' };

const FUSE_GLYPH = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor"
  stroke-width="1.2" stroke-linecap="round"><circle cx="20" cy="20" r="15"/>
  <circle cx="20" cy="20" r="9" opacity=".5"/>
  <path d="M20 5v30M5 20h30" opacity=".45"/>
  <polygon points="20,12 26.5,24 13.5,24"/></svg>`;

export function renderLab(root, ctx) {
  clear(root);
  root.className = 'screen';

  root.append(h('div', { class: 'head' }, [
    h('div', {}, [
      h('p', { class: 'eyebrow', text: 'Opus I · Coniunctio' }),
      h('h1', { text: 'המעבדה' }),
      h('p', { class: 'sub', text: 'הנח שני קלפים על השולחן. אם קיים ביניהם קשר — הוא יתגלה.' }),
    ]),
  ]));

  /* ---- bench ------------------------------------------------------------ */
  const benchEl = h('section', { class: 'lab-bench' });
  const resultEl = h('div', { class: 'lab-result' });
  const trayEl = h('div', { class: 'card-grid' });

  function paintBench() {
    clear(benchEl);
    benchEl.append(
      slotNode(0),
      h('div', { class: 'fuse-col' + (bench[0] && bench[1] ? ' is-ready' : '') }, [
        h('div', { class: 'fuse-glyph', html: FUSE_GLYPH }),
        h('button', {
          class: 'btn btn--sm btn--ghost',
          text: 'נקה',
          disabled: !bench[0] && !bench[1],
          onclick: () => { bench[0] = bench[1] = null; paintBench(); paintTray(); clear(resultEl); },
        }),
      ]),
      slotNode(1),
    );
  }

  function slotNode(i) {
    if (!bench[i]) {
      return h('button', {
        class: 'slot',
        type: 'button',
        'aria-label': `משבצת ${i + 1} ריקה`,
        onclick: () => toast('בחר קלף מהמדף למטה.', '', 1800),
      }, [h('span', { class: 'slot-hint', text: i === 0 ? 'רכיב\nראשון' : 'רכיב\nשני' })]);
    }
    const card = CARD_BY_ID[bench[i]];
    return h('div', { class: 'slot', style: 'border-style:solid;border-color:var(--gold-lo)' }, [
      renderCard(card, {
        onClick: () => { bench[i] = null; paintBench(); paintTray(); clear(resultEl); },
      }),
    ]);
  }

  /* ---- tray ------------------------------------------------------------- */
  function paintTray() {
    clear(trayEl);
    const list = save.discovered
      .map((id) => CARD_BY_ID[id])
      .filter(Boolean)
      .filter((k) => (!filter.el || k.el === filter.el))
      .filter((k) => (!filter.q || k.name.includes(filter.q)))
      .sort((a, b) => a.tier - b.tier || (a.atk + a.def) - (b.atk + b.def) || a.name.localeCompare(b.name, 'he'));

    if (!list.length) {
      trayEl.append(h('p', { class: 'empty-note', text: 'אין קלפים שתואמים לסינון.' }));
      return;
    }

    for (const card of list) {
      const onBench = bench.includes(card.id);
      trayEl.append(h('div',{class:'lab-card-wrap'},[
        renderCard(card, {
          size: 'sm',
          dim: onBench,
          onClick: () => place(card.id),
        }),
        h('button',{
          class:'card-info-btn',type:'button',title:'מידע על הדמות','aria-label':`מידע על ${card.name}`,
          text:'ⓘ',onclick:(e)=>{e.stopPropagation();showCard(card);},
        }),
      ]));
    }
  }

  async function place(id) {
    if (bench[0] === null) bench[0] = id;
    else if (bench[1] === null) bench[1] = id;
    else { bench[0] = bench[1]; bench[1] = id; }
    paintBench();
    paintTray();
    clear(resultEl);

    if (bench[0] !== null && bench[1] !== null) {
      await wait(340);
      doFuse();
    }
  }

  function doFuse() {
    const [a, b] = bench;
    const res = attemptFusion(a, b);
    clear(resultEl);

    if (!res.ok) {
      resultEl.append(h('p', { class: 'lab-msg is-fail', text: res.why }));
      bench[1] = null;
      paintBench();
      paintTray();
      ctx.refreshPurse();
      return;
    }

    if (res.isNew) {
      showDiscovery(res.card, ctx);
      resultEl.append(h('p', { class: 'lab-msg is-new', text: `גילית: ${res.card.name}` }));
    } else {
      const lvl = levelOf(res.id);
      resultEl.append(
        h('p', {
          class: 'lab-msg is-dupe',
          text: lvl >= MAX_LEVEL
            ? `${res.card.name} — כבר בדרגה מרבית.`
            : `${res.card.name} כבר ידוע. רסיס נוסף (${shardsOf(res.id)}/${SHARDS_PER_LEVEL}).`,
        }),
        renderCard(res.card, { size: 'sm', animate: true, onClick: () => showCard(res.card) }),
      );
    }

    bench[0] = res.id;
    bench[1] = null;
    paintBench();
    paintTray();
    ctx.refreshPurse();
  }

  /* ---- tools ------------------------------------------------------------ */
  const tools = h('div', { class: 'tray-tools' }, [
    h('label', { class: 'field' }, [
      h('span', { class: 'field-ico', text: '⌕' }),
      h('input', {
        type: 'search',
        placeholder: 'חיפוש בשם…',
        value: filter.q,
        oninput: (e) => { filter.q = e.target.value.trim(); paintTray(); },
      }),
    ]),
    h('label', { class: 'field', style: 'flex:0 1 150px' }, [
      h('span', { class: 'field-ico', text: '◇' }),
      h('select', {
        onchange: (e) => { filter.el = e.target.value; paintTray(); },
      }, [
        h('option', { value: '', text: 'כל היסודות' }),
        ...Object.values(ELEMENTS).map((el) =>
          h('option', { value: el.id, text: el.name, selected: filter.el === el.id })),
      ]),
    ]),
    h('button', {
      class: 'btn btn--sm',
      text: 'מה אפשר לגלות?',
      onclick: () => showAvailable(),
    }),
  ]);

  paintBench();
  paintTray();

  root.append(
    benchEl,
    resultEl,
    h('div', { class: 'tier-band' }, [
      h('h2', { text: 'המדף' }),
      h('div', { class: 'bar' }),
      h('span', { class: 'count', text: `${save.discovered.length} / ${CARDS.length}` }),
    ]),
    tools,
    trayEl,
    shopSection(ctx),
  );
}

/* -------------------------------------------------------------------------
   Discovery moment
   ------------------------------------------------------------------------- */
export function showDiscovery(card, ctx) {
  modal((api) => [
    h('p', { class: 'eyebrow', text: 'Nova Substantia' }),
    h('h2', { text: 'תגלית' }),
    h('div', { class: 'modal-body' }, [
      renderCard(card, { size: 'lg', animate: true }),
      h('p', {
        style: 'font-family:var(--font-display);font-size:19px;color:var(--gold-hi)',
        text: card.name,
      }),
      card.title && card.title !== card.name
        ? h('p', { class: 'art-title', text: '״' + card.title + '״' })
        : null,
      h('p', { class: 'eyebrow eyebrow--he', text: TIER_NAMES[card.tier] }),
      characterProfile(card),
      recipeLine(card),
      h('div', { class: 'modal-actions' }, [
        h('button', { class: 'btn btn--gold', text: 'המשך', onclick: api.close }),
        h('button', {
          class: 'btn btn--sm',
          text: 'הוסף לחפיסה',
          onclick: () => { ctx.addToDeckFromUI(card.id); api.close(); },
        }),
      ]),
    ]),
  ]);
}

export function showCard(card) {
  modal((api) => [
    h('h2', { text: card.name }),
    card.title && card.title !== card.name
      ? h('p', { class: 'art-title', text: '״' + card.title + '״' })
      : null,
    h('p', { class: 'eyebrow eyebrow--he', text: `${TIER_NAMES[card.tier]} · ${ELEMENTS[card.el].name}` }),
    h('div', { class: 'modal-body' }, [
      renderCard(card, { size: 'lg' }),
      characterProfile(card),
      recipeLine(card, { known: isDiscovered }),
      levelOf(card.id) > 0
        ? h('p', {
            class: 'eyebrow',
            text: `דרגה ${levelOf(card.id)} · רסיסים ${shardsOf(card.id)}/${SHARDS_PER_LEVEL}`,
          })
        : null,
      h('div', { class: 'modal-actions' }, [
        h('button', { class: 'btn', text: 'סגור', onclick: api.close }),
      ]),
    ]),
  ]);
}

function characterProfile(card) {
  const ability=abilityFor(card);
  return h('section',{class:'character-profile'},[
    h('p',{class:'character-lore',text:characterDescription(card)}),
    ability
      ? h('div',{class:'character-ability'},[
          h('b',{text:`${ability.icon} ${ability.name}`}),
          h('span',{text:ability.text}),
        ])
      : h('div',{class:'character-ability is-none'},[
          h('b',{text:'ללא יכולת מיוחדת'}),
          h('span',{text:'הדמות נלחמת באמצעות נתוני ההתקפה וההגנה שלה.'}),
        ]),
  ]);
}

function showAvailable() {
  const list = availableDiscoveries();
  modal((api) => [
    h('h2', { text: 'צירופים בהישג יד' }),
    h('div', { class: 'modal-body' }, [
      h('p', {
        text: list.length
          ? `יש ${list.length} תגליות שכל הרכיבים שלהן כבר ברשותך. הרשימה מסתירה את הפתרון — היא רק אומרת כמה נשארו.`
          : 'אין כרגע תגלית שכל רכיביה ברשותך. נסה צירופים חדשים או קנה רמז.',
      }),
      list.length
        ? h('div', { class: 'stat-strip' }, groupByTier(list).map(([tier, n]) =>
            h('div', {}, [
              h('b', { text: String(n) }),
              h('span', { text: TIER_NAMES[tier] }),
            ])))
        : null,
      h('div', { class: 'modal-actions' }, [
        h('button', { class: 'btn', text: 'סגור', onclick: api.close }),
      ]),
    ]),
  ]);
}

function groupByTier(list) {
  const m = {};
  for (const c of list) m[c.tier] = (m[c.tier] || 0) + 1;
  return Object.entries(m).map(([t, n]) => [Number(t), n]);
}

/* -------------------------------------------------------------------------
   Shop
   ------------------------------------------------------------------------- */
function shopSection(ctx) {
  const wrap = h('section', {}, [
    h('div', { class: 'tier-band' }, [
      h('h2', { text: 'הדוכן' }),
      h('div', { class: 'bar' }),
      h('span', { class: 'count', text: `${save.gold} זהב` }),
    ]),
  ]);

  wrap.append(
    h('div', { class: 'shop-row' }, [
      h('div', {}, [
        h('h4', { text: 'רמז' }),
        h('p', { text: 'חושף מתכון אחד שכל רכיביו כבר ברשותך.' }),
      ]),
      h('button', {
        class: 'btn btn--gold btn--sm',
        text: `${HINT_COST} ◈`,
        disabled: save.gold < HINT_COST,
        onclick: () => {
          const res = buyHint();
          if (!res.ok) return toast(res.why, 'bad');
          modal((api) => [
            h('h2', { text: 'רמז' }),
            h('div', { class: 'modal-body' }, [
              recipeLine(res.card),
              h('p', { text: 'הצירוף הזה זמין לך כבר עכשיו.' }),
              h('div', { class: 'modal-actions' }, [
                h('button', { class: 'btn btn--gold', text: 'הבנתי', onclick: api.close }),
              ]),
            ]),
          ]);
          ctx.rerender();
        },
      }),
    ]),
    h('div', { class: 'shop-row' }, [
      h('div', {}, [
        h('h4', { text: 'צרור רסיסים' }),
        h('p', { text: 'שלושה רסיסים לקלפים אקראיים שכבר גילית. שלושה רסיסים = דרגה.' }),
      ]),
      h('button', {
        class: 'btn btn--gold btn--sm',
        text: `${SHARD_PACK_COST} ◈`,
        disabled: save.gold < SHARD_PACK_COST,
        onclick: () => {
          const res = buyShardPack();
          if (!res.ok) return toast(res.why, 'bad');
          const leveled = res.got.filter((g) => g.leveled);
          toast(
            leveled.length
              ? `דרגה חדשה: ${leveled.map((g) => g.card.name).join(', ')}`
              : `רסיסים: ${res.got.map((g) => g.card.name).join(', ')}`,
            leveled.length ? 'gold' : 'good', 3400,
          );
          ctx.rerender();
        },
      }),
    ]),
  );
  return wrap;
}
