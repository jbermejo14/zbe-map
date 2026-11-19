/**
 * Lógica pura para interpretar los datos de Atlas ZBE (https://atlaszbe.es, ODbL 1.0):
 * emparejar ciudades con municipios, evaluar reglas por etiqueta y redactar textos
 * a partir de campos estructurados. No hace E/S.
 */
import type { DgtBadgeType, ZbeAccessStatus } from './zbe-engine.ts';
import { ringAreaKm2 } from './perimeter-geometry.ts';
import type { LngLatPoint } from './perimeter-geometry.ts';

export type AtlasBadge = '0' | 'ECO' | 'C' | 'B' | 'A';
export type AtlasAccess = 'prohibido' | 'solo_autorizados' | 'condicionado' | 'solo_aparcamiento';
export type AtlasScope = 'zona' | 'calles_senalizadas';
export type AtlasProfile = 'todos' | 'no_domiciliados' | 'domiciliados' | 'residentes_zona';
export type AtlasCondition = 'siempre' | 'episodio_contaminacion';
export type AtlasVehicleType = 'turismo' | 'moto' | 'ciclomotor' | 'furgoneta' | 'camion' | 'autobus';
export type AtlasSanctionState =
  | 'sanciona'
  | 'aviso'
  | 'aprobada_sin_aplicar'
  | 'solo_episodios'
  | 'suspendida'
  | 'sin_restricciones'
  | 'sin_verificar';
export type AtlasInventoryState = 'vigente' | 'en_tramite' | 'pendiente' | 'sin_dato';
/** Estado de aplicación mostrado en la web: el de una zona de Atlas ZBE o el del inventario del MITECO. */
export type EnforcementState = AtlasSanctionState | 'en_tramite' | 'pendiente';

export interface AtlasSchedule {
  dias: 'L-V' | 'L-S' | 'L-D';
  tramos: { desde: string; hasta: string }[];
  festivos: boolean;
}

export interface AtlasVehicles {
  tipos?: AtlasVehicleType[];
  combustible?: 'diesel' | 'gasolina';
}

export interface AtlasRule {
  acceso: AtlasAccess;
  alcance: AtlasScope;
  /** null: la regla no distingue etiquetas y afecta a todas. */
  etiquetas: AtlasBadge[] | null;
  perfil: AtlasProfile;
  vehiculos: 'todos' | AtlasVehicles;
  condicion: AtlasCondition;
  sanciona: boolean;
  desde: string | null;
  hasta: string | null;
  horario: AtlasSchedule | null;
  nota: string | null;
}

export interface AtlasGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface AtlasZone {
  id: string;
  nombre: string;
  municipioIne: string;
  municipio: string;
  estado: string;
  estadoSancion: AtlasSanctionState;
  fechas: {
    multasDesde: string | null;
    avisosHasta: string | null;
    proximoCambio: { fecha: string } | null;
  };
  confianza: 'alta' | 'media' | 'baja';
  reglas: AtlasRule[];
  editorial: {
    multa?: { importe: number | null; prontoPago?: number | null } | null;
    excepciones?: { tipo: string }[] | null;
  } | null;
  urlOficial?: string | null;
  verificadoEl?: string | null;
  geometria: AtlasGeometry;
  geometriaPrecision: 'oficial' | 'aproximada';
}

export interface AtlasMunicipality {
  ine: string;
  nombre: string;
  provincia: string;
  ccaa: string;
  estadoInventario: AtlasInventoryState;
  zonas: string[];
  inventarioActualizado: string;
}

export interface CalendarEntry {
  date: string;
  text: string;
  badges: DgtBadgeType[];
}

export interface EnforcementSummary {
  state: EnforcementState;
  label: string;
  sentence: string;
}

/** Ciudades que no salen por nombre pero sí por código INE, por slug. */
export const ATLAS_INE_OVERRIDES: Record<string, string> = {
  palma: '07040',
  castellon: '12040',
  siero: '33066',
};

