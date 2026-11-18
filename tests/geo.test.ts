import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAllCities } from '../lib/cities-repository.ts';
import {
  GEOLOCATION_PERMISSION_DENIED,
  GEOLOCATION_POSITION_UNAVAILABLE,
  GEOLOCATION_TIMEOUT,
  TIEMPO_ESPERA_UBICACION_MS,
  formatDistanceKm,
  geolocationErrorMessage,
  haversineKm,
  nearestZbe,
} from '../lib/geo.ts';

const PUERTA_DEL_SOL = { lat: 40.4168, lng: -3.7038 };
const PLAZA_DEL_PILAR = { lat: 41.6561, lng: -0.8773 };
/** Distancia en línea recta Madrid-Zaragoza, unos 273 km. */
const MADRID_ZARAGOZA_KM = 273;
const DISTANCE_TOLERANCE_KM = 8;

test('nearestZbe: un punto en Madrid devuelve Madrid con distancia pequeña', () => {
  const nearest = nearestZbe(PUERTA_DEL_SOL.lat, PUERTA_DEL_SOL.lng, getAllCities());
  assert.ok(nearest);
  assert.equal(nearest.city.slug, 'madrid');
  assert.ok(nearest.distanceKm < DISTANCE_TOLERANCE_KM, `distancia ${nearest.distanceKm}`);
});

test('nearestZbe: un punto en Zaragoza devuelve Zaragoza', () => {
  const nearest = nearestZbe(PLAZA_DEL_PILAR.lat, PLAZA_DEL_PILAR.lng, getAllCities());
  assert.ok(nearest);
  assert.equal(nearest.city.slug, 'zaragoza');
  assert.ok(nearest.distanceKm < DISTANCE_TOLERANCE_KM);
});

test('nearestZbe: con la lista vacía devuelve null', () => {
  assert.equal(nearestZbe(PUERTA_DEL_SOL.lat, PUERTA_DEL_SOL.lng, []), null);
});

test('haversineKm: Madrid-Zaragoza ronda 273 km y es simétrica', () => {
  const distance = haversineKm(PUERTA_DEL_SOL, PLAZA_DEL_PILAR);
  assert.ok(Math.abs(distance - MADRID_ZARAGOZA_KM) < DISTANCE_TOLERANCE_KM * 2, `distancia ${distance}`);
  assert.equal(distance, haversineKm(PLAZA_DEL_PILAR, PUERTA_DEL_SOL));
  assert.equal(haversineKm(PUERTA_DEL_SOL, PUERTA_DEL_SOL), 0);
});

test('formatDistanceKm: un decimal bajo 10 km y entero desde ahí', () => {
  assert.equal(formatDistanceKm(3.46), '3,5');
  assert.equal(formatDistanceKm(12.6), '13');
});

test('errores de geolocalización: cada código tiene un mensaje distinto que dice qué hacer', () => {
  const messages = [GEOLOCATION_PERMISSION_DENIED, GEOLOCATION_POSITION_UNAVAILABLE, GEOLOCATION_TIMEOUT].map(
    geolocationErrorMessage
  );
  assert.equal(new Set(messages).size, 3);
  assert.match(messages[0], /permiso/);
  assert.equal(geolocationErrorMessage(99), messages[1]);
});

test('TIEMPO_ESPERA_UBICACION_MS es un tiempo de espera razonable', () => {
  assert.ok(TIEMPO_ESPERA_UBICACION_MS >= 5000 && TIEMPO_ESPERA_UBICACION_MS <= 30000);
});
