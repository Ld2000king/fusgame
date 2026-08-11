/* ============================================================================
   CARD RENDERING
   One function builds every card in the game; callers vary size and state.
   ========================================================================= */

import { h } from './dom.js';
import { sigil } from './sigil.js';
import { TIER_NAMES, CARD_BY_ID } from '../data/cards.js';
import { levelOf } from '../core/state.js';

const LEVEL_MARK = ['', '·', '··', '···'];

/**
 * A card's picture: the painted portrait where one exists, otherwise the
 * procedurally-drawn creature. The drawing stays in the DOM underneath as a
 * fallback, so a missing or broken image file degrades to it rather than to
 * an empty frame.
 */
function cardArt(card, opt) {
  const wrap = h('div', { class: 'card-art', html: sigil(card) });
  if (!card.img || opt.locked) return wrap;

  wrap.classList.add('has-img');
  const img = h('img', {
    class: 'mon-img',
    src: card.img,
    alt: '',
    loading: 'lazy',
    decoding: 'async',
    draggable: 'false',
    style: card.imgPos ? `object-position:${card.imgPos}` : null,
  });
  img.addEventListener('error', () => wrap.classList.add('img-failed'), { once: true });
  wrap.append(img);
  return wrap;
}

/**
 * @param {object} card   card record
 * @param {object} [opt]
 *   size      'lg' | '' | 'sm' | 'xs'
 *   atk/def   override displayed stats (in-battle buffs)
 *   locked    render as an undiscovered silhouette
 *   lvl       override the shard-level shown (defaults to the save file)
 *   buffed    force the buffed number styling even if atk/def == printed
 *   mega      show the small Mega mark (a freshly-fused, orb-free card)
 *   onClick   click handler; also marks the card as interactive
 *   className extra classes
 */
export function renderCard(card, opt = {}) {
  const size = opt.size === undefined ? '' : opt.size;
  const lvl = opt.lvl !== undefined ? opt.lvl : levelOf(card.id);
  const atk = opt.atk !== undefined ? opt.atk : card.atk + lvl;
  const def = opt.def !== undefined ? opt.def : card.def + lvl;
  const buffed = opt.buffed || atk !== card.atk + lvl || def !== card.def + lvl;

  const cls = ['card'];
  if (size) cls.push('card--' + size);
  if (opt.locked) cls.push('is-locked');
  if (opt.selected) cls.push('is-selected');
  if (opt.dim) cls.push('is-dim');
  if (opt.playable) cls.push('is-playable');
  if (opt.animate) cls.push('anim-in');
  if (opt.className) cls.push(opt.className);

  const frame = h('div', { class: 'card-frame' }, [
    lvl > 0 && !opt.locked
      ? h('div', { class: 'card-lvl', text: LEVEL_MARK[Math.min(3, lvl)] })
      : null,
    opt.mega ? h('div', { class: 'card-mega', text: 'MEGA' }) : null,
    cardArt(card, opt),
    h('h3', { class: 'card-name', text: opt.locked ? '؟؟؟' : card.name }),
    h('div', { class: 'card-tier', text: opt.locked ? '' : TIER_NAMES[card.tier] }),
    h('div', { class: 'card-stats' }, [
      h('span', { class: 'atk' + (buffed && atk > card.atk + lvl ? ' is-buffed' : ''), text: String(atk) }),
      h('span', { class: 'def' + (buffed && def > card.def + lvl ? ' is-buffed' : ''), text: String(def) }),
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
