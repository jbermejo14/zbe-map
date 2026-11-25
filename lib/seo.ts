import type { CityData } from './cities-repository.ts';
import { NO_RESTRICTIONS_SCHEDULE_TEXT, type EnforcementState } from './atlas-zbe.ts';
import { truncateMetaDescription } from './badge-page-insights.ts';
import { fitDescription, fitTitle } from './seo-metadata.ts';

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

/** Sufijos del título de ciudad, del más completo al más corto; el nombre y el año van siempre. */
const SEO_TITLE_SUFFIXES_WITH_FINE = [
  ': Mapa, Horarios, Multas y Normativa DGT',
  ': Mapa, Horarios y Multas',
  ': Mapa y Multas',
  '',
];
const SEO_TITLE_SUFFIXES_NO_FINE = [': Mapa, Horarios y Normativa DGT', ': Mapa y Horarios', ': Mapa y Normativa', ''];
const SEO_TITLE_SUFFIXES_UNVERIFIED = [
  ': Mapa y Normas Orientativas por Etiqueta DGT',
  ': Mapa y Normas Orientativas',
  ': Mapa y Normas',
  '',
];

function seoTitleSuffixes(city: SeoCity, verified: boolean): string[] {
  if (!verified) return SEO_TITLE_SUFFIXES_UNVERIFIED;
  return seoCityHasNoFine(city) ? SEO_TITLE_SUFFIXES_NO_FINE : SEO_TITLE_SUFFIXES_WITH_FINE;
}

/** Título SEO completo (con marca) de la página de ciudad; sin multa, no promete "Multas". */
export function cityMetaTitle(city: SeoCity, verified: boolean, year: number): string {
  const keyword = `ZBE ${city.name} ${year}`;
  return fitTitle(seoTitleSuffixes(city, verified).map((suffix) => `${keyword}${suffix}`));
}

const SEO_LONG_ACCESS_TAIL = 'Consulta el acceso por etiqueta DGT, las exenciones y el mapa de la zona.';
const SEO_SHORT_ACCESS_TAIL = 'Acceso por etiqueta DGT.';
const SEO_LONG_EXEMPTIONS_TAIL = 'Exenciones y acceso por etiqueta DGT, con el mapa y la normativa de la zona.';
const SEO_SHORT_EXEMPTIONS_TAIL = 'Exenciones y acceso por etiqueta DGT.';

function seoEnforcementCandidates(city: SeoCity): string[] {
  const enforcement = city.enforcement!;
  const lead = `Zona de Bajas Emisiones de ${city.name} (${city.province}): ${seoLowercaseFirst(enforcement.label)}.`;
  if (enforcement.source === 'miteco') return [`${lead} ${SEO_LONG_ACCESS_TAIL}`, `${lead} ${SEO_SHORT_ACCESS_TAIL}`];
  const hasSchedule = city.schedule !== NO_RESTRICTIONS_SCHEDULE_TEXT;
  const withSchedule = hasSchedule ? `${lead} Horario: ${city.schedule}.` : lead;
  return [
    `${withSchedule} ${SEO_LONG_EXEMPTIONS_TAIL}`,
    `${withSchedule} ${SEO_SHORT_EXEMPTIONS_TAIL}`,
    `${lead} ${SEO_LONG_EXEMPTIONS_TAIL}`,
  ];
}

function seoLegacyCandidates(city: SeoCity, verified: boolean): string[] {
  const place = `${city.name} (${city.province})`;
  if (!verified) {
    return [
      `Normas orientativas de la Zona de Bajas Emisiones en ${place}, pendientes de verificar con la ordenanza municipal. Acceso por etiqueta DGT; consulta al ayuntamiento horario y sanciones.`,
    ];
  }
  return [
    `Normativa y restricciones de la Zona de Bajas Emisiones en ${place}. Horario (${city.schedule}), multa de ${city.fineAmount} €, exenciones y acceso por etiqueta DGT.`,
  ];
}

/**
 * Descripción SEO de la página de ciudad, de 120 a 160 caracteres. Si el horario es tan largo que
 * ningún texto cabe, recorta el más completo en el último espacio.
 */
export function cityMetaDescription(city: SeoCity, verified: boolean): string {
  const candidates = seoCityHasNoFine(city) ? seoEnforcementCandidates(city) : seoLegacyCandidates(city, verified);
  return fitDescription([...candidates, truncateMetaDescription(candidates[0])]);
}