const ATLAS_LEADING_ARTICLES = ['el', 'la', 'los', 'las', 'a', 'l'];
const ATLAS_NAME_SEPARATOR = /\/| - /;
const ATLAS_TRAILING_ARTICLE = /^(.+),\s*(el|la|los|las|a|l'?)$/i;
const ATLAS_DIACRITICS = /[̀-ͯ]/g;
const ATLAS_NON_ALPHANUMERIC = /[^a-z0-9 ]/g;
const ATLAS_REPEATED_SPACES = / +/g;

const ATLAS_BADGE_BY_DGT: Record<DgtBadgeType, AtlasBadge> = {
  CERO: '0',
  ECO: 'ECO',
  C: 'C',
  B: 'B',
  SIN_ETIQUETA: 'A',
};
const ATLAS_DGT_BY_BADGE: Record<AtlasBadge, DgtBadgeType> = {
  '0': 'CERO',
  ECO: 'ECO',
  C: 'C',
  B: 'B',
  A: 'SIN_ETIQUETA',
};
const ATLAS_BADGE_SENTENCE_ORDER: AtlasBadge[] = ['A', 'B', 'C', 'ECO', '0'];
const ATLAS_BADGE_SENTENCE_LABEL: Record<AtlasBadge, string> = {
  A: 'sin etiqueta',
  B: 'B',
  C: 'C',
  ECO: 'ECO',
  '0': '0 CERO',
};
const ATLAS_ANY_BADGE_TEXT = ', tengan la etiqueta que tengan,';
const ATLAS_WITH_BADGE_PREFIX = 'con etiqueta ';

const ATLAS_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const ATLAS_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/;
const ATLAS_ISO_DATE_LENGTH = 10;

const ATLAS_DAYS_TEXT: Record<AtlasSchedule['dias'], string> = {
  'L-V': 'De lunes a viernes',
  'L-S': 'De lunes a sábado',
  'L-D': 'Todos los días',
};
const ATLAS_ALL_DAY_FROM = '00:00';
const ATLAS_ALL_DAY_TO = '24:00';
const ATLAS_ALL_DAY_TEXT = 'a todas horas';
const ATLAS_NO_SCHEDULE_TEXT = 'Horario no especificado';
const ATLAS_EXCEPT_HOLIDAYS_TEXT = ', excepto festivos';

const ATLAS_VEHICLE_TYPE_TEXT: Record<AtlasVehicleType, string> = {
  turismo: 'turismos',
  moto: 'motos',
  ciclomotor: 'ciclomotores',
  furgoneta: 'furgonetas',
  camion: 'camiones',
  autobus: 'autobuses',
};
const ATLAS_FEMININE_VEHICLE_TYPES: AtlasVehicleType[] = ['moto', 'furgoneta'];
/** Campos de `vehiculos` que se entienden; `nota` es texto editorial y no se copia. */
const ATLAS_KNOWN_VEHICLE_FIELDS = ['tipos', 'combustible', 'nota'];
const ATLAS_MASCULINE_ARTICLE = 'los';
const ATLAS_FEMININE_ARTICLE = 'las';
const ATLAS_STATE_SEVERITY: AtlasSanctionState[] = [
  'sanciona',
  'aviso',
  'aprobada_sin_aplicar',
  'solo_episodios',
  'sin_restricciones',
  'suspendida',
  'sin_verificar',
];
const ATLAS_GENERIC_VEHICLES_TEXT = 'vehículos';
const ATLAS_FUEL_TEXT = { diesel: ' diésel', gasolina: ' de gasolina' };
const ATLAS_ACCESS_TEXT: Record<AtlasAccess, string> = {
  prohibido: 'no pueden circular',
  solo_autorizados: 'solo pueden entrar con autorización',
  condicionado: 'pueden entrar con condiciones',
  solo_aparcamiento: 'solo pueden entrar para aparcar en un aparcamiento',
};
const ATLAS_BANNING_ACCESS: AtlasAccess[] = ['prohibido', 'solo_autorizados'];
const ATLAS_BANNING_PROFILES: AtlasProfile[] = ['todos', 'no_domiciliados'];
const ATLAS_WARNING_TEXT = ' (en periodo de aviso, sin multa)';
const ATLAS_EPISODE_TEXT = ' durante los episodios de contaminación';
const ATLAS_SIGNPOSTED_STREETS_TEXT = ' en las calles señalizadas';

const ATLAS_FINES_START_TEXT = 'Empiezan las multas.';
const ATLAS_WARNING_END_TEXT = 'Termina el periodo de aviso.';
const ATLAS_NEXT_CHANGE_TEXT = 'Próximo cambio previsto en la ZBE.';

function atlasNormalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(ATLAS_DIACRITICS, '')
    .toLowerCase()
    .replace(ATLAS_NON_ALPHANUMERIC, ' ')
    .replace(ATLAS_REPEATED_SPACES, ' ')
    .trim();
}

