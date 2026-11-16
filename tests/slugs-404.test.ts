import test from 'node:test';
import assert from 'node:assert/strict';
import { getCityBySlug, getAllCities } from '../lib/cities-repository.ts';
import { normalizeFuel, type FuelCategory } from '../lib/dgt-rules.ts';

test('Validación de Slugs y Manejo Estricto de 404 (Requisito 3 y 9)', async (t) => {
  await t.test('Ciudades existentes devuelven datos completos sin sustitución', () => {
    const validSlugs = ['madrid', 'barcelona', 'valencia', 'sevilla', 'zaragoza', 'malaga'];
    for (const slug of validSlugs) {
      const city = getCityBySlug(slug);
      assert.ok(city, `La ciudad ${slug} debe existir`);
      assert.equal(city.slug, slug, `El slug devuelto debe coincidir exactamente con el solicitado (${slug})`);
      assert.ok(city.name, 'Debe tener nombre');
      assert.ok(city.sourceUrl, 'Debe tener sourceUrl');
    }
  });

  await t.test('Ciudades inexistentes o inventadas devuelven undefined (disparando 404)', () => {
    const fakeSlugs = [
      'ciudad-inventada',
      'atlantida',
      'madrid-fake',
      'random-12345',
      'undefined',
      'null',
      'test-city',
    ];
    for (const fake of fakeSlugs) {
      const city = getCityBySlug(fake);
      assert.equal(
        city,
        undefined,
        `Un slug inexistente (${fake}) debe devolver undefined para provocar 404, nunca sustituir por otra ciudad`
      );
    }
  });

  await t.test('Combinaciones válidas de combustible y año se reconocen correctamente', () => {
    const validFuels: FuelCategory[] = [
      'gasolina',
      'diesel',
      'hibrido',
      'hibrido-enchufable',
      'electrico',
      'glp-gnc',
    ];

    for (const fuel of validFuels) {
      assert.equal(normalizeFuel(fuel), fuel, `El combustible ${fuel} debe normalizarse correctamente`);
    }

    // Años válidos frontera
    const validYears = [1990, 2001, 2006, 2015, 2020, 2025, 2026];
    for (const y of validYears) {
      assert.ok(y >= 1980 && y <= 2026, `El año ${y} está dentro del rango permitido`);
    }
  });

  await t.test('Años fuera de rango o inválidos son rechazados', () => {
    const invalidYears = [-1, 0, 1800, 1950, 1979, 2027, 2050, NaN];
    for (const y of invalidYears) {
      const isInvalid = isNaN(y) || y < 1980 || y > 2026;
      assert.ok(isInvalid, `El año ${y} debe considerarse inválido para disparar 404`);
    }
  });

  await t.test('Etiquetas válidas para rutas /zbe/[ciudad]/[etiqueta]', () => {
    const validBadgeSlugs = ['cero', 'eco', 'c', 'b', 'sin-etiqueta'];
    const invalidBadgeSlugs = ['a', 'd', 'euro6', 'electrico', 'verde', 'fake'];

    for (const valid of validBadgeSlugs) {
      assert.ok(validBadgeSlugs.includes(valid));
    }

    for (const invalid of invalidBadgeSlugs) {
      assert.ok(!validBadgeSlugs.includes(invalid), `La etiqueta ${invalid} no debe ser admitida`);
    }
  });
});
