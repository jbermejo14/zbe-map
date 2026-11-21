import type { CityData, CityEnforcement } from './cities-repository.ts';
import { NO_RESTRICTIONS_SCHEDULE_TEXT } from './atlas-zbe.ts';
import type { DgtBadgeType, ZbeAccessStatus } from './zbe-engine.ts';
import { canonicalRegion } from './regions.ts';

export const SAME_REGION_LIMIT = 8;
export const META_TITLE_MAX_LENGTH = 60;
export const META_DESCRIPTION_MAX_LENGTH = 160;

const NO_FINE_TEXT = 'Sin multa por ahora.';
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
  /** Si es false, se dice que no hay multa en lugar de su importe. Por defecto, true. */
  fineApplies?: boolean;
}

/** Recorta una descripción SEO al máximo permitido, en el último espacio y con puntos suspensivos. */
export function truncateMetaDescription(text: string): string {
  if (text.length <= META_DESCRIPTION_MAX_LENGTH) return text;
  const head = text.slice(0, META_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = head.lastIndexOf(' ');
  return `${(lastSpace > 0 ? head.slice(0, lastSpace) : head).trimEnd()}${ELLIPSIS}`;
}

/** Descripción SEO de la página de etiqueta, de 160 caracteres como máximo. */
export function badgeMetaDescription(input: BadgeMetaDescriptionInput): string {
  const lead = `${insightsCapitalize(input.subject)} ${VERDICTS[input.status]} en la ZBE de ${input.cityName}.`;
  const fineText = input.fineApplies === false ? NO_FINE_TEXT : `Multa: ${input.fineAmount} €.`;
  const tail = input.verified
    ? `${fineText} Horario, excepciones y mapa.`
    : 'Normas orientativas: horario, excepciones y mapa.';
  return truncateMetaDescription(`${lead} ${tail}`);
}

export interface BadgeFaq {
  question: string;
  answer: string;
}

export interface BadgeFaqInput {
  cityName: string;
  /** Nombre de la etiqueta tal como se muestra ("Etiqueta B"). */
  badgeLabel: string;
  accessStatus: ZbeAccessStatus;
  /** Motivo de la regla de la etiqueta (`rule.reason`). */
  reason: string;
  verified: boolean;
  schedule: string;
  fineAmount: number;
  enforcement: CityEnforcement | null;
}

/** Frase del estado cuando la ZBE existe pero no multa; null si multa o no hay datos de estado. */
function faqNoFineSentence(enforcement: CityEnforcement | null): string | null {
  return enforcement !== null && enforcement.state !== 'sanciona' ? enforcement.sentence : null;
}

function faqAccessAnswer(input: BadgeFaqInput): string {
  const { cityName, badgeLabel, accessStatus, reason, verified, enforcement } = input;
  if (accessStatus === 'allowed') {
    const noFineSentence = faqNoFineSentence(enforcement);
    return noFineSentence !== null
      ? `Sí, ahora mismo puede entrar. ${noFineSentence}`
      : `Sí, los vehículos con ${badgeLabel} tienen acceso libre a la ZBE de ${cityName}.`;
  }
  if (accessStatus === 'restricted') {
    return `El acceso está condicionado en la ZBE de ${cityName}: ${reason}`;
  }
  const orientative = verified ? '' : ' según las normas orientativas';
  return `No, los vehículos con ${badgeLabel} tienen prohibido el acceso a la ZBE de ${cityName}${orientative}: ${reason}`;
}

function faqScheduleAnswer(input: BadgeFaqInput): string {
  const { cityName, schedule, verified, enforcement } = input;
  if (schedule === NO_RESTRICTIONS_SCHEDULE_TEXT) {
    return `Ahora no hay horario de restricción en ${cityName}: ${enforcement?.sentence ?? schedule}`;
  }
  return verified
    ? `El horario de restricción fijado por el Ayuntamiento de ${cityName} es: ${schedule}.`
    : `Horario orientativo, pendiente de verificar con la ordenanza municipal de ${cityName}: ${schedule}.`;
}

function faqFineAnswer(input: BadgeFaqInput): string {
  const { cityName, fineAmount, verified, enforcement } = input;
  const noFineSentence = faqNoFineSentence(enforcement);
  if (noFineSentence !== null) return noFineSentence;
  if (!verified) {
    return `Sanción orientativa de ${fineAmount} €, pendiente de verificar con la ordenanza municipal de ${cityName}.`;
  }
  const earlyPayment = enforcement?.source === 'atlaszbe' ? enforcement.earlyPaymentAmount : null;
  const earlyText = earlyPayment === null || earlyPayment === undefined ? '' : ` (${earlyPayment} € con pronto pago)`;
  return `La sanción general en ${cityName} es de ${fineAmount} €${earlyText}.`;
}

/** Preguntas frecuentes visibles (y del JSON-LD) de la página de etiqueta. */
export function badgeFaqs(input: BadgeFaqInput): BadgeFaq[] {
  const { cityName, badgeLabel } = input;
  return [
    {
      question: `¿Puede circular un coche con ${badgeLabel} en la ZBE de ${cityName}?`,
      answer: faqAccessAnswer(input),
    },
    {
      question: `¿Cuál es el horario de la Zona de Bajas Emisiones en ${cityName}?`,
      answer: faqScheduleAnswer(input),
    },
    {
      question: `¿A cuánto asciende la multa por entrar sin permiso en la ZBE de ${cityName}?`,
      answer: faqFineAnswer(input),
    },
  ];
}

/**
 * Determina si la página de etiqueta de una ciudad debe marcarse con noindex.
 * Las páginas CERO y ECO en ciudades cuya ZBE está en tramitación o pendiente según Atlas ZBE
 * no tienen restricciones vigentes y presentan un 64-73% de similitud Jaccard respecto a la ficha de la ciudad.
 */
export function isBadgePageNoIndex(city: CityData, badgeSlug: string): boolean {
  const normalized = badgeSlug.toLowerCase();
  if (normalized !== 'cero' && normalized !== 'eco') {
    return false;
  }
  const state = city.enforcement?.state;
  return state === 'en_tramite' || state === 'pendiente';
}