function atlasMoveTrailingArticle(part: string): string {
  const match = ATLAS_TRAILING_ARTICLE.exec(part.trim());
  return match ? `${match[2]} ${match[1]}` : part;
}

function atlasStripLeadingArticle(normalized: string): string {
  for (const article of ATLAS_LEADING_ARTICLES) {
    const prefix = `${article} `;
    if (normalized.startsWith(prefix) && normalized.length > prefix.length) return normalized.slice(prefix.length);
  }
  return normalized;
}

function atlasNameVariants(name: string): Set<string> {
  const parts = [name, ...name.split(ATLAS_NAME_SEPARATOR)];
  const variants = new Set<string>();
  for (const part of parts) {
    const normalized = atlasNormalizeName(atlasMoveTrailingArticle(part));
    if (normalized === '') continue;
    variants.add(normalized);
    variants.add(atlasStripLeadingArticle(normalized));
  }
  return variants;
}

/**
 * Busca el municipio de Atlas ZBE que corresponde a una ciudad. Un override por slug
 * (código INE) tiene prioridad; si no, se compara por nombre normalizado.
 */
export function matchCityToMunicipality(
  city: { slug: string; name: string },
  municipalities: AtlasMunicipality[],
  overrides: Record<string, string>,
): AtlasMunicipality | null {
  const overrideIne = overrides[city.slug];
  if (overrideIne !== undefined) return municipalities.find((item) => item.ine === overrideIne) ?? null;
  const cityVariants = atlasNameVariants(city.name);
  const found = municipalities.find((item) => {
    const itemVariants = atlasNameVariants(item.nombre);
    return [...cityVariants].some((variant) => itemVariants.has(variant));
  });
  return found ?? null;
}

/** Algunas fechas de Atlas ZBE llegan con hora (2025-02-15T02:00:00+01:00): solo cuenta el día. */
function atlasDayOf(date: string): string {
  return date.slice(0, ATLAS_ISO_DATE_LENGTH);
}

/**
 * La regla está en vigor en la fecha ISO dada: `desde` ≤ fecha ≤ `hasta`.
 * `hasta` es el último día en vigor: en los datos, la regla siguiente empieza al día siguiente.
 */
export function isRuleActive(rule: AtlasRule, onDate: string): boolean {
  const started = rule.desde === null || atlasDayOf(rule.desde) <= onDate;
  const notEnded = rule.hasta === null || atlasDayOf(rule.hasta) >= onDate;
  return started && notEnded;
}

function atlasGeometryPolygons(geometry: AtlasGeometry): number[][][][] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates as number[][][]]
    : (geometry.coordinates as number[][][][]);
}

function atlasZoneOuterAreaKm2(zone: AtlasZone): number {
  return atlasGeometryPolygons(zone.geometria).reduce(
    (sum, polygon) => sum + ringAreaKm2(polygon[0] as LngLatPoint[]),
    0,
  );
}

/**
 * Zona de mayor área (suma de anillos exteriores). En empate, la primera.
 * Solo decide la geometría, la multa y el nombre de la zona principal; el estado sale de `cityEnforcementZone`.
 */
export function pickMainZone(zones: AtlasZone[]): AtlasZone {
  if (zones.length === 0) throw new Error('pickMainZone necesita al menos una zona');
  let main = zones[0];
  let mainArea = atlasZoneOuterAreaKm2(main);
  for (const zone of zones.slice(1)) {
    const area = atlasZoneOuterAreaKm2(zone);
    if (area > mainArea) {
      main = zone;
      mainArea = area;
    }
  }
  return main;
}

/**
 * Zona con el estado de aplicación más severo (sanciona > aviso > aprobada_sin_aplicar > solo_episodios >
 * sin_restricciones > suspendida > sin_verificar). En empate gana la principal y después la primera.
 * Evita que una zona grande sin restricciones tape a una subzona que multa.
 */
export function cityEnforcementZone(zones: AtlasZone[]): AtlasZone {
  const mainZone = pickMainZone(zones);
  const severity = (zone: AtlasZone) => ATLAS_STATE_SEVERITY.indexOf(zone.estadoSancion);
  return zones.reduce((best, zone) => {
    if (severity(zone) < severity(best)) return zone;
    if (severity(zone) === severity(best) && zone === mainZone) return zone;
    return best;
  }, zones[0]);
}

