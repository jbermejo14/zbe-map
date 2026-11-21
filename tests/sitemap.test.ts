import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../app/sitemap.ts';
import { absoluteUrl, getSiteUrl } from '../lib/site.ts';

test('Generación Estática de Sitemap SEO (Requisitos 8 y 9)', async (t) => {
  const routes = sitemap();

  await t.test('El sitemap genera URLs indexables (< 1000, omitiendo páginas noindex)', () => {
    assert.ok(routes.length >= 950 && routes.length < 1000, `Se esperaban entre 950 y 999 URLs, obtenidas: ${routes.length}`);
  });

  await t.test('Todas las URLs son absolutas y cuelgan de la ruta base del sitio', () => {
    const baseUrl = absoluteUrl('/');
    for (const r of routes) {
      assert.ok(r.url.startsWith(getSiteUrl()), `La URL ${r.url} no comienza con ${getSiteUrl()}`);
      assert.ok(r.url.startsWith(baseUrl), `La URL ${r.url} no cuelga de ${baseUrl}`);
      assert.ok(!r.url.includes('undefined'), `La URL ${r.url} contiene 'undefined'`);
    }
  });

  await t.test('Contiene la home, las 152 ciudades y sus distintivos indexables', () => {
    const urls = new Set(routes.map((r) => r.url));

    assert.ok(urls.has(absoluteUrl('/')), 'Debe incluir la home');
    assert.ok(urls.has(absoluteUrl('/madrid')), 'Debe incluir Madrid');
    assert.ok(urls.has(absoluteUrl('/madrid/cero')), 'Madrid (activa) debe incluir etiqueta CERO');
    assert.ok(urls.has(absoluteUrl('/madrid/b')), 'Debe incluir Madrid con etiqueta B');
    assert.ok(urls.has(absoluteUrl('/barcelona/sin-etiqueta')), 'Debe incluir Barcelona sin etiqueta');
    // En ciudades en tramitación (ej. Las Palmas), CERO y ECO se omiten por noindex
    assert.ok(!urls.has(absoluteUrl('/las-palmas/cero')), 'Las Palmas (en trámite) no debe incluir CERO en sitemap');
    assert.ok(!urls.has(absoluteUrl('/las-palmas/eco')), 'Las Palmas (en trámite) no debe incluir ECO en sitemap');
    assert.ok(urls.has(absoluteUrl('/las-palmas/b')), 'Las Palmas debe mantener etiqueta B en sitemap');
  });

  await t.test('Ninguna URL conserva el prefijo antiguo /zbe/ sin la ruta base', () => {
    for (const r of routes) {
      assert.ok(!r.url.includes('/zbe/zbe/'), `La URL ${r.url} duplica el prefijo /zbe/`);
    }
  });

  await t.test('Contiene páginas programáticas de combustible y año', () => {
    const urls = new Set(routes.map((r) => r.url));

    assert.ok(urls.has(absoluteUrl('/etiqueta-dgt/gasolina/2006')), 'Debe incluir gasolina 2006');
    assert.ok(urls.has(absoluteUrl('/etiqueta-dgt/diesel/2015')), 'Debe incluir diesel 2015');
    assert.ok(urls.has(absoluteUrl('/etiqueta-dgt/hibrido/2020')), 'Debe incluir hibrido 2020');
    assert.ok(urls.has(absoluteUrl('/etiqueta-dgt/electrico/2024')), 'Debe incluir electrico 2024');
  });
});
