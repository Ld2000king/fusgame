/* ============================================================================
   BUNDLE — folds every ES module into one self-contained HTML file.
   No <script type="module">, no separate CSS files, no external font
   requests: everything the multi-file game needs, inlined into one page that
   works offline and needs no server (used for the single-file Artifact
   publish; the real, maintained source stays the multi-file version).

   Modules are wrapped in a tiny CommonJS-style loader (__require/__modules)
   rather than flattened into one scope, so identically-named locals in
   different files (e.g. two `let filter` in lab.js and deck.js) can't
   collide. `export function`/`export const` become plain declarations plus
   a name recorded for the module's return object; `import { a, b as c }`
   becomes a destructured `__require(...)` call. This is deliberately not a
   general bundler — it only understands the subset of ES module syntax this
   codebase actually uses (verified by tools/validate.mjs's import). If you
   add `export default`, a dynamic `import()`, or a re-export block, this
   script will not notice and the bundle will silently miss it — grep for
   `^export` and `^import` after adding new syntax and extend the regexes
   below if needed.

   Run with `node tools/bundle.mjs [outFile]`.
   ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_ROOT = path.join(ROOT, 'js');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.bundle', 'game.html'));

/* Dependency order doesn't actually matter — __require resolves lazily and
   memoizes — but listing leaves-first keeps the generated file readable. */
const MODULES = [
  'data/cards.js',
  'data/campaign.js',
  'core/battle.js',
  'core/ai.js',
  'core/state.js',
  'ui/sigil.js',
  'ui/dom.js',
  'ui/card.js',
  'screens/lab.js',
  'screens/codex.js',
  'screens/deck.js',
  'screens/map.js',
  'screens/battle.js',
  'main.js',
];

function resolveSpec(fromRel, spec) {
  const fromDir = path.posix.dirname(fromRel);
  return path.posix.normalize(path.posix.join(fromDir, spec));
}

function transformModule(relPath) {
  let src = fs.readFileSync(path.join(JS_ROOT, relPath), 'utf8');
  const exportsSet = new Set();

  // import { a, b as c } from '...';  — spans multiple lines in this codebase.
  src = src.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"]\s*;?/g, (_m, names, spec) => {
    const resolved = resolveSpec(relPath, spec);
    const destructure = names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => {
        const asMatch = n.match(/^(\w+)\s+as\s+(\w+)$/);
        return asMatch ? `${asMatch[1]}: ${asMatch[2]}` : n;
      })
      .join(', ');
    return `const { ${destructure} } = __require(${JSON.stringify(resolved)});`;
  });

  // export function NAME(...)
  src = src.replace(/^export\s+function\s+([$\w]+)/gm, (_m, name) => {
    exportsSet.add(name);
    return `function ${name}`;
  });

  // export const NAME = ...
  src = src.replace(/^export\s+const\s+([$\w]+)/gm, (_m, name) => {
    exportsSet.add(name);
    return `const ${name}`;
  });

  const leftover = src.match(/^export\s+\S+/gm);
  if (leftover) {
    throw new Error(`${relPath}: unhandled export form: ${leftover.join(', ')}`);
  }

  return { body: src, exportsList: [...exportsSet] };
}

function bundleScript() {
  const parts = [
    '"use strict";',
    'var __modules = {};',
    'var __cache = {};',
    'function __require(key) {',
    '  if (Object.prototype.hasOwnProperty.call(__cache, key)) return __cache[key];',
    '  if (!__modules[key]) throw new Error("bundle: missing module " + key);',
    '  var exp = __modules[key]();',
    '  __cache[key] = exp;',
    '  return exp;',
    '}',
  ];

  for (const rel of MODULES) {
    const { body, exportsList } = transformModule(rel);
    parts.push(`__modules[${JSON.stringify(rel)}] = function () {`);
    parts.push(body);
    parts.push(`return { ${exportsList.join(', ')} };`);
    parts.push('};');
  }

  parts.push(`__require(${JSON.stringify('main.js')});`);
  return parts.join('\n');
}

function extractBodyMarkup() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    .trim();
}

function readCss(name) {
  return fs.readFileSync(path.join(ROOT, 'css', name), 'utf8');
}

function readFonts() {
  const cached = path.join(ROOT, 'tools', '.font-cache', 'fonts.css');
  if (!fs.existsSync(cached)) {
    console.warn('! tools/.font-cache/fonts.css missing — run `node tools/fetch-fonts.mjs` first.');
    console.warn('! bundling without it: type will silently fall back to system fonts.');
    return '';
  }
  return fs.readFileSync(cached, 'utf8');
}

function build() {
  const script = bundleScript();
  const body = extractBodyMarkup();
  const css = readFonts() + '\n\n' + readCss('theme.css') + '\n\n' + readCss('app.css');

  const html = `<title>קלפי היסודות · Opus Alchemicum</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23070912'/%3E%3Cg fill='none' stroke='%23d4a24c' stroke-width='1.4'%3E%3Ccircle cx='16' cy='16' r='11'/%3E%3Ccircle cx='16' cy='16' r='7.5' opacity='.5'/%3E%3Cpolygon points='16,9 22,20 10,20'/%3E%3C/g%3E%3C/svg%3E">
<style>
${css}
</style>
${body}
<script>
${script}
</script>
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log(`bundled ${MODULES.length} modules → ${path.relative(ROOT, OUT)} (${(html.length / 1024).toFixed(0)} KB)`);
}

build();
