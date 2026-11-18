/** Combustibles con página /etiqueta-dgt/[combustible]/[anio]. */
export const ETIQUETA_FUEL_SLUGS = [
  'gasolina',
  'diesel',
  'hibrido',
  'hibrido-enchufable',
  'electrico',
  'glp-gnc',
] as const;

export type EtiquetaFuelSlug = (typeof ETIQUETA_FUEL_SLUGS)[number];

export const ETIQUETA_FIRST_YEAR = 1998;
export const ETIQUETA_LAST_YEAR = 2026;

/** Años con página generada: de ETIQUETA_FIRST_YEAR a ETIQUETA_LAST_YEAR, ambos incluidos. */
export const ETIQUETA_YEARS: readonly number[] = Array.from(
  { length: ETIQUETA_LAST_YEAR - ETIQUETA_FIRST_YEAR + 1 },
  (_, index) => ETIQUETA_FIRST_YEAR + index
);

const ETIQUETA_FUEL_BY_PROPULSION: Record<string, EtiquetaFuelSlug> = {
  GASOLINA: 'gasolina',
  DIESEL: 'diesel',
  HEV: 'hibrido',
  MHEV: 'hibrido',
  PHEV: 'hibrido-enchufable',
  BEV: 'electrico',
  GLP: 'glp-gnc',
};

/**
 * Ruta interna de la página de etiqueta DGT que corresponde a un vehículo, o null si
 * su combustible o su año no tienen página generada (el enlace sería un 404).
 */
export function etiquetaRouteFor(propulsionCode: string, year: number): string | null {
  const fuel = ETIQUETA_FUEL_BY_PROPULSION[propulsionCode];
  if (!fuel || !ETIQUETA_YEARS.includes(year)) return null;
  return `/etiqueta-dgt/${fuel}/${year}`;
}
