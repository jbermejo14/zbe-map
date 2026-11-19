import type { DgtBadgeType, ZbeAccessStatus } from './zbe-engine.ts';
import type { CityData } from './cities-repository.ts';

type CityStatus = CityData['status'];

/** Texto corto del estado de una ciudad, en listados. */
export const CITY_STATUS_LABEL: Record<CityStatus, string> = {
  activa: 'Activa',
  suspendida: 'Suspendida',
  en_tramitacion: 'En tramitación',
};

/** Texto del estado de una ciudad en su ficha y en la tarjeta. */
export const CITY_STATUS_ZBE_LABEL: Record<CityStatus, string> = {
  activa: 'ZBE activa',
  suspendida: 'ZBE suspendida',
  en_tramitacion: 'En tramitación',
};

const CITY_STATUS_TAG_CLASS: Record<CityStatus, string> = {
  activa: 'tag tag-green',
  suspendida: 'tag tag-green',
  en_tramitacion: 'tag tag-warning',
};

const CITY_STATUS_DOT_CLASS: Record<CityStatus, string> = {
  activa: 'bg-positive animate-pulse',
  suspendida: 'bg-positive',
  en_tramitacion: 'bg-warning',
};

/** Clase CSS (globals.css) de la pastilla con el color oficial de cada etiqueta DGT. */
const ZBE_UI_BADGE_CHIP_CLASS: Record<DgtBadgeType, string> = {
  CERO: 'dgt-chip dgt-chip-cero',
  ECO: 'dgt-chip dgt-chip-eco',
  C: 'dgt-chip dgt-chip-c',
  B: 'dgt-chip dgt-chip-b',
  SIN_ETIQUETA: 'dgt-chip dgt-chip-sin',
};

/** Etiqueta DGT escrita como la ve el usuario: "0 CERO", "ETIQUETA B", "SIN ETIQUETA (A)". */
const ZBE_UI_BADGE_SHORT_LABEL: Record<DgtBadgeType, string> = {
  CERO: '0 CERO',
  ECO: 'ETIQUETA ECO',
  C: 'ETIQUETA C',
  B: 'ETIQUETA B',
  SIN_ETIQUETA: 'SIN ETIQUETA (A)',
};

/** Etiqueta del veredicto en frase: "0 CERO", "Etiqueta B", "Sin etiqueta (A)". */
const ZBE_UI_BADGE_SENTENCE_LABEL: Record<DgtBadgeType, string> = {
  CERO: '0 CERO',
  ECO: 'Etiqueta ECO',
  C: 'Etiqueta C',
  B: 'Etiqueta B',
  SIN_ETIQUETA: 'Sin etiqueta (A)',
};

/** Pastilla `tag` con el color de estado de cada tipo de acceso. */
const ZBE_UI_ACCESS_TAG_CLASS: Record<ZbeAccessStatus, string> = {
  allowed: 'tag tag-green',
  restricted: 'tag tag-warning',
  banned: 'tag tag-red',
};

const ZBE_UI_ACCESS_TEXT_CLASS: Record<ZbeAccessStatus, string> = {
  allowed: 'text-positive',
  restricted: 'text-warning',
  banned: 'text-negative',
};

const ZBE_UI_ACCESS_DOT_CLASS: Record<ZbeAccessStatus, string> = {
  allowed: 'bg-positive',
  restricted: 'bg-warning',
  banned: 'bg-negative',
};

export function zbeUiBadgeChipClass(badge: DgtBadgeType): string {
  return ZBE_UI_BADGE_CHIP_CLASS[badge];
}

export function zbeUiBadgeShortLabel(badge: DgtBadgeType): string {
  return ZBE_UI_BADGE_SHORT_LABEL[badge];
}

export function zbeUiBadgeSentenceLabel(badge: DgtBadgeType): string {
  return ZBE_UI_BADGE_SENTENCE_LABEL[badge];
}

/** Pastilla `tag` con el color del estado de una ciudad. */
export function zbeUiCityStatusTagClass(status: CityStatus): string {
  return CITY_STATUS_TAG_CLASS[status];
}

export function zbeUiCityStatusDotClass(status: CityStatus): string {
  return CITY_STATUS_DOT_CLASS[status];
}

export function zbeUiAccessTagClass(status: ZbeAccessStatus): string {
  return ZBE_UI_ACCESS_TAG_CLASS[status];
}

export function zbeUiAccessTextClass(status: ZbeAccessStatus): string {
  return ZBE_UI_ACCESS_TEXT_CLASS[status];
}

export function zbeUiAccessDotClass(status: ZbeAccessStatus): string {
  return ZBE_UI_ACCESS_DOT_CLASS[status];
}

/** Clave del color de un perímetro: un estado de acceso, o "neutral" si aún no hay etiqueta. */
export type ZbeMapColorKey = ZbeAccessStatus | 'neutral';

const ZBE_UI_MAP_COLOR_TOKEN: Record<ZbeMapColorKey, string> = {
  allowed: '--map-allowed',
  restricted: '--map-restricted',
  banned: '--map-banned',
  neutral: '--map-neutral',
};

/**
 * Color de trazado de una ciudad en el mapa, leído de los tokens de globals.css.
 * Leaflet pinta con atributos SVG, que no admiten var(), por eso se resuelve aquí.
 * Solo se llama en el navegador.
 */
export function zbeUiReadMapColor(status: ZbeMapColorKey): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(ZBE_UI_MAP_COLOR_TOKEN[status])
    .trim();
  if (!value) {
    throw new Error(`Falta el token CSS ${ZBE_UI_MAP_COLOR_TOKEN[status]} en globals.css.`);
  }
  return value;
}
