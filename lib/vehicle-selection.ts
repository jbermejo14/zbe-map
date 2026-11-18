/**
 * Selección de vehículo por marca, combustible y año. La etiqueta DGT no depende del modelo,
 * sino del combustible, del año (y del mes en el diésel de 2015) y de la autonomía eléctrica.
 */
import { getOfficialDgtBadge } from './dgt-rules.ts';
import type { DgtBadgeEvaluation } from './dgt-rules.ts';
import { ETIQUETA_FUEL_SLUGS, ETIQUETA_YEARS } from './etiqueta-routes.ts';
import type { EtiquetaFuelSlug } from './etiqueta-routes.ts';
import { OTHER_BRAND } from './brands.ts';
import type { DgtBadgeType } from './zbe-engine.ts';

/** Primer año de matriculación que ofrece el selector. */
export const ANIO_MIN = 1990;

/** Año en que el diésel cambia de B a C según el mes (Euro 6 desde septiembre de 2015). */
export const DIESEL_BOUNDARY_YEAR = 2015;

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export const FUEL_CHOICES: { id: EtiquetaFuelSlug; label: string }[] = [
  { id: 'gasolina', label: 'Gasolina' },
  { id: 'diesel', label: 'Diésel' },
  { id: 'hibrido', label: 'Híbrido (HEV/MHEV)' },
  { id: 'hibrido-enchufable', label: 'Híbrido enchufable' },
  { id: 'electrico', label: 'Eléctrico' },
  { id: 'glp-gnc', label: 'GLP/GNC' },
];

export interface VehicleSelection {
  brand: string;
  fuel: EtiquetaFuelSlug | null;
  year: number | null;
  month: number | null;
  electricRangeKm: number | null;
}

export const EMPTY_VEHICLE_SELECTION: VehicleSelection = {
  brand: '',
  fuel: null,
  year: null,
  month: null,
  electricRangeKm: null,
};

export interface SelectionResult {
  badge: DgtBadgeType;
  evaluation: DgtBadgeEvaluation;
  title: string;
  /** Null mientras la etiqueta sea la misma para gasolina y diésel y no se haya elegido combustible. */
  fuelLabel: string | null;
  year: number;
  /** Ruta de /etiqueta-dgt/<combustible>/<año>, solo si esa página existe. */
  etiquetaHref: string | null;
  /** Suposiciones que se han hecho por falta de datos, para avisar al usuario. */
  assumptions: string[];
}

const MONTH_ASSUMPTION =
  'Diésel de 2015: indica el mes de matriculación. Sin él se asume junio (etiqueta B); desde septiembre es etiqueta C.';
export const FUEL_QUESTION = '¿Qué combustible usa tu coche?';
const FUEL_NOTE =
  'Si tu coche es híbrido, eléctrico o de gas, elige el combustible y la etiqueta cambia.';
const RANGE_ASSUMPTION =
  'Sin la autonomía eléctrica se asume 40 km o más (0 CERO). Con menos de 40 km la etiqueta es ECO.';

/** Años de matriculación del selector, del más reciente a ANIO_MIN. */
export function registrationYears(currentYear: number): number[] {
  return Array.from({ length: currentYear - ANIO_MIN + 1 }, (_, index) => currentYear - index);
}

export function requiresRegistrationMonth(selection: VehicleSelection): boolean {
  return selection.fuel === 'diesel' && selection.year === DIESEL_BOUNDARY_YEAR;
}

export function requiresElectricRange(selection: VehicleSelection): boolean {
  return selection.fuel === 'hibrido-enchufable';
}

function selectionTitle(selection: VehicleSelection): string {
  const brand = selection.brand.trim();
  return brand && brand !== OTHER_BRAND ? `Tu ${brand}` : 'Tu vehículo';
}

function selectionAssumptions(selection: VehicleSelection): string[] {
  const assumptions: string[] = [];
  if (requiresRegistrationMonth(selection) && selection.month === null) assumptions.push(MONTH_ASSUMPTION);
  if (requiresElectricRange(selection) && selection.electricRangeKm === null) assumptions.push(RANGE_ASSUMPTION);
  return assumptions;
}

function selectionEtiquetaHref(fuel: EtiquetaFuelSlug, year: number): string | null {
  return ETIQUETA_YEARS.includes(year) ? `/etiqueta-dgt/${fuel}/${year}` : null;
}

/**
 * Etiqueta que corresponde a un año (y mes) con independencia del combustible habitual:
 * la de gasolina y diésel si coinciden, o null si dependen del combustible.
 */
export function fuelIndependentBadge(year: number, month?: number): DgtBadgeType | null {
  const gasoline = getOfficialDgtBadge({ fuel: 'gasolina', year, month }).badge;
  const diesel = getOfficialDgtBadge({ fuel: 'diesel', year, month }).badge;
  return gasoline === diesel ? gasoline : null;
}

/** Hay año válido pero la etiqueta depende del combustible y aún no se ha elegido. */
export function selectionNeedsFuel(selection: VehicleSelection): boolean {
  const { fuel, year } = selection;
  if (fuel !== null || year === null || year < ANIO_MIN) return false;
  return fuelIndependentBadge(year, selection.month ?? undefined) === null;
}

function selectionFuelEvaluation(selection: VehicleSelection, year: number): DgtBadgeEvaluation | null {
  const month = selection.month ?? undefined;
  if (selection.fuel === null) {
    return fuelIndependentBadge(year, month) === null
      ? null
      : getOfficialDgtBadge({ fuel: 'gasolina', year, month });
  }
  return getOfficialDgtBadge({
    fuel: selection.fuel,
    year,
    month,
    electricRangeKm: selection.electricRangeKm ?? undefined,
  });
}

/**
 * Etiqueta DGT del vehículo elegido. Es null mientras falte el año o, sin combustible,
 * mientras la etiqueta dependa de él.
 */
export function evaluateVehicleSelection(selection: VehicleSelection): SelectionResult | null {
  const { fuel, year } = selection;
  if (year === null || year < ANIO_MIN) return null;

  const evaluation = selectionFuelEvaluation(selection, year);
  if (evaluation === null) return null;

  const assumptions = selectionAssumptions(selection);
  if (fuel === null) assumptions.push(FUEL_NOTE);
  return {
    badge: evaluation.badge,
    evaluation,
    title: selectionTitle(selection),
    fuelLabel: fuel === null ? null : (FUEL_CHOICES.find((choice) => choice.id === fuel)?.label ?? fuel),
    year,
    etiquetaHref: fuel === null ? null : selectionEtiquetaHref(fuel, year),
    assumptions,
  };
}

export function isEtiquetaFuel(value: string): value is EtiquetaFuelSlug {
  return (ETIQUETA_FUEL_SLUGS as readonly string[]).includes(value);
}