function atlasRuleCoversBadge(rule: AtlasRule, badge: AtlasBadge): boolean {
  return rule.etiquetas === null || rule.etiquetas.includes(badge);
}

function atlasRulesForBadge(zones: AtlasZone[], mainZone: AtlasZone, badge: AtlasBadge, onDate: string): AtlasRule[] {
  const ordered = [mainZone, ...zones.filter((zone) => zone !== mainZone)];
  return ordered
    .flatMap((zone) => zone.reglas)
    .filter((rule) => isRuleActive(rule, onDate) && rule.condicion === 'siempre' && atlasRuleCoversBadge(rule, badge));
}

function atlasIsBanningRule(rule: AtlasRule): boolean {
  return (
    rule.etiquetas !== null &&
    ATLAS_BANNING_ACCESS.includes(rule.acceso) &&
    ATLAS_BANNING_PROFILES.includes(rule.perfil) &&
    rule.alcance === 'zona'
  );
}

/**
 * Estado de acceso de una etiqueta según las reglas de todas las zonas del municipio.
 * Devuelve también las reglas que han decidido el estado (vacío si es `allowed`).
 */
export function badgeAccessFromAtlas(
  badge: DgtBadgeType,
  zones: AtlasZone[],
  mainZone: AtlasZone,
  onDate: string,
): { status: ZbeAccessStatus; rules: AtlasRule[] } {
  const applicable = atlasRulesForBadge(zones, mainZone, ATLAS_BADGE_BY_DGT[badge], onDate);
  if (applicable.length === 0) return { status: 'allowed', rules: [] };
  const banning = applicable.filter((rule) => mainZone.reglas.includes(rule) && atlasIsBanningRule(rule));
  if (banning.length > 0) return { status: 'banned', rules: banning };
  return { status: 'restricted', rules: applicable };
}

/** Nombre de la zona a la que pertenece la regla. Es null si el municipio tiene una sola zona o la regla no está en ninguna. */
export function zoneNameForRule(rule: AtlasRule, zones: AtlasZone[]): string | null {
  if (zones.length <= 1) return null;
  return zones.find((zone) => zone.reglas.includes(rule))?.nombre ?? null;
}

/** '2025-01-01' → '1 de enero de 2025'. */
export function formatSpanishDate(isoDate: string): string {
  const match = ATLAS_ISO_DATE.exec(isoDate);
  if (!match) throw new Error(`Fecha ISO no válida: "${isoDate}" (se esperaba AAAA-MM-DD)`);
  const month = ATLAS_MONTHS[Number(match[2]) - 1];
  if (month === undefined) throw new Error(`Mes no válido en la fecha "${isoDate}"`);
  return `${Number(match[3])} de ${month} de ${match[1]}`;
}

function atlasLowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function atlasCapitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function atlasJoinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function atlasTramoText(tramo: { desde: string; hasta: string }): string {
  if (tramo.desde === ATLAS_ALL_DAY_FROM && tramo.hasta === ATLAS_ALL_DAY_TO) return ATLAS_ALL_DAY_TEXT;
  return `de ${tramo.desde} a ${tramo.hasta}`;
}

/** Texto del horario, p. ej. "De lunes a viernes de 07:00 a 20:00, excepto festivos". */
export function scheduleText(horario: AtlasSchedule | null): string {
  if (horario === null) return ATLAS_NO_SCHEDULE_TEXT;
  const days = ATLAS_DAYS_TEXT[horario.dias];
  const ranges = atlasJoinWithAnd(horario.tramos.map(atlasTramoText));
  const base = ranges === '' ? days : `${days} ${ranges}`;
  return horario.festivos ? base : `${base}${ATLAS_EXCEPT_HOLIDAYS_TEXT}`;
}

function atlasBadgeSubject(badges: AtlasBadge[]): string {
  const sorted = ATLAS_BADGE_SENTENCE_ORDER.filter((badge) => badges.includes(badge));
  const withoutBadge = sorted.includes('A');
  const labelled = sorted.filter((badge) => badge !== 'A').map((badge) => ATLAS_BADGE_SENTENCE_LABEL[badge]);
  const parts: string[] = [];
  if (withoutBadge) parts.push(ATLAS_BADGE_SENTENCE_LABEL.A);
  if (labelled.length > 0) parts.push(`${ATLAS_WITH_BADGE_PREFIX}${atlasJoinWithAnd(labelled)}`);
  return atlasJoinWithAnd(parts);
}

