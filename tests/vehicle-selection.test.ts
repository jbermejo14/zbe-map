import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOfficialDgtBadge } from '../lib/dgt-rules.ts';
import { resolveBadgeFromPlate, PLATE_TOO_SHORT_MESSAGE } from '../lib/plate-badge.ts';
import {
  ANIO_MIN,
  EMPTY_VEHICLE_SELECTION,
  evaluateVehicleSelection,
  registrationYears,
  requiresElectricRange,
  requiresRegistrationMonth,
  selectionNeedsFuel,
} from '../lib/vehicle-selection.ts';
import type { VehicleSelection } from '../lib/vehicle-selection.ts';

const ALL_FUELS = ['gasolina', 'diesel', 'hibrido', 'hibrido-enchufable', 'electrico', 'glp-gnc'] as const;
const SAMPLE_YEARS = [1995, 2001, 2006, 2010, 2015, 2020, 2026];
const SEPTEMBER = 9;
const AUGUST = 8;
const PHEV_LIMIT_KM = 40;

function selectionOf(changes: Partial<VehicleSelection>): VehicleSelection {
  return { ...EMPTY_VEHICLE_SELECTION, ...changes };
}

test('selector: sin año no hay etiqueta (estado vacío)', () => {
  assert.equal(evaluateVehicleSelection(EMPTY_VEHICLE_SELECTION), null);
  assert.equal(evaluateVehicleSelection(selectionOf({ fuel: 'gasolina' })), null);
});

test('selector: combustible y año dan la misma etiqueta que getOfficialDgtBadge', () => {
  for (const fuel of ALL_FUELS) {
    for (const year of SAMPLE_YEARS) {
      const result = evaluateVehicleSelection(selectionOf({ fuel, year }));
      assert.ok(result);
      assert.equal(result.badge, getOfficialDgtBadge({ fuel, year }).badge, `${fuel} ${year}`);
    }
  }
});

test('selector: BMW diésel de 2010 es etiqueta B y la marca solo rotula el resultado', () => {
  const result = evaluateVehicleSelection(selectionOf({ brand: 'BMW', fuel: 'diesel', year: 2010 }));
  assert.ok(result);
  assert.equal(result.badge, 'B');
  assert.equal(result.title, 'Tu BMW');
  const other = evaluateVehicleSelection(selectionOf({ brand: 'Otra marca', fuel: 'diesel', year: 2010 }));
  assert.equal(other?.title, 'Tu vehículo');
});

test('selector: diésel de septiembre de 2015 es C y de agosto de 2015 es B', () => {
  const september = evaluateVehicleSelection(selectionOf({ fuel: 'diesel', year: 2015, month: SEPTEMBER }));
  const august = evaluateVehicleSelection(selectionOf({ fuel: 'diesel', year: 2015, month: AUGUST }));
  assert.equal(september?.badge, 'C');
  assert.equal(august?.badge, 'B');
});

test('selector: híbrido enchufable de 40 km es CERO y de 39 km es ECO', () => {
  const forty = evaluateVehicleSelection(
    selectionOf({ fuel: 'hibrido-enchufable', year: 2022, electricRangeKm: PHEV_LIMIT_KM })
  );
  const thirtyNine = evaluateVehicleSelection(
    selectionOf({ fuel: 'hibrido-enchufable', year: 2022, electricRangeKm: PHEV_LIMIT_KM - 1 })
  );
  assert.equal(forty?.badge, 'CERO');
  assert.equal(thirtyNine?.badge, 'ECO');
});

test('selector: mes y autonomía solo se piden cuando las reglas los exigen', () => {
  assert.ok(requiresRegistrationMonth(selectionOf({ fuel: 'diesel', year: 2015 })));
  assert.ok(!requiresRegistrationMonth(selectionOf({ fuel: 'diesel', year: 2016 })));
  assert.ok(!requiresRegistrationMonth(selectionOf({ fuel: 'gasolina', year: 2015 })));
  assert.ok(requiresElectricRange(selectionOf({ fuel: 'hibrido-enchufable' })));
  assert.ok(!requiresElectricRange(selectionOf({ fuel: 'electrico' })));
});

test('selector: avisa de lo que supone si falta el mes o la autonomía', () => {
  assert.equal(evaluateVehicleSelection(selectionOf({ fuel: 'diesel', year: 2015 }))?.assumptions.length, 1);
  assert.equal(
    evaluateVehicleSelection(selectionOf({ fuel: 'hibrido-enchufable', year: 2022 }))?.assumptions.length,
    1
  );
  assert.equal(evaluateVehicleSelection(selectionOf({ fuel: 'gasolina', year: 2022 }))?.assumptions.length, 0);
});

test('selector: el enlace a la ficha solo existe si esa página se genera', () => {
  const generated = evaluateVehicleSelection(selectionOf({ fuel: 'gasolina', year: 2018 }));
  const missing = evaluateVehicleSelection(selectionOf({ fuel: 'gasolina', year: 1992 }));
  assert.equal(generated?.etiquetaHref, '/etiqueta-dgt/gasolina/2018');
  assert.equal(missing?.etiquetaHref, null);
});

test('años: de ANIO_MIN al año actual, del más reciente al más antiguo', () => {
  const years = registrationYears(2026);
  assert.equal(years[0], 2026);
  assert.equal(years[years.length - 1], ANIO_MIN);
  assert.equal(ANIO_MIN, 1990);
});

test('sin combustible: un año con la misma etiqueta para gasolina y diésel la muestra con nota', () => {
  const result = evaluateVehicleSelection(selectionOf({ year: 2020 }));
  assert.ok(result);
  assert.equal(result.badge, 'C');
  assert.equal(result.fuelLabel, null);
  assert.match(result.assumptions.join(' '), /híbrido, eléctrico o de gas/);
});

test('sin combustible: un año cuya etiqueta depende del combustible no muestra etiqueta y lo pide', () => {
  const selection = selectionOf({ year: 2010 });
  assert.equal(evaluateVehicleSelection(selection), null);
  assert.ok(selectionNeedsFuel(selection));
  assert.ok(!selectionNeedsFuel(selectionOf({ year: 2020 })));
  assert.ok(!selectionNeedsFuel(EMPTY_VEHICLE_SELECTION));
});

test('matrícula provincial antigua: etiqueta directa SIN_ETIQUETA sin preguntar combustible', async () => {
  const resolution = await resolveBadgeFromPlate('M-1234-AB');
  assert.equal(resolution.badge, 'SIN_ETIQUETA');
  assert.equal(resolution.needsFuel, false);
});

test('matrícula de 2010: pide combustible y no da etiqueta', async () => {
  const resolution = await resolveBadgeFromPlate('1234 GRR');
  assert.equal(resolution.year, 2010);
  assert.equal(resolution.badge, null);
  assert.equal(resolution.needsFuel, true);
});

test('matrícula de 2020: etiqueta C directa', async () => {
  const resolution = await resolveBadgeFromPlate('1234 LBC');
  assert.equal(resolution.year, 2020);
  assert.equal(resolution.badge, 'C');
  assert.equal(resolution.needsFuel, false);
});

test('matrícula inválida o corta: error explícito', async () => {
  await assert.rejects(() => resolveBadgeFromPlate('1234 AEI'), /Formato de matrícula española no válido/);
  await assert.rejects(() => resolveBadgeFromPlate(' 12 '), { message: PLATE_TOO_SHORT_MESSAGE });
});
