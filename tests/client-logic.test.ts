import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAllCities, getAllCities } from '../lib/cities-repository.ts';
import {
  buildRecommendations,
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

test('recomendaciones: enlaces comerciales limpios y con la marca y el modelo codificados', () => {
  const { recommendations } = buildRecommendations({ vehicleId: recommendationTargetVehicle().id });
  for (const rec of recommendations) {
    const query = encodeURIComponent(`${rec.brand} ${rec.model}`);
    assert.equal(rec.affiliateDeals.segundaMano.url, `https://www.clicars.com/coches-segunda-mano?search=${query}`);
    assert.equal(rec.affiliateDeals.renting.url, `https://rentingfinders.com/coches/?search=${query}`);
    assert.equal(rec.affiliateDeals.tasacion.url, 'https://www.compramostucoche.es/');
    assert.equal(rec.affiliateDeals.segundaMano.platform, 'Clicars');
  }
});

const AFFILIATE_TAG_ENV = 'NEXT_PUBLIC_AFFILIATE_CLICARS_TAG';
const AFFILIATE_TEST_TAG = 'placeholder & prueba';

test('recomendaciones: con tag de afiliación, el enlace de Clicars lo añade codificado', () => {
  const previous = process.env[AFFILIATE_TAG_ENV];
  process.env[AFFILIATE_TAG_ENV] = AFFILIATE_TEST_TAG;
  try {
    const { recommendations } = buildRecommendations({ vehicleId: recommendationTargetVehicle().id });
    assert.ok(recommendations.length > 0);
    for (const rec of recommendations) {
      const query = encodeURIComponent(`${rec.brand} ${rec.model}`);
      assert.equal(
        rec.affiliateDeals.segundaMano.url,
        `https://www.clicars.com/coches-segunda-mano?search=${query}&tag=placeholder%20%26%20prueba`
      );
    }
  } finally {
    if (previous === undefined) delete process.env[AFFILIATE_TAG_ENV];
    else process.env[AFFILIATE_TAG_ENV] = previous;
  }
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
