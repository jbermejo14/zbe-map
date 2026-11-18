import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAllCities, getAllCities } from '../lib/cities-repository.ts';
import {
  buildRecommendations,
  buildTasacionDeal,
  DEFAULT_RECOMMENDATION_BODY_TYPE,
  DEFAULT_RECOMMENDATION_POWER_KW,
  DEFAULT_RECOMMENDATION_WHEELBASE_MM,
} from '../lib/client-logic.ts';
import {
  getEcoCandidates,
  getVehicleById,
  getAllReferenceVehicles,
} from '../lib/vehicles-repository.ts';
import type { DgtBadgeType } from '../lib/zbe-engine.ts';

const ALL_BADGES: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
const RECOMMENDATION_COUNT = 3;
const RECOMMENDATION_TARGET_BRAND = 'Audi';
const RECOMMENDATION_TARGET_MODEL = 'A4';

function recommendationTargetVehicle() {
  const vehicle = getAllReferenceVehicles().find(
    (v) => v.brand === RECOMMENDATION_TARGET_BRAND && v.model === RECOMMENDATION_TARGET_MODEL
  );
  assert.ok(vehicle, 'Debe existir un Audi A4 de referencia');
  return vehicle;
}

// /api/zbe-cities devolvía evaluateAllCities(badge) y un resumen con los recuentos por estado.
test('ciudades: evaluateAllCities cubre las 152 ciudades y los recuentos suman el total', () => {
  for (const badge of ALL_BADGES) {
    const cities = evaluateAllCities(badge);
    const allowed = cities.filter((c) => c.status === 'allowed').length;
    const restricted = cities.filter((c) => c.status === 'restricted').length;
    const banned = cities.filter((c) => c.status === 'banned').length;
    assert.equal(cities.length, getAllCities().length);
    assert.equal(allowed + restricted + banned, cities.length, `estados desconocidos para ${badge}`);
  }
});

test('ciudades: una ciudad prohibida para B es libre para CERO', () => {
  const madridB = evaluateAllCities('B').find((c) => c.slug === 'madrid');
  const madridCero = evaluateAllCities('CERO').find((c) => c.slug === 'madrid');
  assert.ok(madridB && madridCero);
  assert.notEqual(madridB.status, 'allowed');
  assert.equal(madridCero.status, 'allowed');
});

// /api/recommendations: objetivo desde vehicleId o parámetros; 3 candidatos ECO/CERO con enlaces.
test('recomendaciones: para un vehículo conocido usa sus datos y devuelve 3 ECO/CERO distintos', () => {
  const vehicle = recommendationTargetVehicle();
  const { target, recommendations } = buildRecommendations({ vehicleId: vehicle.id });

  assert.deepEqual(target, {
    id: vehicle.id,
    bodyType: vehicle.bodyType,
    wheelbaseMm: vehicle.wheelbaseMm,
    powerKw: vehicle.powerKw,
  });
  assert.equal(recommendations.length, RECOMMENDATION_COUNT);
  for (const rec of recommendations) {
    assert.ok(rec.dgtBadge === 'ECO' || rec.dgtBadge === 'CERO');
    assert.notEqual(rec.id, vehicle.id);
    assert.ok(getEcoCandidates().some((c) => c.id === rec.id));
  }
});

const AFFILIATE_TAG_ENVS = [
  'NEXT_PUBLIC_AFFILIATE_CLICARS_TAG',
  'NEXT_PUBLIC_AFFILIATE_RENTING_TAG',
  'NEXT_PUBLIC_AFFILIATE_TASACION_TAG',
] as const;
const AFFILIATE_TEST_TAG = 'placeholder & prueba';

/** Ejecuta la prueba con exactamente las variables de afiliado indicadas definidas. */
function withAffiliateEnv(values: Partial<Record<(typeof AFFILIATE_TAG_ENVS)[number], string>>, run: () => void): void {
  const previous = AFFILIATE_TAG_ENVS.map((name) => process.env[name]);
  for (const name of AFFILIATE_TAG_ENVS) {
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    run();
  } finally {
    AFFILIATE_TAG_ENVS.forEach((name, index) => {
      const old = previous[index];
      if (old === undefined) delete process.env[name];
      else process.env[name] = old;
    });
  }
}

test('recomendaciones: sin códigos de afiliación no hay enlaces ni tasación', () => {
  withAffiliateEnv({}, () => {
    const { recommendations } = buildRecommendations({ vehicleId: recommendationTargetVehicle().id });
    assert.equal(recommendations.length, RECOMMENDATION_COUNT);
    for (const rec of recommendations) {
      assert.deepEqual(rec.affiliateDeals, {});
    }
    assert.equal(buildTasacionDeal(), null);
  });
});

test('recomendaciones: con tag de afiliación, los enlaces lo añaden codificado', () => {
  withAffiliateEnv(
    {
      NEXT_PUBLIC_AFFILIATE_CLICARS_TAG: AFFILIATE_TEST_TAG,
      NEXT_PUBLIC_AFFILIATE_RENTING_TAG: AFFILIATE_TEST_TAG,
      NEXT_PUBLIC_AFFILIATE_TASACION_TAG: AFFILIATE_TEST_TAG,
    },
    () => {
      const { recommendations } = buildRecommendations({ vehicleId: recommendationTargetVehicle().id });
      assert.ok(recommendations.length > 0);
      const encodedTag = 'placeholder%20%26%20prueba';
      for (const rec of recommendations) {
        const query = encodeURIComponent(`${rec.brand} ${rec.model}`);
        assert.equal(rec.affiliateDeals.segundaMano?.url, `https://www.clicars.com/coches-segunda-mano?search=${query}&tag=${encodedTag}`);
        assert.equal(rec.affiliateDeals.renting?.url, `https://rentingfinders.com/coches/?search=${query}&ref=${encodedTag}`);
        assert.equal(rec.affiliateDeals.segundaMano?.platform, 'Clicars');
      }
      assert.equal(buildTasacionDeal()?.url, `https://www.compramostucoche.es/?tag=${encodedTag}`);
    }
  );
});

test('recomendaciones: solo aparece el enlace cuyo código existe', () => {
  withAffiliateEnv({ NEXT_PUBLIC_AFFILIATE_RENTING_TAG: AFFILIATE_TEST_TAG }, () => {
    const { recommendations } = buildRecommendations({ vehicleId: recommendationTargetVehicle().id });
    for (const rec of recommendations) {
      assert.equal(rec.affiliateDeals.segundaMano, undefined);
      assert.ok(rec.affiliateDeals.renting);
    }
  });
});

test('recomendaciones: sin vehículo conocido usa los parámetros o el perfil por defecto', () => {
  const custom = buildRecommendations({ bodyType: 'SUV', wheelbaseMm: 2700, powerKw: 110 });
  assert.deepEqual(custom.target, { id: undefined, bodyType: 'SUV', wheelbaseMm: 2700, powerKw: 110 });

  const fallback = buildRecommendations({ vehicleId: 'id-que-no-existe' });
  assert.deepEqual(fallback.target, {
    id: 'id-que-no-existe',
    bodyType: DEFAULT_RECOMMENDATION_BODY_TYPE,
    wheelbaseMm: DEFAULT_RECOMMENDATION_WHEELBASE_MM,
    powerKw: DEFAULT_RECOMMENDATION_POWER_KW,
  });
  assert.equal(getVehicleById('id-que-no-existe'), undefined);
});
