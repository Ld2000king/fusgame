/* ============================================================================
   FETCH-ART — pulls the monster portraits from THE-ARENA and re-encodes them
   at the size this game actually displays them.

   The source files are full-size illustrations (60-180 KB each, ~3.6 MB for
   the set). Cards render the art at 118 px wide at most, so shipping the
   originals would bloat the single-file bundle by several megabytes for
   detail nobody can see. Each image is therefore downscaled to a card-sized
   crop and re-encoded, which brings the whole set well under a megabyte.

   Run with `node tools/fetch-art.mjs [--force]` — writes into art/.
   ========================================================================= */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'tools', '.art-cache');
const OUT_DIR = path.join(ROOT, 'art');
const FORCE = process.argv.includes('--force');

const BASE = 'https://raw.githubusercontent.com/Ld2000king/THE-ARENA/main/';

/* Card art is shown at 118px wide; 2x that covers retina without waste. */
const TARGET_W = 260;
const QUALITY = 78;

const FILES = [
  'abyss-mage', 'abyss-prince', 'azure-guardian', 'blood-knight',
  'blue-fist-monk', 'chrono-racer', 'crimson-warlock', 'dark-fist',
  'galaxy-knight', 'ice-dragoness', 'ice-golem', 'iron-vanguard',
  'lava-cub', 'lava-dragon', 'lich-king', 'machine-guardian',
  'mist-phantom', 'night-vampire', 'night-warden', 'nossa', 'orion',
  'poison-spore', 'ranger-guard', 'ranger-strike', 'rose-destroyer',
  'saiyan-king', 'sand-shark', 'shadow-imp', 'steel-spider',
  'storm-sentinel', 'sun-monarch', 'swamp-crawler', 'thunder-orb',
  'titan-prime', 'void-tyrant',
];

fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

let fetched = 0;
let rawBytes = 0;

for (const name of FILES) {
  const raw = path.join(RAW_DIR, name + '.jpg');
  if (FORCE || !fs.existsSync(raw)) {
    process.stdout.write(`  fetching ${name}… `);
    execFileSync('curl', ['-sSf', '-o', raw, BASE + 'art/' + name + '.jpg']);
    fetched++;
    console.log(`${(fs.statSync(raw).size / 1024).toFixed(0)} KB`);
  }
  rawBytes += fs.statSync(raw).size;
}
console.log(`\n${FILES.length} source image(s), ${fetched} newly fetched, ${(rawBytes / 1024 / 1024).toFixed(2)} MB raw`);

/* ---- downscale + re-encode via Pillow ---------------------------------- */
const py = `
import os, sys
from PIL import Image
src_dir, out_dir = sys.argv[1], sys.argv[2]
target_w, quality = int(sys.argv[3]), int(sys.argv[4])
total = 0
for fn in sorted(os.listdir(src_dir)):
    if not fn.endswith('.jpg'):
        continue
    im = Image.open(os.path.join(src_dir, fn)).convert('RGB')
    if im.width > target_w:
        h = round(im.height * target_w / im.width)
        im = im.resize((target_w, h), Image.LANCZOS)
    out = os.path.join(out_dir, fn)
    im.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
    total += os.path.getsize(out)
print(total)
`;
const outBytes = Number(
  execFileSync('python3', ['-c', py, RAW_DIR, OUT_DIR, String(TARGET_W), String(QUALITY)])
    .toString().trim()
);

console.log(`re-encoded to ${TARGET_W}px wide @ q${QUALITY} → ${(outBytes / 1024).toFixed(0)} KB total`);
console.log(`(~${(outBytes * 1.34 / 1024).toFixed(0)} KB once base64-inlined into the bundle)`);