function atlasAssertKnownVehicleFields(vehiculos: AtlasVehicles): void {
  const unknown = Object.keys(vehiculos).filter((field) => !ATLAS_KNOWN_VEHICLE_FIELDS.includes(field));
  if (unknown.length > 0) {
    throw new Error(`La regla tiene un campo de vehículos que no se entiende: ${unknown.join(', ')}`);
  }
}

/** Tipos con los masculinos primero, para que "los camiones y furgonetas" concuerde. */
function atlasSortVehicleTypes(types: AtlasVehicleType[]): AtlasVehicleType[] {
  const isFeminine = (type: AtlasVehicleType) => ATLAS_FEMININE_VEHICLE_TYPES.includes(type);
  return [...types.filter((type) => !isFeminine(type)), ...types.filter(isFeminine)];
}

function atlasVehiclesText(vehiculos: AtlasRule['vehiculos']): { text: string; article: string } {
  if (vehiculos === 'todos') return { text: ATLAS_GENERIC_VEHICLES_TEXT, article: ATLAS_MASCULINE_ARTICLE };
  atlasAssertKnownVehicleFields(vehiculos);
  const types = atlasSortVehicleTypes(vehiculos.tipos ?? []);
  const base = types.length > 0 ? atlasJoinWithAnd(types.map((type) => ATLAS_VEHICLE_TYPE_TEXT[type])) : ATLAS_GENERIC_VEHICLES_TEXT;
  const onlyFeminine = types.length > 0 && types.every((type) => ATLAS_FEMININE_VEHICLE_TYPES.includes(type));
  return {
    text: vehiculos.combustible ? `${base}${ATLAS_FUEL_TEXT[vehiculos.combustible]}` : base,
    article: onlyFeminine ? ATLAS_FEMININE_ARTICLE : ATLAS_MASCULINE_ARTICLE,
  };
}

function atlasAllText(article: string): string {
  return article === ATLAS_FEMININE_ARTICLE ? 'todas' : 'todos';
}

function atlasProfileText(profile: AtlasProfile, cityName: string): string {
  if (profile === 'no_domiciliados') return ` no domiciliados en ${cityName}`;
  if (profile === 'domiciliados') return ` domiciliados en ${cityName}`;
  if (profile === 'residentes_zona') return ' que no residen en la zona';
  return '';
}

function atlasPlaceText(rule: AtlasRule, zoneName: string | null): string {
  if (rule.alcance === 'calles_senalizadas') {
    return zoneName ? `${ATLAS_SIGNPOSTED_STREETS_TEXT} de ${zoneName}` : ATLAS_SIGNPOSTED_STREETS_TEXT;
  }
  return zoneName ? ` en ${zoneName}` : '';
}

function atlasRuleBody(rule: AtlasRule, ctx: { cityName: string; zoneName: string | null }): string {
  const vehicles = atlasVehiclesText(rule.vehiculos);
  const profile = atlasProfileText(rule.perfil, ctx.cityName);
  const subject =
    rule.etiquetas === null
      ? `${atlasAllText(vehicles.article)} ${vehicles.article} ${vehicles.text}${profile}${ATLAS_ANY_BADGE_TEXT}`
      : `${vehicles.article} ${vehicles.text} ${atlasBadgeSubject(rule.etiquetas)}${profile}`;
  const episode = rule.condicion === 'episodio_contaminacion' ? ATLAS_EPISODE_TEXT : '';
  const schedule = rule.horario === null ? '' : `, ${atlasLowerFirst(scheduleText(rule.horario))}`;
  const warning = rule.sanciona ? '' : ATLAS_WARNING_TEXT;
  return `${subject} ${ATLAS_ACCESS_TEXT[rule.acceso]}${atlasPlaceText(rule, ctx.zoneName)}${episode}${schedule}${warning}`;
}

/** Redacta una regla en una frase en español terminada en punto. */
export function ruleSentence(rule: AtlasRule, ctx: { cityName: string; zoneName: string | null }): string {
  const body = atlasRuleBody(rule, ctx);
  if (rule.desde === null) return `${atlasCapitalize(body)}.`;
  return `Desde el ${formatSpanishDate(rule.desde)}, ${body}.`;
}

