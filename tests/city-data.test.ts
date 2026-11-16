import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findSyntheticPolygonSlugs, isRegularPolygon } from '../lib/polygon-quality.ts';

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

  it('Las ciudades verificadas tienen fecha reciente (menos de 120 días) y las pendientes no tienen fecha', () => {
    const now = new Date();
    const MAX_DAYS = 120;
    const maxAgeMs = MAX_DAYS * 24 * 60 * 60 * 1000;

    for (const city of cities) {
      assert.ok(
        ['verified', 'pending'].includes(city.verificationStatus),
        `La ciudad ${city.name} tiene verificationStatus inválido: ${city.verificationStatus}`
      );

      if (city.verificationStatus === 'pending') {
        assert.equal(city.lastVerified, null, `La ciudad pendiente ${city.name} no debe tener lastVerified`);
        continue;
      }

      assert.ok(
        city.lastVerified && typeof city.lastVerified === 'string',
        `La ciudad verificada ${city.name} no tiene campo lastVerified`
      );
      const verifiedDate = new Date(city.lastVerified);
      assert.ok(!isNaN(verifiedDate.getTime()), `La fecha lastVerified de ${city.name} no es válida`);
      assert.ok(
        now.getTime() - verifiedDate.getTime() <= maxAgeMs,
        `La verificación de ${city.name} tiene más de ${MAX_DAYS} días (${city.lastVerified})`
      );
    }
  });

  it('Solo se marca como verificada una ciudad con fuente que no sea la página genérica de la DGT', () => {
    for (const city of cities) {
      const host = new URL(city.sourceUrl).host;
      if (host.endsWith('dgt.gob.es')) {
        assert.equal(city.verificationStatus, 'pending', `${city.name} usa la DGT como fuente: debe estar pendiente`);
      }
      if (city.verificationStatus === 'pending') {
        assert.doesNotMatch(city.sourceName, /^Ordenanza Municipal/i, `${city.name}: sourceName no puede llamar ordenanza a un enlace que no lo es`);
      }
    }
  });

  it('Ningún polígono del dataset es regular ni sintético (ni geoJSON sin polígono real)', () => {
    const syntheticSlugs = findSyntheticPolygonSlugs(cities);
    assert.deepEqual(syntheticSlugs, [], `Perímetros sintéticos: ${syntheticSlugs.join(', ')}`);
    for (const city of cities) {
      if (!city.polygon) {
        assert.ok(!city.geoJSON, `${city.name} tiene geoJSON pero no polygon`);
      }
    }
  });

  it('Detecta un polígono regular generado alrededor del centro', () => {
    const ringPoints = Array.from({ length: 9 }, (_, i) => {
      const angle = (i / 9) * 2 * Math.PI;
      return [40 + 0.01 * Math.sin(angle), -3 + (0.01 * Math.cos(angle)) / Math.cos((40 * Math.PI) / 180)];
    });
    assert.ok(isRegularPolygon(ringPoints as [number, number][], 40, -3));
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
