import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '../components/Footer.tsx';

const OTHER_ROUTE = '/es/gasolineras';

test('Footer pinta las otras webs con <a href> tal cual y nada sin red', () => {
  const sections = [{ ruta: OTHER_ROUTE, nombre: 'Gasolineras', descripcion: 'Precios.' }];
  const con = renderToStaticMarkup(<Footer redSecciones={sections} />);
  assert.ok(con.includes('Otras webs de Ododex'));
  assert.ok(con.includes(`href="${OTHER_ROUTE}"`));
  assert.ok(!renderToStaticMarkup(<Footer redSecciones={null} />).includes('Otras webs de Ododex'));
  assert.ok(!renderToStaticMarkup(<Footer />).includes('Otras webs de Ododex'));
});
