import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OTHER_BRAND, getVehicleBrands } from '../lib/brands.ts';

const SPANISH_LOCALE = 'es';

test('marcas: sin duplicados', () => {
  const brands = getVehicleBrands();
  assert.equal(new Set(brands.map((brand) => brand.toLowerCase())).size, brands.length);
});

test('marcas: en orden alfabético y con "Otra marca" al final', () => {
  const brands = getVehicleBrands();
  assert.equal(brands[brands.length - 1], OTHER_BRAND);
  const named = brands.slice(0, -1);
  const sorted = [...named].sort((a, b) => a.localeCompare(b, SPANISH_LOCALE, { sensitivity: 'base' }));
  assert.deepEqual(named, sorted);
});

test('marcas: incluye BMW, Seat y Rover', () => {
  const brands = getVehicleBrands();
  for (const brand of ['BMW', 'Seat', 'Rover']) {
    assert.ok(brands.includes(brand), `Falta ${brand}`);
  }
});

test('marcas: el fichero explica su origen en el campo fuente', () => {
  const file = JSON.parse(readFileSync('data/brands.json', 'utf-8')) as { fuente: string };
  assert.match(file.fuente, /vehicle-stats/);
});
