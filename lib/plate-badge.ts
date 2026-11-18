/** Atajo para obtener el año de matriculación a partir de la matrícula, sin enviarla a ningún sitio. */
import { lookupPlate } from './plate-lookup.ts';
import { fuelIndependentBadge } from './vehicle-selection.ts';
import type { DgtBadgeType } from './zbe-engine.ts';

/** Longitud mínima de una matrícula para intentar la estimación. */
export const PLATE_MIN_LENGTH = 4;

export const PLATE_TOO_SHORT_MESSAGE =
  'Debes proporcionar una matrícula válida (ej. 1234 LMN o M 1234 AB)';

export interface PlateResolution {
  formattedPlate: string;
  /** Año estimado por la serie de la matrícula. */
  year: number;
  /** Etiqueta si es la misma para gasolina y diésel; null si depende del combustible. */
  badge: DgtBadgeType | null;
  needsFuel: boolean;
}

/**
 * Estima el año por la serie de la matrícula y, si la etiqueta no depende del combustible,
 * la devuelve. Lanza Error con el motivo si la matrícula es corta o no tiene un formato válido.
 * La serie no da el mes, así que el diésel de 2015 se resuelve con el mes por defecto de las reglas.
 */
export async function resolveBadgeFromPlate(plate: string): Promise<PlateResolution> {
  if (plate.trim().length < PLATE_MIN_LENGTH) throw new Error(PLATE_TOO_SHORT_MESSAGE);
  const { formattedPlate, estimatedYear } = await lookupPlate(plate);
  const badge = fuelIndependentBadge(estimatedYear);
  return { formattedPlate, year: estimatedYear, badge, needsFuel: badge === null };
}
