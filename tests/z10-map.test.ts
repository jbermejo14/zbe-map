import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAllCities } from '../lib/cities-repository.ts';
import { evaluateCitiesForBadge } from '../lib/zbe-engine.ts';
import { perimeterMarkerPosition } from '../lib/geo.ts';
import type { MarkerPoint } from '../lib/geo.ts';
import { visibleMapCities } from '../lib/map-cities.ts';
import { isZbeInProgress } from '../lib/zbe-ui.ts';
import { parsePolygonPoints } from '../lib/polygon-quality.ts';

const Z10_CITY = { lat: 10, lng: 10 };
const Z10_PRECISION = 1e-9;

/** Número de vueltas del anillo alrededor del punto (regla de Sunday): distinto de 0 si está dentro. */
function z10WindingNumber(point: MarkerPoint, ring: readonly MarkerPoint[]): number {
  const [lat, lng] = point;
  let turns = 0;
  ring.forEach(([lat1, lng1], index) => {
    const [lat2, lng2] = ring[(index + 1) % ring.length];
    const side = (lng2 - lng1) * (lat - lat1) - (lng - lng1) * (lat2 - lat1);
    if (lat1 <= lat && lat2 > lat && side > 0) turns += 1;
    if (lat1 > lat && lat2 <= lat && side < 0) turns -= 1;
  });
  return turns;
}

function z10AssertClose(actual: MarkerPoint, expected: MarkerPoint): void {
  assert.ok(Math.abs(actual[0] - expected[0]) < Z10_PRECISION, `lat ${actual[0]} != ${expected[0]}`);
  assert.ok(Math.abs(actual[1] - expected[1]) < Z10_PRECISION, `lng ${actual[1]} != ${expected[1]}`);
}

test('perimeterMarkerPosition: cuadrado devuelve su centro', () => {
  const polygon: MarkerPoint[] = [[0, 0], [0, 2], [2, 2], [2, 0]];
  z10AssertClose(perimeterMarkerPosition({ ...Z10_CITY, polygon }), [1, 1]);
});

test('perimeterMarkerPosition: triángulo devuelve su centroide', () => {
  const polygon: MarkerPoint[] = [[0, 0], [0, 3], [3, 0]];
  z10AssertClose(perimeterMarkerPosition({ ...Z10_CITY, polygon }), [1, 1]);
});

test('perimeterMarkerPosition: forma en C devuelve un punto interior', () => {
  const polygon: MarkerPoint[] = [[0, 0], [0, 10], [3, 10], [3, 3], [7, 3], [7, 10], [10, 10], [10, 0]];
  const position = perimeterMarkerPosition({ ...Z10_CITY, polygon });
  assert.notEqual(z10WindingNumber(position, polygon), 0, `fuera del perímetro: ${position}`);
});

test('perimeterMarkerPosition: forma en U con tramos desiguales elige el más largo', () => {
  // A la latitud del centroide la horizontal corta el brazo izquierdo (2) y el derecho (4).
  const polygon: MarkerPoint[] = [[0, 0], [0, 10], [10, 10], [10, 6], [2, 6], [2, 2], [10, 2], [10, 0]];
  const [lat, lng] = perimeterMarkerPosition({ ...Z10_CITY, polygon });
  assert.ok(lat > 2 && lat < 10, `latitud fuera del tramo de los brazos: ${lat}`);
  assert.equal(lng, 8);
});

test('perimeterMarkerPosition: sin cortes con la horizontal devuelve la media de vértices', () => {
  // Ocho con lóbulos de distinto tamaño: el centroide queda fuera de la banda de latitudes.
  const polygon: MarkerPoint[] = [[0, 0], [1, 2], [1, 0], [0, 3]];
  z10AssertClose(perimeterMarkerPosition({ ...Z10_CITY, polygon }), [0.5, 1.25]);
});

test('perimeterMarkerPosition: polígono degenerado devuelve la media de vértices', () => {
  const polygon: MarkerPoint[] = [[0, 0], [1, 1], [2, 2]];
  z10AssertClose(perimeterMarkerPosition({ ...Z10_CITY, polygon }), [1, 1]);
});

test('perimeterMarkerPosition: sin polígono o con menos de 3 puntos devuelve lat/lng', () => {
  assert.deepEqual(perimeterMarkerPosition(Z10_CITY), [10, 10]);
  assert.deepEqual(perimeterMarkerPosition({ ...Z10_CITY, polygon: null }), [10, 10]);
  assert.deepEqual(perimeterMarkerPosition({ ...Z10_CITY, polygon: [[0, 0], [1, 1]] }), [10, 10]);
});

const Z10_CITIES = [
  { cityId: 'a', zbeStatus: 'activa', status: 'allowed' },
  { cityId: 'b', zbeStatus: 'en_tramitacion', status: 'allowed' },
  { cityId: 'c', zbeStatus: 'suspendida', status: 'banned' },
  { cityId: 'd', zbeStatus: 'en_tramitacion', status: 'banned' },
];

function z10Count(cities: readonly { status: string }[], status: string): number {
  return cities.filter((city) => city.status === status).length;
}

test('visibleMapCities: oculta las ciudades en tramitación por defecto', () => {
  const visible = visibleMapCities(Z10_CITIES, { showInProgress: false, selectedCityId: null });
  assert.deepEqual(visible.map((city) => city.cityId), ['a', 'c']);
});

test('visibleMapCities: las muestra con el conmutador encendido', () => {
  const visible = visibleMapCities(Z10_CITIES, { showInProgress: true, selectedCityId: null });
  assert.deepEqual(visible.map((city) => city.cityId), ['a', 'b', 'c', 'd']);
});

test('visibleMapCities: la ciudad seleccionada se ve siempre', () => {
  const visible = visibleMapCities(Z10_CITIES, { showInProgress: false, selectedCityId: 'b' });
  assert.deepEqual(visible.map((city) => city.cityId), ['a', 'b', 'c']);
});

test('los recuentos que salen de visibleMapCities excluyen las ocultas', () => {
  const hidden = visibleMapCities(Z10_CITIES, { showInProgress: false, selectedCityId: null });
  const shown = visibleMapCities(Z10_CITIES, { showInProgress: true, selectedCityId: null });
  assert.equal(z10Count(hidden, 'allowed'), 1);
  assert.equal(z10Count(hidden, 'banned'), 1);
  assert.equal(z10Count(shown, 'allowed'), 2);
  assert.equal(z10Count(shown, 'banned'), 2);
  assert.equal(Z10_CITIES.filter(isZbeInProgress).length, 2);
});

test('datos reales: zbeStatus se copia del estado de la ciudad', () => {
  const cities = getAllCities();
  const evaluated = evaluateCitiesForBadge('B', cities);
  evaluated.forEach((result, index) => assert.equal(result.zbeStatus, cities[index].status));
  assert.ok(evaluated.some(isZbeInProgress));
});

test('datos reales: el marcador cae dentro del polígono de cada ciudad', () => {
  const failures: string[] = [];
  getAllCities().forEach((city) => {
    const polygon = parsePolygonPoints(city.polygon);
    if (polygon.length < 3) return;
    const position = perimeterMarkerPosition({ lat: city.lat, lng: city.lng, polygon });
    if (z10WindingNumber(position, polygon) === 0) failures.push(city.name);
  });
  assert.deepEqual(failures, []);
});
