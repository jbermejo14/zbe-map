import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import CitiesPage from '../app/ciudades/page.tsx';
import sitemap from '../app/sitemap.ts';
import { SplitDashboard } from '../components/SplitDashboard.tsx';
import { getAllCities } from '../lib/cities-repository.ts';
import { absoluteUrl } from '../lib/site.ts';

// lib/zbe-engine.ts (fuera de este encargo) conserva el término en su modelo de datos; no es interfaz.
const SOURCE_DIRECTORIES = ['app', 'components'];

function z5ListSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return z5ListSources(fullPath);
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

test('/ciudades: incluye las 152 ciudades con enlace y está en el sitemap', () => {
  const html = renderToStaticMarkup(<CitiesPage />);
  const cities = getAllCities();
  assert.equal(cities.length, 152);
  for (const city of cities) {
    assert.ok(html.includes(`href="/${city.slug}"`), `Falta el enlace de ${city.name}`);
  }
  assert.ok(html.includes('for='), 'El buscador debe tener label asociado');
  assert.ok(sitemap().some((route) => route.url === absoluteUrl('/ciudades')));
});

test('/ciudades: JSON-LD BreadcrumbList con la URL absoluta de /ciudades', () => {
  const html = renderToStaticMarkup(<CitiesPage />);
  assert.match(html, /BreadcrumbList/);
  assert.ok(html.includes(absoluteUrl('/ciudades')));
});

test('home: arranca sin vehículo ni etiqueta seleccionados y con los campos con label', () => {
  const html = renderToStaticMarkup(<SplitDashboard />);
  assert.doesNotMatch(html, /Audi A4/);
  assert.doesNotMatch(html, /Etiqueta [BC]|Etiqueta ECO|0 CERO/);
  assert.doesNotMatch(html, /Confirmar en la DGT/);
  assert.match(html, /Elige tu vehículo/);
  assert.match(html, /Buscar por matrícula/);
  assert.match(html, /Empezar de nuevo/);
  assert.match(html, /Estimación por la serie de la matrícula/);
});

test('interfaz: ningún fichero conserva focusZaragoza, focusHuesca ni "GeoJSON"', () => {
  const offenders: string[] = [];
  for (const directory of SOURCE_DIRECTORIES) {
    for (const file of z5ListSources(directory)) {
      if (/focusZaragoza|focusHuesca|GeoJSON/.test(readFileSync(file, 'utf-8'))) offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});
