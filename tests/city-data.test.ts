import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Verificación de Datos Municipales ZBE (Requisito 5)', () => {
  const citiesPath = path.join(process.cwd(), 'data/zbe-cities.json');
  const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

  it('Contiene la lista completa de ciudades con ZBE', () => {
    assert.ok(cities.length >= 150, `Se esperaban >= 150 ciudades, encontradas: ${cities.length}`);
  });

  it('Todas las ciudades tienen una sourceUrl oficial válida (HTTP/HTTPS)', () => {
    for (const city of cities) {
      assert.ok(
        city.sourceUrl && typeof city.sourceUrl === 'string' && city.sourceUrl.trim().length > 0,
        `La ciudad ${city.name} (${city.id}) no tiene sourceUrl`
      );
      assert.match(
        city.sourceUrl,
        /^https?:\/\//i,
        `La sourceUrl de ${city.name} no es una URL HTTP/HTTPS válida: ${city.sourceUrl}`
      );
    }
  });

  it('Todas las ciudades tienen una fecha de verificación (lastVerified) de menos de 120 días', () => {
    const now = new Date();
    const MAX_DAYS = 120;
    const maxAgeMs = MAX_DAYS * 24 * 60 * 60 * 1000;

    for (const city of cities) {
      assert.ok(
        city.lastVerified && typeof city.lastVerified === 'string',
        `La ciudad ${city.name} no tiene campo lastVerified`
      );

      const verifiedDate = new Date(city.lastVerified);
      assert.ok(
        !isNaN(verifiedDate.getTime()),
        `La fecha lastVerified de ${city.name} no es válida: ${city.lastVerified}`
      );

      const ageMs = now.getTime() - verifiedDate.getTime();
      assert.ok(
        ageMs <= maxAgeMs,
        `La verificación de ${city.name} tiene más de ${MAX_DAYS} días de antigüedad (${city.lastVerified})`
      );
    }
  });

  it('Cada ciudad tiene reglas definidas para todas las 5 etiquetas DGT', () => {
    const requiredBadges = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
    for (const city of cities) {
      assert.ok(city.rules, `La ciudad ${city.name} no tiene objeto rules`);
      for (const badge of requiredBadges) {
        assert.ok(
          city.rules[badge],
          `La ciudad ${city.name} carece de regla para la etiqueta ${badge}`
        );
        assert.ok(
          ['allowed', 'restricted', 'banned'].includes(city.rules[badge].status),
          `Estado de acceso inválido para ${city.name} (${badge}): ${city.rules[badge].status}`
        );
      }
    }
  });
});
