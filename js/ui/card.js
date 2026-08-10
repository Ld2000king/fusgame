/* ============================================================================
   CARD RENDERING
   One function builds every card in the game; callers vary size and state.
   ========================================================================= */

import { h } from './dom.js';
import { sigil } from './sigil.js';
import { KEYWORDS, TIER_NAMES, CARD_BY_ID } from '../data/cards.js';
import { levelOf } from '../core/state.js';

const LEVEL_MARK = ['', '·', '··', '···'];

/**
 * @param {object} card   card record
 * @param {object} [opt]
 *   size      'lg' | '' | 'sm' | 'xs'
 *   atk/hp    override displayed stats (battle instances)
 *   maxHp     for the hurt indicator
 *   locked    render as an undiscovered silhouette
 *   lvl       override the level shown (defaults to the save file)
 *   onClick   click handler; also marks the card as interactive
 *   className extra classes
 */
export function renderCard(card, opt = {}) {
  const size = opt.size === undefined ? '' : opt.size;
  const lvl = opt.lvl !== undefined ? opt.lvl : levelOf(card.id);
  const atk = opt.atk !== undefined ? opt.atk : card.atk + lvl;
  const hp = opt.hp !== undefined ? opt.hp : card.hp + lvl;
  const maxHp = opt.maxHp !== undefined ? opt.maxHp : hp;

  const kwLabel = card.kw.map((k) => (KEYWORDS[k] ? KEYWORDS[k].name : k)).join(' · ');

  const cls = ['card'];
  if (size) cls.push('card--' + size);
  if (opt.locked) cls.push('is-locked');
  if (opt.selected) cls.push('is-selected');
  if (opt.dim) cls.push('is-dim');
  if (opt.playable) cls.push('is-playable');
  if (opt.animate) cls.push('anim-in');
  if (opt.className) cls.push(opt.className);

  const frame = h('div', { class: 'card-frame' }, [
    h('div', { class: 'card-cost', text: String(card.cost) }),
    lvl > 0 && !opt.locked
      ? h('div', { class: 'card-lvl', text: LEVEL_MARK[Math.min(3, lvl)] })
      : null,
    h('div', { class: 'card-art', html: sigil(card) }),
    h('h3', { class: 'card-name', text: opt.locked ? '؟؟؟' : card.name }),
    h('div', { class: 'card-kw', text: opt.locked ? '' : kwLabel }),
    h('div', { class: 'card-stats' }, [
      h('span', {
        class: 'atk' + (lvl > 0 || (opt.buffed && atk > card.atk) ? ' is-buffed' : ''),
        text: String(atk),
      }),
      h('span', {
        class: 'hp' + (hp < maxHp ? ' is-hurt' : (lvl > 0 || opt.buffed ? ' is-buffed' : '')),
        text: String(hp),
      }),
    ]),
  ]);

  const node = h('article', {
    class: cls.join(' '),
    'data-el': card.el,
    'data-tier': card.tier,
    'data-id': card.id,
    title: opt.locked ? 'טרם התגלה' : `${card.name} · ${TIER_NAMES[card.tier]}`,
  }, [frame]);

  if (opt.onClick) {
    node.dataset.clickable = '1';
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.addEventListener('click', opt.onClick);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.onClick(e); }
    });
  }
  return node;
}

/** Keyword chips + rules text, shared by the codex and the battle inspector. */
export function cardDetail(card) {
  const rows = [];
  if (card.kw.length) {
    rows.push(h('div', { class: 'detail-kw' },
      card.kw.map((k) => h('span', {
        class: 'kw-chip',
        text: KEYWORDS[k] ? KEYWORDS[k].name : k,
        title: KEYWORDS[k] ? KEYWORDS[k].text : '',
      }))));
  }
  if (card.text) rows.push(h('p', { text: card.text }));
  if (card.kw.length) {
    rows.push(h('p', {
      class: 'eyebrow',
      style: 'text-align:center;direction:rtl;letter-spacing:.04em;text-transform:none;font-size:11px;color:var(--ink-3)',
      text: card.kw.map((k) => KEYWORDS[k] && KEYWORDS[k].text).filter(Boolean).join(' '),
    }));
  }
  return rows;
}

/** "אש + אדמה" line for a recipe, with a fallback for the primes. */
export function recipeLine(card, { known = () => true } = {}) {
  if (!card.recipe) {
    return h('p', { class: 'recipe-line', text: 'יסוד ראשוני — קיים מלכתחילה.' });
  }
  const parts = card.recipe.map((id) => {
    const p = CARD_BY_ID[id];
    return h('b', {
      style: `color:var(--el-${p.el})`,
      text: known(id) ? p.name : '؟؟؟',
    });
  });
  return h('div', { class: 'recipe-line' }, [
    parts[0], h('span', { class: 'op', text: '+' }), parts[1],
    h('span', { class: 'op', text: '→' }),
    h('b', { style: `color:var(--el-${card.el})`, text: card.name }),
  ]);
}
