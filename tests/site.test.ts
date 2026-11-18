import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { absoluteUrl, assetPath, BASE_PATH, getSiteUrl } from '../lib/site.ts';
import nextConfig from '../next.config.ts';

const SITE_ORIGIN = 'https://ododex.com';
const SOURCE_DIRS = ['app', 'components', 'lib'];
const FORBIDDEN_STRINGS = ['/api/', 'cartocdn', 'radar-zbe'];

function withSiteOrigin(origin: string | undefined, check: () => void): void {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  if (origin === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = origin;
  try {
    check();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(full) ? [full] : [];
  });
}

test('BASE_PATH es /es/zbe', () => {
  assert.equal(BASE_PATH, '/es/zbe');
});

test('absoluteUrl: raíz vacía o con barra devuelve origen + ruta base sin barra final', () => {
  withSiteOrigin(SITE_ORIGIN, () => {
    assert.equal(absoluteUrl('/'), `${SITE_ORIGIN}/es/zbe`);
    assert.equal(absoluteUrl(''), `${SITE_ORIGIN}/es/zbe`);
  });
});

test('absoluteUrl: ruta con y sin barra inicial', () => {
  withSiteOrigin(SITE_ORIGIN, () => {
    assert.equal(absoluteUrl('/madrid/b'), `${SITE_ORIGIN}/es/zbe/madrid/b`);
    assert.equal(absoluteUrl('madrid/b'), `${SITE_ORIGIN}/es/zbe/madrid/b`);
  });
});

test('getSiteUrl: quita barras finales y usa localhost por defecto', () => {
  withSiteOrigin(`${SITE_ORIGIN}/`, () => {
    assert.equal(getSiteUrl(), SITE_ORIGIN);
    assert.equal(absoluteUrl('/madrid'), `${SITE_ORIGIN}/es/zbe/madrid`);
  });
  withSiteOrigin(undefined, () => {
    assert.equal(getSiteUrl(), 'http://localhost:3000');
  });
});

test('assetPath antepone la ruta base', () => {
  assert.equal(assetPath('/brand/x.svg'), '/es/zbe/brand/x.svg');
  assert.equal(assetPath('brand/x.svg'), '/es/zbe/brand/x.svg');
});

test('next.config.ts usa la misma ruta base que lib/site.ts', () => {
  assert.equal(nextConfig.basePath, BASE_PATH);
});

test('next.config.ts exporta el sitio como ficheros estáticos y sin redirects', () => {
  assert.equal(nextConfig.output, 'export');
  assert.equal('redirects' in nextConfig, false);
});

// Un <a> con href interno literal se salta la ruta base; los internos van con next/link.
const RAW_INTERNAL_ANCHOR = /<a\s[^>]*href=["'{`]+\/(?!\/)/;

test('ningún .tsx de app/ ni components/ usa src="/ ni <a href="/ literales', () => {
  for (const dir of ['app', 'components']) {
    for (const file of sourceFiles(dir).filter((f) => f.endsWith('.tsx'))) {
      const source = readFileSync(file, 'utf8');
      assert.ok(!source.includes('src="/'), `${file} contiene src="/ sin assetPath`);
      assert.doesNotMatch(source, RAW_INTERNAL_ANCHOR, `${file} tiene un <a href="/..."> sin next/link ni assetPath`);
    }
  }
});

test('ningún fichero de app/, components/ ni lib/ contiene /api/, cartocdn ni radar-zbe', () => {
  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(dir)) {
      const source = readFileSync(file, 'utf8');
      for (const forbidden of FORBIDDEN_STRINGS) {
        assert.ok(!source.includes(forbidden), `${file} contiene "${forbidden}"`);
      }
    }
  }
});

test('las rutas dinámicas no admiten parámetros fuera de generateStaticParams', () => {
  const dynamicPages = [
    join('app', '[ciudad]', 'page.tsx'),
    join('app', '[ciudad]', '[etiqueta]', 'page.tsx'),
    join('app', 'etiqueta-dgt', '[combustible]', '[anio]', 'page.tsx'),
  ];
  for (const page of dynamicPages) {
    assert.match(readFileSync(page, 'utf8'), /export const dynamicParams = false;/, `${page} sin dynamicParams = false`);
  }
});
