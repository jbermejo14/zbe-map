import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sitemap from '../app/sitemap.ts';
import { VehicleBadgeCard } from '../components/VehicleBadgeCard.tsx';
import { etiquetaRouteFor } from '../lib/etiqueta-routes.ts';
import { absoluteUrl } from '../lib/site.ts';
import { getAllReferenceVehicles } from '../lib/vehicles-repository.ts';

type CardVehicle = React.ComponentProps<typeof VehicleBadgeCard>['vehicle'];

test('enlace de etiqueta DGT: el href de cada vehículo de referencia es una ruta generada o no hay enlace', () => {
  const generated = new Set(sitemap().map((route) => route.url));
  let withLink = 0;
  for (const vehicle of getAllReferenceVehicles()) {
    const href = etiquetaRouteFor(vehicle.propulsionCode, vehicle.year);
    if (href === null) continue;
    withLink += 1;
    assert.ok(generated.has(absoluteUrl(href)), `${vehicle.brand} ${vehicle.model} ${vehicle.year}: ${href} no se genera`);
  }
  assert.ok(withLink > 0, 'Debe haber vehículos con enlace');
});

test('enlace de etiqueta DGT: combustible o año sin página no generan enlace', () => {
  assert.equal(etiquetaRouteFor('GASOLINA', 1996), null);
  assert.equal(etiquetaRouteFor('NO_EXISTE', 2020), null);
  assert.equal(etiquetaRouteFor('PHEV', 2020), '/etiqueta-dgt/hibrido-enchufable/2020');
});

test('VehicleBadgeCard: enlaza a /etiqueta-dgt/<combustible>/<año> y no a /etiqueta-dgt/<marca>/<modelo>', () => {
  const [vehicle] = getAllReferenceVehicles().filter((v) => etiquetaRouteFor(v.propulsionCode, v.year) !== null);
  const html = renderToStaticMarkup(React.createElement(VehicleBadgeCard, { vehicle: vehicle as CardVehicle }));
  assert.ok(html.includes(`href="${etiquetaRouteFor(vehicle.propulsionCode, vehicle.year)}"`));
});
