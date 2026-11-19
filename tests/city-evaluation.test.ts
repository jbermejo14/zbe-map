import test from 'node:test';
import assert from 'node:assert/strict';
import { getCityBySlug, evaluateCityAccess, getAllCities, evaluateAllCities } from '../lib/cities-repository.ts';
import type { DgtBadgeType } from '../lib/zbe-engine.ts';

test('Evaluación de Acceso Municipal por Etiqueta ZBE', async (t) => {
  await t.test('Madrid bloquea SIN_ETIQUETA y restringe B/C', () => {
    const madrid = getCityBySlug('madrid');
    assert.ok(madrid, 'Madrid debe existir');

    const evalSin = evaluateCityAccess(madrid, 'SIN_ETIQUETA');
    assert.equal(evalSin.status, 'banned', 'Madrid prohíbe sin etiqueta');
    assert.match(evalSin.reason, /no pueden circular/i);

    const evalB = evaluateCityAccess(madrid, 'B');
    assert.equal(evalB.status, 'restricted', 'Madrid restringe etiqueta B (parking en Centro)');

    const evalC = evaluateCityAccess(madrid, 'C');
    assert.equal(evalC.status, 'restricted', 'Madrid restringe etiqueta C');

    const evalEco = evaluateCityAccess(madrid, 'ECO');
    assert.equal(evalEco.status, 'allowed', 'Madrid permite ECO');

    const evalCero = evaluateCityAccess(madrid, 'CERO');
    assert.equal(evalCero.status, 'allowed', 'Madrid permite CERO');
  });

  await t.test('Barcelona prohíbe SIN_ETIQUETA en horario laboral', () => {
    const bcn = getCityBySlug('barcelona');
    assert.ok(bcn, 'Barcelona debe existir');

    const evalSin = evaluateCityAccess(bcn, 'SIN_ETIQUETA');
    assert.equal(evalSin.status, 'banned', 'Barcelona prohíbe sin etiqueta en horario laboral');

    const evalB = evaluateCityAccess(bcn, 'B');
    assert.equal(evalB.status, 'allowed', 'Barcelona permite B actualmente');
  });

  await t.test('Todas las 152 ciudades se evalúan correctamente para cualquier distintivo', () => {
    const badges: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
    for (const badge of badges) {
      const results = evaluateAllCities(badge);
      assert.equal(results.length, 152, `Deben evaluarse 152 ciudades para etiqueta ${badge}`);
      for (const res of results) {
        assert.ok(['allowed', 'restricted', 'banned'].includes(res.status), `Estado inválido para ${res.cityName}: ${res.status}`);
        assert.ok(res.reason && res.reason.length > 5, `Razón vacía para ${res.cityName}`);
      }
    }
  });
});