function atlasUpTo(date: string | null | undefined, prefix: string, suffix: string = ''): string {
  return date ? `${prefix}${formatSpanishDate(atlasDayOf(date))}${suffix}` : '';
}

function atlasSummaryByState(zone: AtlasZone): Record<AtlasSanctionState, { label: string; sentence: string }> {
  const { multasDesde, avisosHasta, proximoCambio } = zone.fechas;
  const startDate = proximoCambio?.fecha ?? multasDesde;
  return {
    sanciona: {
      label: 'Se multa',
      sentence: `Las restricciones están en vigor y se multa${atlasUpTo(multasDesde, ' desde el ')}.`,
    },
    aviso: {
      label: 'Periodo de aviso',
      sentence: `Hay restricciones, pero en periodo de aviso: todavía no se multa.${atlasUpTo(avisosHasta, ' El aviso termina el ', '.')}`,
    },
    aprobada_sin_aplicar: {
      label: 'Aprobada, sin aplicar',
      sentence: `La ZBE está aprobada, pero las restricciones empiezan más adelante${atlasUpTo(startDate, ', el ')}.`,
    },
    solo_episodios: {
      label: 'Solo en episodios',
      sentence: 'Solo hay restricciones durante los episodios de alta contaminación.',
    },
    suspendida: {
      label: 'Suspendida',
      sentence: 'La ZBE está anulada o suspendida: ahora no hay restricciones.',
    },
    sin_restricciones: {
      label: 'Sin restricciones',
      sentence: 'La zona existe, pero no restringe el acceso.',
    },
    sin_verificar: {
      label: 'Sin confirmar',
      sentence: 'El estado de esta ZBE no está confirmado.',
    },
  };
}

/** Etiqueta corta y frase del estado de aplicación de la zona dada (la de `cityEnforcementZone`). */
export function enforcementSummary(zone: AtlasZone): EnforcementSummary {
  const state = zone.estadoSancion;
  return { state, ...atlasSummaryByState(zone)[state] };
}

/** Texto para un municipio en el inventario del MITECO sin zona en vigor. `cityName` sustituye al nombre del municipio. */
export function inventorySummary(municipality: AtlasMunicipality, cityName: string = municipality.nombre): EnforcementSummary {
  if (municipality.estadoInventario === 'en_tramite') {
    return {
      state: 'en_tramite',
      label: 'En tramitación',
      sentence: `${cityName} tiene la ZBE en tramitación: todavía no hay restricciones de acceso por etiqueta.`,
    };
  }
  if (municipality.estadoInventario === 'pendiente') {
    return {
      state: 'pendiente',
      label: 'Pendiente',
      sentence: `${cityName} aún no ha aprobado su ZBE: todavía no hay restricciones de acceso por etiqueta.`,
    };
  }
  throw new Error(
    `inventorySummary solo admite en_tramite o pendiente, y ${municipality.nombre} está en ${municipality.estadoInventario}`,
  );
}

interface AtlasRuleGroup {
  rule: AtlasRule;
  zoneNames: string[];
}

