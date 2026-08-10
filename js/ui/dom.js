/* Small DOM helpers — no framework, no build step. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ---- Toasts ------------------------------------------------------------- */
let toastHost;
export function toast(msg, kind = '', ms = 2600) {
  toastHost = toastHost || document.getElementById('toastHost');
  const el = h('div', { class: `toast ${kind}`, role: 'status', text: msg });
  toastHost.append(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 260);
  }, ms);
  // Never let the stack grow unbounded.
  while (toastHost.children.length > 4) toastHost.firstChild.remove();
}

/* ---- Modal -------------------------------------------------------------- */
let closeHandler = null;

export function modal(build, { dismissible = true } = {}) {
  const host = document.getElementById('modalHost');
  clear(host);
  host.hidden = false;

  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
  const api = { close: closeModal, box };
  const content = build(api);
  box.append(...[].concat(content));
  host.append(box);

  if (dismissible) {
    host.onclick = (e) => { if (e.target === host) closeModal(); };
    closeHandler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', closeHandler);
  } else {
    host.onclick = null;
  }
  const focusable = box.querySelector('button, [href], input, select');
  if (focusable) focusable.focus();
  return api;
}

export function closeModal() {
  const host = document.getElementById('modalHost');
  host.hidden = true;
  clear(host);
  host.onclick = null;
  if (closeHandler) document.removeEventListener('keydown', closeHandler);
  closeHandler = null;
}

/* ---- Floating combat numbers ------------------------------------------- */
export function floatNumber(anchor, text, kind = 'dmg') {
  if (!anchor || !anchor.getBoundingClientRect) return;
  const r = anchor.getBoundingClientRect();
  if (!r.width && !r.height) return;
  const el = h('div', {
    class: `float ${kind}`,
    text,
    style: `left:${r.left + r.width / 2}px;top:${r.top + r.height * 0.34}px`,
  });
  document.body.append(el);
  setTimeout(() => el.remove(), 950);
}

export function shake(node) {
  if (!node) return;
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
  setTimeout(() => node.classList.remove('shake'), 300);
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
