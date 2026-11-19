import type { CityData } from './cities-repository.ts';
import type { DgtBadgeType, ZbeAccessStatus } from './zbe-engine.ts';
import { canonicalRegion } from './regions.ts';

export const SAME_REGION_LIMIT = 8;
export const META_TITLE_MAX_LENGTH = 60;
export const META_DESCRIPTION_MAX_LENGTH = 160;

const ELLIPSIS = '…';
const DEFAULT_STATUS: ZbeAccessStatus = 'allowed';
const STATUS_ORDER: ZbeAccessStatus[] = ['allowed', 'restricted', 'banned'];

const STATUS_WORDS: Record<ZbeAccessStatus, string> = {
  allowed: 'puede entrar sin restricciones',
  restricted: 'tiene restricciones',
  banned: 'tiene prohibido el acceso',
};

const VERDICTS: Record<ZbeAccessStatus, string> = {
  allowed: 'puede entrar sin restricciones',
  restricted: 'puede entrar con condiciones',
  banned: 'no puede entrar',
};

export interface BadgeAccessCounts {
  allowed: number;
  restricted: number;
  banned: number;
  total: number;
}

export interface SameRegionCity {
  slug: string;
  name: string;
  status: ZbeAccessStatus;
}

function insightsCapitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function insightsStatusOf(city: CityData, badge: DgtBadgeType): ZbeAccessStatus {
  return city.rules[badge]?.status ?? DEFAULT_STATUS;
}

function insightsJoinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function insightsSameRegionOthers(city: CityData, cities: CityData[]): CityData[] {
  const region = canonicalRegion(city.region);
  return cities.filter((other) => other.slug !== city.slug && canonicalRegion(other.region) === region);
}

/** Recuenta cuántas ZBE permiten, restringen o prohíben la etiqueta. */
export function badgeAccessCounts(badge: DgtBadgeType, cities: CityData[]): BadgeAccessCounts {
  const counts: BadgeAccessCounts = { allowed: 0, restricted: 0, banned: 0, total: cities.length };
  for (const city of cities) {
    counts[insightsStatusOf(city, badge)] += 1;
  }
  return counts;
}

/** Frase con el reparto nacional de estados para la etiqueta. */
export function badgeNationalSentence(badge: DgtBadgeType, cities: CityData[], subject: string): string {
  const counts = badgeAccessCounts(badge, cities);
  const present = STATUS_ORDER.filter((status) => counts[status] > 0);
  if (present.length === 1) {
    return `${insightsCapitalize(subject)} ${STATUS_WORDS[present[0]]} en las ${counts.total} ZBE de España.`;
  }
  const parts = present.map((status) => `${STATUS_WORDS[status]} en ${counts[status]}`);
  return `De las ${counts.total} ZBE de España, ${subject} ${insightsJoinList(parts)}.`;
}

/** Otras ZBE de la misma comunidad, ordenadas por nombre y limitadas. */
export function sameRegionCities(
  city: CityData,
  cities: CityData[],
  badge: DgtBadgeType,
  limit: number = SAME_REGION_LIMIT,
): SameRegionCity[] {
  return insightsSameRegionOthers(city, cities)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
    .map((other) => ({ slug: other.slug, name: other.name, status: insightsStatusOf(other, badge) }));
}

function insightsSingleOtherSentence(
  city: CityData,
  other: CityData,
  badge: DgtBadgeType,
  subject: string,
): string {
  const status = insightsStatusOf(city, badge);
  const shares = insightsStatusOf(other, badge) === status;
  const words = STATUS_WORDS[status];
  const verb = shares ? `también ${words}` : `no ${words}`;
  return `En la otra ZBE de la comunidad, ${other.name}, ${subject} ${verb}.`;
}

function insightsManyOthersSentence(
  city: CityData,
  others: CityData[],
  badge: DgtBadgeType,
  subject: string,
): string {
  const status = insightsStatusOf(city, badge);
  const words = STATUS_WORDS[status];
  const sharing = others.filter((other) => insightsStatusOf(other, badge) === status).length;
  if (sharing === others.length) {
    return `En todas las demás, ${subject} ${words}, igual que en ${city.name}.`;
  }
  if (sharing === 0) {
    return `En ninguna de las otras ${others.length}, ${subject} ${words} como en ${city.name}.`;
  }
  return `En ${sharing} de las otras ${others.length}, ${subject} ${words}, igual que en ${city.name}.`;
}

/** Frase que compara la ciudad con el resto de su comunidad, o `null` si es la única. */
export function regionSentence(
  city: CityData,
  cities: CityData[],
  badge: DgtBadgeType,
  subject: string,
): string | null {
  const others = insightsSameRegionOthers(city, cities);
  if (others.length === 0) return null;
  const region = canonicalRegion(city.region);
  const intro = `En ${region} hay ${others.length + 1} ZBE en el mapa.`;
  const detail =
    others.length === 1
      ? insightsSingleOtherSentence(city, others[0], badge, subject)
      : insightsManyOthersSentence(city, others, badge, subject);
  return `${intro} ${detail}`;
}

/** Título SEO de la página de etiqueta, de 60 caracteres como máximo cuando es posible. */
export function badgeMetaTitle(badgeShortLabel: string, cityName: string, year: number): string {
  const base = `${badgeShortLabel} en la ZBE de ${cityName}`;
  const withYear = `${base}: ¿puede entrar? (${year})`;
  if (withYear.length <= META_TITLE_MAX_LENGTH) return withYear;
  const withoutYear = `${base}: ¿puede entrar?`;
  return withoutYear.length <= META_TITLE_MAX_LENGTH ? withoutYear : base;
}

export interface BadgeMetaDescriptionInput {
  subject: string;
  cityName: string;
  status: ZbeAccessStatus;
  fineAmount: number;
  verified: boolean;
}

function insightsTruncate(text: string): string {
  if (text.length <= META_DESCRIPTION_MAX_LENGTH) return text;
  const head = text.slice(0, META_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = head.lastIndexOf(' ');
  return `${(lastSpace > 0 ? head.slice(0, lastSpace) : head).trimEnd()}${ELLIPSIS}`;
}

/** Descripción SEO de la página de etiqueta, de 160 caracteres como máximo. */
export function badgeMetaDescription(input: BadgeMetaDescriptionInput): string {
  const lead = `${insightsCapitalize(input.subject)} ${VERDICTS[input.status]} en la ZBE de ${input.cityName}.`;
  const tail = input.verified
    ? `Multa: ${input.fineAmount} €. Horario, excepciones y mapa.`
    : 'Normas orientativas: horario, excepciones y mapa.';
  return insightsTruncate(`${lead} ${tail}`);
}
