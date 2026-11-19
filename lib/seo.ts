import type { CityData } from './cities-repository.ts';
import { NO_RESTRICTIONS_SCHEDULE_TEXT, type EnforcementState } from './atlas-zbe.ts';
import { truncateMetaDescription } from './badge-page-insights.ts';

/** Año actual, fijado al evaluar el módulo (en el build) para los títulos SEO. */
export const SEO_CURRENT_YEAR = new Date().getFullYear();

type SeoCity = Pick<CityData, 'name' | 'province' | 'schedule' | 'fineAmount' | 'enforcement'>;

/** Estados en los que el texto de multa sigue siendo válido: se multa, o no se sabe. */
const SEO_FINE_STATES: EnforcementState[] = ['sanciona', 'sin_verificar'];

function seoLowercaseFirst(text: string): string {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/** Cierto si la ZBE existe pero ahora mismo no multa (aviso, trámite, suspendida…). */
function seoCityHasNoFine(city: SeoCity): boolean {
  return Boolean(city.enforcement) && !SEO_FINE_STATES.includes(city.enforcement!.state);
}

/** Título SEO de la página de ciudad; sin multa, no promete "Multas". */
export function cityMetaTitle(city: SeoCity, verified: boolean, year: number): string {
  if (!verified) return `ZBE ${city.name} ${year}: Mapa y Normas Orientativas por Etiqueta DGT`;
  if (seoCityHasNoFine(city)) return `ZBE ${city.name} ${year}: Mapa, Horarios y Normativa DGT`;
  return `ZBE ${city.name} ${year}: Mapa, Horarios, Multas y Normativa DGT`;
}

function seoEnforcementDescription(city: SeoCity): string {
  const enforcement = city.enforcement!;
  const lead = `Zona de Bajas Emisiones de ${city.name} (${city.province}): ${seoLowercaseFirst(enforcement.label)}.`;
  if (enforcement.source === 'miteco') return `${lead} Acceso por etiqueta DGT.`;
  const schedule = city.schedule === NO_RESTRICTIONS_SCHEDULE_TEXT ? '' : ` Horario: ${city.schedule}.`;
  return `${lead}${schedule} Exenciones y acceso por etiqueta DGT.`;
}

function seoLegacyDescription(city: SeoCity, verified: boolean): string {
  return verified
    ? `Normativa y restricciones de la Zona de Bajas Emisiones en ${city.name} (${city.province}). Horario (${city.schedule}), multa de ${city.fineAmount} €, exenciones y acceso por etiqueta DGT.`
    : `Normas orientativas de la Zona de Bajas Emisiones en ${city.name} (${city.province}), pendientes de verificar con la ordenanza municipal. Acceso por etiqueta DGT; consulta al ayuntamiento horario y sanciones.`;
}

/** Descripción SEO de la página de ciudad, de 160 caracteres como máximo. */
export function cityMetaDescription(city: SeoCity, verified: boolean): string {
  const text = seoCityHasNoFine(city) ? seoEnforcementDescription(city) : seoLegacyDescription(city, verified);
  return truncateMetaDescription(text);
}