/** Agrupa reglas con la misma clave y reúne los nombres de las zonas en las que aparecen. */
function atlasGroupRules(
  rules: AtlasRule[],
  zones: AtlasZone[],
  keyOf: (rule: AtlasRule) => string,
): AtlasRuleGroup[] {
  const groups = new Map<string, AtlasRuleGroup>();
  for (const rule of rules) {
    const key = keyOf(rule);
    const group = groups.get(key) ?? { rule, zoneNames: [] };
    const zoneName = zoneNameForRule(rule, zones);
    if (zoneName !== null && !group.zoneNames.includes(zoneName)) group.zoneNames.push(zoneName);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Si la regla está en todas las zonas del municipio no se nombra ninguna. */
function atlasGroupZoneName(group: AtlasRuleGroup, zones: AtlasZone[]): string | null {
  const coversAllZones = group.zoneNames.length === zones.length;
  return group.zoneNames.length === 0 || coversAllZones ? null : atlasJoinWithAnd(group.zoneNames);
}

function atlasBadgesOf(rule: AtlasRule): DgtBadgeType[] {
  return (rule.etiquetas ?? []).map((badge) => ATLAS_DGT_BY_BADGE[badge]);
}

/**
 * Frases de las reglas, una por cada regla distinta (misma frase sin zona y misma nota): las zonas
 * de las reglas repetidas se unen en una sola frase. Termina cada frase con la nota de la regla si existe.
 */
export function groupedRuleTexts(rules: AtlasRule[], zones: AtlasZone[], cityName: string): string[] {
  const noZone = { cityName, zoneName: null };
  const groups = atlasGroupRules(rules, zones, (rule) => `${ruleSentence(rule, noZone)}|${rule.nota ?? ''}`);
  return groups.map((group) => {
    const sentence = ruleSentence(group.rule, { cityName, zoneName: atlasGroupZoneName(group, zones) });
    return group.rule.nota ? `${sentence} ${group.rule.nota}` : sentence;
  });
}

function atlasRuleCalendarEntries(zones: AtlasZone[], cityName: string): CalendarEntry[] {
  const noZone = { cityName, zoneName: null };
  const dated = zones.flatMap((zone) => zone.reglas).filter((rule) => rule.desde !== null);
  const keyOf = (rule: AtlasRule) =>
    [atlasDayOf(rule.desde as string), atlasBadgesOf(rule).join(','), atlasRuleBody(rule, noZone)].join('|');
  return atlasGroupRules(dated, zones, keyOf).map((group) => {
    const zoneName = atlasGroupZoneName(group, zones);
    return {
      date: atlasDayOf(group.rule.desde as string),
      text: `${atlasCapitalize(atlasRuleBody(group.rule, { cityName, zoneName }))}.`,
      badges: atlasBadgesOf(group.rule),
    };
  });
}

function atlasZoneCalendarEntries(enforcementZone: AtlasZone): CalendarEntry[] {
  const { multasDesde, avisosHasta, proximoCambio } = enforcementZone.fechas;
  const general: [string | null | undefined, string][] = [
    [multasDesde, ATLAS_FINES_START_TEXT],
    [avisosHasta, ATLAS_WARNING_END_TEXT],
    [proximoCambio?.fecha, ATLAS_NEXT_CHANGE_TEXT],
  ];
  return general.flatMap(([date, text]) => (date ? [{ date: atlasDayOf(date), text, badges: [] }] : []));
}

/**
 * Calendario de hitos de la ZBE, ordenado por fecha y sin entradas repetidas: las reglas con la misma
 * fecha, etiquetas y texto se agrupan y sus zonas se unen. Los hitos generales salen de `milestonesZone`.
 */
export function calendarEntries(zones: AtlasZone[], milestonesZone: AtlasZone, cityName: string): CalendarEntry[] {
  const all = [...atlasRuleCalendarEntries(zones, cityName), ...atlasZoneCalendarEntries(milestonesZone)];
  const seen = new Set<string>();
  const unique = all.filter((entry) => {
    const key = JSON.stringify(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort((first, second) => first.date.localeCompare(second.date));
}

const ATLAS_EXEMPTION_TEXT: Record<string, string> = {
  residentes: 'Residentes de la zona',
  domiciliados: 'Vehículos domiciliados en el municipio',
  pmr: 'Personas con movilidad reducida (PMR)',
  servicios_esenciales: 'Servicios esenciales y emergencias',
  profesionales: 'Vehículos profesionales autorizados',
  carga_descarga: 'Carga y descarga en horario permitido',
  taxi_vtc: 'Taxis y VTC',
  rentas_bajas: 'Personas con rentas bajas',
  accesos_puntuales: 'Accesos puntuales autorizados',
  aparcamiento: 'Acceso a aparcamientos de la zona',
  talleres: 'Acceso a talleres',
  hoteles: 'Clientes de hoteles de la zona',
};

/** Lista de exenciones de la zona principal, a partir de los tipos de excepción, sin duplicados ni el tipo "otros". */
export function exemptionsFromZone(mainZone: AtlasZone): string[] {
  const texts = (mainZone.editorial?.excepciones ?? [])
    .map((exception) => ATLAS_EXEMPTION_TEXT[exception.tipo])
    .filter((text): text is string => text !== undefined);
  return [...new Set(texts)];
}

/** Resumen de la ciudad: cuántas zonas tiene, sus nombres y la frase del estado de aplicación. */
export function zonesSummary(cityName: string, zones: AtlasZone[], enforcementSentence: string): string {
  const names = atlasJoinWithAnd(zones.map((zone) => zone.nombre));
  const count = zones.length === 1 ? 'una zona' : `${zones.length} zonas`;
  return `${cityName} tiene ${count} de bajas emisiones: ${names}. ${enforcementSentence}`;
}
