/* Browser smoke test: boots the game, walks the Lab, the Codex, the deck
   builder and a full battle, and fails on any console error or page error.
   Run with `node tools/smoke.mjs [--headed] [--shots]`. */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, '.shots');

// --entry lets this same walk-through validate the bundled single-file
// artifact build, not just the multi-file dev version served from index.html.
const entryArg = process.argv.find((a) => a.startsWith('--entry='));
const ENTRY = entryArg ? entryArg.slice('--entry='.length) : 'index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? ENTRY : rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const port = await new Promise((r) => server.listen(0, () => r(server.address().port)));
const base = `http://127.0.0.1:${port}`;

const problems = [];
const steps = [];
const ok = (m) => { steps.push('  ✓ ' + m); console.log('  ✓ ' + m); };
const bad = (m) => { problems.push(m); console.error('  ✗ ' + m); };

/* Use the pre-installed browser rather than downloading one. */
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => fs.existsSync(p));

const browser = await chromium.launch({
  headless: !process.argv.includes('--headed'),
  ...(executablePath ? { executablePath } : {}),
});

if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });
let shotN = 0;
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.screenshot({ path: path.join(SHOT_DIR, `${String(++shotN).padStart(2, '0')}-${name}.png`), fullPage: false });
};

async function run(label, viewport) {
  console.log(`\n── ${label} (${viewport.width}×${viewport.height}) ─────────────`);
  const ctx = await browser.newContext({ viewport, locale: 'he-IL' });
  const page = await ctx.newPage();

  // Webfonts are a progressive enhancement; a blocked CDN is not a game bug.
  const isFont = (u) => /fonts\.(googleapis|gstatic)/.test(u || '');
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (isFont(m.location() && m.location().url)) return;
    if (/net::ERR_/.test(m.text()) && fontBlocked) return;
    bad(`[${label}] console: ${m.text()}`);
  });
  let fontBlocked = false;
  page.on('requestfailed', (r) => {
    if (isFont(r.url())) { fontBlocked = true; return; }
    bad(`[${label}] request failed: ${r.url()}`);
  });
  page.on('pageerror', (e) => bad(`[${label}] pageerror: ${e.message}`));

  await page.goto(base, { waitUntil: 'networkidle' });

  /* -- intro ------------------------------------------------------------- */
  await page.waitForSelector('.modal', { timeout: 5000 });
  await shot(page, `${label}-intro`);
  await page.click('.modal .btn--gold');
  await page.waitForSelector('.modal', { state: 'detached' });
  ok('intro dismissed');

  /* -- lab: discover a card ---------------------------------------------- */
  await page.waitForSelector('.lab-bench');
  const trayCards = () => page.$$('.card-grid .card');
  const startCount = (await trayCards()).length;
  if (startCount !== 4) bad(`expected 4 starting cards, saw ${startCount}`);
  else ok('four primes on the shelf');

  // fire + water -> steam
  await page.click('.card-grid .card[data-id="fire"]');
  await page.click('.card-grid .card[data-id="water"]');
  await page.waitForSelector('.modal .card--lg', { timeout: 5000 });
  const discovered = await page.textContent('.modal h2');
  if (!discovered.includes('תגלית')) bad('discovery modal did not appear');
  else ok('fusion produced a discovery');
  await shot(page, `${label}-discovery`);
  await page.click('.modal .btn--gold');

  // a fusion that must fail
  await page.click('.card-grid .card[data-id="earth"]');
  await page.click('.card-grid .card[data-id="steam"]');
  await page.waitForTimeout(600);
  const msg = await page.textContent('.lab-msg');
  if (!msg) bad('no message for a dead-end fusion');
  else ok(`dead-end fusion reported: "${msg.trim()}"`);

  /* -- seed a collection so a battle is reachable ------------------------- */
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('fusgame:save:v1'));
    raw.discovered = [
      'fire', 'water', 'earth', 'air', 'steam', 'lava', 'energy', 'mud', 'rain',
      'dust', 'inferno', 'ocean', 'mountain', 'storm', 'stone', 'life', 'human',
      'metal', 'blade', 'beast', 'crystal', 'wizard', 'warrior', 'golem',
    ];
    raw.levels = { blade: 2, human: 1 };
    raw.gold = 300;
    localStorage.setItem('fusgame:save:v1', JSON.stringify(raw));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.lab-bench');
  ok('save reloaded with a seeded collection');

  /* -- codex -------------------------------------------------------------- */
  await page.click('[data-nav="codex"]');
  await page.waitForSelector('.tier-band');
  const bands = (await page.$$('.tier-band')).length;
  const codexCards = (await page.$$('.card')).length;
  if (bands < 6) bad(`codex shows only ${bands} tier bands`);
  else ok(`codex renders ${bands} tier bands, ${codexCards} cards`);
  await shot(page, `${label}-codex`);

  await page.click('.card-grid .card');
  await page.waitForSelector('.modal');
  ok('card detail opens from the codex');
  await page.click('.modal .btn');

  /* -- deck --------------------------------------------------------------- */
  await page.click('[data-nav="deck"]');
  await page.waitForSelector('.deck-panel');
  await page.click('.deck-panel .btn--gold');   // auto-build
  await page.waitForTimeout(200);
  const deckSize = await page.textContent('.deck-count b');
  if (Number(deckSize) !== 20) bad(`auto-deck built ${deckSize} cards, expected 20`);
  else ok('auto-deck built 20 cards');
  const curveBars = (await page.$$('.deck-curve i')).length;
  if (curveBars !== 8) bad(`mana curve has ${curveBars} bars`);
  else ok('mana curve rendered');
  await shot(page, `${label}-deck`);

  /* -- battle -------------------------------------------------------------- */
  await page.click('[data-nav="map"]');
  await page.waitForSelector('.stage');
  await shot(page, `${label}-map`);
  await page.click('.stage');
  await page.waitForSelector('.modal');
  await page.click('.modal .btn--gold');
  await page.waitForSelector('.arena', { timeout: 5000 });
  ok('battle started');

  const heroBars = (await page.$$('.hero-bar')).length;
  const handCards = (await page.$$('.hand-rail .card')).length;
  if (heroBars !== 2) bad(`expected 2 hero bars, saw ${heroBars}`);
  if (handCards !== 3) bad(`expected 3 cards in the opening hand, saw ${handCards}`);
  else ok('opening hand of 3 dealt');

  // A random opening hand may hold no one-cost card; that is legal, so only
  // assert the summon path when a play is actually available.
  let summoned = false;
  const playable = await page.$('.hand-rail .card.is-playable');
  if (playable) {
    await playable.click();
    await page.waitForTimeout(300);
    const onBoard = (await page.$$('.board.is-mine .minion')).length;
    if (onBoard < 1) bad('playing a card did not put a minion on the board');
    else { summoned = true; ok('card summoned to the board on turn one'); }
  } else {
    ok('no one-cost card in the opening hand (legal) — deferring the summon check');
  }
  await shot(page, `${label}-battle`);

  // drive the battle to a conclusion
  let guard = 0;
  while (guard++ < 400) {
    if (await page.$('.modal .modal-actions')) break;
    const endBtn = await page.$('.battle-bar button:not([disabled])');
    if (!endBtn) { await page.waitForTimeout(250); continue; }
    const label2 = (await endBtn.textContent()) || '';
    if (label2.includes('סיכום')) { await endBtn.click(); break; }

    // attack with anything that can, then end the turn
    const actors = await page.$$('.minion.can-act');
    for (const a of actors.slice(0, 3)) {
      await a.click().catch(() => {});
      await page.waitForTimeout(90);
      const target = await page.$('.minion.is-target') || await page.$('.hero-bar.is-target');
      if (target) { await target.click().catch(() => {}); await page.waitForTimeout(160); }
    }
    for (const c of (await page.$$('.hand-rail .card.is-playable')).slice(0, 3)) {
      await c.click().catch(() => {});
      await page.waitForTimeout(140);
      if ((await page.$$('.board.is-mine .minion')).length) summoned = true;
    }
    const stillThere = await page.$('.battle-bar button:not([disabled])');
    if (stillThere) await stillThere.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  if (!summoned) bad('the player never managed to summon a minion');
  else ok('minions summoned during the battle');

  const over = await page.$('.modal h2');
  if (!over) bad(`battle did not conclude within ${guard} rounds`);
  else ok(`battle concluded: "${(await over.textContent()).trim()}" after ${guard} rounds`);
  await shot(page, `${label}-result`);

  /* -- horizontal overflow ------------------------------------------------ */
  await page.click('.modal .btn--gold');       // back to the map
  await page.waitForTimeout(400);
  for (const nav of ['lab', 'codex', 'deck', 'map']) {
    await page.click(`[data-nav="${nav}"]`);
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) bad(`${nav} overflows horizontally by ${overflow}px`);
  }
  ok('no horizontal overflow on any screen');

  await ctx.close();
}

await run('mobile', { width: 390, height: 844 });
await run('desktop', { width: 1280, height: 860 });

await browser.close();
server.close();

console.log('\n────────────────────────────────────────────────────');
console.log(`${steps.length} check(s) passed · ${problems.length} problem(s)`);
if (problems.length) {
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log('all good\n');
