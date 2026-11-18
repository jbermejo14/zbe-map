import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { Header } from '../components/Header.tsx';
import { SECTION_NAME, SITE_NAME } from '../lib/site.ts';

const SOURCE_DIRECTORIES = ['app', 'components', 'lib'];
const OLD_BRAND_PATTERN = /radar-zbe|Radar ZBE/i;
const SECTION_LINKS = ['/', '/etiqueta-dgt/gasolina/2018', '/#ciudades'];

function brandListFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? brandListFiles(fullPath) : [fullPath];
  });
}

test('marca: SITE_NAME es Ododex y la sección es Zonas de bajas emisiones', () => {
  assert.equal(SITE_NAME, 'Ododex');
  assert.equal(SECTION_NAME, 'Zonas de bajas emisiones');
});

test('marca: ningún fichero de app, components ni lib menciona Radar ZBE', () => {
  const offenders = SOURCE_DIRECTORIES.flatMap((directory) => brandListFiles(path.join(process.cwd(), directory)))
    .filter((file) => OLD_BRAND_PATTERN.test(readFileSync(file, 'utf-8')));
  assert.deepEqual(offenders, []);
});

test('BrandLogo: dos variantes del logo con la ruta base', () => {
  const html = renderToStaticMarkup(React.createElement(BrandLogo));
  assert.ok(html.includes('src="/es/zbe/brand/ododex-logo-light.svg"'));
  assert.ok(html.includes('src="/es/zbe/brand/ododex-logo-dark.svg"'));
});

test('Header: marca, sección, conmutador de tema y fila de navegación con tres enlaces', () => {
  const html = renderToStaticMarkup(React.createElement(Header));
  assert.ok(html.includes(SECTION_NAME));
  assert.ok(html.includes('id="themeToggleBtn"'));
  assert.ok(html.includes('aria-label="Secciones"'));
  for (const href of SECTION_LINKS) {
    assert.ok(html.includes(`href="${href}"`), `Falta el enlace ${href}`);
  }
  for (const label of ['Mapa', 'Etiqueta DGT', 'Ciudades']) {
    assert.ok(html.includes(`>${label}<`), `Falta el texto ${label}`);
  }
});

test('tema: el script de layout y el conmutador usan ododex-theme y data-theme, no la clase dark', () => {
  const layout = readFileSync(path.join('app', 'layout.tsx'), 'utf-8');
  const switchSource = readFileSync(path.join('components', 'ThemeSwitch.tsx'), 'utf-8');
  assert.ok(layout.includes("localStorage.getItem('ododex-theme')"));
  assert.ok(layout.includes("setAttribute('data-theme'"));
  assert.ok(switchSource.includes("'ododex-theme'"));
  assert.ok(!layout.includes('classList') && !switchSource.includes('classList'));
  assert.ok(!readFileSync(path.join('app', 'globals.css'), 'utf-8').includes('.dark'));
});

test('anclas: la home tiene los destinos #ciudades y #buscador del menú y del JSON-LD', () => {
  const dashboard = readFileSync(path.join('components', 'SplitDashboard.tsx'), 'utf-8');
  assert.ok(dashboard.includes('id="ciudades"'));
  assert.ok(dashboard.includes('id="buscador"'));
  assert.match(readFileSync(path.join('app', 'globals.css'), 'utf-8'), /\.anchor-target\s*\{[^}]*scroll-margin-top/);
});
