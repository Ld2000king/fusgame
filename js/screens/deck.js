/* ============================================================================
   DECK BUILDER — twenty cards, at most two copies each (legendaries: one).
   ========================================================================= */

import { h, clear, toast } from '../ui/dom.js';
import { renderCard } from '../ui/card.js';
import { CARD_BY_ID, copyLimit, ELEMENTS } from '../data/cards.js';
import {
  save, DECK_SIZE, deckCount, addToDeck, removeFromDeck,
  clearDeck, autoDeck, deckIsLegal, levelOf,
} from '../core/state.js';

let filter = { q: '', el: '' };

export function renderDeck(root, ctx) {
  clear(root);
  root.className = 'screen';

  root.append(h('div', { class: 'head' }, [
    h('div', {}, [
      h('p', { class: 'eyebrow', text: 'Instrumentum' }),
      h('h1', { text: 'החפיסה' }),
      h('p', {
        class: 'sub',
        text: `${DECK_SIZE} קלפים · יסודות ×4, ראשוניים ומורכבים ×3, גבוהים ×2, אגדיים ×1`,
      }),
    ]),
  ]));

  const layout = h('div', { class: 'deck-layout' });
  const panel = h('aside', { class: 'deck-panel' });
  const pool = h('div', {});
  layout.append(panel, pool);
  root.append(layout);

  /* ---- panel ------------------------------------------------------------ */
  function paintPanel() {
    clear(panel);

    panel.append(h('div', { class: 'deck-count' + (deckIsLegal() ? ' is-full' : '') }, [
      h('div', {}, [
        h('b', { text: `${save.deck.length}` }),
        h('span', { style: 'font-size:12px;color:var(--ink-3)', text: ` / ${DECK_SIZE}` }),
      ]),
      h('span', {
        class: 'eyebrow',
        text: deckIsLegal() ? 'מוכנה לקרב' : 'חסרים קלפים',
      }),
    ]));

    // mana curve
    const buckets = new Array(8).fill(0);
    for (const id of save.deck) {
      const c = CARD_BY_ID[id];
      buckets[Math.min(7, c.cost - 1)]++;
    }
    const peak = Math.max(1, ...buckets);
    panel.append(h('div', { class: 'deck-curve' },
      buckets.map((n, i) => h('i', {
        style: `height:${(n / peak) * 100}%`,
        'data-n': i === 7 ? '8+' : String(i + 1),
        title: `${n} קלפים בעלות ${i + 1}`,
      }))));

    panel.append(h('div', { style: 'height:16px' }));

    // grouped rows
    const counts = {};
    for (const id of save.deck) counts[id] = (counts[id] || 0) + 1;
    const rows = Object.keys(counts)
      .map((id) => CARD_BY_ID[id])
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'he'));

    const list = h('div', { class: 'deck-list' });
    if (!rows.length) {
      list.append(h('p', { class: 'empty-note', text: 'החפיסה ריקה. בחר קלפים מהאוסף, או לחץ "בנה אוטומטית".' }));
    }
    for (const card of rows) {
      list.append(h('button', {
        class: 'deck-row',
        type: 'button',
        'data-el': card.el,
        title: 'הסר עותק אחד',
        onclick: () => { removeFromDeck(card.id); paintPanel(); paintPool(); },
      }, [
        h('span', { class: 'rc', text: String(card.cost) }),
        h('span', { class: 'rn', text: card.name + (levelOf(card.id) ? ` ·${levelOf(card.id)}` : '') }),
        h('span', { class: 'rdot' }),
        h('span', { class: 'rx', text: '×' + counts[card.id] }),
      ]));
    }
    panel.append(list);

    panel.append(h('div', { style: 'display:flex;gap:6px;margin-top:12px;flex-wrap:wrap' }, [
      h('button', {
        class: 'btn btn--sm btn--gold',
        text: 'בנה אוטומטית',
        onclick: () => {
          autoDeck();
          toast('נבנתה חפיסה לפי עקומת מאנה מהאוסף שלך.', 'good');
          paintPanel(); paintPool();
        },
      }),
      h('button', {
        class: 'btn btn--sm btn--danger',
        text: 'רוקן',
        disabled: !save.deck.length,
        onclick: () => { clearDeck(); paintPanel(); paintPool(); },
      }),
    ]));
  }

  /* ---- pool ------------------------------------------------------------- */
  function paintPool() {
    clear(pool);

    pool.append(h('div', { class: 'tray-tools' }, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field-ico', text: '⌕' }),
        h('input', {
          type: 'search',
          placeholder: 'חיפוש בשם…',
          value: filter.q,
          oninput: (e) => { filter.q = e.target.value.trim(); paintGrid(); },
        }),
      ]),
      h('label', { class: 'field', style: 'flex:0 1 150px' }, [
        h('span', { class: 'field-ico', text: '◇' }),
        h('select', { onchange: (e) => { filter.el = e.target.value; paintGrid(); } }, [
          h('option', { value: '', text: 'כל היסודות' }),
          ...Object.values(ELEMENTS).map((el) =>
            h('option', { value: el.id, text: el.name, selected: filter.el === el.id })),
        ]),
      ]),
    ]));

    const grid = h('div', { class: 'card-grid' });
    pool.append(grid);

    function paintGrid() {
      clear(grid);
      const list = save.discovered
        .map((id) => CARD_BY_ID[id])
        .filter(Boolean)
        .filter((k) => (!filter.el || k.el === filter.el))
        .filter((k) => (!filter.q || k.name.includes(filter.q)))
        .sort((a, b) => a.cost - b.cost || b.tier - a.tier || a.name.localeCompare(b.name, 'he'));

      if (!list.length) {
        grid.append(h('p', { class: 'empty-note', text: 'אין קלפים שתואמים לסינון.' }));
        return;
      }

      for (const card of list) {
        const n = deckCount(card.id);
        const maxed = n >= copyLimit(card);
        const node = renderCard(card, {
          size: 'sm',
          dim: maxed,
          onClick: () => {
            const res = addToDeck(card.id);
            if (!res.ok) return toast(res.why, 'bad');
            paintPanel();
            paintGrid();
          },
        });
        if (n > 0) {
          node.append(h('span', {
            class: 'card-lvl',
            style: 'inset-inline-end:auto;inset-inline-start:6px;inset-block-end:4px;inset-block-start:auto;color:var(--verdigris);font-size:9px',
            text: '×' + n,
          }));
        }
        grid.append(node);
      }
    }

    paintGrid();
  }

  paintPanel();
  paintPool();
  ctx.refreshPurse();
}
