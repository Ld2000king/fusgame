/* ============================================================================
   FETCH-FONTS — downloads the two typefaces the theme specifies (Frank Ruhl
   Libre for display, Heebo for body) and writes a self-contained @font-face
   stylesheet with the glyph data inlined as base64.

   Why: the Artifact CSP blocks requests to font CDNs at view time, so the
   bundled single-file build can't link fonts.googleapis.com the way the dev
   site does — that would silently fall back to a system serif, undercutting
   the "engraved plate" typography the design calls for. This script does the
   fetch once, at build time, so the shipped page makes zero external
   requests.

   Only the Hebrew and Latin subsets are kept (this game has no other
   scripts) to keep the payload down. Results are cached in
   tools/.font-cache/ so repeat bundles don't re-download.

   Run with `node tools/fetch-fonts.mjs` — writes tools/.font-cache/fonts.css.
   ========================================================================= */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'tools', '.font-cache');
const OUT = path.join(CACHE_DIR, 'fonts.css');

const FAMILIES = 'family=Frank+Ruhl+Libre:wght@700;900&family=Heebo:wght@400;500;700';
const CSS_API = `https://fonts.googleapis.com/css2?${FAMILIES}&display=swap`;
// A modern desktop UA gets woff2 (smallest) rather than ttf from the CSS2 API.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curl(url, extraArgs = []) {
  return execFileSync('curl', ['-sS', '-A', UA, url, ...extraArgs], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function parseFontFaces(css) {
  const blocks = css.split('@font-face').slice(1).map((b) => '@font-face' + b);
  return blocks.map((block) => {
    const family = block.match(/font-family:\s*'([^']+)'/)[1];
    const weight = block.match(/font-weight:\s*(\d+)/)[1];
    const url = block.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)[1];
    const range = block.match(/unicode-range:\s*([^;]+);/);
    const subject = block.match(/\/\*\s*(\S+)\s*\*\//);
    return {
      family, weight, url,
      range: range ? range[1].trim() : null,
      subset: subject ? subject[1] : 'unknown',
    };
  });
}

function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log('fetching font manifest…');
  const css = curl(CSS_API).toString('utf8');
  const faces = parseFontFaces(css).filter((f) => f.subset === 'hebrew' || f.subset === 'latin');

  console.log(`${faces.length} face(s) to embed (hebrew + latin subsets only)`);

  const seen = new Map(); // url -> base64
  let totalBytes = 0;
  const rules = [];

  for (const f of faces) {
    if (!seen.has(f.url)) {
      const cacheFile = path.join(CACHE_DIR, Buffer.from(f.url).toString('base64url') + '.woff2');
      let buf;
      if (fs.existsSync(cacheFile)) {
        buf = fs.readFileSync(cacheFile);
      } else {
        console.log(`  downloading ${f.family} ${f.weight} (${f.subset})…`);
        buf = curl(f.url);
        fs.writeFileSync(cacheFile, buf);
      }
      totalBytes += buf.length;
      seen.set(f.url, buf.toString('base64'));
    }
    const b64 = seen.get(f.url);
    rules.push(
      `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
      `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');` +
      (f.range ? `unicode-range:${f.range};` : '') + '}'
    );
  }

  fs.writeFileSync(OUT, rules.join('\n') + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)} — ${(totalBytes / 1024).toFixed(0)} KB of glyph data, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB as base64 CSS`);
}

main();
