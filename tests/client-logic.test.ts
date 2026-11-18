import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAllCities, getAllCities } from '../lib/cities-repository.ts';
import {
  buildRecommendations,
  DEFAULT_RECOMMENDATION_BODY_TYPE,
  DEFAULT_RECOMMENDATION_POWER_KW,
  DEFAULT_RECOMMENDATION_WHEELBASE_MM,
  lookupPlateForForm,
  PLATE_TOO_SHORT_MESSAGE,
} from '../lib/client-logic.ts';
import {
  getBrands,
  getEcoCandidates,
  getModelsByBrand,
  getVehicleById,
  getVersionsByModel,
  searchVehicles,
} from '../lib/vehicles-repository.ts';
import type { DgtBadgeType } from '../lib/zbe-engine.ts';

const ALL_BADGES: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
const RECOMMENDATION_COUNT = 3;

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

// /api/vehicles: action=brands, models, versions y search.
test('vehículos: marcas, modelos y versiones encadenados', () => {
  const brands = getBrands();
  assert.ok(brands.length > 0);
  assert.deepEqual(brands, [...brands].sort());

  const brand = brands[0];
  const models = getModelsByBrand(brand);
  assert.ok(models.length > 0);

  const versions = getVersionsByModel(brand, models[0]);
  assert.ok(versions.length > 0);
  assert.ok(versions.every((v) => v.brand === brand && v.model === models[0]));
});

test('vehículos: la búsqueda no distingue mayúsculas y respeta el límite de 15', () => {
  const results = searchVehicles('A4');
  assert.ok(results.length > 0);
  assert.equal(results[0].brand, 'Audi');
  assert.deepEqual(
    searchVehicles('a4').map((v) => v.id),
    results.map((v) => v.id)
  );
  assert.ok(searchVehicles('a').length <= 15);
  assert.deepEqual(searchVehicles('zzz-no-existe'), []);
});

// /api/recommendations: objetivo desde vehicleId o parámetros; 3 candidatos ECO/CERO con enlaces.
test('recomendaciones: para un vehículo conocido usa sus datos y devuelve 3 ECO/CERO distintos', () => {
  const vehicle = searchVehicles('A4')[0];
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
  const { recommendations } = buildRecommendations({ vehicleId: searchVehicles('A4')[0].id });
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
    const { recommendations } = buildRecommendations({ vehicleId: searchVehicles('A4')[0].id });
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

// /api/plate: matrícula corta o inválida daba error 400 con el mensaje; la válida, el resultado.
test('matrícula válida moderna: devuelve etiqueta, año estimado y matrícula formateada', async () => {
  const result = await lookupPlateForForm('1234 lmn', 'gasolina');
  assert.equal(result.plate, '1234LMN');
  assert.equal(result.formattedPlate, '1234 LMN');
  assert.equal(result.confidence, 'estimation');
  assert.ok(result.estimatedYear >= 2000);
  assert.ok(ALL_BADGES.includes(result.badge));
});

test('matrícula provincial: sin etiqueta', async () => {
  const result = await lookupPlateForForm('M-1234-AB', 'diesel');
  assert.equal(result.badge, 'SIN_ETIQUETA');
  assert.equal(result.confidence, 'provincial_vintage');
});

test('matrícula con combustible desconocido se trata como gasolina', async () => {
  const unknownFuel = await lookupPlateForForm('1234 LMN', 'fusion');
  const gasoline = await lookupPlateForForm('1234 LMN', 'gasolina');
  assert.deepEqual(unknownFuel, gasoline);
});

test('matrícula corta: error con el mensaje de la API', async () => {
  await assert.rejects(() => lookupPlateForForm(' 12 ', 'gasolina'), { message: PLATE_TOO_SHORT_MESSAGE });
});

test('matrícula con formato inválido: error explícito, no se silencia', async () => {
  await assert.rejects(() => lookupPlateForForm('1234 AEI', 'gasolina'), /Formato de matrícula española no válido/);
});
