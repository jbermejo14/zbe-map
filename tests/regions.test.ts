import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllCities } from '../lib/cities-repository.ts';
import { canonicalRegion } from '../lib/regions.ts';

const EXPECTED_REGION_GROUPS = 19;

test('regiones: las variantes se unifican en el nombre oficial', () => {
  assert.equal(canonicalRegion('Comunidad Valenciana'), 'Comunitat Valenciana');
  assert.equal(canonicalRegion('Comunitat Valenciana'), 'Comunitat Valenciana');
  assert.equal(canonicalRegion('Islas Baleares'), 'Illes Balears');
  assert.equal(canonicalRegion('Illes Balears'), 'Illes Balears');
  assert.equal(canonicalRegion('Cataluña'), 'Cataluña');
});

test('regiones: las 152 ciudades caen en 19 grupos (17 comunidades, Ceuta y Melilla)', () => {
  const cities = getAllCities();
  assert.equal(cities.length, 152);
  const groups = new Set(cities.map((city) => canonicalRegion(city.region)));
  assert.equal(groups.size, EXPECTED_REGION_GROUPS);
});
