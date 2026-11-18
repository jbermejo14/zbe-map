import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SOURCE_DIRECTORIES = ['app', 'components', 'lib'];
const TSX_EXTENSION = '.tsx';

// Colores fijos y degradados prohibidos: todo color sale de los tokens de globals.css.
// El lookbehind evita que "translate-" cuente como "slate-".
const PALETTE = 'red|green|emerald|amber|yellow|sky|blue|indigo|rose|stone|lime|teal|cyan|purple|pink|violet|fuchsia';
const FORBIDDEN_PATTERNS: RegExp[] = [
  /(?<![a-z])neutral-/,
  /(?<![a-z])zinc-/,
  /(?<![a-z])slate-/,
  /(?<![a-z])gray-/,
  /text-orange-/,
  /bg-orange-/,
  /#ff6b00/i,
  /bg-gradient/,
  /(?<![\w-])(from|via|to)-(\[|[a-z]+-\d)/,
  new RegExp(`(?<![\\w-])(${PALETTE})-\\d{2,3}`),
  /text-white|bg-white|bg-black|border-white/,
  /dark:/
];

function uiListTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return uiListTsxFiles(fullPath);
    return fullPath.endsWith(TSX_EXTENSION) ? [fullPath] : [];
  });
}

test('estilo: ningún .tsx usa colores fijos, degradados ni border-white', () => {
  const offenders: string[] = [];
  for (const directory of SOURCE_DIRECTORIES) {
    for (const file of uiListTsxFiles(path.join(process.cwd(), directory))) {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) offenders.push(`${path.relative(process.cwd(), file)}: ${pattern}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('estilo: globals.css no tiene degradados y deja Leaflet en @layer base sin ancho ni alto', () => {
  const css = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf-8');
  assert.doesNotMatch(css, /gradient\(/);
  const containerRule = /@layer base\s*\{[\s\S]*?\.leaflet-container\s*\{([^}]*)\}/.exec(css);
  assert.ok(containerRule, '.leaflet-container debe estar en @layer base');
  assert.doesNotMatch(containerRule[1], /(^|[\s;])(width|height)\s*:/);
});

test('estilo: los contenedores de Leaflet llevan isolate', () => {
  for (const file of ['SpainZbeMap.tsx', 'CityMiniMap.tsx']) {
    assert.match(readFileSync(path.join('components', file), 'utf-8'), /relative isolate/, file);
  }
});
