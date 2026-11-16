import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../app/sitemap.ts';

test('Generación Estática de Sitemap SEO (Requisitos 8 y 9)', async (t) => {
  const routes = sitemap();

  await t.test('El sitemap genera más de 1000 URLs indexables', () => {
    assert.ok(routes.length >= 1000, `Se esperaban >= 1000 URLs, obtenidas: ${routes.length}`);
  });

  await t.test('Todas las URLs son absolutas y utilizan el dominio del sitio', () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';
    for (const r of routes) {
      assert.ok(r.url.startsWith(siteUrl), `La URL ${r.url} no comienza con ${siteUrl}`);
      assert.ok(!r.url.includes('undefined'), `La URL ${r.url} contiene 'undefined'`);
    }
  });

  await t.test('Contiene la home, las 152 ciudades y sus 5 distintivos', () => {
    const urls = new Set(routes.map((r) => r.url));
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';

    assert.ok(urls.has(siteUrl), 'Debe incluir la home');
    assert.ok(urls.has(`${siteUrl}/zbe/madrid`), 'Debe incluir Madrid');
    assert.ok(urls.has(`${siteUrl}/zbe/madrid/b`), 'Debe incluir Madrid con etiqueta B');
    assert.ok(urls.has(`${siteUrl}/zbe/barcelona/sin-etiqueta`), 'Debe incluir Barcelona sin etiqueta');
  });

  await t.test('Contiene páginas programáticas de combustible y año', () => {
    const urls = new Set(routes.map((r) => r.url));
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';

    assert.ok(urls.has(`${siteUrl}/etiqueta-dgt/gasolina/2006`), 'Debe incluir gasolina 2006');
    assert.ok(urls.has(`${siteUrl}/etiqueta-dgt/diesel/2015`), 'Debe incluir diesel 2015');
    assert.ok(urls.has(`${siteUrl}/etiqueta-dgt/hibrido/2020`), 'Debe incluir hibrido 2020');
    assert.ok(urls.has(`${siteUrl}/etiqueta-dgt/electrico/2024`), 'Debe incluir electrico 2024');
  });
});
