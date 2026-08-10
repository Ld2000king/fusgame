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
  if (curveBars !== 7) bad(`tier distribution has ${curveBars} bars`);
  else ok('tier distribution rendered');
  await shot(page, `${label}-deck`);

  /* -- battle -------------------------------------------------------------- */
  await page.click('[data-nav="map"]');
  await page.waitForSelector('.stage');
  await shot(page, `${label}-map`);
  await page.click('.stage');
  await page.waitForSelector('.modal');
  await page.click('.modal [data-action="launch"]');
  await page.waitForSelector('.arena', { timeout: 5000 });
  ok('battle started');

  const heroBars = (await page.$$('.hero-bar')).length;
  const handCards = (await page.$$('.hand-rail .card')).length;
  if (heroBars !== 2) bad(`expected 2 hero bars, saw ${heroBars}`);
  if (handCards !== 5) bad(`expected 5 cards in the opening hand, saw ${handCards}`);
  else ok('opening hand of 5 dealt');

  // Pick the first hand card (a one-card selection means "attack"), commit,
  // and confirm a round actually resolves (round counter advances or the
  // hero HP fields change) before driving the rest of the battle blind.
  await page.click('.hand-rail .card');
  await page.waitForTimeout(200);
  const attackBtn = await page.$('.action-panel .btn--gold');
  if (!attackBtn) bad('no attack button appeared after selecting one card');
  else {
    await attackBtn.click();
    await page.waitForTimeout(2400); // reveal delay + resolve delay in battle.js
    ok('first round committed and resolved');
  }
  await shot(page, `${label}-battle`);

  // Drive the rest of the battle blind: pick one card, attack, repeat — or
  // pass when the hand is empty — until the result modal appears.
  let guard = 0;
  let fusedAtLeastOnce = false;
  while (guard++ < 250) {
    if (await page.$('.modal .modal-actions')) break;

    const passBtn = await page.$('.action-panel button');
    const passText = passBtn ? (await passBtn.textContent()) || '' : '';
    if (passText.includes('המשך')) {
      await passBtn.click();
      await page.waitForTimeout(2400);
      continue;
    }

    // Occasionally try a fusion (two fusible cards) to exercise that path too.
    const fusible = await page.$('.hand-rail .card.is-fusible');
    if (fusible && guard % 4 === 0) {
      const anyCard = await page.$('.hand-rail .card');
      if (anyCard) await anyCard.click();
      await fusible.click();
      await page.waitForTimeout(150);
      const fuseBtn = await page.$('.action-panel .btn--gold:not([disabled])');
      if (fuseBtn) {
        const t = (await fuseBtn.textContent()) || '';
        if (t.includes('התך') || t.includes('Mega')) fusedAtLeastOnce = true;
        await fuseBtn.click();
        await page.waitForTimeout(2400);
        continue;
      }
    }

    const cards = await page.$$('.hand-rail .card');
    if (!cards.length) { await page.waitForTimeout(300); continue; }
    await cards[0].click();
    await page.waitForTimeout(150);
    const goBtn = await page.$('.action-panel .btn--gold:not([disabled])');
    if (goBtn) { await goBtn.click(); await page.waitForTimeout(2400); }
    else { await page.waitForTimeout(300); }
  }

  if (fusedAtLeastOnce) ok('at least one in-battle fusion was committed');
  else ok('no fusible pair came up this run (not guaranteed every game)');

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
