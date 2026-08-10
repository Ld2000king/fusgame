/* ============================================================================
   CODEX — the collection, banded by tier. Undiscovered cards keep their
   silhouette so the shape of what remains is always visible.
   ========================================================================= */

import { h, clear } from '../ui/dom.js';
import { renderCard } from '../ui/card.js';
import { showCard } from './lab.js';
import { CARDS, TIER_NAMES } from '../data/cards.js';
import { save, isDiscovered, progressPercent } from '../core/state.js';

let showLocked = true;

export function renderCodex(root) {
  clear(root);
  root.className = 'screen';

  const total = CARDS.length;
  const found = save.discovered.length;

  root.append(h('div', { class: 'head' }, [
    h('div', {}, [
      h('p', { class: 'eyebrow', text: 'Codex Elementorum' }),
      h('h1', { text: 'הקודקס' }),
      h('p', { class: 'sub', text: `${found} מתוך ${total} · ${progressPercent()}% מהמלאכה` }),
    ]),
    h('button', {
      class: 'btn btn--sm btn--ghost',
      text: showLocked ? 'הסתר נעולים' : 'הצג נעולים',
      onclick: () => { showLocked = !showLocked; renderCodex(root); },
    }),
  ]));

  root.append(h('div', { class: 'progress-rail' }, [
    h('i', { style: `width:${(found / total) * 100}%` }),
  ]));

  const byTier = {};
  for (const card of CARDS) {
    (byTier[card.tier] = byTier[card.tier] || []).push(card);
  }

  for (const tier of Object.keys(byTier).sort((a, b) => a - b)) {
    const list = byTier[tier]
      .slice()
      .sort((a, b) => (a.atk + a.def) - (b.atk + b.def) || a.name.localeCompare(b.name, 'he'));
    const owned = list.filter((c) => isDiscovered(c.id)).length;
    const visible = showLocked ? list : list.filter((c) => isDiscovered(c.id));
    if (!visible.length) continue;

    root.append(
      h('div', { class: 'tier-band', 'data-tier': tier }, [
        h('h2', { text: `דרגה ${tier} · ${TIER_NAMES[tier]}` }),
        h('div', { class: 'bar' }),
        h('span', { class: 'count', text: `${owned}/${list.length}` }),
      ]),
      h('div', { class: 'card-grid' }, visible.map((card) => {
        const known = isDiscovered(card.id);
        return renderCard(card, {
          size: 'sm',
          locked: !known,
          onClick: () => showCard(card),
        });
      })),
    );
  }
}
