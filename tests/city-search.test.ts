import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAllCities } from '../lib/cities-repository.ts';
import { filterCitiesByName, groupCitiesByRegion, normalizeSearchText } from '../lib/city-search.ts';
import {
  CITY_SUGGESTION_LIMIT,
  MAX_CIUDADES_SELECCIONADAS,
  addSelectedCity,
  removeSelectedCity,
  suggestCities,
} from '../lib/multi-city.ts';

const SPANISH_LOCALE = 'es';

test('búsqueda: ignora tildes y mayúsculas', () => {
  assert.equal(normalizeSearchText('  MÁLAGA '), 'malaga');
  assert.ok(filterCitiesByName(getAllCities(), 'malaga').some((city) => city.slug === 'malaga'));
  assert.equal(filterCitiesByName(getAllCities(), '').length, getAllCities().length);
});

test('agrupación: las 152 ciudades por comunidad, en orden alfabético', () => {
  const groups = groupCitiesByRegion(getAllCities());
  assert.equal(groups.reduce((total, group) => total + group.cities.length, 0), 152);
  const regions = groups.map((group) => group.region);
  assert.deepEqual(regions, [...regions].sort((a, b) => a.localeCompare(b, SPANISH_LOCALE)));
  for (const group of groups) {
    const names = group.cities.map((city) => city.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, SPANISH_LOCALE)));
  }
});

test('varias ciudades: no pasa del máximo ni repite', () => {
  assert.equal(MAX_CIUDADES_SELECCIONADAS, 4);
  let selected: string[] = [];
  for (const slug of ['madrid', 'madrid', 'barcelona', 'valencia', 'sevilla', 'zaragoza']) {
    selected = addSelectedCity(selected, slug);
  }
  assert.deepEqual(selected, ['madrid', 'barcelona', 'valencia', 'sevilla']);
  assert.deepEqual(removeSelectedCity(selected, 'barcelona'), ['madrid', 'valencia', 'sevilla']);
});

test('varias ciudades: las sugerencias excluyen las ya elegidas y respetan el límite', () => {
  const suggestions = suggestCities(getAllCities(), 'a', ['madrid']);
  assert.ok(suggestions.length > 0 && suggestions.length <= CITY_SUGGESTION_LIMIT);
  assert.ok(suggestions.every((city) => city.slug !== 'madrid'));
  assert.deepEqual(suggestCities(getAllCities(), '   ', []), []);
});
